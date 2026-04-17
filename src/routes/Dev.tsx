import { useMemo, useState } from 'react';
import { recordPitch, type Recording } from '../audio/recorder';
import {
  adaptiveRmsThreshold,
  trackChao,
  type ChaoTrack,
} from '../audio/pitchTrack';
import { hzToChao } from '../calibration/mapping';
import type { Calibration } from '../calibration/mapping';
import { PitchStaff } from '../ui/PitchStaff';
import { RecordButton } from '../ui/RecordButton';

const FALLBACK_CAL: Calibration = {
  fMinHz: 110,
  fMaxHz: 240,
  fMidHz: 160,
  sampleRateHz: 48000,
  updatedAt: 0,
};

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return NaN;
  const idx = q * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.min(sorted.length - 1, lo + 1);
  const frac = idx - lo;
  return sorted[lo] * (1 - frac) + sorted[hi] * frac;
}

interface Stats {
  totalFrames: number;
  voicedFrames: number;
  medianHz: number;
  p5Hz: number;
  p95Hz: number;
  minHz: number;
  maxHz: number;
  peakRms: number;
  adaptiveRms: number;
  minChao: number;
  maxChao: number;
  medianChao: number;
  frameRateHz: number;
}

function computeStats(
  rec: Recording,
  track: ChaoTrack,
  clarityT: number,
  rmsFloor: number,
  hopSize: number,
): Stats | null {
  const voiced = rec.frames.filter((f) => f.clarity >= clarityT);
  const rmsTh = adaptiveRmsThreshold(rec.frames, rmsFloor, 0.95, 0.15);
  const gated = voiced.filter((f) => f.rms >= rmsTh);
  const hzSorted = gated.map((f) => f.hz).sort((a, b) => a - b);
  const chaoSorted = track.frames.map((f) => f.chao).sort((a, b) => a - b);
  if (gated.length === 0 || track.frames.length === 0) return null;
  return {
    totalFrames: rec.frames.length,
    voicedFrames: gated.length,
    medianHz: quantile(hzSorted, 0.5),
    p5Hz: quantile(hzSorted, 0.05),
    p95Hz: quantile(hzSorted, 0.95),
    minHz: hzSorted[0],
    maxHz: hzSorted[hzSorted.length - 1],
    peakRms: rec.frames.reduce((m, f) => (f.rms > m ? f.rms : m), 0),
    adaptiveRms: rmsTh,
    minChao: chaoSorted[0],
    maxChao: chaoSorted[chaoSorted.length - 1],
    medianChao: quantile(chaoSorted, 0.5),
    frameRateHz: rec.sampleRate / hopSize,
  };
}

