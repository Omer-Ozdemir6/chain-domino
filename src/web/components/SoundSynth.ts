// Web Audio API Retro Sound Effects Synthesizer
// Synthesizes retro sounds on-the-fly without needing any asset files!

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playSound(
  type: 'place' | 'trigger' | 'pulse' | 'win' | 'loss' | 'discard' | 'gavel' | 'chime' | 'void' | 'devour' | 'rewind',
  pitchOffset = 0
) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    if (type === 'place') {
      // Wood/stone click: high pitch, quick decay, bandpass filtered noise + sine wave
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400 + pitchOffset * 50, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.08);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } 
    else if (type === 'trigger') {
      // Magical upward sweep/arpeggio: 3 rapid sweet notes
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + index * 0.06);

        gain.gain.setValueAtTime(0.0, now + index * 0.06);
        gain.gain.linearRampToValueAtTime(0.12, now + index * 0.06 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.06 + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + index * 0.06);
        osc.stop(now + index * 0.06 + 0.16);
      });
    }
    else if (type === 'pulse') {
      // Retro score rollup sound: quick retro electronic blip
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      // pitch increases with offset
      const baseFreq = 220 + (pitchOffset % 24) * 25;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.06);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.07);
    }
    else if (type === 'win') {
      // Triumphant fanfare arpeggio
      const chord = [261.63, 329.63, 392.00, 523.25, 659.25]; // C major chord notes
      chord.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.0, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.06, now + idx * 0.08 + 0.02);
        gain.gain.setValueAtTime(0.06, now + 0.5);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + 0.85);
      });
    }
    else if (type === 'loss') {
      // Sad descending square wave sweep
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.linearRampToValueAtTime(80, now + 0.65);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.7);
    }
    else if (type === 'discard') {
      // Paper woosh sound: quick white-noise-like frequency sweep
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.22);

      gain.gain.setValueAtTime(0.0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    }
    else if (type === 'gavel') {
      // Küratörün Çekici: a hard, fast-decaying percussive thump (stone splitting in two).
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.13);

      // A second, sharper "crack" transient right after the thump.
      const crack = ctx.createOscillator();
      const crackGain = ctx.createGain();
      crack.type = 'square';
      crack.frequency.setValueAtTime(900, now + 0.03);
      crack.frequency.exponentialRampToValueAtTime(300, now + 0.09);
      crackGain.gain.setValueAtTime(0.1, now + 0.03);
      crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      crack.connect(crackGain);
      crackGain.connect(ctx.destination);
      crack.start(now + 0.03);
      crack.stop(now + 0.1);
    }
    else if (type === 'chime') {
      // Simyacı Aynası: a bright bell-like "tıınnn" with a faint harmonic overtone.
      [880, 1320].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(idx === 0 ? 0.15 : 0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.42);
      });
    }
    else if (type === 'void') {
      // Kozmik Karadelik: a deep, descending sub-bass sweep — the rules being sucked away.
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.9);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.95);
    }
    else if (type === 'devour') {
      // Obur Matruşka: a low, tremolo'd growl — chewing through the earlier stones.
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const tremolo = ctx.createOscillator();
      const tremoloGain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(90, now);
      osc.frequency.linearRampToValueAtTime(60, now + 0.35);

      tremolo.type = 'sine';
      tremolo.frequency.setValueAtTime(18, now);
      tremoloGain.gain.setValueAtTime(0.08, now);
      tremolo.connect(tremoloGain);
      tremoloGain.connect(gain.gain);

      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);
      tremolo.start(now);
      tremolo.stop(now + 0.4);
      osc.start(now);
      osc.stop(now + 0.42);
    }
    else if (type === 'rewind') {
      // Zamanı Büken Sarkaç: pitch dips down then snaps back up — time reversing.
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.linearRampToValueAtTime(150, now + 0.2);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.4);

      gain.gain.setValueAtTime(0.14, now);
      gain.gain.setValueAtTime(0.14, now + 0.35);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.46);
    }
  } catch (err) {
    console.warn("Audio Context init or play failed: ", err);
  }
}
