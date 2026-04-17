import type { ChaoContour, SandhiKind, Syllable, ToneId } from './model';
import { HALF_THIRD_CONTOUR, TONE_CONTOURS, neutralContourAfter } from './contours';

export interface SandhiResult {
  surfaceContours: ChaoContour[];
  surfaceTones: ToneId[];
  sandhi?: SandhiKind;
}

function applyYi(syllables: Syllable[]): SandhiResult | null {
  if (syllables.length !== 2) return null;
  const [first, second] = syllables;
  if (first.hanzi !== '一') return null;
  const newTone: ToneId = second.tone === 4 ? 2 : 4;
  return {
    surfaceTones: [newTone, second.tone],
    surfaceContours: [contourFor(newTone, undefined), contourFor(second.tone, newTone)],
    sandhi: 'yi',
  };
}

function applyBu(syllables: Syllable[]): SandhiResult | null {
  if (syllables.length !== 2) return null;
  const [first, second] = syllables;
  if (first.hanzi !== '不') return null;
  const newTone: ToneId = second.tone === 4 ? 2 : 4;
  return {
    surfaceTones: [newTone, second.tone],
    surfaceContours: [contourFor(newTone, undefined), contourFor(second.tone, newTone)],
    sandhi: 'bu',
  };
}

function applyThirdThird(syllables: Syllable[]): SandhiResult | null {
  if (syllables.length !== 2) return null;
  const [a, b] = syllables;
  if (a.tone !== 3 || b.tone !== 3) return null;
  return {
    surfaceTones: [2, 3],
    surfaceContours: [TONE_CONTOURS[2], TONE_CONTOURS[3]],
    sandhi: 'third-third',
  };
}

function applyHalfThird(syllables: Syllable[]): SandhiResult | null {
  if (syllables.length !== 2) return null;
  const [a, b] = syllables;
  if (a.tone !== 3) return null;
  if (b.tone === 3) return null;
  return {
    surfaceTones: [3, b.tone],
    surfaceContours: [HALF_THIRD_CONTOUR, contourFor(b.tone, 3)],
    sandhi: 'half-third',
  };
}

function applyNeutral(syllables: Syllable[]): SandhiResult | null {
  const hasNeutral = syllables.some((s) => s.tone === 0);
  if (!hasNeutral) return null;
  const surfaceTones: ToneId[] = syllables.map((s) => s.tone);
  const surfaceContours: ChaoContour[] = [];
  for (let i = 0; i < syllables.length; i++) {
    const tone = syllables[i].tone;
    if (tone === 0) {
      const prev = i > 0 ? syllables[i - 1].tone : 1;
      surfaceContours.push(neutralContourAfter(prev));
    } else {
      surfaceContours.push(TONE_CONTOURS[tone]);
    }
  }
  return { surfaceTones, surfaceContours, sandhi: 'neutral' };
}

function contourFor(tone: ToneId, prevTone: ToneId | undefined): ChaoContour {
  if (tone === 0) return neutralContourAfter(prevTone ?? 1);
  return TONE_CONTOURS[tone];
}

export function applySandhi(syllables: Syllable[]): SandhiResult {
  const rules = [applyYi, applyBu, applyThirdThird, applyHalfThird, applyNeutral];
  for (const rule of rules) {
    const r = rule(syllables);
    if (r) return r;
  }
  return {
    surfaceTones: syllables.map((s) => s.tone),
    surfaceContours: syllables.map((s, i) =>
      contourFor(s.tone, i > 0 ? syllables[i - 1].tone : undefined),
    ),
  };
}

export function underlyingContours(syllables: Syllable[]): ChaoContour[] {
  return syllables.map((s, i) => contourFor(s.tone, i > 0 ? syllables[i - 1].tone : undefined));
}
