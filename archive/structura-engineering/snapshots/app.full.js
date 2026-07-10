import { Scene3D, MODES } from './scene3d.js?v=robot1';
import { speakClean, stopSpeaking, cleanForSpeech } from './tts.js';
import { LessonPlayer } from './lesson-player.js?v=young2';
import { VisualStage } from './lesson-visuals.js';
import { createMarketSim } from './market-sim.js';
import { createCodeLab } from './code-lab.js';
import { warmVoices } from './tts.js';
import { HeadsetController } from './headset.js';
import { ClassroomVision, hasWebcam } from './classroom-vision.js?v=cam1';
import {
  drawBlueprint,
  renderBuildPlan,
  captureFrame,
  fileToDataUrl,
} from './blueprint.js?v=bp1';


const $ = (id) => document.getElementById(id);

const state = {
  project: null,
  memory: null,
  projects: [],
  busy: false,
  scene3d: null,
  connectors: null,
  headset: null,
  activeVoiceTab: 'ask',
  askHistory: [],
  tutor: {
    children: [],
    child: null,
    history: [],
    busy: false,
    lesson: null,
    quiz: null,
    quizIdx: 0,
    quizSelected: null,
    quizScore: { correct: 0, total: 0 },
    lessons: [],
    subjects: [],
    subjectFilter: 'all',
    search: '',
    mode: 'lessons',
    completedIds: new Set(),
    modalLesson: null,
    modalQuizIdx: 0,
    modalQuizSelected: null,
    modalQuizScore: { correct: 0, total: 0 },
    path: null,
    pathFilter: 'all', // all | recommended | review | stretch | done
    ageFitOnly: true,
    selectedAge: 8,
    editAge: 8,
    lessonPlayer: null,
    lessonReadDone: false,
    visualStage: null,
    marketSim: null,
    codeLab: null,
    vision: null,
    visionOn: false,
    waitingForQuestion: false,
    classLog: [],
  },
  paper: {
    stream: null,
    imageDataUrl: null,
    busy: false,
  },
};

// Kids through adults — market & lessons grow with age
const TUTOR_AGES = [
  3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
  21, 25, 30, 40, 50, 60, 70, 80,
];

/** Exact BrightMind StockMarket.jsx disclaimer — do not weaken */
const INVESTING_DISCLAIMER_UI =
  'This is a simulation using fictional companies and play money. It is for educational purposes only and does not constitute financial advice. No real money is involved. Past simulated performance does not reflect real market outcomes.';

const BUILD_HINTS = [
  'Open Paper→Blueprint — I drew a house on paper',
  'Build a full humanoid robot head to toe, height 1.8 m',
  'Steel beam span 8 m, section 0.3×0.5 m, live 5 kN/m',
  'Concrete bridge span 40 m, deck 10 m wide, piers 6 m',
  'Timber cabin 6×5 m red clay brick walls',
  'Analyze this structure under full live load',
];

const ASK_HINTS = [
  'Help me with a school project',
  'Explain gravity simply',
  'What can you help me make?',
  'Idea for a project today',
];

const TUTOR_HINTS = [
  'Teach me about fractions — only real math',
  'Why is the sky blue?',
  'Quiz me on the solar system',
  'What is photosynthesis really?',
  'Help me check if this is true: the moon is cheese',
];

function md(text) {
  if (window.marked) return window.marked.parse(String(text || ''));
  return String(text || '').replace(/</g, '&lt;').replace(/\n/g, '<br>');
}

function setStatus(text, ok = true) {
  const el = $('statusLine');
  const dot = $('statusDot');
  if (el) el.textContent = text;
  if (dot) {
    dot.classList.toggle('ok', ok);
    dot.classList.toggle('bad', !ok);
  }
  const banner = $('offlineBanner');
  if (banner) banner.hidden = ok;
}

async function checkServerAlive() {
  try {
    const r = await fetch('/api/health', { signal: AbortSignal.timeout(2500) });
    if (!r.ok) throw new Error('bad status');
    const j = await r.json();
    setStatus(j.hasCli ? 'Ready' : 'Ready (no CLI)', true);
    return true;
  } catch {
    setStatus('Offline — open Grok Agent', false);
    return false;
  }
}

function friendlyFetchError(err) {
  const m = String(err?.message || err || '');
  if (/failed to fetch|networkerror|load failed|fetch/i.test(m)) {
    return 'Grok is not running. Double-click **Grok Agent** on your Desktop, wait for the page to open, then try again. (Keep using that page — do not open a random file.)';
  }
  return m;
}

function maybeSpeak(text) {
  if (!$('ttsToggle')?.checked) return;
  const age = Number(state.tutor?.child?.age) || 8;
  speakClean(text, { age, rate: 0.94, pitch: 1.12 });
}

function addMsg(containerId, role, content) {
  const box = $(containerId);
  if (!box) return;
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  if (role === 'assistant') div.innerHTML = `<div class="md">${md(content)}</div>`;
  else div.textContent = content;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

function clearMsgs(containerId) {
  const box = $(containerId);
  if (box) box.innerHTML = '';
}

/* ─── Tabs ─────────────────────────────────────────── */
function showTab(name) {
  document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
  $(`tab-${name}`)?.classList.add('active');
  if (name === 'build') {
    requestAnimationFrame(() => state.scene3d?.resize());
  }
  if (name === 'tutor') {
    loadTutorLessons();
  }
}

/* ─── Build chat hide / show ───────────────────────── */
const CHAT_HIDDEN_KEY = 'grok-build-chat-hidden';

function setBuildChatHidden(hidden) {
  const split = document.querySelector('.build-split');
  const toggleBtn = $('btnToggleChat');
  const fab = $('btnShowChat');
  if (!split) return;
  split.classList.toggle('chat-hidden', hidden);
  if (toggleBtn) toggleBtn.textContent = hidden ? 'Show chat' : 'Hide chat';
  if (fab) fab.hidden = !hidden;
  try {
    localStorage.setItem(CHAT_HIDDEN_KEY, hidden ? '1' : '0');
  } catch { /* ignore */ }
  requestAnimationFrame(() => state.scene3d?.resize());
}

function setupBuildChatToggle() {
  const apply = () => {
    let hidden = true; // default: hide chat so the 3D model is not covered
    try {
      const v = localStorage.getItem(CHAT_HIDDEN_KEY);
      if (v === '0') hidden = false;
      if (v === '1') hidden = true;
    } catch { /* ignore */ }
    setBuildChatHidden(hidden);
  };
  $('btnToggleChat')?.addEventListener('click', () => {
    const split = document.querySelector('.build-split');
    setBuildChatHidden(!split?.classList.contains('chat-hidden'));
  });
  $('btnHideChat')?.addEventListener('click', () => setBuildChatHidden(true));
  $('btnShowChat')?.addEventListener('click', () => setBuildChatHidden(false));
  apply();
}

function setupBuildLabelsToggle() {
  const btn = $('btnLabels');
  if (!btn) return;
  const apply = () => {
    const on = !!state.scene3d?.showLabels;
    btn.textContent = on ? 'Labels on' : 'Labels off';
    btn.classList.toggle('primary', on);
  };
  btn.addEventListener('click', () => {
    if (!state.scene3d) return;
    state.scene3d.setShowLabels(!state.scene3d.showLabels);
    apply();
  });
  apply();
}

/* ─── Build (3D) ───────────────────────────────────── */
function renderMessages() {
  clearMsgs('messages');
  for (const m of state.project?.messages || []) {
    addMsg('messages', m.role === 'user' ? 'user' : 'assistant', m.content);
  }
}

function renderSceneMeta() {
  const s = state.project?.scene;
  if (!s) return;
  const st = s.structure;
  $('sceneTitle').textContent = s.title || st?.name || 'Structural designer';
  if ($('sceneDesc')) {
    $('sceneDesc').textContent = s.description || '';
    $('sceneDesc').hidden = true;
  }
  $('partCount').textContent = `${s.objects?.length || 0} members`;

  const risk = s.analysis?.overall_risk || '—';
  const rp = $('riskPill');
  if (rp) {
    rp.textContent = `Risk ${risk}`;
    rp.className = `pill risk-${String(risk).toLowerCase()}`;
  }

  // Engineering meta panel
  const meta = $('structMeta');
  if (meta) {
    if (st || s.analysis) {
      const a = s.analysis || {};
      const d = st?.dimensions || {};
      const mats = (st?.materials || []).map((m) => `${m.name || m.type}${m.grade ? ' ' + m.grade : ''}`).join(', ') || a.material?.name || '—';
      const loads = (st?.loads || []).map((l) => `${l.type} ${l.magnitude}${l.unit || ''}`).join(' · ') || 'self-weight only';
      meta.innerHTML = `
        <div class="struct-grid">
          <div><span class="k">Type</span><span class="v">${esc(st?.type || a.type || '—')}</span></div>
          <div><span class="k">Dims</span><span class="v">${esc([d.length, d.width, d.height].filter((x) => x != null).join(' × '))} ${esc(d.unit || 'm')}</span></div>
          <div><span class="k">Material</span><span class="v">${esc(mats)}</span></div>
          <div><span class="k">Loads</span><span class="v">${esc(loads)}</span></div>
          <div><span class="k">Mass</span><span class="v">${a.mass_kg != null ? a.mass_kg + ' kg' : '—'}</span></div>
          <div><span class="k">σ_b (approx)</span><span class="v">${a.approx_bending_stress_mpa != null ? a.approx_bending_stress_mpa + ' MPa' : '—'}</span></div>
          <div><span class="k">δ (approx)</span><span class="v">${a.approx_deflection_mm != null ? a.approx_deflection_mm + ' mm' : '—'} <small>lim L/360 ≈ ${a.deflection_limit_L360_mm ?? '—'} mm</small></span></div>
          <div><span class="k">FOS (approx)</span><span class="v">${a.factor_of_safety_approx ?? '—'}</span></div>
        </div>
        ${a.assumptions?.length ? `<p class="sub eng-assumptions">${a.assumptions.map(esc).join(' · ')}</p>` : ''}
      `;
    } else {
      meta.innerHTML = `<p class="sub">Describe a structure with real dimensions (e.g. “steel beam span 8 m, live 5 kN/m”).</p>`;
    }
  }

  const list = $('partsList');
  if (!list) return;
  list.innerHTML = '';
  for (const o of s.objects || []) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'part-item';
    b.innerHTML = `<span class="swatch" style="background:${o.color || '#888'}"></span>${esc(o.label || o.id)} <small>${esc(o.material || o.type || '')}</small>`;
    b.onclick = () => {
      state.scene3d?.select(o.id);
      $('selectedInfo').textContent = `${o.label || o.id} · ${o.type} · ${o.material || ''}`;
    };
    list.appendChild(b);
  }
}

