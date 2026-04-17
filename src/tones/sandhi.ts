import type { ChaoContour, SandhiKind, Syllable, ToneId } from './model';
import {
  FINAL_T3_CONTOUR,
  HALF_THIRD_CONTOUR,
  TONE_CONTOURS,
  TRUNCATED_T4_CONTOUR,
  neutralContourAfter,
} from './contours';

export interface SandhiResult {
  surfaceContours: ChaoContour[];
  surfaceTones: ToneId[];
  sandhi?: SandhiKind;
}

type Position = 'only' | 'first' | 'second';

// Resolve the surface contour for a single syllable given its position in the
// word and (for disyllables) the partner tone. Encodes the positional variants
// that citation contours don't cover:
//   σ₁ T3 before T3       → T2 onset [2,5]   (handled by caller via surfaceTones)
//   σ₁ T3 before non-T3   → half-third [2,1]
//   σ₁ T4 before full     → truncated [5,3]
//   σ₂ T3                 → final T3 [2,1]   (no upturn)
function contourByPosition(
  tone: ToneId,
  position: Position,
  partner: ToneId | undefined,
): ChaoContour {
  if (tone === 0) return neutralContourAfter(partner ?? 1);
  if (position === 'first') {
    if (tone === 3) {
      return partner === 3 ? TONE_CONTOURS[2] : HALF_THIRD_CONTOUR;
    }
    if (tone === 4 && partner !== undefined && partner !== 0) {
      return TRUNCATED_T4_CONTOUR;
    }
    return TONE_CONTOURS[tone];
  }
  if (position === 'second') {
    if (tone === 3) return FINAL_T3_CONTOUR;
    return TONE_CONTOURS[tone];
  }
  return TONE_CONTOURS[tone];
}

function buildContours(surfaceTones: ToneId[]): ChaoContour[] {
  if (surfaceTones.length === 1) {
    return [contourByPosition(surfaceTones[0], 'only', undefined)];
  }
  if (surfaceTones.length === 2) {
    const [a, b] = surfaceTones;
    return [
      contourByPosition(a, 'first', b),
      contourByPosition(b, 'second', a),
    ];
  }
  return surfaceTones.map((t, i) => {
    const position: Position = i === 0 ? 'first' : 'second';
    const partner = i === 0 ? surfaceTones[1] : surfaceTones[i - 1];
    return contourByPosition(t, position, partner);
  });
}

function classify(syllables: Syllable[]): { surfaceTones: ToneId[]; sandhi?: SandhiKind } {
  const tones = syllables.map((s) => s.tone);

  if (syllables.length === 2) {
    const [first, second] = syllables;

    if (first.hanzi === '一') {
      const newTone: ToneId = second.tone === 4 ? 2 : 4;
      return { surfaceTones: [newTone, second.tone], sandhi: 'yi' };
    }

    if (first.hanzi === '不') {
      const newTone: ToneId = second.tone === 4 ? 2 : 4;
      return { surfaceTones: [newTone, second.tone], sandhi: 'bu' };
    }

    if (first.tone === 3 && second.tone === 3) {
      return { surfaceTones: [2, 3], sandhi: 'third-third' };
    }

    if (first.tone === 3 && second.tone !== 3) {
      return { surfaceTones: [3, second.tone], sandhi: 'half-third' };
    }

    if (tones.some((t) => t === 0)) {
      return { surfaceTones: tones, sandhi: 'neutral' };
    }

    if (first.tone === 4 && second.tone !== 0) {
      return { surfaceTones: [4, second.tone], sandhi: 't4-truncation' };
    }

    return { surfaceTones: tones };
  }

  if (tones.some((t) => t === 0)) {
    return { surfaceTones: tones, sandhi: 'neutral' };
  }

  return { surfaceTones: tones };
}

export function applySandhi(syllables: Syllable[]): SandhiResult {
  const { surfaceTones, sandhi } = classify(syllables);
  return {
    surfaceTones,
    surfaceContours: buildContours(surfaceTones),
    sandhi,
  };
}

export function underlyingContours(syllables: Syllable[]): ChaoContour[] {
  return syllables.map((s, i) => {
    if (s.tone === 0) {
      const prev = i > 0 ? syllables[i - 1].tone : 1;
      return neutralContourAfter(prev);
    }
    return TONE_CONTOURS[s.tone];
  });
}
