/**
 * Clean, clear text-to-speech for kids — real words only, smooth teacher voice.
 */

/** Prefer bright, clear English voices; avoid rough/old compact voices. */
const PREFER = [
  /aria/i,
  /jenny/i,
  /samantha/i,
  /zira/i,
  /google us english/i,
  /google uk english female/i,
  /natasha/i,
  /susan/i,
  /hazel/i,
  /karen/i,
  /moira/i,
  /neural/i,
  /online \(natural\)/i,
  /natural/i,
];

const AVOID = [
  /david/i,
  /mark/i,
  /george/i,
  /ralph/i,
  /compact/i,
  /mobile/i,
  /espeak/i,
  /robot/i,
];

let _cachedVoice = null;
let _voicesReady = false;

export function warmVoices() {
  if (!window.speechSynthesis) return;
  const load = () => {
    const v = window.speechSynthesis.getVoices() || [];
    if (v.length) {
      _voicesReady = true;
      _cachedVoice = null; // re-pick
    }
  };
  load();
  window.speechSynthesis.onvoiceschanged = load;
}

export function pickBestVoice() {
  if (!window.speechSynthesis) return null;
  if (_cachedVoice) return _cachedVoice;
  const voices = window.speechSynthesis.getVoices() || [];
  if (!voices.length) return null;

  const en = voices.filter((v) => /^en\b/i.test(v.lang || ''));
  const pool = en.length ? en : voices;

  // Score voices
  let best = null;
  let bestScore = -999;
  for (const v of pool) {
    let s = 0;
    const name = v.name || '';
    for (const re of PREFER) if (re.test(name)) s += 10;
    for (const re of AVOID) if (re.test(name)) s -= 20;
    if (/en-US/i.test(v.lang)) s += 3;
    if (/en-GB/i.test(v.lang)) s += 2;
    if (/female|woman/i.test(name)) s += 2;
    // Prefer local service quality flags when present
    if (v.localService === false) s += 4; // cloud/neural often clearer on Windows
    if (s > bestScore) {
      bestScore = s;
      best = v;
    }
  }
  _cachedVoice = best || pool[0];
  return _cachedVoice;
}

export function cleanForSpeech(text) {
  let t = String(text || '');

  // Remove filler teachers shouldn't "say"
  t = t.replace(/\b(hmm+|uh+|um+|erm+|ahh+)\b/gi, ' ');
  t = t.replace(/\.{2,}|…+/g, ' '); // never speak "dot dot" or trail off
  t = t.replace(/\s*—\s*/g, '. ');
  t = t.replace(/\s*–\s*/g, '. ');

  // code / markdown
  t = t.replace(/```[\s\S]*?```/g, ' ');
  t = t.replace(/`([^`]+)`/g, '$1');
  t = t.replace(/!\[([^\]]*)\]\([^)]*\)/g, ' $1 ');
  t = t.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
  t = t.replace(/^#{1,6}\s+/gm, '');
  t = t.replace(/^\s*[-*+]\s+/gm, '');
  t = t.replace(/^\s*\d+\.\s+/gm, '');
  t = t.replace(/[*_~|>#]/g, ' ');
  t = t.replace(/<\/?[^>]+>/g, ' ');
  t = t.replace(/&nbsp;|&#\d+;|&[a-z]+;/gi, ' ');
  t = t.replace(/[•·▪▸►●○◆■□]/g, ' ');
  t = t.replace(/[_/\\|]+/g, ' ');
  t = t.replace(/[~^=+<>{}[\]()]+/g, ' ');
  t = t.replace(/["“”‘’]+/g, ' ');
  t = t.replace(/[@#$%*]+/g, ' ');
  // colons: "Part 1:" -> pause as period, not "colon"
  t = t.replace(/:/g, '. ');
  t = t.replace(/;/g, '. ');
  t = t.replace(/!{2,}/g, '!');
  t = t.replace(/\?{2,}/g, '?');

  t = t.replace(/\s+/g, ' ');
  t = t.replace(/\s+([.,!?])/g, '$1');
  t = t.replace(/([.!?]){2,}/g, '$1');
  t = t.replace(/^\s*[.\-]+\s*/g, '');
  t = t.trim();

  // Prefer full sentences for kids; allow longer classroom lines
  if (t.length > 900) t = t.slice(0, 900).replace(/\s+\S*$/, '');
  return t;
}

/**
 * Apply a clear, friendly teacher voice to an utterance.
 */
export function styleUtterance(u, { rate = 0.94, pitch = 1.12, age = 8 } = {}) {
  const voice = pickBestVoice();
  if (voice) u.voice = voice;
  // Age-aware clarity: younger = slower, slightly brighter
  if (age <= 6) {
    u.rate = Math.min(rate, 0.88);
    u.pitch = Math.max(pitch, 1.18);
  } else if (age <= 10) {
    u.rate = rate;
    u.pitch = pitch;
  } else {
    u.rate = Math.min(1.0, rate + 0.04);
    u.pitch = Math.min(pitch, 1.08);
  }
  u.volume = 1;
  return u;
}

export function speakClean(text, { rate = 0.94, pitch = 1.12, age = 8, onend } = {}) {
  if (!window.speechSynthesis) {
    onend?.();
    return;
  }
  warmVoices();
  window.speechSynthesis.cancel();
  const clean = cleanForSpeech(text);
  if (!clean) {
    onend?.();
    return;
  }

  const parts = clean.split(/(?<=[.!?])\s+/).filter(Boolean);
  let i = 0;

  const next = () => {
    if (i >= parts.length) {
      onend?.();
      return;
    }
    const u = new SpeechSynthesisUtterance(parts[i++]);
    styleUtterance(u, { rate, pitch, age });
    u.onend = () => setTimeout(next, 120); // tiny breath between sentences
    u.onerror = next;
    window.speechSynthesis.speak(u);
  };
  next();
}

export function stopSpeaking() {
  try {
    window.speechSynthesis?.cancel();
  } catch { /* */ }
}

// Warm voices early
if (typeof window !== 'undefined') {
  try {
    warmVoices();
  } catch { /* */ }
}