function renderProjects() {
  const box = $('projectList');
  if (!box) return;
  box.innerHTML = '';
  for (const p of state.projects || []) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'project-chip' + (state.project?.id === p.id ? ' active' : '');
    b.textContent = p.title || 'Build';
    b.onclick = () => loadProject(p.id);
    box.appendChild(b);
  }
}

function renderMemory() {
  const mem = state.memory;
  if (!mem) return;
  $('memUser').textContent = mem.userName ? `Hi ${mem.userName} — Grok remembers you` : 'Grok remembers what you make together';
  $('memFacts').innerHTML = (mem.facts || []).slice(-10).map((f) => `<li>${esc(f)}</li>`).join('') || '<li class="sub">Nothing yet</li>';
  $('memLessons').innerHTML = (mem.lessons || []).slice(-8).map((f) => `<li>${esc(f)}</li>`).join('') || '<li class="sub">Nothing yet</li>';
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

function applyScene(scene, frame = false) {
  if (!state.scene3d || !scene) return;
  state.scene3d.applyScene(scene);
  if (frame) state.scene3d.frameAll();
  renderSceneMeta();
  // Refresh blueprint UI if project has one
  if (state.project?.blueprint) {
    renderBlueprintUI(state.project.blueprint);
  }
}

/* ─── Paper → Blueprint → Build partner ─── */
function setPaperPanel(open) {
  const p = $('paperBlueprintPanel');
  if (p) p.hidden = !open;
  if (open) {
    setMaterialsOpen(false);
    renderBuildPlan($('buildPlanPanel'), state.project?.blueprint);
    if (state.project?.blueprint?.plan) {
      drawBlueprint($('blueprintCanvas'), state.project.blueprint.plan);
    }
  } else {
    stopPaperCamera();
  }
}

function setPaperStatus(msg) {
  if ($('paperBpStatus')) $('paperBpStatus').textContent = msg;
}

function stopPaperCamera() {
  if (state.paper.stream) {
    state.paper.stream.getTracks().forEach((t) => t.stop());
    state.paper.stream = null;
  }
  const v = $('paperCamVideo');
  if (v) v.srcObject = null;
  if ($('btnPaperSnap')) $('btnPaperSnap').disabled = true;
}

async function startPaperCamera() {
  try {
    stopPaperCamera();
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    state.paper.stream = stream;
    const v = $('paperCamVideo');
    if (v) {
      v.srcObject = stream;
      v.hidden = false;
      await v.play().catch(() => {});
    }
    if ($('paperSnapPreview')) $('paperSnapPreview').hidden = true;
    if ($('btnPaperSnap')) $('btnPaperSnap').disabled = false;
    setPaperStatus('Camera on — point at your paper house drawing, then Snap sketch.');
  } catch (e) {
    setPaperStatus('Camera unavailable — use Upload photo instead. ' + (e.message || ''));
  }
}

function showPaperSnap(dataUrl) {
  state.paper.imageDataUrl = dataUrl;
  const img = $('paperSnapPreview');
  const v = $('paperCamVideo');
  if (img) {
    img.src = dataUrl;
    img.hidden = false;
  }
  if (v) v.hidden = true;
  setPaperStatus('Sketch captured. Add notes/location, then Make blueprint + build plan.');
}

function renderBlueprintUI(bp) {
  if (!bp) return;
  renderBuildPlan($('buildPlanPanel'), bp);
  if (bp.plan) drawBlueprint($('blueprintCanvas'), bp.plan);
  const has = true;
  ['btnResearchPrices', 'btnResearchSubs', 'btnResearchBoth'].forEach((id) => {
    if ($(id)) $(id).disabled = !has;
  });
}

async function runPaperBlueprint() {
  if (state.paper.busy) return;
  if (!state.paper.imageDataUrl) {
    setPaperStatus('Snap or upload a sketch first.');
    return;
  }
  if (!state.project) {
    setPaperStatus('Create or open a project first (New).');
    return;
  }
  state.paper.busy = true;
  if ($('btnPaperBuild')) $('btnPaperBuild').disabled = true;
  setPaperStatus('Grok is reading your sketch and drafting a blueprint + full build plan… (may take a minute)');
  if ($('typing')) $('typing').hidden = false;

  try {
    const res = await fetch('/api/blueprint/from-sketch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: state.project.id,
        imageDataUrl: state.paper.imageDataUrl,
        notes: $('paperNotes')?.value || '',
        location: $('paperLocation')?.value || '',
        wallMaterial: $('paperWallMat')?.value || 'red clay brick',
        units: 'ft',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Blueprint failed');

    state.project = await fetch(`/api/projects/${data.projectId}`).then((r) => r.json());
    state.project.blueprint = data.blueprint;
    applyScene(data.scene || state.project.scene, true);
    renderMessages();
    renderProjects();
    renderBlueprintUI(data.blueprint);
    addMsg('messages', 'assistant', data.message || 'Blueprint ready.');
    maybeSpeak(cleanForSpeech(data.message || 'Blueprint ready. Review the plan together.').slice(0, 280));
    setPaperStatus('Blueprint ready — 3D house + plan + clay-to-roof phases. Research prices or contractors next.');
    if ($('viewport')) {
      $('viewport').classList.add('flash');
      setTimeout(() => $('viewport')?.classList.remove('flash'), 500);
    }
  } catch (e) {
    setPaperStatus(friendlyFetchError(e));
    addMsg('messages', 'assistant', `**Blueprint error:** ${friendlyFetchError(e)}`);
  } finally {
    state.paper.busy = false;
    if ($('btnPaperBuild')) $('btnPaperBuild').disabled = false;
    if ($('typing')) $('typing').hidden = true;
  }
}

async function runBlueprintResearch(focus) {
  if (!state.project?.id) return;
  if (state.paper.busy) return;
  state.paper.busy = true;
  setPaperStatus(`Live Grok research (${focus}) — searching prices / contractors…`);
  if ($('typing')) $('typing').hidden = false;
  try {
    const res = await fetch('/api/blueprint/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: state.project.id,
        focus,
        location: $('paperLocation')?.value || '',
        notes: $('paperNotes')?.value || '',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Research failed');
    state.project.blueprint = data.blueprint;
    renderBlueprintUI(data.blueprint);
    addMsg('messages', 'assistant', data.message || 'Research complete.');
    maybeSpeak(cleanForSpeech(data.message || 'Research complete.').slice(0, 240));
    setPaperStatus('Research updated — scroll the build plan for prices & contractor guidance.');
  } catch (e) {
    setPaperStatus(friendlyFetchError(e));
  } finally {
    state.paper.busy = false;
    if ($('typing')) $('typing').hidden = true;
  }
}

function setupPaperBlueprint() {
  $('btnPaper')?.addEventListener('click', () => {
    const p = $('paperBlueprintPanel');
    setPaperPanel(!!p?.hidden);
  });
  $('btnPaperClose')?.addEventListener('click', () => setPaperPanel(false));
  $('btnPaperCam')?.addEventListener('click', () => startPaperCamera());
  $('btnPaperSnap')?.addEventListener('click', () => {
    const dataUrl = captureFrame($('paperCamVideo'));
    if (!dataUrl) {
      setPaperStatus('No camera frame yet — wait a second and try again.');
      return;
    }
    showPaperSnap(dataUrl);
  });
  $('paperFile')?.addEventListener('change', async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const url = await fileToDataUrl(f);
      stopPaperCamera();
      showPaperSnap(url);
    } catch {
      setPaperStatus('Could not read that image file.');
    }
  });
  $('btnPaperBuild')?.addEventListener('click', () => runPaperBlueprint());
  $('btnResearchPrices')?.addEventListener('click', () => runBlueprintResearch('prices'));
  $('btnResearchSubs')?.addEventListener('click', () => runBlueprintResearch('contractors'));
  $('btnResearchBoth')?.addEventListener('click', () => runBlueprintResearch('both'));

  // Resize blueprint canvas with window
  window.addEventListener('resize', () => {
    if (state.project?.blueprint?.plan && !$('paperBlueprintPanel')?.hidden) {
      drawBlueprint($('blueprintCanvas'), state.project.blueprint.plan);
    }
  });
}

async function loadAgentIdentity() {
  try {
    const agent = await fetch('/api/agent').then((r) => r.json());
    state.agent = agent;
    const set = (id, text) => { if ($(id)) $(id).textContent = text || ''; };
    set('discEdu', agent.disclaimers?.educational);
    set('discMarket', agent.disclaimers?.market);
    set('discHome', agent.disclaimers?.homeschool);
    set('discStruct', agent.disclaimers?.structural);
    set('discMat', agent.disclaimers?.materials);
    set('discSim', agent.disclaimers?.simulation);
    renderMaterialsCatalog(agent.materials || []);
  } catch { /* ignore */ }
}

function renderMaterialsCatalog(list) {
  const box = $('materialsList');
  if (!box) return;
  box.innerHTML = '';
  for (const m of list) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'mat-row';
    row.innerHTML = `
      <span class="swatch" style="background:${m.color || '#888'}"></span>
      <span class="mat-body">
        <strong>${esc(m.name)}</strong>
        <small>${esc(m.category)} · ${esc(m.grade || '—')}</small>
        <small>ρ ${m.density} kg/m³ · E ${m.youngs_modulus_gpa} GPa · fy ${m.yield_mpa} MPa</small>
      </span>`;
    row.onclick = () => {
      sendBuild(
        `Use primary material ${m.name} (grade ${m.grade || m.id}). Density ${m.density} kg/m³, E=${m.youngs_modulus_gpa} GPa, fy=${m.yield_mpa} MPa. Update structure materials and rebuild.`,
      );
      setMaterialsOpen(false);
    };
    box.appendChild(row);
  }
}

function setMaterialsOpen(on) {
  const p = $('materialsPanel');
  if (p) p.hidden = !on;
}

async function bootstrap() {
  const h = await fetch('/api/health').then((r) => r.json()).catch(() => null);
  if (!h?.ready) setStatus('Run: grok login', false);
  else setStatus(h.tagline ? 'Ready · unified' : 'Ready', true);

  await loadAgentIdentity();

  const data = await fetch('/api/bootstrap').then((r) => r.json());
  state.project = data.project;
  state.memory = data.memory;
  state.projects = data.projects || [];
  renderMessages();
  renderMemory();
  renderProjects();
  applyScene(state.project.scene, true);
}

