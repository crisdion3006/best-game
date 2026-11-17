// Synthesised sound: every effect is built from oscillators and filtered noise
// through the Web Audio API, so the game ships no audio files. The context is
// created lazily on the first user gesture (browsers block audio before one),
// and every call is a no-op until then. A quiet procedural music loop — a bass
// pulse under a sparse arpeggio — runs while the game plays, and M mutes all of it.

const MUSIC_BPM = 112;
const MUSIC_BAR = (60 / MUSIC_BPM) * 4;
/** A-minor-ish bass line and arpeggio, one bar each, as semitone offsets from A2. */
const BASS_LINE = [0, 0, -4, -2, 0, 0, 3, -2];
const ARP_NOTES = [12, 15, 19, 24, 19, 15, 12, 15];

export function createAudio() {
  let context = null;
  let master = null;
  let musicGain = null;
  let sfxGain = null;
  let muted = false;
  let musicTimer = null;
  let musicStep = 0;
  let nextNoteTime = 0;

  function ensure() {
    if (context) {
      if (context.state === 'suspended') context.resume().catch(() => {});
      return context;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      context = new AC();
      master = context.createGain();
      master.gain.value = muted ? 0 : 0.9;
      master.connect(context.destination);
      sfxGain = context.createGain();
      sfxGain.gain.value = 0.5;
      sfxGain.connect(master);
      musicGain = context.createGain();
      musicGain.gain.value = 0.16;
      musicGain.connect(master);
    } catch {
      context = null;
    }
    return context;
  }

  function tone(freq, dur, type, vol, slideTo, when = 0) {
    if (!context || muted) return;
    const t0 = context.currentTime + when;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(sfxGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise(dur, vol, filterFreq, when = 0) {
    if (!context || muted) return;
    const t0 = context.currentTime + when;
    const len = Math.max(1, Math.floor(context.sampleRate * dur));
    const buffer = context.createBuffer(1, len, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = context.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(sfxGain);
    source.start(t0);
  }

  function musicTone(freq, dur, type, vol, when) {
    if (!context || muted) return;
    const t0 = when;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(musicGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function scheduleMusic() {
    if (!context || muted) return;
    const stepDur = MUSIC_BAR / 8;
    while (nextNoteTime < context.currentTime + 0.25) {
      const step = musicStep % 8;
      const bassFreq = 110 * 2 ** (BASS_LINE[step] / 12);
      musicTone(bassFreq, stepDur * 0.9, 'triangle', 0.5, nextNoteTime);
      if (step % 2 === 0) {
        const arpFreq = 220 * 2 ** (ARP_NOTES[step] / 12);
        musicTone(arpFreq, stepDur * 1.6, 'sine', 0.16, nextNoteTime);
      }
      nextNoteTime += stepDur;
      musicStep += 1;
    }
  }

  return {
    ensure,
    setMuted(value) {
      muted = value;
      if (master) master.gain.value = muted ? 0 : 0.9;
      if (muted) this.stopMusic();
    },
    isMuted() {
      return muted;
    },
    startMusic() {
      if (!context || musicTimer) return;
      nextNoteTime = context.currentTime + 0.1;
      musicStep = 0;
      musicTimer = window.setInterval(scheduleMusic, 90);
    },
    stopMusic() {
      if (musicTimer) {
        window.clearInterval(musicTimer);
        musicTimer = null;
      }
    },
    shoot() {
      tone(920 + Math.random() * 120, 0.09, 'square', 0.10, 320);
    },
    enemyShoot() {
      tone(340, 0.12, 'sawtooth', 0.07, 160);
    },
    explode(big) {
      noise(big ? 0.5 : 0.28, big ? 0.5 : 0.32, big ? 900 : 1400);
      tone(big ? 120 : 170, big ? 0.45 : 0.25, 'sine', 0.4, 40);
    },
    hit() {
      noise(0.22, 0.4, 700);
      tone(220, 0.3, 'sawtooth', 0.25, 55);
    },
    shieldPop() {
      tone(660, 0.15, 'triangle', 0.25, 990);
      noise(0.12, 0.2, 2400);
    },
    pickup() {
      tone(660, 0.08, 'sine', 0.22);
      tone(880, 0.08, 'sine', 0.22, null, 0.07);
      tone(1320, 0.12, 'sine', 0.22, null, 0.14);
    },
    powerup() {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.14, 'triangle', 0.2, null, i * 0.07));
    },
    bomb() {
      noise(0.8, 0.5, 500);
      tone(90, 0.7, 'sine', 0.5, 30);
      tone(1200, 0.4, 'sawtooth', 0.12, 100);
    },
    waveHorn() {
      tone(392, 0.18, 'triangle', 0.25);
      tone(523, 0.28, 'triangle', 0.25, null, 0.16);
    },
    bossAlarm() {
      tone(196, 0.22, 'sawtooth', 0.22);
      tone(196, 0.22, 'sawtooth', 0.22, null, 0.26);
      tone(262, 0.4, 'sawtooth', 0.22, null, 0.52);
    },
    victory() {
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.3, 'triangle', 0.22, null, i * 0.11));
    },
    gameOver() {
      [392, 330, 262, 196].forEach((f, i) => tone(f, 0.32, 'triangle', 0.22, null, i * 0.16));
    },
    click() {
      tone(700, 0.05, 'square', 0.12);
    },
  };
}
