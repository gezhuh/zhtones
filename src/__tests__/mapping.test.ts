import { describe, it, expect } from 'vitest';
import { chaoToHz, hzToChao, isPlausibleCalibration, type Calibration } from '../calibration/mapping';

const cal: Calibration = {
  fMinHz: 100,
  fMaxHz: 250,
  fMidHz: 160,
  sampleRateHz: 48000,
  updatedAt: 0,
};

describe('hz<->chao mapping', () => {
  it('maps fMin to 1 and fMax to 5', () => {
    expect(hzToChao(cal.fMinHz, cal)).toBeCloseTo(1, 5);
    expect(hzToChao(cal.fMaxHz, cal)).toBeCloseTo(5, 5);
  });

  it('round-trips chao -> hz -> chao', () => {
    for (const level of [1, 2, 3, 4, 5]) {
      const hz = chaoToHz(level, cal);
      expect(hzToChao(hz, cal)).toBeCloseTo(level, 5);
    }
  });

  it('clamps below fMin and above fMax to the [0.5, 5.5] window', () => {
    expect(hzToChao(10, cal)).toBe(0.5);
    expect(hzToChao(10000, cal)).toBe(5.5);
  });

  it('handles zero / NaN gracefully', () => {
    expect(hzToChao(0, cal)).toBe(0.5);
    expect(hzToChao(Number.NaN, cal)).toBe(0.5);
  });
});

describe('isPlausibleCalibration', () => {
  it('accepts a normal calibration', () => {
    expect(isPlausibleCalibration(cal)).toBe(true);
  });
  it('rejects too-narrow ranges', () => {
    expect(isPlausibleCalibration({ ...cal, fMaxHz: 110 })).toBe(false);
  });
  it('rejects out-of-range values', () => {
    expect(isPlausibleCalibration({ ...cal, fMinHz: 30 })).toBe(false);
    expect(isPlausibleCalibration({ ...cal, fMaxHz: 1000 })).toBe(false);
  });
});
