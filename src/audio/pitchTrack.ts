import type { Calibration } from '../calibration/mapping';
import { hzToChao } from '../calibration/mapping';
import type { PitchFrame, Recording } from './recorder';

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
  rmsFloor?: number;
  rmsQuantile?: number;
  rmsQuantileFactor?: number;
  minHz?: number;
  maxHz?: number;
}

function quantile(sortedAsc: number[], q: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = q * (sortedAsc.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.min(sortedAsc.length - 1, lo + 1);
  const frac = idx - lo;
  return sortedAsc[lo] * (1 - frac) + sortedAsc[hi] * frac;
}

// Adaptive voiced-frame gate: a frame counts as speech if its RMS exceeds
// `max(floor, recordingQuantile * factor)`. The quantile (default p95) tracks
// "typical loud" without being swayed by a single transient; the floor keeps
// an all-silence recording from passing its own noise through.
export function adaptiveRmsThreshold(
  frames: PitchFrame[],
  floor: number,
  q: number,
  factor: number,
): number {
  if (frames.length === 0) return floor;
  const sorted = frames.map((f) => f.rms).sort((a, b) => a - b);
  return Math.max(floor, quantile(sorted, q) * factor);
}

// Voiced nasal/liquid onsets (m, n, l) pass clarity + RMS gates but their F0
// hasn't locked onto the tone yet, so they smear the start of the contour.
// Skip leading frames until three consecutive frames stay inside a ~1-semitone
// window; cap the trim so we never eat into a genuine T2 rise.
const ONSET_WINDOW = 3;
const ONSET_SEMITONES = 1;
const ONSET_RATIO = Math.pow(2, ONSET_SEMITONES / 12);
const MAX_ONSET_TRIM_MS = 80;

function findOnsetStableIndex(frames: { t: number; hz: number }[]): number {
  if (frames.length < ONSET_WINDOW) return 0;
  const cap = frames[0].t + MAX_ONSET_TRIM_MS / 1000;
  for (let i = 0; i + ONSET_WINDOW <= frames.length; i++) {
    if (frames[i].t > cap) return i;
    let lo = Infinity;
    let hi = 0;
    for (let k = i; k < i + ONSET_WINDOW; k++) {
      if (frames[k].hz < lo) lo = frames[k].hz;
      if (frames[k].hz > hi) hi = frames[k].hz;
    }
    if (lo > 0 && hi / lo <= ONSET_RATIO) return i;
  }
  return 0;
}

export function trackChao(
  rec: Recording,
  cal: Calibration,
  opts: TrackOptions = {},
): ChaoTrack {
  const clarityT = opts.clarityThreshold ?? 0.75;
  const rmsFloor = opts.rmsFloor ?? 0.002;
  const rmsQ = opts.rmsQuantile ?? 0.95;
  const rmsFactor = opts.rmsQuantileFactor ?? 0.15;
  const minHz = opts.minHz ?? 60;
  const maxHz = opts.maxHz ?? 600;
  const rmsT = adaptiveRmsThreshold(rec.frames, rmsFloor, rmsQ, rmsFactor);

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

  const onsetIdx = findOnsetStableIndex(smoothed);
  const trimmed = smoothed.slice(onsetIdx);
  if (trimmed.length === 0) return { frames: [], durationMs: 0 };

  const t0 = trimmed[0].t;
  const tEnd = trimmed[trimmed.length - 1].t;
  return {
    frames: trimmed.map((f) => ({
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
  rmsThreshold: number;
}

export function medianHzInRange(rec: Recording, opts: TrackOptions = {}): MedianResult {
  const clarityT = opts.clarityThreshold ?? 0.8;
  const rmsFloor = opts.rmsFloor ?? 0.003;
  const rmsQ = opts.rmsQuantile ?? 0.95;
  const rmsFactor = opts.rmsQuantileFactor ?? 0.2;
  const minHz = opts.minHz ?? 60;
  const maxHz = opts.maxHz ?? 600;
  const rmsT = adaptiveRmsThreshold(rec.frames, rmsFloor, rmsQ, rmsFactor);

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
    rmsThreshold: rmsT,
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
