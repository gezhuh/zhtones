export interface Calibration {
  fMinHz: number;
  fMaxHz: number;
  fMidHz: number;
  sampleRateHz: number;
  updatedAt: number;
}

const CHAO_MIN = 0.5;
const CHAO_MAX = 5.5;

export function hzToChao(hz: number, cal: Calibration): number {
  if (!isFinite(hz) || hz <= 0) return CHAO_MIN;
  const lo = Math.log2(cal.fMinHz);
  const hi = Math.log2(cal.fMaxHz);
  const span = hi - lo;
  if (span <= 0) return 3;
  const x = Math.log2(hz);
  const v = 1 + (4 * (x - lo)) / span;
  return Math.min(CHAO_MAX, Math.max(CHAO_MIN, v));
}

export function chaoToHz(level: number, cal: Calibration): number {
  const lo = Math.log2(cal.fMinHz);
  const hi = Math.log2(cal.fMaxHz);
  const span = hi - lo;
  const x = lo + ((level - 1) / 4) * span;
  return Math.pow(2, x);
}

export function isPlausibleCalibration(cal: Partial<Calibration>): cal is Calibration {
  if (!cal.fMinHz || !cal.fMaxHz) return false;
  if (cal.fMinHz < 50 || cal.fMinHz > 400) return false;
  if (cal.fMaxHz < cal.fMinHz * 1.2) return false;
  if (cal.fMaxHz > 800) return false;
  return true;
}
