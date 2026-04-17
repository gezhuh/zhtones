import type { Calibration } from '../calibration/mapping';
import { hzToChao } from '../calibration/mapping';
import type { Recording } from './recorder';

export interface ChaoFrame {
  t: number;
  chao: number;
  clarity: number;
}

export interface ChaoTrack {
  frames: ChaoFrame[];
  durationMs: number;
}

export interface TrackOptions {
  clarityThreshold?: number;
  rmsThreshold?: number;
  minHz?: number;
  maxHz?: number;
}

export function trackChao(
  rec: Recording,
  cal: Calibration,
  opts: TrackOptions = {},
): ChaoTrack {
  const clarityT = opts.clarityThreshold ?? 0.75;
  const rmsT = opts.rmsThreshold ?? 0.003;
  const minHz = opts.minHz ?? 60;
  const maxHz = opts.maxHz ?? 600;

  const voiced = rec.frames.filter(
    (f) => f.clarity >= clarityT && f.rms >= rmsT && f.hz >= minHz && f.hz <= maxHz,
  );
  if (voiced.length === 0) return { frames: [], durationMs: 0 };

  const smoothed = voiced.map((_, i) => {
    const lo = Math.max(0, i - 1);
    const hi = Math.min(voiced.length - 1, i + 1);
    const sortedHz = [voiced[lo].hz, voiced[i].hz, voiced[hi].hz].sort((a, b) => a - b);
    return { ...voiced[i], hz: sortedHz[1] };
  });

  const t0 = smoothed[0].t;
  const tEnd = smoothed[smoothed.length - 1].t;
  return {
    frames: smoothed.map((f) => ({
      t: f.t - t0,
      chao: hzToChao(f.hz, cal),
      clarity: f.clarity,
    })),
    durationMs: (tEnd - t0) * 1000,
  };
}

export interface MedianResult {
  medianHz: number | null;
  totalFrames: number;
  voicedFrames: number;
  peakRms: number;
}

export function medianHzInRange(rec: Recording, opts: TrackOptions = {}): MedianResult {
  const clarityT = opts.clarityThreshold ?? 0.8;
  const rmsT = opts.rmsThreshold ?? 0.004;
  const minHz = opts.minHz ?? 60;
  const maxHz = opts.maxHz ?? 600;
  const voiced = rec.frames.filter(
    (f) => f.clarity >= clarityT && f.rms >= rmsT && f.hz >= minHz && f.hz <= maxHz,
  );
  const xs = voiced.map((f) => f.hz).sort((a, b) => a - b);
  const peakRms = rec.frames.reduce((m, f) => (f.rms > m ? f.rms : m), 0);
  return {
    medianHz: xs.length ? xs[Math.floor(xs.length / 2)] : null,
    totalFrames: rec.frames.length,
    voicedFrames: voiced.length,
    peakRms,
  };
}

export function meanAbsoluteChaoError(track: ChaoTrack, target: number[]): number | null {
  if (track.frames.length === 0 || target.length < 2) return null;
  const duration = track.frames[track.frames.length - 1].t - track.frames[0].t;
  if (duration <= 0) return null;
  let sumErr = 0;
  for (const f of track.frames) {
    const u = (f.t - track.frames[0].t) / duration;
    const idx = u * (target.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.min(target.length - 1, lo + 1);
    const frac = idx - lo;
    const targetChao = target[lo] * (1 - frac) + target[hi] * frac;
    sumErr += Math.abs(f.chao - targetChao);
  }
  return sumErr / track.frames.length;
}
