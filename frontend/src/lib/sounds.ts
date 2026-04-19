// Web Audio API — no external files needed

// Cached context — reuse so it doesn't get garbage-collected or suspended between plays
let _ctx: AudioContext | null = null;

const getCtx = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  if (!_ctx) {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    _ctx = Ctx ? new Ctx() : null;
  }
  // Resume if browser suspended it due to inactivity
  if (_ctx && _ctx.state === 'suspended') {
    _ctx.resume();
  }
  return _ctx;
};

/** Win sound — ascending chime (3 rising tones) */
export const playWinSound = () => {
  const ctx = getCtx();
  if (!ctx) return;

  const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.18);

    gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.18);
    gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + i * 0.18 + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.5);

    osc.start(ctx.currentTime + i * 0.18);
    osc.stop(ctx.currentTime + i * 0.18 + 0.5);
  });
};

/** Loss sound — descending dull tones */
export const playLossSound = () => {
  const ctx = getCtx();
  if (!ctx) return;

  const notes = [220, 180, 140]; // descending low tones
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.22);

    gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.22);
    gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + i * 0.22 + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.22 + 0.55);

    osc.start(ctx.currentTime + i * 0.22);
    osc.stop(ctx.currentTime + i * 0.22 + 0.55);
  });
};
