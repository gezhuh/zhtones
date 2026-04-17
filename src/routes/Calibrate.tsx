import { useState } from 'react';
import { recordPitch } from '../audio/recorder';
import { medianHzInRange } from '../audio/pitchTrack';
import { saveCalibration } from '../calibration/store';
import { isPlausibleCalibration, type Calibration } from '../calibration/mapping';
import { RecordButton } from '../ui/RecordButton';

type Step = 'low' | 'mid' | 'high';

const STEPS: { id: Step; title: string; help: string; vowel: string }[] = [
  {
    id: 'low',
    title: '1. Comfortable LOW pitch',
    help: 'Sustain a low "uhhh" — the lowest note you can hold without straining.',
    vowel: 'uhhh',
  },
  {
    id: 'mid',
    title: '2. Comfortable MIDDLE pitch',
    help: 'Sustain a relaxed "ahhh" at your normal speaking pitch.',
    vowel: 'ahhh',
  },
  {
    id: 'high',
    title: '3. Comfortable HIGH pitch',
    help: 'Sustain an "eee" — high but still comfortable.',
    vowel: 'eee',
  },
];

interface Props {
  onSaved: () => void;
}

export function Calibrate({ onSaved }: Props) {
  const [readings, setReadings] = useState<Partial<Record<Step, number>>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function record(step: Step) {
    setError(null);
    setSaved(false);
    const rec = await recordPitch(2200);
    const result = medianHzInRange(rec);
    if (result.medianHz == null) {
      if (result.totalFrames === 0) {
        setError(
          "No audio reached the pitch detector. Check mic permission and that the tab's mic isn't muted.",
        );
      } else if (result.peakRms < 0.004) {
        setError(
          `Mic signal is very quiet (peak RMS ${result.peakRms.toFixed(4)}). Speak louder, move closer, or raise the input gain in your OS settings.`,
        );
      } else {
        setError(
          `Captured ${result.totalFrames} frames but none passed the voiced-pitch filter (peak RMS ${result.peakRms.toFixed(3)}). Try holding a steady vowel for the full 2 seconds.`,
        );
      }
      return;
    }
    setReadings((prev) => ({ ...prev, [step]: result.medianHz! }));
  }

  const haveAll = readings.low && readings.mid && readings.high;

  function save() {
    if (!haveAll) return;
    const lo = Math.min(readings.low!, readings.mid!, readings.high!);
    const hi = Math.max(readings.low!, readings.mid!, readings.high!);
    const mid = readings.mid!;
    const cal: Calibration = {
      fMinHz: lo,
      fMaxHz: hi,
      fMidHz: mid,
      sampleRateHz: 48000,
      updatedAt: Date.now(),
    };
    if (!isPlausibleCalibration(cal)) {
      setError(
        `That range looks off (low ${lo.toFixed(1)} Hz, high ${hi.toFixed(1)} Hz). Try again, exaggerating the difference between low and high.`,
      );
      return;
    }
    saveCalibration(cal);
    setSaved(true);
    onSaved();
  }

  return (
    <div>
      <p className="muted">
        Record three sustained vowels so the staff can map your voice onto the 1–5 Chao scale.
        Each take is ~2 seconds.
      </p>
      {STEPS.map((step) => {
        const reading = readings[step.id];
        return (
          <div className="card" key={step.id}>
            <h3 style={{ marginTop: 0 }}>{step.title}</h3>
            <p className="muted">{step.help}</p>
            <div className="row">
              <RecordButton
                durationMs={2200}
                onRecorded={() => record(step.id)}
                label={reading ? `Re-record "${step.vowel}"` : `Record "${step.vowel}"`}
              />
              {reading != null && (
                <span className="muted">
                  median: <strong>{reading.toFixed(1)} Hz</strong>
                </span>
              )}
            </div>
          </div>
        );
      })}
      <div className="card">
        <div className="row">
          <button
            className="primary"
            onClick={save}
            disabled={!haveAll}
            style={{
              padding: '10px 18px',
              fontSize: 16,
              background: haveAll ? '#1f6feb' : '#999',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: haveAll ? 'pointer' : 'default',
            }}
          >
            Save calibration
          </button>
          {saved && <span style={{ color: '#2ca02c' }}>Saved.</span>}
          {error && <span style={{ color: '#d62728' }}>{error}</span>}
        </div>
      </div>
    </div>
  );
}
