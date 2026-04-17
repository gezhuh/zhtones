import type { ChaoContour, ToneId } from './model';

// Citation (isolated) contours. T2 onset is low [2,5] rather than [3,5]; T3
// citation ends around mid [2,1,3] rather than rising to 4.
export const TONE_CONTOURS: Record<Exclude<ToneId, 0>, ChaoContour> = {
  1: [5, 5],
  2: [2, 5],
  3: [2, 1, 3],
  4: [5, 1],
};

// σ₁ T3 before any non-T3 syllable: dip without the final rise.
export const HALF_THIRD_CONTOUR: ChaoContour = [2, 1];

// σ₁ T4 before a full tone: the final fall is truncated (doesn't reach 1).
export const TRUNCATED_T4_CONTOUR: ChaoContour = [5, 3];

// σ₂ T3: drops without the final rise that citation T3 has.
export const FINAL_T3_CONTOUR: ChaoContour = [2, 1];

const NEUTRAL_HEIGHT_AFTER: Record<ToneId, number> = {
  1: 2,
  2: 3,
  3: 4,
  4: 1,
  0: 3,
};

export function neutralContourAfter(prevTone: ToneId): ChaoContour {
  const h = NEUTRAL_HEIGHT_AFTER[prevTone];
  return [h, h];
}

export function baseContour(tone: ToneId, prevTone?: ToneId): ChaoContour {
  if (tone === 0) return neutralContourAfter(prevTone ?? 1);
  return TONE_CONTOURS[tone];
}

export const TONE_LABELS: Record<ToneId, string> = {
  1: '阴平',
  2: '阳平',
  3: '上声',
  4: '去声',
  0: '轻声',
};

export const TONE_COLORS: Record<ToneId, string> = {
  1: '#1f77b4',
  2: '#2ca02c',
  3: '#d62728',
  4: '#9467bd',
  0: '#7f7f7f',
};
