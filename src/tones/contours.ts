import type { ChaoContour, ToneId } from './model';

export const TONE_CONTOURS: Record<Exclude<ToneId, 0>, ChaoContour> = {
  1: [5, 5],
  2: [3, 5],
  3: [2, 1, 4],
  4: [5, 1],
};

export const HALF_THIRD_CONTOUR: ChaoContour = [2, 1];

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
