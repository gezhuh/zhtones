import { useEffect, useMemo, useState } from 'react';
import { speak, ensureVoicesLoaded } from '../audio/tts';
import { recordPitch } from '../audio/recorder';
import { trackChao, meanAbsoluteChaoError, type ChaoTrack } from '../audio/pitchTrack';
import type { Calibration } from '../calibration/mapping';
import { TONE_LABELS } from '../tones/contours';
import type { Prompt, ToneId } from '../tones/model';
import { SINGLE_PROMPTS } from '../tones/prompts';
import { PitchStaff } from '../ui/PitchStaff';
import { TonePill } from '../ui/TonePill';
import { RecordButton } from '../ui/RecordButton';

const FALLBACK_CAL: Calibration = {
  fMinHz: 110,
  fMaxHz: 240,
  fMidHz: 160,
  sampleRateHz: 48000,
  updatedAt: 0,
};

const TONE_FILTERS: { label: string; tone: ToneId | 'all' }[] = [
  { label: 'All', tone: 'all' },
  { label: 'T1 阴平', tone: 1 },
  { label: 'T2 阳平', tone: 2 },
  { label: 'T3 上声', tone: 3 },
  { label: 'T4 去声', tone: 4 },
  { label: 'T0 轻声', tone: 0 },
];

export function SingleTone({ cal }: { cal: Calibration | null }) {
  const activeCal = cal ?? FALLBACK_CAL;
  const [filter, setFilter] = useState<ToneId | 'all'>('all');
  const [idx, setIdx] = useState(0);
  const [track, setTrack] = useState<ChaoTrack | null>(null);

  useEffect(() => {
    ensureVoicesLoaded();
  }, []);

  const pool = useMemo(
    () => (filter === 'all' ? SINGLE_PROMPTS : SINGLE_PROMPTS.filter((p) => p.syllables[0].tone === filter)),
    [filter],
  );

  useEffect(() => {
    setIdx(0);
    setTrack(null);
  }, [filter]);

  const prompt: Prompt | undefined = pool[idx % Math.max(1, pool.length)];

  function next() {
    setTrack(null);
    setIdx((i) => (i + 1) % Math.max(1, pool.length));
  }

  async function onRecord() {
    if (!prompt) return;
    const rec = await recordPitch(1600);
    setTrack(trackChao(rec, activeCal));
  }

  if (!prompt) return <p>No prompts in this filter.</p>;

  const tone = prompt.syllables[0].tone;
  const score = track ? meanAbsoluteChaoError(track, prompt.surfaceContours[0]) : null;

  return (
    <div>
      <div className="row" style={{ marginBottom: 12 }}>
        {TONE_FILTERS.map((t) => (
          <button
            key={String(t.tone)}
            className="secondary"
            onClick={() => setFilter(t.tone)}
            style={{
              padding: '6px 12px',
              fontSize: 13,
              background: filter === t.tone ? '#1f6feb' : '#f1f3f5',
              color: filter === t.tone ? 'white' : '#222',
              border: '1px solid #dde1e5',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <div className="hanzi">{prompt.syllables[0].hanzi}</div>
            <div className="pinyin">{prompt.syllables[0].pinyin}</div>
            <div style={{ marginTop: 8 }}>
              <TonePill tone={tone} /> <span className="muted">{TONE_LABELS[tone]}</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="secondary" onClick={() => speak(prompt.syllables[0].hanzi)}>
              ▶ Play model
            </button>
            <RecordButton durationMs={1600} onRecorded={onRecord} />
            <button className="secondary" onClick={next}>
              Next →
            </button>
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <PitchStaff
            targetSurface={prompt.surfaceContours}
            user={track?.frames}
            autoFit
          />
        </div>
        {score != null && (
          <div className="muted" style={{ marginTop: 8 }}>
            Mean Chao error: <strong>{score.toFixed(2)}</strong> (lower is better)
          </div>
        )}
        {!cal && (
          <div className="muted" style={{ marginTop: 8 }}>
            Using a default pitch range — calibrate for accurate overlay.
          </div>
        )}
      </div>
    </div>
  );
}
