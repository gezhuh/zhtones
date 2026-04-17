import { useState } from 'react';

interface Props {
  durationMs: number;
  onRecorded: (durationMs: number) => Promise<void> | void;
  disabled?: boolean;
  label?: string;
}

export function RecordButton({ durationMs, onRecorded, disabled, label = 'Record' }: Props) {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (recording) return;
    setError(null);
    setRecording(true);
    try {
      await onRecorded(durationMs);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRecording(false);
    }
  }

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || recording}
        style={{
          padding: '10px 18px',
          fontSize: 16,
          background: recording ? '#d62728' : '#222',
          color: 'white',
          border: 'none',
          borderRadius: 6,
          cursor: disabled || recording ? 'default' : 'pointer',
        }}
      >
        {recording ? `● recording ${(durationMs / 1000).toFixed(1)}s…` : label}
      </button>
      {error && (
        <span style={{ color: '#d62728', fontSize: 12, marginTop: 4 }}>{error}</span>
      )}
    </div>
  );
}
