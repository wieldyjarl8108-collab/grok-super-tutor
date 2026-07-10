/**
 * Headset-friendly talk + listen (mic in, speakers/headphones out)
 */
import { speakClean, stopSpeaking } from './tts.js';

export class HeadsetController {
  constructor({ onHeard, onStatus } = {}) {
    this.onHeard = onHeard;
    this.onStatus = onStatus;
    this.listening = false;
    this.recognition = null;
    this.continuous = true;
  }

  status(msg, kind = 'info') {
    this.onStatus?.(msg, kind);
  }

  canListen() {
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  canTalk() {
    return Boolean(window.speechSynthesis);
  }

  startListening() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      this.status('Voice input needs Chrome or Edge', 'err');
      return;
    }
    this.stopListening();
    const rec = new SR();
    rec.lang = 'en-US';
    rec.continuous = this.continuous;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      this.listening = true;
      this.status('Headset mic listening…', 'ok');
    };
    rec.onresult = (e) => {
      let final = '';
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      if (interim) this.status(`Hearing: ${interim}`, 'info');
      if (final.trim()) {
        this.status('Got it', 'ok');
        this.onHeard?.(final.trim());
      }
    };
    rec.onerror = (e) => {
      if (e.error === 'no-speech') return;
      this.status(`Mic: ${e.error}`, 'err');
      this.listening = false;
    };
    rec.onend = () => {
      // auto-restart continuous headset mode
      if (this.listening && this.continuous) {
        try { rec.start(); } catch { this.listening = false; this.status('Mic stopped', 'info'); }
      } else {
        this.listening = false;
        this.status('Mic off', 'info');
      }
    };

    this.recognition = rec;
    try {
      rec.start();
    } catch (e) {
      this.status(e.message || 'Could not start mic', 'err');
    }
  }

  stopListening() {
    this.listening = false;
    try { this.recognition?.stop(); } catch { /* */ }
    this.recognition = null;
  }

  toggleListen() {
    if (this.listening) this.stopListening();
    else this.startListening();
    return this.listening;
  }

  talk(text) {
    if (!this.canTalk()) {
      this.status('Speech not available', 'err');
      return;
    }
    // pause mic while talking to avoid echo on headset
    const was = this.listening;
    if (was) this.stopListening();
    speakClean(text, {
      rate: 1.02,
      onend: () => {
        if (was) this.startListening();
      },
    });
    this.status('Speaking…', 'ok');
  }

  stopTalk() {
    stopSpeaking();
  }
}
