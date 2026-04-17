import { Link } from 'react-router-dom';
import { clearCalibration } from '../calibration/store';
import type { Calibration } from '../calibration/mapping';

interface Props {
  cal: Calibration | null;
  onChange: () => void;
}

export function Settings({ cal, onChange }: Props) {
  function reset() {
    if (!confirm('Clear saved calibration?')) return;
    clearCalibration();
    onChange();
  }
  return (
    <div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Calibration</h3>
        {cal ? (
          <ul className="muted" style={{ lineHeight: 1.8 }}>
            <li>fMin: <strong>{cal.fMinHz.toFixed(1)} Hz</strong></li>
            <li>fMid: <strong>{cal.fMidHz.toFixed(1)} Hz</strong></li>
            <li>fMax: <strong>{cal.fMaxHz.toFixed(1)} Hz</strong></li>
            <li>updated: <strong>{new Date(cal.updatedAt).toLocaleString()}</strong></li>
          </ul>
        ) : (
          <p className="muted">No calibration saved.</p>
        )}
        <div className="row">
          <Link to="/calibrate" className="secondary" style={btn('secondary')}>
            Re-run calibration
          </Link>
          <button className="secondary" onClick={reset} disabled={!cal}>
            Clear calibration
          </button>
        </div>
      </div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>About</h3>
        <p className="muted">
          Reference audio uses your browser's <code>SpeechSynthesis</code> with{' '}
          <code>zh-CN</code>. Pitch detection runs locally with{' '}
          <a href="https://github.com/ianprime0509/pitchy" target="_blank" rel="noreferrer">
            pitchy
          </a>{' '}
          (YIN) inside an AudioWorklet.
        </p>
      </div>
    </div>
  );
}

function btn(kind: 'primary' | 'secondary'): React.CSSProperties {
  return {
    display: 'inline-block',
    textDecoration: 'none',
    padding: '8px 14px',
    background: kind === 'primary' ? '#1f6feb' : '#f1f3f5',
    color: kind === 'primary' ? 'white' : '#222',
    border: '1px solid #dde1e5',
    borderRadius: 6,
    fontSize: 14,
  };
}
