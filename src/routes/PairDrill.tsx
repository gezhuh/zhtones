import { useEffect, useMemo, useState } from 'react';
import { speak, ensureVoicesLoaded } from '../audio/tts';
import { recordPitch } from '../audio/recorder';
import { trackChao, type ChaoTrack } from '../audio/pitchTrack';
import type { Calibration } from '../calibration/mapping';
import type { Prompt, SandhiKind } from '../tones/model';
import { PAIR_PROMPTS } from '../tones/prompts';
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

const SANDHI_LABEL: Record<SandhiKind, string> = {
  'third-third': 'T3 + T3 → T2 + T3',
  'half-third': 'T3 + (T1/T2/T4/T0) → 半三声 + _',
  yi: '一-sandhi',
  bu: '不-sandhi',
  neutral: '轻声',
};

const FILTERS: { label: string; key: SandhiKind | 'all' }[] = [
  { label: 'All', key: 'all' },
  { label: 'T3+T3', key: 'third-third' },
  { label: '半三声', key: 'half-third' },
  { label: '一-sandhi', key: 'yi' },
  { label: '不-sandhi', key: 'bu' },
  { label: '轻声', key: 'neutral' },
];

export function PairDrill({ cal }: { cal: Calibration | null }) {
  const activeCal = cal ?? FALLBACK_CAL;
  const [filter, setFilter] = useState<SandhiKind | 'all'>('all');
  const [showUnderlying, setShowUnderlying] = useState(true);
  const [idx, setIdx] = useState(0);
  const [track, setTrack] = useState<ChaoTrack | null>(null);

  useEffect(() => {
    ensureVoicesLoaded();
  }, []);

  const pool = useMemo(
    () => (filter === 'all' ? PAIR_PROMPTS : PAIR_PROMPTS.filter((p) => p.sandhi === filter)),
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
    const rec = await recordPitch(2200);
    setTrack(trackChao(rec, activeCal));
  }

  if (!prompt) return <p>No prompts in this filter.</p>;

  const word = prompt.syllables.map((s) => s.hanzi).join('');
  const pinyin = prompt.syllables.map((s) => s.pinyin).join(' ');

  return (
    <div>
      <div className="row" style={{ marginBottom: 12 }}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className="secondary"
            onClick={() => setFilter(f.key)}
            style={{
              padding: '6px 12px',
              fontSize: 13,
              background: filter === f.key ? '#1f6feb' : '#f1f3f5',
              color: filter === f.key ? 'white' : '#222',
              border: '1px solid #dde1e5',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <div className="hanzi">{word}</div>
            <div className="pinyin">{pinyin}</div>
            <div style={{ marginTop: 8 }} className="row">
              {prompt.syllables.map((s, i) => (
                <TonePill key={i} tone={s.tone} />
              ))}
              {prompt.sandhi && (
                <span className="muted">→ {SANDHI_LABEL[prompt.sandhi]}</span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="secondary" onClick={() => speak(word)}>
              ▶ Play model
            </button>
            <RecordButton durationMs={2200} onRecorded={onRecord} />
            <button className="secondary" onClick={next}>
              Next →
            </button>
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <PitchStaff
            targetSurface={prompt.surfaceContours}
            targetUnderlying={prompt.underlyingContours}
            showUnderlying={showUnderlying && !!prompt.sandhi}
            user={track?.frames}
          />
        </div>
        <label className="toggle" style={{ marginTop: 8 }}>
          <input
            type="checkbox"
            checked={showUnderlying}
            onChange={(e) => setShowUnderlying(e.target.checked)}
          />
          Show underlying (pre-sandhi) contour
        </label>
        {!cal && (
          <div className="muted" style={{ marginTop: 8 }}>
            Using a default pitch range — calibrate for accurate overlay.
          </div>
        )}
      </div>
    </div>
  );
}