async function loadProject(id) {
  state.project = await fetch(`/api/projects/${id}`).then((r) => r.json());
  renderMessages();
  renderProjects();
  applyScene(state.project.scene, true);
}

async function newProject() {
  const title = prompt('Name this build:', 'New build') || 'New build';
  state.project = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  }).then((r) => r.json());
  const list = await fetch('/api/projects').then((r) => r.json());
  state.projects = list.projects || [];
  state.memory = list.memory || state.memory;
  renderMessages();
  renderProjects();
  renderMemory();
  applyScene(state.project.scene, true);
}

async function sendBuild(text) {
  const msg = (text || $('input').value || '').trim();
  if (!msg || state.busy || !state.project) return;
  $('input').value = '';
  state.busy = true;
  $('btnSend').disabled = true;
  $('typing').hidden = false;
  state.project.messages.push({ role: 'user', content: msg });
  renderMessages();

  try {
    const res = await fetch('/api/build', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: state.project.id,
        message: msg,
        scene: state.scene3d?.getSceneData() || state.project.scene,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');
    state.project = await fetch(`/api/projects/${data.projectId}`).then((r) => r.json());
    state.memory = data.memory || state.memory;
    const list = await fetch('/api/projects').then((r) => r.json());
    state.projects = list.projects || state.projects;
    renderMessages();
    renderMemory();
    renderProjects();
    applyScene(data.scene || state.project.scene, data.sceneChanged);
    if (data.sceneChanged) {
      $('viewport')?.classList.add('flash');
      setTimeout(() => $('viewport')?.classList.remove('flash'), 400);
    }
    maybeSpeak(data.message);
  } catch (e) {
    state.project.messages.push({ role: 'assistant', content: friendlyFetchError(e) });
    renderMessages();
    checkServerAlive();
  } finally {
    state.busy = false;
    $('btnSend').disabled = false;
    $('typing').hidden = true;
  }
}

/* ─── General Grok help ────────────────────────────── */
async function askGrok(message, { boxId, mode = 'general', context = '' } = {}) {
  const msg = String(message || '').trim();
  if (!msg) return null;
  addMsg(boxId, 'user', msg);
  try {
    const res = await fetch('/api/help', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg, mode, context }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');
    addMsg(boxId, 'assistant', data.message);
    maybeSpeak(data.message);
    if (data.memory) {
      state.memory = data.memory;
      renderMemory();
    }
    return data;
  } catch (e) {
    addMsg(boxId, 'assistant', friendlyFetchError(e));
    checkServerAlive();
    return null;
  }
}

/* ─── Super Tutor (local, truth-seeking, no Base44) ── */
async function tutorApi(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Tutor error ${res.status}`);
  return data;
}

function setTutorMode(mode) {
  state.tutor.mode = mode;
  document.querySelectorAll('.tutor-mode-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.tutorMode === mode);
  });
  if ($('tutorLessonsView')) $('tutorLessonsView').hidden = mode !== 'lessons';
  if ($('tutorChatView')) $('tutorChatView').hidden = mode !== 'chat';
  if ($('tutorMarketView')) $('tutorMarketView').hidden = mode !== 'market';
  if ($('tutorCodeView')) $('tutorCodeView').hidden = mode !== 'code';

  if (mode !== 'market') state.tutor.marketSim?.stop();
  if (mode !== 'code') state.tutor.codeLab?.stop();

  if (mode === 'lessons') loadTutorLessons();
  if (mode === 'market') {
    const el = $('tutorMarketView');
    if (el && !state.tutor.marketSim) {
      state.tutor.marketSim = createMarketSim(el, {
        getChildName: () => state.tutor.child?.name || 'friend',
        getAge: () => state.tutor.child?.age ?? 10,
      });
    }
    state.tutor.marketSim?.refreshTier?.();
    state.tutor.marketSim?.start();
  }
  if (mode === 'code') {
    const el = $('tutorCodeView');
    if (el && !state.tutor.codeLab) {
      state.tutor.codeLab = createCodeLab(el, {
        getChild: () => state.tutor.child,
        askGrok: async (prompt) => {
          const child = state.tutor.child || {};
          const data = await tutorApi('/api/tutor', {
            method: 'POST',
            body: JSON.stringify({
              message: [
                '[Active class lesson: "Code Lab" · subject: coding]',
                `Student (${child.name || 'friend'}, age ${child.age ?? '?'}) asked:`,
                prompt,
                '',
                'Stay on coding help for this challenge. Truth only. Do not switch to unrelated lessons.',
              ].join('\n'),
              history: [],
              childId: child.id,
              child,
              context: {
                classroom: true,
                coding: true,
                lessonTitle: 'Code Lab',
                lessonSubject: 'coding',
                lessonSnippet: String(prompt || '').slice(0, 2000),
              },
            }),
          });
          return data.message || '';
        },
      });
    }
    state.tutor.codeLab?.start();
  }
}

function renderAgeChecks(containerId, selectedAge, onPick) {
  const box = $(containerId);
  if (!box) return;
  box.innerHTML = '';
  for (const age of TUTOR_AGES) {
    const lab = document.createElement('label');
    lab.className = age === selectedAge ? 'on' : '';
    const inp = document.createElement('input');
    inp.type = 'checkbox';
    inp.checked = age === selectedAge;
    inp.onclick = (e) => {
      e.preventDefault();
      onPick(age);
      renderAgeChecks(containerId, age, onPick);
    };
    lab.append(inp, document.createTextNode(` ${age}`));
    box.appendChild(lab);
  }
}

function renderTutorChildren() {
  const box = $('tutorChildList');
  if (!box) return;
  box.innerHTML = '';
  for (const c of state.tutor.children) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tutor-child-btn' + (state.tutor.child?.id === c.id ? ' active' : '');
    b.innerHTML = `<span>${esc(c.avatar || '🌟')} ${esc(c.name)} · age ${c.age}</span>`;
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'del';
    del.textContent = '✕';
    del.title = 'Remove kid (admin)';
    del.onclick = async (e) => {
      e.stopPropagation();
      if (!confirm(`Remove ${c.name}? Their progress will be cleared.`)) return;
      await tutorApi(`/api/tutor/children/${c.id}`, { method: 'DELETE' });
      if (state.tutor.child?.id === c.id) {
        state.tutor.child = null;
        state.tutor.path = null;
      }
      await loadTutorChildren();
    };
    b.appendChild(del);
    b.onclick = () => selectTutorChild(c);
    box.appendChild(b);
  }
  renderTutorStats();
  renderTutorEditBox();
}

function renderTutorEditBox() {
  const box = $('tutorEditBox');
  if (!box) return;
  const c = state.tutor.child;
  if (!c) {
    box.hidden = true;
    return;
  }
  box.hidden = false;
  if ($('tutorEditName')) $('tutorEditName').value = c.name || '';
  state.tutor.editAge = c.age || 8;
  renderAgeChecks('tutorEditAgeChecks', state.tutor.editAge, (age) => {
    state.tutor.editAge = age;
  });
}

function renderTutorStats() {
  const el = $('tutorChildStats');
  if (!el) return;
  const c = state.tutor.child;
  if (!c) {
    el.textContent = 'Admin: add a kid (username + age), then pick who is learning.';
    return;
  }
  const skills = c.skillLevels || state.tutor.path?.skillLevels || {};
  const skillLine = Object.keys(skills).length
    ? Object.entries(skills).slice(0, 6).map(([k, v]) => `${k}:${v}`).join(' · ')
    : 'skills: starting beginner';
  el.innerHTML = `<strong>${esc(c.name)}</strong> · age ${c.age}<br>Level ${c.level || 1} · ${c.xp || 0} XP · 🔥 ${c.streak || 0}<br>${esc(skillLine)}<br><span class="sub">${state.tutor.completedIds.size} lessons done · path evolves after quizzes</span>`;
}

function renderTutorPathBox() {
  const el = $('tutorPathBox');
  if (!el) return;
  const path = state.tutor.path;
  if (!path || !state.tutor.child) {
    el.innerHTML = 'Select a kid to see their evolving path.';
    return;
  }
  const notes = (path.evolutionNotes || []).slice(0, 3).map((n) => `• ${esc(n)}`).join('<br>') || '• Complete quizzes — lessons get harder or review as needed';
  el.innerHTML = `<strong>Path for ${esc(path.child.name)}</strong><br>${esc(path.message)}<br>${notes}`;
}

async function loadTutorPath() {
  if (!state.tutor.child?.id) {
    state.tutor.path = null;
    renderTutorPathBox();
    return;
  }
  try {
    state.tutor.path = await tutorApi(`/api/tutor/path/${state.tutor.child.id}`);
    if (state.tutor.path.child) {
      state.tutor.child = state.tutor.path.child;
      const i = state.tutor.children.findIndex((c) => c.id === state.tutor.child.id);
      if (i >= 0) state.tutor.children[i] = state.tutor.child;
    }
    const done = (state.tutor.path.lessons || []).filter((l) => l.done).map((l) => l.id);
    state.tutor.completedIds = new Set(done);
    renderTutorStats();
    renderTutorPathBox();
    renderTutorNextUp();
    renderTutorLessonGrid();
  } catch (e) {
    console.warn(e);
  }
}

function renderTutorNextUp() {
  const box = $('tutorNextUp');
  if (!box) return;
  const next = state.tutor.path?.nextUp || [];
  if (!next.length || !state.tutor.child) {
    box.hidden = true;
    box.innerHTML = '';
    return;
  }
  box.hidden = false;
  box.innerHTML = `<h4>✨ Next for ${esc(state.tutor.child.name)} (age ${state.tutor.child.age})</h4><div class="chips" id="tutorNextChips"></div>`;
  const chips = $('tutorNextChips');
  for (const L of next) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = `${L.emoji || '📚'} ${L.title}`;
    b.onclick = () => openTutorLessonModal(L);
    chips.appendChild(b);
  }
}

async function loadTutorChildren() {
  try {
    const data = await tutorApi('/api/tutor/children');
    state.tutor.children = data.children || [];
    if (state.tutor.child) {
      state.tutor.child = state.tutor.children.find((c) => c.id === state.tutor.child.id) || null;
    }
    if (!state.tutor.child && state.tutor.children[0]) {
      state.tutor.child = state.tutor.children[0];
    }
    renderTutorChildren();
    if (state.tutor.child && !state.tutor.history.length) {
      greetTutor();
    }
    await loadTutorProgressIds();
    await loadTutorLessons();
  } catch (e) {
    console.warn(e);
  }
}

async function loadTutorProgressIds() {
  state.tutor.completedIds = new Set();
  if (!state.tutor.child?.id) return;
  try {
    const data = await tutorApi(`/api/tutor/progress/${state.tutor.child.id}`);
    for (const id of data.completedLessonIds || []) state.tutor.completedIds.add(id);
  } catch {
    try {
      const key = `tutor-done-${state.tutor.child.id}`;
      const raw = localStorage.getItem(key);
      if (raw) state.tutor.completedIds = new Set(JSON.parse(raw));
    } catch { /* ignore */ }
  }
  renderTutorLessonGrid();
  renderTutorStats();
}

function markLessonDone(lessonId) {
  if (!lessonId) return;
  state.tutor.completedIds.add(lessonId);
  try {
    const key = state.tutor.child?.id ? `tutor-done-${state.tutor.child.id}` : null;
    if (key) localStorage.setItem(key, JSON.stringify([...state.tutor.completedIds]));
  } catch { /* ignore */ }
  renderTutorLessonGrid();
  renderTutorStats();
}

async function loadTutorLessons() {
  try {
    // Prefer evolving path when a kid is selected
    if (state.tutor.child?.id) {
      await loadTutorPath();
      const pathLessons = state.tutor.path?.lessons || [];
      state.tutor.lessons = pathLessons;
      state.tutor.subjects = [...new Set(pathLessons.map((l) => l.subject).filter(Boolean))].sort();
    } else {
      const params = new URLSearchParams();
      if (state.tutor.subjectFilter && state.tutor.subjectFilter !== 'all') {
        params.set('subject', state.tutor.subjectFilter);
      }
      if (state.tutor.search) params.set('q', state.tutor.search);
      const data = await tutorApi(`/api/tutor/lessons?${params}`);
      state.tutor.lessons = (data.lessons || []).map((l) => ({ ...l, pathStatus: 'available' }));
      state.tutor.subjects = data.subjects || [];
    }
    renderTutorSubjects();
    renderTutorPathFilters();
    renderTutorLessonGrid();
  } catch (e) {
    console.warn(e);
  }
}

function renderTutorPathFilters() {
  const box = $('tutorPathFilters');
  if (!box) return;
  const opts = [
    { key: 'all', label: 'All path' },
    { key: 'recommended', label: '✨ Recommended' },
    { key: 'review', label: '🔁 Review' },
    { key: 'stretch', label: '🚀 Stretch' },
    { key: 'done', label: '✓ Done' },
  ];
  box.innerHTML = '';
  for (const o of opts) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    if (state.tutor.pathFilter === o.key) {
      b.style.background = 'linear-gradient(135deg, #8b5cf6, #22d3ee)';
      b.style.color = '#0a0a12';
      b.style.borderColor = 'transparent';
      b.style.fontWeight = '700';
    }
    b.textContent = o.label;
    b.onclick = () => {
      state.tutor.pathFilter = o.key;
      renderTutorPathFilters();
      renderTutorLessonGrid();
    };
    box.appendChild(b);
  }
}

function renderTutorSubjects() {
  const box = $('tutorSubjectFilters');
  if (!box) return;
  const all = ['all', ...state.tutor.subjects];
  const labels = {
    all: '✨ All',
    animals: '🦁 Animals',
    math: '🔢 Math',
    science: '🔬 Science',
    reading: '📖 Reading',
    history: '🏺 History',
    space: '🪐 Space',
    geography: '🌍 Geography',
    health: '💪 Health',
    coding: '💻 Coding',
    investing: '📈 Investing',
    art: '🎨 Art',
    general: '📚 General',
  };
  box.innerHTML = '';
  for (const s of all) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (state.tutor.subjectFilter === s ? ' active' : '');
    if (state.tutor.subjectFilter === s) {
      b.style.background = 'linear-gradient(135deg, #8b5cf6, #22d3ee)';
      b.style.color = '#0a0a12';
      b.style.borderColor = 'transparent';
      b.style.fontWeight = '700';
    }
    b.textContent = labels[s] || s;
    b.onclick = () => {
      state.tutor.subjectFilter = s;
      renderTutorSubjects();
      renderTutorLessonGrid();
    };
    box.appendChild(b);
  }
}

function filteredPathLessons() {
  let list = state.tutor.lessons || [];
  if (state.tutor.subjectFilter && state.tutor.subjectFilter !== 'all') {
    list = list.filter((l) => String(l.subject).toLowerCase() === state.tutor.subjectFilter);
  }
  if (state.tutor.search) {
    const s = state.tutor.search.toLowerCase();
    list = list.filter((l) =>
      `${l.title} ${l.description} ${l.subject} ${l.content || ''}`.toLowerCase().includes(s));
  }
  if (state.tutor.ageFitOnly && state.tutor.child) {
    list = list.filter((l) => !['too_young', 'too_old'].includes(l.pathStatus));
  }
  if (state.tutor.pathFilter && state.tutor.pathFilter !== 'all') {
    list = list.filter((l) => l.pathStatus === state.tutor.pathFilter
      || (state.tutor.pathFilter === 'recommended' && l.pathStatus === 'available'));
  }
  return list;
}

function renderTutorLessonGrid() {
  const grid = $('tutorLessonGrid');
  if (!grid) return;
  grid.innerHTML = '';
  const list = filteredPathLessons();
  if ($('tutorLessonCount')) {
    $('tutorLessonCount').textContent = `${list.length} lessons`;
  }
  if (!list.length) {
    grid.innerHTML = '<p class="sub" style="grid-column:1/-1;padding:24px;text-align:center">No lessons match. Pick a kid, clear filters, or Ask Grok to create one.</p>';
    return;
  }
  const badge = {
    recommended: '✨ For you',
    review: '🔁 Review',
    stretch: '🚀 Stretch',
    done: '✓ Done',
    available: 'Open',
    too_young: 'Age+',
    too_old: 'Younger',
  };
  for (const lesson of list) {
    const st = lesson.pathStatus || 'available';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `lesson-pic-card ${st === 'recommended' ? 'rec' : ''} ${st === 'review' ? 'review' : ''} ${st === 'stretch' ? 'stretch' : ''} ${st === 'done' ? 'done' : ''} ${['too_young', 'too_old'].includes(st) ? 'blocked' : ''}`;
    const badgeEl = document.createElement('span');
    badgeEl.className = 'badge-path';
    badgeEl.textContent = badge[st] || st;
    const img = document.createElement('img');
    img.alt = `${lesson.emoji || ''} ${lesson.title || 'Lesson'}`;
    img.loading = 'lazy';
    if (lesson.picture) img.src = lesson.picture;
    const body = document.createElement('div');
    body.className = 'body';
    body.innerHTML = `
      <h3>${esc(lesson.emoji || '📚')} ${esc(lesson.title || 'Lesson')}</h3>
      <p>${esc(lesson.pathReason || lesson.description || '')}</p>
      <div class="meta">
        <span>${esc(lesson.subject || '')} · ${esc(lesson.difficulty || '')}</span>
        <span class="xp">+${lesson.xp_reward || 10} XP</span>
      </div>
    `;
    btn.append(badgeEl, img, body);
    btn.onclick = () => {
      if (['too_young', 'too_old'].includes(st) && !confirm('This lesson is outside their usual age range. Open anyway?')) return;
      openTutorLessonModal(lesson);
    };
    grid.appendChild(btn);
  }
}

function ensureVisualStage() {
  if (!state.tutor.visualStage && $('tutorVisualStage')) {
    state.tutor.visualStage = new VisualStage($('tutorVisualStage'));
  }
  return state.tutor.visualStage;
}

function ensureLessonPlayer() {
  if (state.tutor.lessonPlayer) return state.tutor.lessonPlayer;
  state.tutor.lessonPlayer = new LessonPlayer({
    getRate: () => {
      const age = Number(state.tutor.child?.age) || 8;
      if (age <= 5) return 0.82;
      if (age <= 7) return 0.86;
      if (age <= 10) return 0.92;
      return 0.96;
    },
    onProgress: (index, total, lines) => {
      renderClassroomTalk(lines, index);
      // Change picture when teacher moves to a new idea (see + hear)
      if (lines?.[index]?.kind === 'content' || lines?.[index]?.kind === 'open') {
        state.tutor.visualStage?.next();
      }
      const fill = $('tutorLessonProgressFill');
      const done = state.tutor.lessonPlayer?.state === 'done';
      if (fill) {
        fill.style.width = `${done ? 100 : Math.round((index / Math.max(total, 1)) * 100)}%`;
      }
      const pt = $('tutorLessonProgressText');
      if (pt) {
        if (done) {
          pt.innerHTML = '✅ <strong>Class finished.</strong> Ask a question, or press <strong>Start quiz</strong>.';
        } else if (state.tutor.lessonPlayer?.state === 'paused') {
          pt.innerHTML = '⏸ Teacher paused. Press <strong>Continue</strong> when you are ready.';
        } else if (state.tutor.lessonPlayer?.state === 'playing') {
          pt.innerHTML = `👩‍🏫 Look at the pictures while I teach. (${Math.min(index + 1, total)} / ${total})`;
        } else {
          pt.innerHTML = 'Sit down and press <strong>Start class</strong>. You will hear and see the lesson.';
        }
      }
    },
    onEnd: () => {
      state.tutor.lessonReadDone = true;
      updateLessonPlayerButtons('done');
      state.tutor.visualStage?.stopAuto();
      if ($('tutorModalPhase')) $('tutorModalPhase').textContent = 'Quiz time';
      appendClassLog('teacher', 'That is the end of our lesson. Any questions before the quiz?');
    },
    onState: (st) => {
      updateLessonPlayerButtons(st);
      if ($('tutorModalPhase')) {
        $('tutorModalPhase').textContent =
          st === 'playing' ? 'In class'
            : st === 'paused' ? 'Paused'
              : st === 'done' ? 'Quiz time'
                : 'Class';
      }
      if (st === 'playing') state.tutor.visualStage?.startAuto(8000);
      if (st === 'paused' || st === 'idle') state.tutor.visualStage?.stopAuto();
    },
  });
  return state.tutor.lessonPlayer;
}

function setTeacherBubble(text) {
  const line = $('tutorTeacherLine');
  if (line) line.innerHTML = text;
}

function appendClassLog(who, text) {
  const log = $('tutorClassLog');
  if (!log) return;
  const role = who === 'student' ? 'student' : 'teacher';
  const line = String(text || '').trim();
  if (!line) return;
  // In-memory buffer for API history (reliable; DOM alone can lag/miss)
  if (!Array.isArray(state.tutor.classLog)) state.tutor.classLog = [];
  state.tutor.classLog.push({ who: role, text: line });
  if (state.tutor.classLog.length > 40) state.tutor.classLog = state.tutor.classLog.slice(-40);

  const div = document.createElement('div');
  div.className = `class-msg ${role}`;
  const label = role === 'student'
    ? (state.tutor.child?.name || 'You')
    : 'Teacher Grok';
  div.innerHTML = `<div class="who">${esc(label)}</div><div class="class-msg-body">${esc(line)}</div>`;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

function renderClassroomTalk(lines, activeIndex) {
  const line = lines?.[activeIndex];
  if (line?.text) {
    setTeacherBubble(esc(line.text));
  }
  // Mirror recent teacher content lines in the class log (avoid spam bridges)
  const log = $('tutorClassLog');
  if (!log || !line || line.kind === 'bridge') return;
  // Only append when index advances to a new content/open/close
  if (state.tutor._lastLogIndex === activeIndex) return;
  state.tutor._lastLogIndex = activeIndex;
  if (line.kind === 'content' || line.kind === 'open' || line.kind === 'close') {
    appendClassLog('teacher', line.text);
  }
}

function updateLessonPlayerButtons(st) {
  const start = $('tutorLessonStart');
  const pause = $('tutorLessonPause');
  const cont = $('tutorLessonContinue');
  if (start) {
    start.disabled = st === 'playing';
    start.textContent = st === 'done' || (st === 'idle' && state.tutor.lessonReadDone)
      ? '▶ Restart class'
      : '▶ Start class';
  }
  if (pause) pause.disabled = st !== 'playing';
  if (cont) cont.disabled = st !== 'paused';
}

/** Recent class-log turns so the teacher keeps lesson + kid continuity. */
function getClassroomHistory(limit = 10) {
  if (Array.isArray(state.tutor.classLog) && state.tutor.classLog.length) {
    return state.tutor.classLog.slice(-limit).map((e) => ({
      role: e.who === 'teacher' ? 'assistant' : 'user',
      content: String(e.text || '').slice(0, 1500),
    }));
  }
  const log = $('tutorClassLog');
  if (!log) return [];
  return [...log.querySelectorAll('.class-msg')].slice(-limit).map((el) => {
    const isTeacher = el.classList.contains('teacher');
    const body = el.querySelector('.class-msg-body')?.textContent?.trim()
      || el.querySelector('div:not(.who)')?.textContent?.trim()
      || '';
    return {
      role: isTeacher ? 'assistant' : 'user',
      content: body.slice(0, 1500),
    };
  }).filter((m) => m.content);
}

async function askTeacherInClass() {
  const q = ($('tutorClassAsk')?.value || '').trim();
  if (!q || !state.tutor.modalLesson) return;
  if ($('tutorClassAsk')) $('tutorClassAsk').value = '';

  const player = ensureLessonPlayer();
  const wasPlaying = player.state === 'playing' || state.tutor._wasPlayingBeforeRaise;
  player.holdForQuestion();
  state.tutor.waitingForQuestion = false;
  state.tutor._wasPlayingBeforeRaise = false;
  const banner = $('tutorHandRaiseBanner');
  if (banner) banner.hidden = true;

  // Capture prior class talk before logging this turn (avoid double user message)
  const priorHistory = getClassroomHistory(8);
  appendClassLog('student', q);
  setTeacherBubble('Good question! Let me answer that.');

  const L = state.tutor.modalLesson;
  const child = state.tutor.child || { name: 'friend', age: 8 };
  // Anchor the message to the open lesson so truth-seeking cannot "pivot" topics.
  const anchoredMessage = [
    `[Active class lesson: "${L.title || 'Untitled'}" · subject: ${L.subject || 'general'}]`,
    `Student (${child.name || 'friend'}, age ${child.age ?? '?'}) raised their hand and asked:`,
    q,
    '',
    'Stay on THIS lesson. Deepen true facts about this topic only — do not switch to another lesson.',
  ].join('\n');
  try {
    const data = await tutorApi('/api/tutor', {
      method: 'POST',
      body: JSON.stringify({
        message: anchoredMessage,
        history: priorHistory,
        childId: child.id,
        child,
        context: {
          classroom: true,
          handRaised: true,
          lessonId: L.id || null,
          lessonTitle: L.title,
          lessonSubject: L.subject,
          lessonSnippet: String(L.content || '').slice(0, 2500),
        },
      }),
    });
    const reply = data.message || 'Let us think about that carefully.';
    const spoken = cleanForSpeech(reply).slice(0, 500);
    appendClassLog('teacher', reply);
    setTeacherBubble(esc(spoken));
    if ($('tutorModalPhase')) $('tutorModalPhase').textContent = 'Answering';
    speakClean(spoken, {
      age: Number(child.age) || 8,
      rate: Number(child.age) <= 7 ? 0.88 : 0.94,
      pitch: 1.12,
      onend: () => {
        // After answering, offer to continue class
        const wrap = ageContinueMsg(child);
        appendClassLog('teacher', wrap);
        if (wasPlaying) {
          setTimeout(() => {
            if (player.state === 'paused') {
              player.continue();
              if ($('tutorModalPhase')) $('tutorModalPhase').textContent = 'In class';
            }
          }, 600);
        }
      },
    });
  } catch (e) {
    const msg = e.message || 'I lost my train of thought. Ask me again in a moment.';
    appendClassLog('teacher', msg);
    setTeacherBubble(esc(msg));
    state.tutor.waitingForQuestion = false;
    if (wasPlaying) player.continue();
  }
}

function ageContinueMsg(child) {
  const name = child?.name || 'friend';
  const age = Number(child?.age) || 8;
  return age <= 7
    ? `Great question, ${name}! Let’s keep learning.`
    : `Thanks for asking, ${name}. Let’s continue the lesson.`;
}

function getNextPathLesson(current) {
  const list = state.tutor.path?.nextUp || state.tutor.path?.lessons || state.tutor.lessons || [];
  const open = list.filter((l) => l.id !== current?.id && !['done', 'too_young', 'too_old'].includes(l.pathStatus));
  if (open.length) return open[0];
  const all = (state.tutor.path?.lessons || state.tutor.lessons || []).filter((l) => l.id !== current?.id);
  return all[0] || null;
}

function updateNextLessonButton() {
  const btn = $('tutorModalNextLesson');
  if (!btn) return;
  const next = getNextPathLesson(state.tutor.modalLesson);
  if (next) {
    btn.hidden = false;
    btn.textContent = `➡ Next: ${next.emoji || ''} ${next.title}`.slice(0, 48);
    btn.dataset.nextId = next.id;
  } else {
    btn.hidden = true;
    delete btn.dataset.nextId;
  }
}

function openTutorLessonModal(lesson) {
  state.tutor.modalLesson = lesson;
  state.tutor.lesson = lesson; // free chat + teacher stay on this lesson
  state.tutor.modalQuizIdx = 0;
  state.tutor.modalQuizSelected = null;
  state.tutor.modalQuizScore = { correct: 0, total: 0 };
  state.tutor.lessonReadDone = false;
  state.tutor._lastLogIndex = -1;
  state.tutor.classLog = [];
  const modal = $('tutorLessonModal');
  if (!modal) return;
  modal.hidden = false;
  const child = state.tutor.child || { name: 'friend', age: 8 };

  if ($('tutorModalSubject')) $('tutorModalSubject').textContent = lesson.subject || 'class';
  if ($('tutorModalDiff')) $('tutorModalDiff').textContent = lesson.difficulty || 'beginner';
  if ($('tutorModalXp')) $('tutorModalXp').textContent = `+${lesson.xp_reward || 10} XP`;
  if ($('tutorModalTitle')) $('tutorModalTitle').textContent = `${lesson.emoji || '📚'} ${lesson.title || 'Class'}`;
  if ($('tutorModalDesc')) $('tutorModalDesc').textContent = lesson.description || '';
  if ($('tutorModalPhase')) $('tutorModalPhase').textContent = 'Class';
  if ($('classroomSeatLabel')) {
    $('classroomSeatLabel').textContent = `${child.name || 'Student'} · age ${child.age ?? '?'}`;
  }
  if ($('tutorClassLog')) $('tutorClassLog').innerHTML = '';

  const disc = $('tutorModalDisclaimer');
  if (disc) {
    const isInvest = String(lesson.subject || '').toLowerCase() === 'investing'
      || /stock|crypto|invest|market|money|compound|diversif/i.test(`${lesson.title} ${lesson.content}`);
    if (isInvest) {
      disc.hidden = false;
      disc.innerHTML = `⚠️ <strong>Educational Disclaimer:</strong> ${esc(INVESTING_DISCLAIMER_UI)}`;
    } else {
      disc.hidden = true;
      disc.innerHTML = '';
    }
  }
  const qa = $('tutorModalQuizArea');
  if (qa) { qa.hidden = true; qa.innerHTML = ''; }

  // Load pictures / video for see+hear teaching
  warmVoices();
  ensureVisualStage()?.load(lesson);
  // Probe camera; optional auto-start when class begins
  probeCameraOnOpen();
  state.tutor.waitingForQuestion = false;
  if ($('tutorHandRaiseBanner')) $('tutorHandRaiseBanner').hidden = true;

  const player = ensureLessonPlayer();
  player.stop();
  const lines = player.load(lesson, child);
  const welcome = lines[0]?.text
    || `Hi ${child.name || 'friend'}! Have a seat. Press Start class when you are ready.`;
  setTeacherBubble(esc(welcome));
  appendClassLog('teacher', `Welcome to class, ${child.name || 'friend'}. Topic: ${lesson.title}. Look at the pictures while I teach.`);

  if ($('tutorLessonProgressFill')) $('tutorLessonProgressFill').style.width = '0%';
  if ($('tutorLessonProgressText')) {
    $('tutorLessonProgressText').innerHTML =
      `Hear + see · <strong>${lines.length}</strong> teacher turns. Press <strong>Start class</strong>. Raise your hand anytime.`;
  }
  updateLessonPlayerButtons('idle');
  updateNextLessonButton();
}

function closeTutorLessonModal() {
  state.tutor.lessonPlayer?.stop();
  state.tutor.visualStage?.stopAuto();
  stopSpeaking();
  stopClassroomVision();
  const modal = $('tutorLessonModal');
  if (modal) modal.hidden = true;
  state.tutor.modalLesson = null;
  state.tutor.waitingForQuestion = false;
  const banner = $('tutorHandRaiseBanner');
  if (banner) banner.hidden = true;
}

/* ─── Classroom camera: raised-hand → pause lesson → ask ─── */
function setCamStatus(msg) {
  if ($('tutorCamStatus')) $('tutorCamStatus').textContent = msg;
  if ($('tutorCamBadge')) {
    const on = state.tutor.visionOn;
    $('tutorCamBadge').textContent = on ? 'Camera on' : 'Camera off';
    $('tutorCamBadge').classList.toggle('on', on);
  }
  const btn = $('tutorCamToggle');
  if (btn) btn.textContent = state.tutor.visionOn ? '📷 Stop camera' : '📷 Start camera';
}

function ensureClassroomVision() {
  if (state.tutor.vision) return state.tutor.vision;
  state.tutor.vision = new ClassroomVision({
    videoEl: $('tutorCamVideo'),
    canvasEl: $('tutorCamCanvas'),
    onStatus: (msg) => setCamStatus(msg),
    onCameraReady: () => {
      state.tutor.visionOn = true;
      setCamStatus('Camera on · watching for a raised hand (local only)');
    },
    onError: () => {
      state.tutor.visionOn = false;
      setCamStatus('No camera or permission denied — use ✋ I raised my hand');
    },
    onHandRaise: () => {
      onStudentRaisedHand('camera');
    },
  });
  return state.tutor.vision;
}

async function startClassroomVision() {
  const v = ensureClassroomVision();
  v.setEnabled($('tutorCamWatch')?.checked !== false);
  const ok = await v.start();
  state.tutor.visionOn = ok;
  setCamStatus(
    ok
      ? 'Camera on · raise your hand to pause class and ask a question'
      : 'No camera — press ✋ I raised my hand or type a question',
  );
  return ok;
}

function stopClassroomVision() {
  state.tutor.vision?.stop();
  state.tutor.visionOn = false;
  setCamStatus('Camera off');
}

/**
 * Child raised hand (camera or button) → stop lesson, invite question.
 */
function onStudentRaisedHand(source = 'button') {
  if (!state.tutor.modalLesson) return;
  // Avoid spam while already waiting for their question
  if (state.tutor.waitingForQuestion) return;

  const player = ensureLessonPlayer();
  const wasPlaying = player.state === 'playing';
  player.holdForQuestion();
  state.tutor.waitingForQuestion = true;
  state.tutor._wasPlayingBeforeRaise = wasPlaying;

  const banner = $('tutorHandRaiseBanner');
  if (banner) banner.hidden = false;

  const name = state.tutor.child?.name || 'friend';
  const age = Number(state.tutor.child?.age) || 8;
  const prompt = age <= 7
    ? `I see your hand up, ${name}! Class is paused. What is your question?`
    : `I see a raised hand${source === 'camera' ? ' on camera' : ''}. Class is paused. ${name}, what is your question?`;

  setTeacherBubble(esc(prompt));
  appendClassLog('teacher', prompt);
  if ($('tutorModalPhase')) $('tutorModalPhase').textContent = 'Hand up';
  if ($('tutorLessonProgressText')) {
    $('tutorLessonProgressText').innerHTML =
      '✋ <strong>Hand raised</strong> — class paused. Type or speak your question, then press <strong>Ask teacher</strong>.';
  }

  // Focus question box
  const input = $('tutorClassAsk');
  if (input) {
    input.placeholder = 'What is your question?';
    input.focus();
  }

  speakClean(prompt, {
    age,
    rate: age <= 7 ? 0.88 : 0.94,
    pitch: 1.14,
  });
}

async function probeCameraOnOpen() {
  try {
    const info = await hasWebcam();
    if (info.hasCamera) {
      setCamStatus(`Camera found (${info.devices?.length || 1}) — press Start camera or Start class`);
    } else {
      setCamStatus('No camera on this PC — use ✋ I raised my hand or type a question');
    }
  } catch {
    setCamStatus('Could not check camera — you can still ask with the button');
  }
}

function startModalQuiz() {
  const lesson = state.tutor.modalLesson;
  if (!lesson?.questions?.length) {
    alert('This lesson has no quiz yet.');
    return;
  }
  // Stop narration when quiz starts
  state.tutor.lessonPlayer?.stop();
  stopSpeaking();
  updateLessonPlayerButtons('idle');
  state.tutor.modalQuizIdx = 0;
  state.tutor.modalQuizSelected = null;
  state.tutor.modalQuizScore = { correct: 0, total: 0 };
  if ($('tutorModalPhase')) $('tutorModalPhase').textContent = 'Quiz';
  renderModalQuizQ();
}

function renderModalQuizQ() {
  const lesson = state.tutor.modalLesson;
  const area = $('tutorModalQuizArea');
  if (!area || !lesson) return;
  const i = state.tutor.modalQuizIdx;
  const q = lesson.questions[i];
  area.hidden = false;
  area.innerHTML = `
    <h4>🧠 Quiz · ${i + 1}/${lesson.questions.length}</h4>
    <p><strong>${esc(q.question)}</strong></p>
    <div class="opts" id="tutorModalOpts"></div>
    <p class="sub" id="tutorModalExplain" hidden></p>
  `;
  const opts = $('tutorModalOpts');
  q.options.forEach((opt, idx) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'opt';
    b.textContent = opt;
    b.onclick = () => answerModalQuiz(idx);
    opts.appendChild(b);
  });
}

async function answerModalQuiz(idx) {
  const lesson = state.tutor.modalLesson;
  if (!lesson || state.tutor.modalQuizSelected !== null) return;
  const q = lesson.questions[state.tutor.modalQuizIdx];
  state.tutor.modalQuizSelected = idx;
  const correct = idx === q.correct_index;
  state.tutor.modalQuizScore.total += 1;
  if (correct) state.tutor.modalQuizScore.correct += 1;
  const buttons = $('tutorModalOpts')?.querySelectorAll('.opt') || [];
  buttons.forEach((b, i) => {
    b.disabled = true;
    if (i === q.correct_index) b.classList.add('good');
    else if (i === idx) b.classList.add('bad');
  });
  const ex = $('tutorModalExplain');
  if (ex && q.explanation) {
    ex.hidden = false;
    ex.textContent = q.explanation;
  }
  setTimeout(async () => {
    if (state.tutor.modalQuizIdx + 1 < lesson.questions.length) {
      state.tutor.modalQuizIdx += 1;
      state.tutor.modalQuizSelected = null;
      renderModalQuizQ();
      return;
    }
    const { correct: c, total: t } = state.tutor.modalQuizScore;
    const pct = t ? Math.round((c / t) * 100) : 0;
    markLessonDone(lesson.id);
    if (state.tutor.child?.id) {
      try {
        const xp = Math.round((lesson.xp_reward || 10) * (pct / 100)) || 5;
        const data = await tutorApi('/api/tutor/complete', {
          method: 'POST',
          body: JSON.stringify({
            childId: state.tutor.child.id,
            lesson,
            score: pct,
            xpEarned: xp,
          }),
        });
        if (data.child) {
          state.tutor.child = data.child;
          const i = state.tutor.children.findIndex((x) => x.id === data.child.id);
          if (i >= 0) state.tutor.children[i] = data.child;
        }
        if (data.path) state.tutor.path = data.path;
        const evo = (data.evolutionNotes || []).join(' · ');
        renderTutorChildren();
        await loadTutorLessons();
        if (evo) {
          addMsg('tutorMessages', 'assistant', `📈 **Path updated:** ${evo}`);
        }
      } catch (e) {
        console.warn(e);
      }
    }
    const area = $('tutorModalQuizArea');
    const next = getNextPathLesson(lesson);
    if (area) {
      area.innerHTML = `
        <h4>🎉 Quiz done!</h4>
        <p>Score: <strong>${c}/${t}</strong> (${pct}%). Lessons evolve with ${esc(state.tutor.child?.name || 'you')}.</p>
        <div class="row gap wrap" style="margin-top:8px">
          ${next ? `<button type="button" class="btn primary" id="tutorModalContinueNext">➡ Continue next lesson</button>` : ''}
          <button type="button" class="btn soft" id="tutorModalDoneBtn">Back to path</button>
        </div>`;
      $('tutorModalDoneBtn').onclick = () => {
        closeTutorLessonModal();
        setTutorMode('lessons');
      };
      $('tutorModalContinueNext')?.addEventListener('click', () => {
        if (next) openTutorLessonModal(next);
      });
    }
    updateNextLessonButton();
    maybeSpeak(`You scored ${pct} percent. Great work!`);
  }, 900);
}

function greetTutor() {
  clearMsgs('tutorMessages');
  state.tutor.history = [];
  const c = state.tutor.child;
  const name = c?.name || 'friend';
  const age = c?.age != null ? c.age : '?';
  const intro = `Hi **${name}** (age **${age}**)! I’m **Grok Super Tutor**.\n\nYour lessons **evolve** as you learn — high scores unlock harder work; tough scores get review.\n\nAdmin set your username + age. I teach **truth only**. What do you want to learn?`;
  addMsg('tutorMessages', 'assistant', intro);
  state.tutor.history.push({ role: 'assistant', content: intro });
}

function selectTutorChild(c) {
  state.tutor.child = c;
  state.tutor.lesson = null;
  state.tutor.quiz = null;
  state.tutor.pathFilter = 'all';
  hideTutorCards();
  renderTutorChildren();
  greetTutor();
  loadTutorLessons();
}

function hideTutorCards() {
  const L = $('tutorLessonCard');
  const Q = $('tutorQuizCard');
  if (L) { L.hidden = true; L.innerHTML = ''; }
  if (Q) { Q.hidden = true; Q.innerHTML = ''; }
}

function showTutorLesson(lesson) {
  state.tutor.lesson = lesson;
  // Prefer full picture modal so kids always get a visual reference
  if (lesson?.picture || lesson?.title) {
    openTutorLessonModal(lesson);
    return;
  }
  const card = $('tutorLessonCard');
  if (!card || !lesson) return;
  card.hidden = false;
  card.innerHTML = `
    <h4>${esc(lesson.emoji || '📖')} ${esc(lesson.title || 'Lesson')}</h4>
    <p class="sub">${esc(lesson.description || '')}</p>
    <div class="body">${esc(lesson.content || '')}</div>
    <div class="row gap wrap">
      <button type="button" class="btn primary" id="tutorStartQuiz">Take quiz</button>
      <button type="button" class="btn soft" id="tutorDismissLesson">Hide</button>
    </div>
  `;
  $('tutorStartQuiz').onclick = () => {
    if (lesson.questions?.length) showTutorQuiz({
      title: `Quiz: ${lesson.title}`,
      questions: lesson.questions,
      fromLesson: lesson,
    });
  };
  $('tutorDismissLesson').onclick = () => { card.hidden = true; };
}

function showTutorQuiz(quiz) {
  state.tutor.quiz = quiz;
  state.tutor.quizIdx = 0;
  state.tutor.quizSelected = null;
  state.tutor.quizScore = { correct: 0, total: 0 };
  renderTutorQuizQ();
}

function renderTutorQuizQ() {
  const card = $('tutorQuizCard');
  const quiz = state.tutor.quiz;
  if (!card || !quiz?.questions?.length) return;
  const i = state.tutor.quizIdx;
  const q = quiz.questions[i];
  card.hidden = false;
  card.innerHTML = `
    <h4>🧠 ${esc(quiz.title || 'Practice')} · ${i + 1}/${quiz.questions.length}</h4>
    <p><strong>${esc(q.question)}</strong></p>
    <div class="opts" id="tutorQuizOpts"></div>
    <p class="sub" id="tutorQuizExplain" hidden></p>
  `;
  const opts = $('tutorQuizOpts');
  q.options.forEach((opt, idx) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'opt';
    b.textContent = opt;
    b.onclick = () => answerTutorQuiz(idx);
    opts.appendChild(b);
  });
}

async function answerTutorQuiz(idx) {
  const quiz = state.tutor.quiz;
  if (!quiz || state.tutor.quizSelected !== null) return;
  const q = quiz.questions[state.tutor.quizIdx];
  state.tutor.quizSelected = idx;
  const correct = idx === q.correct_index;
  state.tutor.quizScore.total += 1;
  if (correct) state.tutor.quizScore.correct += 1;

  const buttons = $('tutorQuizOpts')?.querySelectorAll('.opt') || [];
  buttons.forEach((b, i) => {
    b.disabled = true;
    if (i === q.correct_index) b.classList.add('good');
    else if (i === idx) b.classList.add('bad');
  });
  const ex = $('tutorQuizExplain');
  if (ex && q.explanation) {
    ex.hidden = false;
    ex.textContent = q.explanation;
  }

  setTimeout(async () => {
    if (state.tutor.quizIdx + 1 < quiz.questions.length) {
      state.tutor.quizIdx += 1;
      state.tutor.quizSelected = null;
      renderTutorQuizQ();
      return;
    }
    const { correct: c, total: t } = state.tutor.quizScore;
    const pct = t ? Math.round((c / t) * 100) : 0;
    $('tutorQuizCard').hidden = true;
    const msg = `Quiz done: **${c}/${t}** (${pct}%). ${pct >= 80 ? 'Strong understanding.' : 'Good effort — truth takes practice.'}`;
    addMsg('tutorMessages', 'assistant', msg);
    state.tutor.history.push({ role: 'assistant', content: msg });
    maybeSpeak(`You scored ${pct} percent.`);

    if (quiz.fromLesson && state.tutor.child?.id) {
      try {
        const xp = Math.round((quiz.fromLesson.xp_reward || 10) * (pct / 100)) || 5;
        const data = await tutorApi('/api/tutor/complete', {
          method: 'POST',
          body: JSON.stringify({
            childId: state.tutor.child.id,
            lesson: quiz.fromLesson,
            score: pct,
            xpEarned: xp,
          }),
        });
        if (data.child) {
          state.tutor.child = data.child;
          const i = state.tutor.children.findIndex((x) => x.id === data.child.id);
          if (i >= 0) state.tutor.children[i] = data.child;
          renderTutorChildren();
        }
      } catch (e) {
        console.warn(e);
      }
    }
    state.tutor.quiz = null;
  }, 1000);
}

function applyTutorEffects(effects) {
  if (!effects) return;
  if (effects.lessons?.[0]) {
    showTutorLesson(effects.lessons[0]);
    // Refresh library so new Grok lessons appear with pictures
    loadTutorLessons();
  } else if (effects.quizzes?.[0]?.questions?.length) {
    showTutorQuiz(effects.quizzes[0]);
  }
  if (effects.parentBriefs?.length) {
    const box = $('tutorParentBrief');
    if (box) {
      box.hidden = false;
      box.innerHTML = `<h4>Parent brief</h4>${effects.parentBriefs.map((b) => `<p>${esc(b)}</p>`).join('')}`;
    }
  }
  if (effects.goals?.length) {
    const g = effects.goals.map((x) => x.goal_text).join('; ');
    addMsg('tutorMessages', 'assistant', `🎯 Goal saved: **${g}**`);
  }
}

/** Build tutor context so free chat still knows the open lesson + kid. */
function buildTutorChatContext() {
  const L = state.tutor.modalLesson || state.tutor.lesson || null;
  const ctx = {};
  if (L) {
    ctx.lessonId = L.id || null;
    ctx.lessonTitle = L.title || '';
    ctx.lessonSubject = L.subject || '';
    ctx.lessonSnippet = String(L.content || L.description || '').slice(0, 2500);
    // Modal open = mid-class; card lesson = soft focus
    if (state.tutor.modalLesson) {
      ctx.classroom = true;
    }
  }
  return ctx;
}

async function sendTutor(text) {
  const msg = (text || $('tutorInput')?.value || '').trim();
  if (!msg || state.tutor.busy) return;
  if (!state.tutor.child) {
    alert('Add a learner first (left panel).');
    return;
  }
  if ($('tutorInput')) $('tutorInput').value = '';
  addMsg('tutorMessages', 'user', msg);
  state.tutor.history.push({ role: 'user', content: msg });
  state.tutor.busy = true;
  if ($('tutorSend')) $('tutorSend').disabled = true;
  if ($('tutorTyping')) $('tutorTyping').hidden = false;

  const lessonCtx = buildTutorChatContext();
  // If chat is about an open lesson, pin it in the message so truth stays on-topic
  let outbound = msg;
  if (lessonCtx.lessonTitle) {
    outbound = [
      `[Current lesson focus: "${lessonCtx.lessonTitle}" · ${lessonCtx.lessonSubject || 'general'}]`,
      msg,
      lessonCtx.classroom
        ? '(Stay on this lesson unless the student clearly asks to change topics.)'
        : '',
    ].filter(Boolean).join('\n');
  }

  try {
    const data = await tutorApi('/api/tutor', {
      method: 'POST',
      body: JSON.stringify({
        message: outbound,
        history: state.tutor.history.slice(0, -1),
        childId: state.tutor.child.id,
        child: state.tutor.child,
        context: lessonCtx,
      }),
    });
    const reply = data.message || 'OK';
    addMsg('tutorMessages', 'assistant', reply);
    state.tutor.history.push({ role: 'assistant', content: reply });
    if (data.child) {
      state.tutor.child = data.child;
      const i = state.tutor.children.findIndex((x) => x.id === data.child.id);
      if (i >= 0) state.tutor.children[i] = data.child;
      renderTutorChildren();
    }
    applyTutorEffects(data.effects);
    maybeSpeak(data.speak || reply);
  } catch (e) {
    addMsg('tutorMessages', 'assistant', friendlyFetchError(e));
    checkServerAlive();
  } finally {
    state.tutor.busy = false;
    if ($('tutorSend')) $('tutorSend').disabled = false;
    if ($('tutorTyping')) $('tutorTyping').hidden = true;
  }
}

function setupTutor() {
  const hints = $('tutorHints');
  if (hints) {
    hints.innerHTML = '';
    TUTOR_HINTS.forEach((h) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = h;
      b.onclick = () => {
        setTutorMode('chat');
        sendTutor(h);
      };
      hints.appendChild(b);
    });
  }

  document.querySelectorAll('.tutor-mode-btn').forEach((b) => {
    b.onclick = () => setTutorMode(b.dataset.tutorMode);
  });

  let searchTimer = null;
  $('tutorLessonSearch')?.addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.tutor.search = e.target.value.trim();
      loadTutorLessons();
    }, 200);
  });

  $('tutorModalClose')?.addEventListener('click', closeTutorLessonModal);
  $('tutorModalClose2')?.addEventListener('click', closeTutorLessonModal);
  $('tutorModalQuiz')?.addEventListener('click', startModalQuiz);
  $('tutorLessonStart')?.addEventListener('click', async () => {
    ensureLessonPlayer().start();
    // When class starts, turn on camera if available (so Grok can see raised hands)
    if (!state.tutor.visionOn) {
      startClassroomVision().catch(() => {});
    }
  });
  $('tutorLessonPause')?.addEventListener('click', () => {
    ensureLessonPlayer().pause();
  });
  $('tutorLessonContinue')?.addEventListener('click', () => {
    state.tutor.waitingForQuestion = false;
    if ($('tutorHandRaiseBanner')) $('tutorHandRaiseBanner').hidden = true;
    ensureLessonPlayer().continue();
  });
  $('tutorModalNextLesson')?.addEventListener('click', () => {
    const next = getNextPathLesson(state.tutor.modalLesson);
    if (next) openTutorLessonModal(next);
  });
  $('tutorClassAskBtn')?.addEventListener('click', () => askTeacherInClass());
  $('tutorClassAsk')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); askTeacherInClass(); }
  });
  $('tutorClassMic')?.addEventListener('click', () => {
    startMic((t) => {
      if ($('tutorClassAsk')) $('tutorClassAsk').value = t;
      askTeacherInClass();
    }, $('tutorClassMic'));
  });
  $('tutorCamToggle')?.addEventListener('click', async () => {
    if (state.tutor.visionOn) stopClassroomVision();
    else await startClassroomVision();
  });
  $('tutorRaiseHandBtn')?.addEventListener('click', () => onStudentRaisedHand('button'));
  $('tutorCamWatch')?.addEventListener('change', (e) => {
    state.tutor.vision?.setEnabled(!!e.target.checked);
    setCamStatus(
      e.target.checked
        ? (state.tutor.visionOn ? 'Watching for raised hand…' : 'Camera off — start camera to watch')
        : 'Hand watch paused (camera may still be on)',
    );
  });
  $('tutorLessonModal')?.addEventListener('click', (e) => {
    if (e.target?.id === 'tutorLessonModal') closeTutorLessonModal();
  });

  state.tutor.selectedAge = 8;
  renderAgeChecks('tutorAgeChecks', state.tutor.selectedAge, (age) => {
    state.tutor.selectedAge = age;
  });

  $('tutorAddChild')?.addEventListener('click', async () => {
    const name = ($('tutorNewName')?.value || '').trim();
    const age = state.tutor.selectedAge || 8;
    if (!name) {
      alert('Enter a username (first name) for the kid.');
      return;
    }
    try {
      const data = await tutorApi('/api/tutor/children', {
        method: 'POST',
        body: JSON.stringify({ name, age }),
      });
      if ($('tutorNewName')) $('tutorNewName').value = '';
      await loadTutorChildren();
      if (data.child) selectTutorChild(data.child);
    } catch (e) {
      alert(e.message);
    }
  });

  $('tutorSaveEdit')?.addEventListener('click', async () => {
    if (!state.tutor.child?.id) return;
    const name = ($('tutorEditName')?.value || '').trim();
    const age = state.tutor.editAge || state.tutor.child.age;
    try {
      const data = await tutorApi(`/api/tutor/children/${state.tutor.child.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name, age }),
      });
      if (data.child) {
        state.tutor.child = data.child;
        state.tutor.path = data.path || state.tutor.path;
        await loadTutorChildren();
        selectTutorChild(data.child);
      }
    } catch (e) {
      alert(e.message);
    }
  });

  $('tutorAgeFit')?.addEventListener('change', (e) => {
    state.tutor.ageFitOnly = !!e.target.checked;
    renderTutorLessonGrid();
  });

  $('tutorSend')?.addEventListener('click', () => sendTutor());
  $('tutorInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendTutor(); }
  });
  $('tutorMic')?.addEventListener('click', () => startMic((t) => sendTutor(t), $('tutorMic')));

  setTutorMode('lessons');
  loadTutorChildren();
  warmVoices();
}

