/**
 * Classroom lesson player — feels like sitting with a real teacher.
 * Start / Pause / Continue · full lesson talk · not one dump prompt.
 */
import { cleanForSpeech, styleUtterance, warmVoices, pickBestVoice } from './tts.js';

function splitLessonBody(text, { young = false } = {}) {
  let t = String(text || '').trim();
  t = t.replace(/^⚠️[\s\S]*?(?=\n\n)/, '').trim();
  t = t.replace(/^EDUCATIONAL DISCLAIMER:[\s\S]*?(?=\n\n)/i, '').trim();
  let parts = t.split(/\n\s*\n+/).map((p) => p.replace(/\n/g, ' ').trim()).filter(Boolean);
  if (parts.length <= 1) {
    parts = t.split(/(?<=[.!?])\s+/).map((p) => p.trim()).filter((p) => p.length > 12);
  }
  if (!parts.length && t) parts = [t];
  // Young kids: shorter spoken chunks, more of them (longer overall class)
  const maxChunk = young ? 160 : 280;
  const softMax = young ? 150 : 260;
  const out = [];
  for (const p of parts) {
    if (p.length < maxChunk) out.push(p);
    else {
      const bits = p.split(/(?<=[.!?])\s+/);
      let buf = '';
      for (const b of bits) {
        if ((buf + ' ' + b).length > softMax && buf) {
          out.push(buf.trim());
          buf = b;
        } else buf = buf ? `${buf} ${b}` : b;
      }
      if (buf.trim()) out.push(buf.trim());
    }
  }
  return out.length ? out : parts;
}

/**
 * Turn raw lesson text into classroom teacher talk for this kid.
 */
export function buildClassroomScript(lesson, child = {}) {
  const name = child.name || 'friend';
  const age = Number(child.age) || 8;
  const title = lesson.title || 'today’s topic';
  const subject = lesson.subject || 'this subject';
  const young = age <= 7;
  const little = age <= 5;
  const teen = age >= 13;
  const bodyParts = splitLessonBody(lesson.content || lesson.description || '', { young: young || little });

  const open = little
    ? `Hi ${name}! I’m so glad you’re here. Today’s class is about ${title}. We’ll go slow, look at pictures, and learn a lot together. Raise your hand high if you have a question — I can see you, and I will pause and listen.`
    : young
      ? `Hi ${name}! Come sit with me. Today we’re learning about ${title}. We’ll take our time so you really get it. If you have a question, raise your hand high — I can see you on the camera, and I will pause and listen.`
      : teen
        ? `Hey ${name}. Welcome to class. Today’s topic is ${title} in ${subject}. Raise your hand on camera if you have a question — I’ll pause and ask what you want to know.`
        : `Hi ${name}! Welcome to class. Today we’re learning about ${title}. Raise your hand if you have a question — the camera helps me see, and I’ll stop and ask what your question is.`;

  // Clear spoken bridges only — no trailing "..." (TTS must not say "dot")
  // No ellipsis — TTS must never say "dot" or trail off mid-thought
  const bridges = little
    ? [
      'Okay, next little part!',
      'Look at the picture with me.',
      'You are doing great. Here is more.',
      'Let’s keep going slowly.',
      'One more fun idea!',
      'Listen carefully to this part.',
      'Nice focus! Here is the next part.',
    ]
    : young
      ? [
        'Okay, next part!',
        'Here is something cool.',
        'Look at the picture and listen.',
        'One more important idea.',
        'Let’s take our time on this.',
        'You’re doing awesome. Next part.',
      ]
      : teen
        ? ['Next point.', 'Here is the key idea. Look at the visual.', 'Stay with me on this.', 'Important detail.']
        : ['Alright class.', 'Here is the next idea. Watch the picture.', 'Pay attention to this part.', 'Let us keep going.'];

  const lines = [];
  lines.push({ role: 'teacher', text: open, kind: 'open' });

  // Young kids: mid-class stretch break when lesson is long
  const midBreakAt = (young || little) && bodyParts.length >= 5
    ? Math.floor(bodyParts.length / 2)
    : -1;

  bodyParts.forEach((part, i) => {
    if (i > 0) {
      lines.push({ role: 'teacher', text: bridges[i % bridges.length], kind: 'bridge' });
    }
    if (i === midBreakAt) {
      lines.push({
        role: 'teacher',
        text: little
          ? `Halfway there, ${name}! Stretch your arms up high… and settle back in. We still have more good learning.`
          : `We’re halfway through class, ${name}. Shake out your hands, take a breath, and we’ll keep going — a little longer so it really sticks.`,
        kind: 'bridge',
      });
    }
    const hook = (young || little) && i === 0
      ? `Look at the picture with me. `
      : i === 0
        ? `Watch the pictures while I teach. `
        : '';
    lines.push({ role: 'teacher', text: hook + part, kind: 'content', display: part });
  });

  // Extra recap for little learners (makes class a bit longer + stickier)
  if (little || young) {
    lines.push({
      role: 'teacher',
      text: little
        ? `Let’s remember together, ${name}: we learned about ${title}. You can tell a grown-up one thing you remember!`
        : `Quick recap, ${name}: today’s big topic was ${title}. Say one fact out loud — that helps your brain keep it.`,
      kind: 'content',
    });
  }

  const close = little
    ? `You did such a good job listening, ${name}! That was a nice long class. Press Start quiz when you’re ready, or ask me a question first.`
    : young
      ? `Awesome listening, ${name}! We took our time today. When you are ready, press Start quiz. You can also ask me a question first.`
      : `Great work today, ${name}. That wraps up our lesson. Press Start quiz when you are ready, or ask me anything about ${title} first.`;

  lines.push({ role: 'teacher', text: close, kind: 'close' });

  return lines;
}

