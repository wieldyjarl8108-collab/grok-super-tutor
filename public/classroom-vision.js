/**
 * Classroom vision — local webcam only (never uploaded).
 * Detects a raised hand so Teacher Grok can stop the lesson and ask.
 *
 * Uses MediaPipe Hand Landmarker when available; falls back to a simple
 * upper-frame motion heuristic if the model CDN fails.
 */

const HAND_MODEL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const WASM =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';

export class ClassroomVision {
  constructor({
    videoEl,
    canvasEl,
    onStatus,
    onHandRaise,
    onCameraReady,
    onError,
  } = {}) {
    this.videoEl = videoEl;
    this.canvasEl = canvasEl;
    this.onStatus = onStatus || (() => {});
    this.onHandRaise = onHandRaise || (() => {});
    this.onCameraReady = onCameraReady || (() => {});
    this.onError = onError || (() => {});

    this.stream = null;
    this.landmarker = null;
    this.running = false;
    this.enabled = true;
    this.mode = 'none'; // hands | motion | none
    this._raf = 0;
    this._lastRaise = 0;
    this._raiseHold = 0;
    this._cooldownMs = 8000;
    this._prevFrame = null;
    this._hasCamera = null;
  }

  /** Does this PC list a video input? */
  async detectCamera() {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) {
        this._hasCamera = false;
        return { hasCamera: false, devices: [] };
      }
      // May need a prior permission for labels; still lists kinds without
      let devices = await navigator.mediaDevices.enumerateDevices();
      let cams = devices.filter((d) => d.kind === 'videoinput');
      if (!cams.length) {
        // Some browsers hide devices until permission — probe getUserMedia briefly
        try {
          const probe = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          probe.getTracks().forEach((t) => t.stop());
          devices = await navigator.mediaDevices.enumerateDevices();
          cams = devices.filter((d) => d.kind === 'videoinput');
        } catch {
          this._hasCamera = false;
          return { hasCamera: false, devices: [], reason: 'permission_or_missing' };
        }
      }
      this._hasCamera = cams.length > 0;
      return {
        hasCamera: cams.length > 0,
        devices: cams.map((d) => ({ id: d.deviceId, label: d.label || 'Camera' })),
      };
    } catch (e) {
      this._hasCamera = false;
      return { hasCamera: false, devices: [], reason: e.message };
    }
  }

  async start() {
    if (this.running) return true;
    this.onStatus('Looking for camera…');

    const info = await this.detectCamera();
    if (!info.hasCamera) {
      this.onStatus('No camera found — use the raise-hand button or type a question.');
      this.onError?.(new Error('No camera'));
      return false;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });
    } catch (e) {
      this.onStatus('Camera blocked — allow camera in the browser, or raise hand with the button.');
      this.onError?.(e);
      return false;
    }

    if (this.videoEl) {
      this.videoEl.srcObject = this.stream;
      this.videoEl.muted = true;
      this.videoEl.playsInline = true;
      await this.videoEl.play().catch(() => {});
    }

    this.running = true;
    this.onCameraReady?.(info);
    this.onStatus('Camera on · watching for a raised hand (local only)');

    // Try MediaPipe hands first
    const okHands = await this._initHands();
    if (okHands) {
      this.mode = 'hands';
      this.onStatus('Camera on · hand tracking ready — raise your hand to ask a question');
    } else {
      this.mode = 'motion';
      this.onStatus('Camera on · motion watch (raise hand high). Local only.');
    }

    this._loop();
    return true;
  }

  async _initHands() {
    try {
      const vision = await import(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm'
      );
      const { HandLandmarker, FilesetResolver } = vision;
      const fileset = await FilesetResolver.forVisionTasks(WASM);
      this.landmarker = await HandLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: HAND_MODEL,
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 2,
      });
      return true;
    } catch (e) {
      console.warn('Hand landmarker unavailable, using motion fallback', e);
      this.landmarker = null;
      return false;
    }
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this._raf);
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.videoEl) this.videoEl.srcObject = null;
    try {
      this.landmarker?.close?.();
    } catch { /* */ }
    this.landmarker = null;
    this.mode = 'none';
    this._prevFrame = null;
    this.onStatus('Camera off');
  }

  setEnabled(on) {
    this.enabled = !!on;
  }

  _loop() {
    if (!this.running) return;
    this._raf = requestAnimationFrame(() => this._tick());
  }

  _tick() {
    if (!this.running) return;
    try {
      if (this.enabled && this.videoEl && this.videoEl.readyState >= 2) {
        if (this.mode === 'hands' && this.landmarker) this._detectHands();
        else if (this.mode === 'motion') this._detectMotion();
      }
    } catch (e) {
      /* keep looping */
    }
    this._loop();
  }

  /**
   * Raised hand: wrist clearly above elbow, and near top half of frame.
   * Image Y grows downward.
   */
  _detectHands() {
    const now = performance.now();
    const result = this.landmarker.detectForVideo(this.videoEl, now);
    const hands = result?.landmarks || [];
    let raised = false;

    for (const lm of hands) {
      // MediaPipe: 0 wrist, 5 index MCP, 9 middle MCP, 13 ring, 17 pinky, 8 index tip
      const wrist = lm[0];
      const middleMcp = lm[9];
      const indexTip = lm[8];
      const pinkyMcp = lm[17];
      if (!wrist || !middleMcp) continue;

      // Hand above mid-body of frame (y smaller = higher)
      const highInFrame = wrist.y < 0.55 && indexTip.y < 0.5;
      // Fingers above wrist (open raise)
      const fingersUp = indexTip.y < wrist.y - 0.05;
      // Palm roughly upright: middle MCP above wrist
      const palmUp = middleMcp.y < wrist.y + 0.02;
      // Not a flat hand on desk (wrist very low)
      const notLow = wrist.y < 0.75;

      if (highInFrame && fingersUp && palmUp && notLow) {
        raised = true;
        break;
      }
      // Also count if whole hand is in upper third (classic "raise hand")
      if (wrist.y < 0.35 && pinkyMcp.y < 0.4) {
        raised = true;
        break;
      }
    }

    this._drawOverlay(hands, raised);
    this._considerRaise(raised);
  }

  /** Fallback: lots of motion in the top 40% of the frame */
  _detectMotion() {
    const v = this.videoEl;
    const w = 160;
    const h = 120;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(v, 0, 0, w, h);
    const img = ctx.getImageData(0, 0, w, h);
    const data = img.data;
    let motion = 0;
    let n = 0;
    const topH = Math.floor(h * 0.4);
    if (this._prevFrame && this._prevFrame.length === data.length) {
      for (let y = 0; y < topH; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const g = (data[i] + data[i + 1] + data[i + 2]) / 3;
          const pg = (this._prevFrame[i] + this._prevFrame[i + 1] + this._prevFrame[i + 2]) / 3;
          if (Math.abs(g - pg) > 28) motion++;
          n++;
        }
      }
    }
    this._prevFrame = new Uint8ClampedArray(data);
    const ratio = n ? motion / n : 0;
    // Sustained motion in upper frame ≈ waving / raised hand
    const raised = ratio > 0.08;
    this._considerRaise(raised);
    if (this.canvasEl) {
      const octx = this.canvasEl.getContext('2d');
      if (octx) {
        this.canvasEl.width = v.videoWidth || 320;
        this.canvasEl.height = v.videoHeight || 240;
        octx.clearRect(0, 0, this.canvasEl.width, this.canvasEl.height);
        if (raised) {
          octx.strokeStyle = '#22c55e';
          octx.lineWidth = 4;
          octx.strokeRect(8, 8, this.canvasEl.width - 16, this.canvasEl.height * 0.4);
        }
      }
    }
  }

  _drawOverlay(hands, raised) {
    if (!this.canvasEl || !this.videoEl) return;
    const c = this.canvasEl;
    const v = this.videoEl;
    c.width = v.videoWidth || 320;
    c.height = v.videoHeight || 240;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.strokeStyle = raised ? '#22c55e' : '#60a5fa';
    ctx.fillStyle = raised ? 'rgba(34,197,94,0.35)' : 'rgba(96,165,250,0.35)';
    ctx.lineWidth = 2;
    for (const lm of hands) {
      for (const p of lm) {
        ctx.beginPath();
        ctx.arc(p.x * c.width, p.y * c.height, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (raised) {
      ctx.font = 'bold 18px system-ui';
      ctx.fillStyle = '#86efac';
      ctx.fillText('Hand up!', 12, 28);
    }
  }

  _considerRaise(raised) {
    const now = performance.now();
    if (now - this._lastRaise < this._cooldownMs) return;

    if (raised) {
      this._raiseHold += 1;
      // Need a few consecutive frames so a scratch doesn't fire
      if (this._raiseHold >= 6) {
        this._lastRaise = now;
        this._raiseHold = 0;
        this.onHandRaise({ at: Date.now(), mode: this.mode });
      }
    } else {
      this._raiseHold = Math.max(0, this._raiseHold - 1);
    }
  }
}

/** One-shot: does the browser report a camera device? */
export async function hasWebcam() {
  const v = new ClassroomVision();
  const r = await v.detectCamera();
  return r;
}
