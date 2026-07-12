// Runs inside the offscreen document. Service workers can't touch the Web
// Audio API or <audio> elements directly, so this page exists purely to
// play a sound when asked to — either a synthesized "Standard" effect or a
// "Special"/uploaded audio file.

let ctx = null;

// Tracks whatever is currently making noise, so a new sound can cut off the
// previous one instead of the two overlapping.
let activeMasterGain = null; // for Standard (oscillator-based) sounds
let activeAudioEl = null;    // for Special/uploaded (audio-file-based) sounds

function stopActiveSound() {
  if (activeMasterGain) {
    try {
      activeMasterGain.gain.cancelScheduledValues(activeMasterGain.context.currentTime);
      activeMasterGain.gain.setValueAtTime(0, activeMasterGain.context.currentTime);
      activeMasterGain.disconnect();
    } catch (e) {
      // already disconnected/stopped — fine
    }
    activeMasterGain = null;
  }
  if (activeAudioEl) {
    try {
      activeAudioEl.pause();
      activeAudioEl.currentTime = 0;
    } catch (e) {
      // already stopped — fine
    }
    activeAudioEl = null;
  }
}

function getContext() {
  if (!ctx || ctx.state === "closed") {
    ctx = new AudioContext();
  }
  // Contexts can start (or end up) suspended; resume is a no-op when running.
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

// `destination` is a GainNode (the per-call master volume control), not
// audioCtx.destination directly, so every note in a multi-note sound scales
// together with a single volume knob.
function tone(destination, { freq, startAt, duration, peakGain, type = "sine", freqEnd = null }) {
  const audioCtx = destination.context;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startAt);
  if (freqEnd !== null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), startAt + duration);
  }

  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(peakGain, startAt + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  osc.connect(gain).connect(destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.03);
}

function masterGain(audioCtx, volume) {
  const gain = audioCtx.createGain();
  gain.gain.value = Math.max(0, Math.min(1, volume));
  gain.connect(audioCtx.destination);
  activeMasterGain = gain;
  return gain;
}

// ---- Standard (synthesized) effects ----

function playChime(audioCtx, volume) {
  const dest = masterGain(audioCtx, volume);
  const now = audioCtx.currentTime;
  tone(dest, { freq: 880, startAt: now, duration: 0.22, peakGain: 0.18 });
  tone(dest, { freq: 660, startAt: now + 0.13, duration: 0.28, peakGain: 0.16 });
}

function playDing(audioCtx, volume) {
  const dest = masterGain(audioCtx, volume);
  const now = audioCtx.currentTime;
  tone(dest, { freq: 1046.5, startAt: now, duration: 0.45, peakGain: 0.2 });
}

function playPop(audioCtx, volume) {
  const dest = masterGain(audioCtx, volume);
  const now = audioCtx.currentTime;
  tone(dest, { freq: 220, freqEnd: 70, startAt: now, duration: 0.12, peakGain: 0.28, type: "triangle" });
}

function playMarimba(audioCtx, volume) {
  const dest = masterGain(audioCtx, volume);
  const now = audioCtx.currentTime;
  const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
  notes.forEach((freq, i) => {
    tone(dest, { freq, startAt: now + i * 0.09, duration: 0.3, peakGain: 0.18, type: "triangle" });
  });
}

function playAlert(audioCtx, volume) {
  const dest = masterGain(audioCtx, volume);
  const now = audioCtx.currentTime;
  tone(dest, { freq: 1200, startAt: now, duration: 0.08, peakGain: 0.15, type: "square" });
  tone(dest, { freq: 1200, startAt: now + 0.12, duration: 0.08, peakGain: 0.15, type: "square" });
}

function playBell(audioCtx, volume) {
  const dest = masterGain(audioCtx, volume);
  const now = audioCtx.currentTime;
  tone(dest, { freq: 740, startAt: now, duration: 0.6, peakGain: 0.16 });
  tone(dest, { freq: 1480, startAt: now, duration: 0.5, peakGain: 0.05 });
}

function playArpeggio(audioCtx, volume) {
  const dest = masterGain(audioCtx, volume);
  const now = audioCtx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    tone(dest, { freq, startAt: now + i * 0.08, duration: 0.28, peakGain: 0.17, type: "triangle" });
  });
}

function playFanfare(audioCtx, volume) {
  const dest = masterGain(audioCtx, volume);
  const now = audioCtx.currentTime;
  const notes = [392.0, 523.25, 659.25, 783.99]; // G4, C5, E5, G5
  const durations = [0.14, 0.14, 0.14, 0.4];
  const gains = [0.16, 0.16, 0.16, 0.22];
  let t = now;
  notes.forEach((freq, i) => {
    tone(dest, { freq, startAt: t, duration: durations[i], peakGain: gains[i], type: "sine" });
    t += durations[i] * 0.85;
  });
}

function playLevelUp(audioCtx, volume) {
  const dest = masterGain(audioCtx, volume);
  const now = audioCtx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    tone(dest, { freq, startAt: now + i * 0.06, duration: 0.14, peakGain: 0.13, type: "square" });
  });
}

function playBloop(audioCtx, volume) {
  const dest = masterGain(audioCtx, volume);
  const now = audioCtx.currentTime;
  const notes = [880.0, 698.46, 587.33]; // A5, F5, D5
  notes.forEach((freq, i) => {
    tone(dest, { freq, startAt: now + i * 0.11, duration: 0.2, peakGain: 0.18, type: "triangle" });
  });
}

const STANDARD_SOUNDS = {
  chime: playChime,
  ding: playDing,
  pop: playPop,
  marimba: playMarimba,
  alert: playAlert,
  bell: playBell,
  arpeggio: playArpeggio,
  fanfare: playFanfare,
  levelup: playLevelUp,
  bloop: playBloop
};

// ---- Special (bundled audio files) + uploaded sounds ----

function playAudioSrc(src, volume) {
  if (!src) return;
  try {
    const audio = new Audio(src);
    audio.volume = Math.max(0, Math.min(1, volume));
    activeAudioEl = audio;
    audio.addEventListener("ended", () => {
      if (activeAudioEl === audio) activeAudioEl = null;
    });
    audio.play().catch((e) => console.warn("Could not play sound:", e));
  } catch (e) {
    console.warn("Could not play sound:", e);
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (!message) return;
  // Number.isFinite instead of typeof: NaN is typeof "number" but would
  // throw when assigned to an AudioParam.
  const volume = Number.isFinite(message.volume) ? message.volume : 0.5;

  stopActiveSound();

  if (message.type === "play-builtin-sound") {
    const fn = STANDARD_SOUNDS[message.soundId] || STANDARD_SOUNDS.chime;
    fn(getContext(), volume);
  } else if (message.type === "play-custom-sound") {
    playAudioSrc(chrome.runtime.getURL(`sounds/custom/${message.file}`), volume);
  } else if (message.type === "play-uploaded-sound") {
    playAudioSrc(message.dataUrl, volume);
  }
});
