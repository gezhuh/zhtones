import { TONE_COLORS, TONE_LABELS } from '../tones/contours';
import type { ToneId } from '../tones/model';

export function TonePill({ tone, small = false }: { tone: ToneId; small?: boolean }) {
  const color = TONE_COLORS[tone];
  const label = `T${tone === 0 ? '0' : tone}`;
  return (
    <span
      title={TONE_LABELS[tone]}
      style={{
        display: 'inline-block',
        background: color,
        color: 'white',
        padding: small ? '1px 6px' : '2px 10px',
        borderRadius: 999,
        fontSize: small ? 11 : 13,
        fontWeight: 600,
        lineHeight: 1.4,
      }}
    >
      {label}
    </span>
  );
}
