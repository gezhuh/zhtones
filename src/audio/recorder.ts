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

const FRAME_SIZE = 2048;
const HOP_SIZE = 1024;

export async function recordPitch(durationMs: number): Promise<Recording> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      channelCount: 1,
    },
  });

  const ctx = new AudioContext();
  const workletUrl = `${import.meta.env.BASE_URL}pitch-worklet.js`;
  await ctx.audioWorklet.addModule(workletUrl);

  const source = ctx.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(ctx, 'forward-processor');
  source.connect(node);

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
  stream.getTracks().forEach((t) => t.stop());
  await ctx.close();

  return { frames, durationMs, sampleRate };
}
