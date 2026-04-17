import { describe, it, expect } from 'vitest';
import { applySandhi, underlyingContours } from '../tones/sandhi';
import {
  FINAL_T3_CONTOUR,
  HALF_THIRD_CONTOUR,
  TONE_CONTOURS,
  TRUNCATED_T4_CONTOUR,
} from '../tones/contours';
import type { Syllable } from '../tones/model';

const syl = (hanzi: string, pinyin: string, tone: Syllable['tone']): Syllable => ({
  hanzi,
  pinyin,
  tone,
});

describe('sandhi', () => {
  it('T3 + T3 surfaces as T2 + T3 with final T3 contour', () => {
    const r = applySandhi([syl('你', 'nǐ', 3), syl('好', 'hǎo', 3)]);
    expect(r.sandhi).toBe('third-third');
    expect(r.surfaceTones).toEqual([2, 3]);
    expect(r.surfaceContours[0]).toEqual(TONE_CONTOURS[2]);
    expect(r.surfaceContours[1]).toEqual(FINAL_T3_CONTOUR);
  });

  it('T3 + non-T3 becomes half-third + non-T3', () => {
    const r = applySandhi([syl('老', 'lǎo', 3), syl('师', 'shī', 1)]);
    expect(r.sandhi).toBe('half-third');
    expect(r.surfaceContours[0]).toEqual(HALF_THIRD_CONTOUR);
    expect(r.surfaceContours[1]).toEqual(TONE_CONTOURS[1]);
  });

  it('一 before T4 becomes T2', () => {
    const r = applySandhi([syl('一', 'yī', 1), syl('个', 'gè', 4)]);
    expect(r.sandhi).toBe('yi');
    expect(r.surfaceTones).toEqual([2, 4]);
    expect(r.surfaceContours[0]).toEqual(TONE_CONTOURS[2]);
    expect(r.surfaceContours[1]).toEqual(TONE_CONTOURS[4]);
  });

  it('一 before T1/T2/T3 becomes truncated T4', () => {
    const before1 = applySandhi([syl('一', 'yī', 1), syl('天', 'tiān', 1)]);
    const before2 = applySandhi([syl('一', 'yī', 1), syl('年', 'nián', 2)]);
    const before3 = applySandhi([syl('一', 'yī', 1), syl('起', 'qǐ', 3)]);
    expect(before1.surfaceTones[0]).toBe(4);
    expect(before2.surfaceTones[0]).toBe(4);
    expect(before3.surfaceTones[0]).toBe(4);
    expect(before1.surfaceContours[0]).toEqual(TRUNCATED_T4_CONTOUR);
    expect(before1.surfaceContours[1]).toEqual(TONE_CONTOURS[1]);
    expect(before3.surfaceContours[1]).toEqual(FINAL_T3_CONTOUR);
  });

  it('不 before T4 becomes T2; otherwise stays T4 (truncated)', () => {
    const r1 = applySandhi([syl('不', 'bù', 4), syl('要', 'yào', 4)]);
    const r2 = applySandhi([syl('不', 'bù', 4), syl('来', 'lái', 2)]);
    expect(r1.sandhi).toBe('bu');
    expect(r1.surfaceTones).toEqual([2, 4]);
    expect(r1.surfaceContours[0]).toEqual(TONE_CONTOURS[2]);
    expect(r1.surfaceContours[1]).toEqual(TONE_CONTOURS[4]);
    expect(r2.sandhi).toBe('bu');
    expect(r2.surfaceTones).toEqual([4, 2]);
    expect(r2.surfaceContours[0]).toEqual(TRUNCATED_T4_CONTOUR);
    expect(r2.surfaceContours[1]).toEqual(TONE_CONTOURS[2]);
  });

  it('T4 before a full tone truncates its fall', () => {
    const r = applySandhi([syl('汉', 'hàn', 4), syl('语', 'yǔ', 3)]);
    expect(r.sandhi).toBe('t4-truncation');
    expect(r.surfaceTones).toEqual([4, 3]);
    expect(r.surfaceContours[0]).toEqual(TRUNCATED_T4_CONTOUR);
    expect(r.surfaceContours[1]).toEqual(FINAL_T3_CONTOUR);

    const r2 = applySandhi([syl('电', 'diàn', 4), syl('话', 'huà', 4)]);
    expect(r2.sandhi).toBe('t4-truncation');
    expect(r2.surfaceContours[0]).toEqual(TRUNCATED_T4_CONTOUR);
    expect(r2.surfaceContours[1]).toEqual(TONE_CONTOURS[4]);
  });

  it('T4 before T0 keeps the full fall', () => {
    const r = applySandhi([syl('爸', 'bà', 4), syl('爸', 'ba', 0)]);
    expect(r.sandhi).toBe('neutral');
    expect(r.surfaceContours[0]).toEqual(TONE_CONTOURS[4]);
  });

  it('neutral tone height depends on previous tone', () => {
    const after1 = applySandhi([syl('妈', 'mā', 1), syl('妈', 'ma', 0)]);
    const after4 = applySandhi([syl('爸', 'bà', 4), syl('爸', 'ba', 0)]);
    expect(after1.sandhi).toBe('neutral');
    expect(after1.surfaceContours[1][0]).toBeLessThan(after4.surfaceContours[1][0] + 5);
    expect(after4.surfaceContours[1][0]).toBe(1);
  });

  it('underlying contours preserve the dictionary tones', () => {
    const u = underlyingContours([syl('你', 'nǐ', 3), syl('好', 'hǎo', 3)]);
    expect(u[0]).toEqual(TONE_CONTOURS[3]);
    expect(u[1]).toEqual(TONE_CONTOURS[3]);
  });

  it('falls through with no sandhi tag for unrelated pairs', () => {
    const r = applySandhi([syl('今', 'jīn', 1), syl('天', 'tiān', 1)]);
    expect(r.sandhi).toBeUndefined();
    expect(r.surfaceTones).toEqual([1, 1]);
    expect(r.surfaceContours[0]).toEqual(TONE_CONTOURS[1]);
    expect(r.surfaceContours[1]).toEqual(TONE_CONTOURS[1]);
  });
});