/* ─── Ask anything ─────────────────────────────────── */
function setupAsk() {
  const box = $('askHints');
  box.innerHTML = '';
  ASK_HINTS.forEach((h) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = h;
    b.onclick = () => sendAsk(h);
    box.appendChild(b);
  });
  addMsg('askMessages', 'assistant', 'Hi — I am **Grok**, your one local agent. Super Tutor, 3D, school, ideas. I seek truth and remember what we do together.');

  $('askSend').onclick = () => sendAsk();
  $('askInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAsk(); }
  });
  $('askClear').onclick = () => {
    clearMsgs('askMessages');
    addMsg('askMessages', 'assistant', 'Cleared. What next?');
  };
  $('askMic').onclick = () => startMic((t) => sendAsk(t), $('askMic'));
}

async function sendAsk(text) {
  const msg = (text || $('askInput').value || '').trim();
  if (!msg) return;
  $('askInput').value = '';
  await askGrok(msg, { boxId: 'askMessages', mode: 'general' });
}

/* ─── Mic helper ───────────────────────────────────── */
function startMic(onText, btn) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { alert('Voice works best in Chrome or Edge.'); return; }
  const rec = new SR();
  rec.lang = 'en-US';
  rec.onresult = (e) => onText(e.results[0][0].transcript);
  rec.onend = () => btn?.classList.remove('live');
  rec.onerror = () => btn?.classList.remove('live');
  rec.start();
  btn?.classList.add('live');
}

