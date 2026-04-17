import { isPlausibleCalibration, type Calibration } from './mapping';

const KEY = 'zhtones.calibration.v1';

export function loadCalibration(): Calibration | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isPlausibleCalibration(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveCalibration(cal: Calibration): void {
  localStorage.setItem(KEY, JSON.stringify(cal));
}

export function clearCalibration(): void {
  localStorage.removeItem(KEY);
}
