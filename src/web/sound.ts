let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

/** Short percussive tick, synthesized on the fly (no audio asset) — plays when a tile lands on the chain. */
export function playPlaceSound(): void {
  const audio = getCtx();
  const now = audio.currentTime;

  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(520, now);
  osc.frequency.exponentialRampToValueAtTime(220, now + 0.08);
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

  osc.connect(gain).connect(audio.destination);
  osc.start(now);
  osc.stop(now + 0.12);
}