/* ─── Connectors (Grok + X) ────────────────────────── */
async function loadConnectors() {
  try {
    state.connectors = await fetch('/api/connectors').then((r) => r.json());
    if (state.connectors?.x?.handle) {
      $('xHandle').value = state.connectors.x.handle;
      $('connectorStatus').textContent = `X linked: @${state.connectors.x.handle} · Grok CLI ${state.connectors.grok?.cliConnected ? 'on' : 'off'}`;
    } else {
      $('connectorStatus').textContent = `Grok CLI ${state.connectors?.grok?.cliConnected ? 'connected' : 'not found'} · save your X @handle`;
    }
  } catch {
    $('connectorStatus').textContent = 'Connectors offline';
  }
}

function setupConnectors() {
  $('btnConnectGrok')?.addEventListener('click', () => {
    const url = state.connectors?.grok?.webUrl || 'https://grok.com';
    window.open(url, '_blank', 'noopener,noreferrer');
  });
  $('btnConnectX')?.addEventListener('click', () => {
    const url = state.connectors?.x?.homeUrl || 'https://x.com';
    window.open(url, '_blank', 'noopener,noreferrer');
  });
  $('btnSaveX')?.addEventListener('click', async () => {
    const xHandle = ($('xHandle').value || '').trim();
    const r = await fetch('/api/connectors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ xHandle }),
    }).then((res) => res.json());
    await loadConnectors();
    maybeSpeak(r.x?.handle ? `Saved your X handle ${r.x.handle}` : 'X handle cleared');
  });
  loadConnectors();
}