export class LessonPlayer {
  constructor({ onProgress, onEnd, onState, getRate } = {}) {
    this.lines = [];
    this.index = 0;
    this.state = 'idle'; // idle | playing | paused | done
    this.onProgress = onProgress;
    this.onEnd = onEnd;
    this.onState = onState;
    this.getRate = getRate;
    this._utterance = null;
    this._timer = null;
  }

  load(lesson, child) {
    this.stop();
    this._age = Number(child?.age) || 8;
    this.lines = buildClassroomScript(lesson, child);
    this.index = 0;
    this.state = 'idle';
    this._emitState();
    this.onProgress?.(0, this.lines.length, this.lines);
    return this.lines;
  }

  _emitState() {
    this.onState?.(this.state, this.index, this.lines.length);
  }

  _rate() {
    if (typeof this.getRate === 'function') return this.getRate();
    const age = this._age || 8;
    // Younger kids: a bit slower so longer lessons stay clear
    if (age <= 5) return 0.82;
    if (age <= 7) return 0.86;
    if (age <= 10) return 0.92;
    return 0.96;
  }

  _speakCurrent() {
    if (this.index >= this.lines.length) {
      this.state = 'done';
      this._emitState();
      this.onProgress?.(this.lines.length, this.lines.length, this.lines);
      this.onEnd?.();
      return;
    }

    const line = this.lines[this.index];
    const text = cleanForSpeech(line.text);
    this.state = 'playing';
    this._emitState();
    this.onProgress?.(this.index, this.lines.length, this.lines);

    if (!window.speechSynthesis || !text) {
      this._timer = setTimeout(() => {
        if (this.state === 'playing') this._advance();
      }, Math.min(8000, 2000 + text.length * 40));
      return;
    }

    warmVoices();
    pickBestVoice();
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const age = typeof this.getRate === 'function' && this._age != null ? this._age : 8;
    styleUtterance(u, {
      rate: this._rate(),
      pitch: age <= 7 ? 1.16 : 1.12,
      age,
    });
    this._utterance = u;

    u.onend = () => {
      if (this.state !== 'playing') return;
      // short breath between thoughts — no awkward hang
      this._timer = setTimeout(() => {
        if (this.state === 'playing') this._advance();
      }, line.kind === 'bridge'
        ? (this._age <= 7 ? 420 : 200)
        : (this._age <= 7 ? 550 : 380));
    };
    u.onerror = () => {
      if (this.state === 'playing') this._advance();
    };
    window.speechSynthesis.speak(u);
  }

  _advance() {
    this.index += 1;
    if (this.index >= this.lines.length) {
      this.state = 'done';
      this._emitState();
      this.onProgress?.(this.lines.length, this.lines.length, this.lines);
      this.onEnd?.();
      return;
    }
    this._speakCurrent();
  }

  start() {
    if (!this.lines.length) return;
    this.index = 0;
    this.state = 'playing';
    this._speakCurrent();
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this._emitState();
    clearTimeout(this._timer);
    if (window.speechSynthesis) {
      try {
        window.speechSynthesis.pause();
      } catch {
        window.speechSynthesis.cancel();
      }
    }
  }

  continue() {
    if (this.state === 'done') return;
    if (this.state === 'idle') {
      this.start();
      return;
    }
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this._emitState();
    if (window.speechSynthesis) {
      try {
        if (window.speechSynthesis.paused) window.speechSynthesis.resume();
        else this._speakCurrent();
      } catch {
        this._speakCurrent();
      }
    } else {
      this._speakCurrent();
    }
  }

  /** Temporary hold while student asks a question */
  holdForQuestion() {
    if (this.state === 'playing') this.pause();
  }

  stop() {
    clearTimeout(this._timer);
    this.state = 'idle';
    this._utterance = null;
    try {
      window.speechSynthesis?.cancel();
    } catch { /* */ }
    this._emitState();
  }
}
