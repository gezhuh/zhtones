import { PitchDetector } from 'pitchy';

export interface PitchFrame {
  t: number;
  hz: number;
  clarity: number;
  rms: number;
}

export interface Recording {
  frames: PitchFrame[];
  durationMs: number;
  sampleRate: number;
}

const DEFAULT_FRAME_SIZE = 2048;
const DEFAULT_HOP_SIZE = 512;

export interface RecordOptions {
  frameSize?: number;
  hopSize?: number;
}

export async function recordPitch(
  durationMs: number,
  opts: RecordOptions = {},
): Promise<Recording> {
  const FRAME_SIZE = opts.frameSize ?? DEFAULT_FRAME_SIZE;
  const HOP_SIZE = opts.hopSize ?? DEFAULT_HOP_SIZE;

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      channelCount: 1,
    },
  });

  const ctx = new AudioContext();
  if (ctx.state !== 'running') {
    try {
      await ctx.resume();
    } catch {
      /* user gesture is already present; ignore */
    }
  }
  const workletUrl = `${import.meta.env.BASE_URL}pitch-worklet.js`;
  await ctx.audioWorklet.addModule(workletUrl);

  const source = ctx.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(ctx, 'forward-processor');
  // Keep the graph pulled by connecting through a muted gain node to the
  // destination. Without this, some browsers never invoke process() because
  // the audio graph has no path to the speakers.
  const silent = ctx.createGain();
  silent.gain.value = 0;
  source.connect(node);
  node.connect(silent).connect(ctx.destination);

  const sampleRate = ctx.sampleRate;
  const detector = PitchDetector.forFloat32Array(FRAME_SIZE);
  const ring = new Float32Array(FRAME_SIZE);
  let writePos = 0;
  let totalSamples = 0;
  let samplesSinceLastDetect = 0;
  const frames: PitchFrame[] = [];
  node.port.onmessage = (e: MessageEvent<Float32Array>) => {
    const chunk = e.data;
    for (let i = 0; i < chunk.length; i++) {
      ring[writePos] = chunk[i];
      writePos = (writePos + 1) % FRAME_SIZE;
    }
    totalSamples += chunk.length;
    samplesSinceLastDetect += chunk.length;

    while (samplesSinceLastDetect >= HOP_SIZE && totalSamples >= FRAME_SIZE) {
      const linear = new Float32Array(FRAME_SIZE);
      for (let i = 0; i < FRAME_SIZE; i++) {
        linear[i] = ring[(writePos + i) % FRAME_SIZE];
      }
      const [hz, clarity] = detector.findPitch(linear, sampleRate);
      let sumSq = 0;
      for (let i = 0; i < FRAME_SIZE; i++) sumSq += linear[i] * linear[i];
      const rms = Math.sqrt(sumSq / FRAME_SIZE);
      const t = totalSamples / sampleRate - FRAME_SIZE / sampleRate / 2;
      frames.push({ t, hz, clarity, rms });
      samplesSinceLastDetect -= HOP_SIZE;
    }
  };

  await new Promise<void>((resolve) => setTimeout(resolve, durationMs));

  source.disconnect();
  node.disconnect();
  silent.disconnect();
  stream.getTracks().forEach((t) => t.stop());
  await ctx.close();

  return { frames, durationMs, sampleRate };
}
