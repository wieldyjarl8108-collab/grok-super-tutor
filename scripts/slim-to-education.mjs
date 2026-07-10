/**
 * Build education-only public/app.js from the archived full app.
 * Engineering stays in archive/structura-engineering/ for later rebuild.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const fullPath = join(root, 'archive/structura-engineering/snapshots/app.full.js');
const outPath = join(root, 'public/app.js');

const lines = readFileSync(fullPath, 'utf8').split(/\r?\n/);
const slice = (a, b) => lines.slice(a - 1, b).join('\n');

// Shared utils + tutor + ask + mic/connectors/headset (no build/paper/3d)
const bodyParts = [
  slice(72, 80),
  slice(91, 165),
  slice(321, 323), // esc
  slice(666, 2185),
].join('\n\n');

let body = bodyParts
  .replace(
    /Hi — I am \*\*Grok\*\*, your one local agent\. Super Tutor, 3D, school, ideas\. I seek truth and remember what we do together\./g,
    'Hi — I am **Grok Super Tutor**. I teach truth only: lessons, quizzes, market lab, and code lab. I remember what we learn together.',
  )
  .replace(
    /const tab = document\.querySelector\('\.tab\.active'\)\?\.id \|\| '';\s*if \(tab === 'tab-build'\) \{\s*sendBuild\(text\);\s*\} else if \(tab === 'tab-tutor'\)/g,
    "const tab = document.querySelector('.tab.active')?.id || '';\n      if (tab === 'tab-tutor')",
  );

const out = `import { speakClean, stopSpeaking, cleanForSpeech } from './tts.js';
import { LessonPlayer } from './lesson-player.js?v=young2';
import { VisualStage } from './lesson-visuals.js';
import { createMarketSim } from './market-sim.js';
import { createCodeLab } from './code-lab.js';
import { warmVoices } from './tts.js';
import { HeadsetController } from './headset.js';
import { ClassroomVision, hasWebcam } from './classroom-vision.js?v=cam1';

/**
 * Grok Super Tutor — education only.
 * Engineering / Structure code archived at:
 *   archive/structura-engineering/
 * Restore from snapshots there when ready to rebuild.
 */

const $ = (id) => document.getElementById(id);

const state = {
  memory: null,
  busy: false,
  connectors: null,
  headset: null,
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
    pathFilter: 'all',
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
};

${body}

function showTab(name) {
  document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
  const el = document.getElementById('tab-' + name);
  if (el) el.classList.add('active');
  if (name === 'tutor') loadTutorLessons();
}

function renderMemory() {
  const mem = state.memory;
  if (!mem) return;
  if ($('memUser')) {
    $('memUser').textContent = mem.userName
      ? \`Remembering as \${mem.userName}\`
      : 'Grok remembers lessons and learner facts (local only)';
  }
  if ($('memFacts')) {
    $('memFacts').innerHTML = (mem.facts || []).slice(-12).map((f) => \`<li>\${esc(f)}</li>\`).join('')
      || '<li class="sub">Nothing yet</li>';
  }
  if ($('memLessons')) {
    $('memLessons').innerHTML = (mem.lessons || []).slice(-8).map((f) => \`<li>\${esc(f)}</li>\`).join('')
      || '<li class="sub">Nothing yet</li>';
  }
}

async function loadAgentIdentity() {
  try {
    const a = await fetch('/api/agent').then((r) => r.json());
    if ($('discEdu')) $('discEdu').textContent = a.disclaimers?.educational || '';
    if ($('discMarket')) $('discMarket').textContent = a.disclaimers?.market || '';
    if ($('discHome')) $('discHome').textContent = a.disclaimers?.homeschool || '';
  } catch { /* offline */ }
}

async function bootstrap() {
  try {
    const r = await fetch('/api/bootstrap');
    if (!r.ok) throw new Error('bootstrap failed');
    const data = await r.json();
    state.memory = data.memory;
    renderMemory();
    setStatus('Ready', true);
  } catch {
    setStatus('Offline — open Grok Agent', false);
  }
}

function init() {
  document.querySelectorAll('.nav-btn').forEach((b) => {
    b.onclick = () => showTab(b.dataset.tab);
  });
  document.querySelectorAll('[data-go]').forEach((b) => {
    b.onclick = () => showTab(b.dataset.go);
  });

  $('btnRetryServer')?.addEventListener('click', () => checkServerAlive());
  $('memClear')?.addEventListener('click', async () => {
    if (!confirm('Clear long-term memory on this PC?')) return;
    state.memory = await fetch('/api/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clear: true }),
    }).then((r) => r.json());
    renderMemory();
  });
  $('memSaveName')?.addEventListener('click', async () => {
    const userName = ($('memName')?.value || '').trim();
    if (!userName) return;
    state.memory = await fetch('/api/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userName }),
    }).then((r) => r.json());
    renderMemory();
  });

  setupTutor();
  setupAsk();
  setupConnectors();
  setupHeadset();
  loadAgentIdentity();
  bootstrap();
  checkServerAlive();
  setInterval(checkServerAlive, 15000);
  showTab('tutor');
}

init();
`;

writeFileSync(outPath, out, 'utf8');
console.log('Wrote education-only app.js', out.length, 'chars');