/* ─── Headset talk + listen ────────────────────────── */
function setupHeadset() {
  state.headset = new HeadsetController({
    onHeard: (text) => {
      // route spoken command to the active area
      const tab = document.querySelector('.tab.active')?.id || '';
      if (tab === 'tab-build') {
        sendBuild(text);
      } else if (tab === 'tab-tutor') {
        sendTutor(text);
      } else {
        sendAsk(text);
      }
    },
    onStatus: (msg) => {
      if ($('headsetStatus')) $('headsetStatus').textContent = msg;
    },
  });

  $('btnHeadsetListen')?.addEventListener('click', () => {
    const on = state.headset.toggleListen();
    const btn = $('btnHeadsetListen');
    btn.textContent = on ? 'Listening… (click stop)' : 'Listen (mic on)';
    btn.classList.toggle('primary', on);
  });
  $('btnHeadsetStopTalk')?.addEventListener('click', () => {
    state.headset.stopTalk();
    stopSpeaking();
    $('headsetStatus').textContent = 'Speech stopped';
  });
}

/* ─── Init ─────────────────────────────────────────── */
function init() {
  // nav
  document.querySelectorAll('.nav-btn').forEach((b) => {
    b.onclick = () => showTab(b.dataset.tab);
  });
  document.querySelectorAll('[data-go]').forEach((b) => {
    b.onclick = () => showTab(b.dataset.go);
  });

  // Structure visualizer (Structura-style)
  state.scene3d = new Scene3D($('c3d'));
  state.scene3d.onSelect = (id, data) => {
    $('selectedInfo').textContent = data
      ? `${data.label || id} · ${data.type}${data.material ? ' · ' + data.material : ''}`
      : '';
  };

  // View modes: 3D | Forces | Heat | Sim
  document.querySelectorAll('#structModes .mode-btn').forEach((btn) => {
    btn.onclick = () => {
      const mode = btn.dataset.mode;
      document.querySelectorAll('#structModes .mode-btn').forEach((b) => b.classList.toggle('active', b === btn));
      state.scene3d?.setMode(mode);
      const sim = $('simPanel');
      if (sim) sim.hidden = mode !== 'Sim';
      if (mode === 'Sim') {
        state.scene3d?.setSimRunning(false);
        if ($('simRun')) $('simRun').textContent = 'Run sim';
      }
    };
  });

  // Sim controls
  const pushSim = () => {
    state.scene3d?.setSimForces({
      gravity: Number($('simG')?.value || 1),
      wind: Number($('simW')?.value || 0),
      seismic: Number($('simS')?.value || 0),
      windDir: 'X+',
    });
  };
  ['simG', 'simW', 'simS'].forEach((id) => $(id)?.addEventListener('input', pushSim));
  $('simRun')?.addEventListener('click', () => {
    const running = !state.scene3d?.simRunning;
    pushSim();
    state.scene3d?.setSimRunning(running);
    if ($('simRun')) $('simRun').textContent = running ? 'Stop' : 'Run sim';
  });
  $('simReset')?.addEventListener('click', () => {
    state.scene3d?.setSimRunning(false);
    state.scene3d?.setSimForces({ gravity: 1, wind: 0, seismic: 0 });
    if ($('simG')) $('simG').value = 1;
    if ($('simW')) $('simW').value = 0;
    if ($('simS')) $('simS').value = 0;
    if ($('simRun')) $('simRun').textContent = 'Run sim';
    if ($('simReadout')) $('simReadout').textContent = 'δ peak —';
  });
  setInterval(() => {
    if (state.scene3d?.mode === 'Sim' && state.scene3d.simRunning && $('simReadout')) {
      const d = state.scene3d.getSimDeflection();
      const fos = Math.max(0.5, 1.5 / (d + 0.01));
      $('simReadout').textContent = `δ peak ≈ ${(d * 1000).toFixed(1)} mm (visual) · FOS sketch ≈ ${fos.toFixed(2)}`;
    }
  }, 200);

  const hints = $('hints');
  BUILD_HINTS.forEach((h) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = h;
    b.onclick = () => sendBuild(h);
    hints.appendChild(b);
  });

  $('btnSend').onclick = () => sendBuild();
  $('input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendBuild(); }
  });
  $('btnMic').onclick = () => startMic((t) => sendBuild(t), $('btnMic'));
  $('btnNew').onclick = () => newProject();
  $('btnFrame').onclick = () => state.scene3d?.frameAll();
  $('btnAnalyze')?.addEventListener('click', () => {
    sendBuild(
      'Run a full educational structural analysis of the current structure: load combinations, material check, failure modes, order-of-magnitude M/δ, and top action items. Update structure.ai_analysis. State assumptions. Not a PE stamp.',
    );
  });
  $('btnMaterials')?.addEventListener('click', () => {
    const p = $('materialsPanel');
    setMaterialsOpen(!!p?.hidden);
  });
  $('btnMaterialsClose')?.addEventListener('click', () => setMaterialsOpen(false));
  setupPaperBlueprint();
  setupBuildChatToggle();
  setupBuildLabelsToggle();

  $('btnSaveName').onclick = async () => {
    const userName = $('userName').value.trim();
    if (!userName) return;
    state.memory = await fetch('/api/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userName }),
    }).then((r) => r.json());
    renderMemory();
    maybeSpeak(`Nice to meet you ${userName}`);
  };
  $('btnClearMem').onclick = async () => {
    if (!confirm('Clear memory? Your projects stay.')) return;
    state.memory = await fetch('/api/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clear: true }),
    }).then((r) => r.json());
    renderMemory();
  };

  $('ttsToggle').onchange = () => { if (!$('ttsToggle').checked) stopSpeaking(); };

  setupTutor();
  setupAsk();
  setupConnectors();
  setupHeadset();
  bootstrap().catch((e) => setStatus(e.message, false));

  // Keep checking so "failed to fetch" is explained if server dies
  setInterval(checkServerAlive, 8000);
  checkServerAlive();

  $('btnRetryServer')?.addEventListener('click', () => {
    window.location.href = 'http://127.0.0.1:3847/';
  });
}

init();

// expose clean speech util for debugging
window.__cleanForSpeech = cleanForSpeech;