export function Dev({ cal }: { cal: Calibration | null }) {
  const activeCal = cal ?? FALLBACK_CAL;
  const [durationMs, setDurationMs] = useState(2500);
  const [frameSize, setFrameSize] = useState(2048);
  const [hopSize, setHopSize] = useState(512);
  const [clarityThreshold, setClarityThreshold] = useState(0.75);
  const [rmsFloor, setRmsFloor] = useState(0.002);
  const [smoothing, setSmoothing] = useState(true);
  const [rec, setRec] = useState<Recording | null>(null);

  async function onRecord() {
    const r = await recordPitch(durationMs, { frameSize, hopSize });
    setRec(r);
  }

  const track: ChaoTrack | null = useMemo(() => {
    if (!rec) return null;
    const t = trackChao(rec, activeCal, {
      clarityThreshold,
      rmsFloor,
    });
    if (!smoothing) {
      // Rebuild without median smoothing by re-filtering raw frames.
      const rmsTh = adaptiveRmsThreshold(rec.frames, rmsFloor, 0.95, 0.15);
      const voiced = rec.frames.filter(
        (f) => f.clarity >= clarityThreshold && f.rms >= rmsTh && f.hz >= 60 && f.hz <= 600,
      );
      if (voiced.length === 0) return { frames: [], durationMs: 0 };
      const t0 = voiced[0].t;
      return {
        frames: voiced.map((f) => ({
          t: f.t - t0,
          chao: hzToChao(f.hz, activeCal),
          clarity: f.clarity,
        })),
        durationMs: (voiced[voiced.length - 1].t - t0) * 1000,
      };
    }
    return t;
  }, [rec, activeCal, clarityThreshold, rmsFloor, smoothing]);

  const stats = useMemo(
    () => (rec && track ? computeStats(rec, track, clarityThreshold, rmsFloor, hopSize) : null),
    [rec, track, clarityThreshold, rmsFloor, hopSize],
  );

  return (
    <div>
      <p className="muted">
        Record without a target and inspect what the pitch tracker sees. Tweak the params
        and the derived track updates without re-recording.
      </p>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Capture parameters</h3>
        <div className="row" style={{ gap: 18, rowGap: 10 }}>
          <NumberField
            label="Duration (ms)"
            value={durationMs}
            step={100}
            min={500}
            max={8000}
            onChange={setDurationMs}
          />
          <SelectField
            label="Frame size"
            value={frameSize}
            options={[1024, 2048, 4096]}
            onChange={setFrameSize}
          />
          <SelectField
            label="Hop size"
            value={hopSize}
            options={[128, 256, 512, 1024]}
            onChange={setHopSize}
          />
        </div>
        <div style={{ marginTop: 12 }}>
          <RecordButton durationMs={durationMs} onRecorded={onRecord} label={rec ? 'Re-record' : 'Record'} />
        </div>
      </div>

      {rec && (
        <>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Track (no target)</h3>
            <PitchStaff
              targetSurface={[]}
              user={track?.frames}
              autoFit
              width={560}
              height={260}
            />
            <div className="row" style={{ gap: 18, marginTop: 12 }}>
              <NumberField
                label="Clarity threshold"
                value={clarityThreshold}
                step={0.05}
                min={0.3}
                max={0.99}
                onChange={setClarityThreshold}
              />
              <NumberField
                label="RMS floor"
                value={rmsFloor}
                step={0.001}
                min={0}
                max={0.05}
                onChange={setRmsFloor}
              />
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={smoothing}
                  onChange={(e) => setSmoothing(e.target.checked)}
                />
                3-frame median smoothing
              </label>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Stats</h3>
            {stats ? <StatsTable stats={stats} /> : <p className="muted">No voiced frames.</p>}
          </div>
        </>
      )}
    </div>
  );
}

function StatsTable({ stats }: { stats: Stats }) {
  const rows: [string, string][] = [
    ['Total frames', String(stats.totalFrames)],
    ['Voiced frames', String(stats.voicedFrames)],
    ['Frame rate', `${stats.frameRateHz.toFixed(1)} Hz`],
    ['Median F0', `${stats.medianHz.toFixed(1)} Hz`],
    ['F0 min / p5 / p95 / max', `${stats.minHz.toFixed(1)} / ${stats.p5Hz.toFixed(1)} / ${stats.p95Hz.toFixed(1)} / ${stats.maxHz.toFixed(1)} Hz`],
    ['Chao min / median / max', `${stats.minChao.toFixed(2)} / ${stats.medianChao.toFixed(2)} / ${stats.maxChao.toFixed(2)}`],
    ['Peak RMS', stats.peakRms.toFixed(4)],
    ['Adaptive RMS threshold', stats.adaptiveRms.toFixed(4)],
  ];
  return (
    <table style={{ borderCollapse: 'collapse', fontSize: 13 }}>
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k}>
            <td style={{ padding: '4px 14px 4px 0', color: '#555' }}>{k}</td>
            <td style={{ padding: '4px 0', fontFamily: 'ui-monospace, monospace' }}>{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step: number;
  min: number;
  max: number;
}) {
  return (
    <label style={{ fontSize: 13, color: '#555' }}>
      <div>{label}</div>
      <input
        type="number"
        value={value}
        step={step}
        min={min}
        max={max}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isNaN(n)) onChange(n);
        }}
        style={{ width: 100, padding: '4px 6px', marginTop: 2 }}
      />
    </label>
  );
}

function SelectField<T extends number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: T[];
  onChange: (v: T) => void;
}) {
  return (
    <label style={{ fontSize: 13, color: '#555' }}>
      <div>{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value) as T)}
        style={{ padding: '4px 6px', marginTop: 2 }}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
