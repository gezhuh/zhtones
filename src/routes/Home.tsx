import { Link } from 'react-router-dom';

export function Home({ calibrated }: { calibrated: boolean }) {
  return (
    <div>
      <p className="muted">
        Practice Mandarin tones with visual pitch feedback. Pick a drill below.
      </p>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Single character tones</h2>
        <p className="muted">
          Drill 阴平 / 阳平 / 上声 / 去声 / 轻声 on isolated syllables.
        </p>
        <Link to="/single" className="primary" style={linkBtnStyle()}>
          Start single-tone drill →
        </Link>
      </div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Two-character patterns</h2>
        <p className="muted">
          Drill disyllabic patterns including 3+3, 半三声, 一-sandhi, 不-sandhi, and 轻声.
        </p>
        <Link to="/pairs" className="primary" style={linkBtnStyle()}>
          Start pair drill →
        </Link>
      </div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Calibration</h2>
        <p className="muted">
          {calibrated
            ? 'Your pitch range is calibrated. You can re-run calibration any time.'
            : 'Set your low / high / middle pitches so the staff lines up with your voice.'}
        </p>
        <Link to="/calibrate" className="secondary" style={linkBtnStyle('secondary')}>
          {calibrated ? 'Re-run calibration' : 'Calibrate now'}
        </Link>
      </div>
    </div>
  );
}

function linkBtnStyle(kind: 'primary' | 'secondary' = 'primary'): React.CSSProperties {
  return {
    display: 'inline-block',
    textDecoration: 'none',
    padding: kind === 'primary' ? '10px 18px' : '8px 14px',
    background: kind === 'primary' ? '#1f6feb' : '#f1f3f5',
    color: kind === 'primary' ? 'white' : '#222',
    border: kind === 'primary' ? 'none' : '1px solid #dde1e5',
    borderRadius: 6,
    fontSize: kind === 'primary' ? 16 : 14,
  };
}
