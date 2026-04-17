import type { ChaoFrame } from '../audio/pitchTrack';
import type { ChaoContour } from '../tones/model';

interface Props {
  width?: number;
  height?: number;
  targetSurface: ChaoContour[];
  targetUnderlying?: ChaoContour[];
  showUnderlying?: boolean;
  user?: ChaoFrame[];
  autoFit?: boolean;
}

const PAD_X = 24;
const PAD_Y = 10;
const DEFAULT_VIEW_LO = 0;
const DEFAULT_VIEW_HI = 6;

function quantile(sortedAsc: number[], q: number): number {
  const idx = q * (sortedAsc.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.min(sortedAsc.length - 1, lo + 1);
  const frac = idx - lo;
  return sortedAsc[lo] * (1 - frac) + sortedAsc[hi] * frac;
}

function computeView(user: ChaoFrame[] | undefined, autoFit: boolean): [number, number] {
  if (!autoFit || !user || user.length === 0) {
    return [DEFAULT_VIEW_LO, DEFAULT_VIEW_HI];
  }
  const sorted = user.map((f) => f.chao).sort((a, b) => a - b);
  const p2 = quantile(sorted, 0.02);
  const p98 = quantile(sorted, 0.98);
  const lo = Math.min(DEFAULT_VIEW_LO, Math.floor(p2 - 0.3));
  const hi = Math.max(DEFAULT_VIEW_HI, Math.ceil(p98 + 0.3));
  return [lo, hi];
}

function chaoY(level: number, height: number, viewLo: number, viewHi: number): number {
  const usable = height - 2 * PAD_Y;
  const t = (level - viewLo) / (viewHi - viewLo);
  return PAD_Y + (1 - t) * usable;
}

function buildSyllableSegments(contours: ChaoContour[], width: number) {
  if (contours.length === 0) return [];
  const usable = width - 2 * PAD_X;
  const gap = 12;
  const totalGap = gap * (contours.length - 1);
  const segWidth = (usable - totalGap) / contours.length;
  return contours.map((c, i) => {
    const x0 = PAD_X + i * (segWidth + gap);
    return { contour: c, x0, x1: x0 + segWidth };
  });
}

function contourPath(
  contour: ChaoContour,
  x0: number,
  x1: number,
  height: number,
  viewLo: number,
  viewHi: number,
): string {
  if (contour.length === 0) return '';
  const span = x1 - x0;
  return contour
    .map((level, i) => {
      const x = x0 + (i / (contour.length - 1)) * span;
      const y = chaoY(level, height, viewLo, viewHi);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

function userPath(
  frames: ChaoFrame[],
  x0: number,
  x1: number,
  height: number,
  viewLo: number,
  viewHi: number,
): { d: string; pts: { x: number; y: number; opacity: number }[] } {
  if (frames.length === 0) return { d: '', pts: [] };
  const tFirst = frames[0].t;
  const tLast = frames[frames.length - 1].t;
  const span = Math.max(1e-3, tLast - tFirst);
  const xSpan = x1 - x0;
  const pts = frames.map((f) => {
    const u = (f.t - tFirst) / span;
    return {
      x: x0 + u * xSpan,
      y: chaoY(f.chao, height, viewLo, viewHi),
      opacity: Math.max(0, Math.min(1, (f.clarity - 0.7) / 0.3)),
    };
  });
  const d = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  return { d, pts };
}

export function PitchStaff({
  width = 520,
  height = 220,
  targetSurface,
  targetUnderlying,
  showUnderlying = false,
  user,
  autoFit = false,
}: Props) {
  const [viewLo, viewHi] = computeView(user, autoFit);
  const surfaceSegs = buildSyllableSegments(targetSurface, width);
  const underlyingSegs = targetUnderlying
    ? buildSyllableSegments(targetUnderlying, width)
    : [];

  const yTop = chaoY(viewHi, height, viewLo, viewHi);
  const yBottom = chaoY(viewLo, height, viewLo, viewHi);
  const y5 = chaoY(5, height, viewLo, viewHi);
  const y1 = chaoY(1, height, viewLo, viewHi);

  const clipId = 'staff-clip';

  const x0Path = surfaceSegs.length > 0 ? surfaceSegs[0].x0 : PAD_X;
  const x1Path =
    surfaceSegs.length > 0 ? surfaceSegs[surfaceSegs.length - 1].x1 : width - PAD_X;

  return (
    <svg width={width} height={height} role="img" aria-label="pitch contour staff">
      <defs>
        <clipPath id={clipId}>
          <rect x={0} y={0} width={width} height={height} />
        </clipPath>
      </defs>
      <rect x={0} y={0} width={width} height={height} fill="#fafafa" rx={6} />

      {viewHi > 5 && (
        <rect
          x={0}
          y={yTop}
          width={width}
          height={Math.max(0, y5 - yTop)}
          fill="#f0e6f5"
          opacity={0.55}
        />
      )}
      {viewLo < 1 && (
        <rect
          x={0}
          y={y1}
          width={width}
          height={Math.max(0, yBottom - y1)}
          fill="#f0e6f5"
          opacity={0.55}
        />
      )}

      {viewHi > 5 && (
        <text x={width - PAD_X} y={yTop + 12} fontSize={10} fill="#9062ab" textAnchor="end">
          above calibrated range
        </text>
      )}
      {viewLo < 1 && (
        <text x={width - PAD_X} y={yBottom - 4} fontSize={10} fill="#9062ab" textAnchor="end">
          below calibrated range
        </text>
      )}

      {[1, 2, 3, 4, 5].map((lvl) => {
        const y = chaoY(lvl, height, viewLo, viewHi);
        return (
          <g key={lvl}>
            <line
              x1={PAD_X}
              x2={width - PAD_X}
              y1={y}
              y2={y}
              stroke={lvl === 3 ? '#bbb' : '#e3e3e3'}
              strokeDasharray={lvl === 3 ? '4 4' : undefined}
            />
            <text x={6} y={y + 4} fontSize={10} fill="#888">
              {lvl}
            </text>
          </g>
        );
      })}

      <g clipPath={`url(#${clipId})`}>
        {showUnderlying &&
          underlyingSegs.map((seg, i) => (
            <path
              key={`u-${i}`}
              d={contourPath(seg.contour, seg.x0, seg.x1, height, viewLo, viewHi)}
              stroke="#888"
              strokeWidth={2}
              strokeDasharray="3 4"
              fill="none"
              opacity={0.7}
            />
          ))}

        {surfaceSegs.map((seg, i) => (
          <path
            key={`s-${i}`}
            d={contourPath(seg.contour, seg.x0, seg.x1, height, viewLo, viewHi)}
            stroke="#1f77b4"
            strokeWidth={6}
            strokeOpacity={0.35}
            strokeLinecap="round"
            fill="none"
          />
        ))}

        {user &&
          user.length > 1 &&
          (() => {
            const { d, pts } = userPath(user, x0Path, x1Path, height, viewLo, viewHi);
            return (
              <g>
                <path d={d} stroke="#d62728" strokeWidth={2} fill="none" opacity={0.85} />
                {pts.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={1.6}
                    fill="#d62728"
                    opacity={p.opacity}
                  />
                ))}
              </g>
            );
          })()}
      </g>
    </svg>
  );
}
