// Synthesized SFX via Web Audio API — no external files needed.
// Shared across cassino games for consistent audio feedback.

let audioCtx: AudioContext | null = null;

function getAudio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      const W = window as unknown as {
        AudioContext?: typeof AudioContext;
        webkitAudioContext?: typeof AudioContext;
      };
      const Ctor = W.AudioContext ?? W.webkitAudioContext;
      if (Ctor) audioCtx = new Ctor();
    } catch {
      /* ignore */
    }
  }
  if (audioCtx?.state === "suspended") audioCtx.resume().catch(() => {});
  return audioCtx;
}

// Short percussive click — generic UI feedback, dice roll, etc.
export function playClick() {
  const ctx = getAudio();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(700 + Math.random() * 200, now);
  osc.frequency.exponentialRampToValueAtTime(280, now + 0.05);
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(0.16, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.08);
}

// Cheerful win chime — ascending notes
export function playWin() {
  const ctx = getAudio();
  if (!ctx) return;
  const now = ctx.currentTime;
  [
    { f: 660, t: 0 },
    { f: 880, t: 0.09 },
    { f: 1320, t: 0.18 },
  ].forEach(({ f, t }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(f, now + t);
    gain.gain.setValueAtTime(0.001, now + t);
    gain.gain.exponentialRampToValueAtTime(0.22, now + t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.18);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + t);
    osc.stop(now + t + 0.2);
  });
}

// Subtle descending tone — generic loss
export function playLose() {
  const ctx = getAudio();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(300, now);
  osc.frequency.exponentialRampToValueAtTime(110, now + 0.32);
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(0.16, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.4);
}

// Explosion — used for mines bomb, crash bust
export function playExplosion() {
  const ctx = getAudio();
  if (!ctx) return;
  const now = ctx.currentTime;
  // Noise burst via short buffer
  const bufferSize = Math.floor(ctx.sampleRate * 0.45);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.4, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1200, now);
  filter.frequency.exponentialRampToValueAtTime(200, now + 0.4);
  noise.connect(filter).connect(noiseGain).connect(ctx.destination);
  noise.start(now);
  noise.stop(now + 0.45);

  // Low-end thump
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(120, now);
  osc.frequency.exponentialRampToValueAtTime(35, now + 0.3);
  oscGain.gain.setValueAtTime(0.001, now);
  oscGain.gain.exponentialRampToValueAtTime(0.5, now + 0.01);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  osc.connect(oscGain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.4);
}

// Coin / cashout — bright pop with shimmer
export function playCashout() {
  const ctx = getAudio();
  if (!ctx) return;
  const now = ctx.currentTime;
  [
    { f: 880, t: 0 },
    { f: 1175, t: 0.06 },
    { f: 1568, t: 0.12 },
  ].forEach(({ f, t }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(f, now + t);
    gain.gain.setValueAtTime(0.001, now + t);
    gain.gain.exponentialRampToValueAtTime(0.2, now + t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.16);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + t);
    osc.stop(now + t + 0.18);
  });
}

// Reveal / safe pick — short bright ping
export function playReveal() {
  const ctx = getAudio();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(1050, now);
  osc.frequency.exponentialRampToValueAtTime(1400, now + 0.1);
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(0.18, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.2);
}

// Rising tick — used for crash multiplier ascending tension
export function playTick() {
  const ctx = getAudio();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(420, now);
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(0.06, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.05);
}

// Spinning / countdown tick — softer than playTick
export function playSpinTick() {
  const ctx = getAudio();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(550, now);
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(0.09, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.06);
}

// Reel clicks — schedules one click per slot crossing the marker.
// `slotTimesSec` is an ordered list of times (relative to now) when each slot
// passes the line. Caller computes these from the same easing curve as the
// reel animation, so audio and visual stay in sync. Returns a stop function.
export function playReelClicks(slotTimesSec: number[]): () => void {
  const ctx = getAudio();
  if (!ctx) return () => {};
  const now = ctx.currentTime;
  const oscs: { osc: OscillatorNode; gain: GainNode }[] = [];

  slotTimesSec.forEach((t, i) => {
    const at = now + t;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    // Slight pitch wobble keeps consecutive clicks from sounding identical.
    const freq = 320 + ((i * 37) % 90);
    osc.frequency.setValueAtTime(freq, at);
    osc.frequency.exponentialRampToValueAtTime(110, at + 0.035);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.07, at + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.045);
    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + 0.05);
    oscs.push({ osc, gain });
  });

  return () => {
    oscs.forEach(({ osc, gain }) => {
      try {
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        osc.stop(ctx.currentTime + 0.01);
      } catch {
        /* already stopped */
      }
    });
  };
}

// Continuous spinning sound — rhythmic clicks like a slot reel.
// Returns a stop function. Frequency of clicks slows over time as a deceleration cue.
export function playSpinning(durationSec: number): () => void {
  const ctx = getAudio();
  if (!ctx) return () => {};
  const now = ctx.currentTime;
  const stopAt = now + durationSec;
  const oscs: { osc: OscillatorNode; gain: GainNode }[] = [];

  // Schedule clicks: start fast (every 60ms), slow down to ~180ms by the end.
  let t = 0;
  while (now + t < stopAt) {
    const progress = t / durationSec; // 0..1
    const interval = 0.06 + progress * 0.12; // 60ms → 180ms

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    const freq = 200 + Math.random() * 60;
    osc.frequency.setValueAtTime(freq, now + t);
    osc.frequency.exponentialRampToValueAtTime(80, now + t + 0.04);
    gain.gain.setValueAtTime(0.001, now + t);
    gain.gain.exponentialRampToValueAtTime(0.08, now + t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.045);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + t);
    osc.stop(now + t + 0.05);
    oscs.push({ osc, gain });

    t += interval;
  }

  return () => {
    oscs.forEach(({ osc, gain }) => {
      try {
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        osc.stop(ctx.currentTime + 0.01);
      } catch {
        /* already stopped */
      }
    });
  };
}

// Bet placed confirmation — short, neutral
export function playBetPlaced() {
  const ctx = getAudio();
  if (!ctx) return;
  const now = ctx.currentTime;
  [
    { f: 520, t: 0 },
    { f: 780, t: 0.05 },
  ].forEach(({ f, t }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(f, now + t);
    gain.gain.setValueAtTime(0.001, now + t);
    gain.gain.exponentialRampToValueAtTime(0.18, now + t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.12);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + t);
    osc.stop(now + t + 0.14);
  });
}
