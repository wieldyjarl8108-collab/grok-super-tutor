/**
 * Grok — one local agent (no Base44)
 *
 * - 3D / structural builds + general chat
 * - Super Tutor (truth-seeking) — local learner data only
 * - Long-term memory · Grok CLI / API
 */
import express from 'express';
import {
  readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync,
} from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createServer } from 'http';
import { spawn } from 'child_process';
import { homedir } from 'os';
import { randomUUID } from 'crypto';
import { createTutorStore } from './tutor-store.mjs';
import {
  expandStructure,
  analyzeStructure,
  structureToScene,
} from './public/structure-engine.js';
import {
  AGENT_IDENTITY,
  STOCK_MARKET_DISCLAIMER,
  EDUCATIONAL_CONTENT_DISCLAIMER,
  HOMESCHOOL_DISCLAIMER,
  STRUCTURAL_ENGINEERING_DISCLAIMER,
  MATERIAL_DATA_DISCLAIMER,
  SIMULATION_DISCLAIMER,
} from './disclaimers.mjs';
import { listMaterials } from './public/materials-db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.GROK_AGENT_PORT || 3847);
const CONFIG_PATH = join(__dirname, 'config.json');
const DATA_DIR = join(__dirname, 'data');
const MEMORY_PATH = join(DATA_DIR, 'longterm-memory.json');
const PROJECTS_DIR = join(DATA_DIR, 'projects');
const XAI_URL = 'https://api.x.ai/v1/chat/completions';

const ENG_DISCLAIMER =
  'Educational structural estimate only — not a PE stamp, not code-checked design, not for construction.';

for (const d of [DATA_DIR, PROJECTS_DIR]) {
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

const tutorStore = createTutorStore(DATA_DIR);

const EMPTY_SCENE = () => ({
  version: 2,
  title: 'Structural workspace',
  description: 'Describe a structure (beam, bridge, frame, cabin…) with real dimensions. Engineering model + analysis.',
  units: 'm',
  ground: true,
  sky: '#0f172a',
  ambient: 0.35,
  structure: null,
  analysis: null,
  riskZones: [],
  objects: [],
  annotations: [],
  camera: { target: [0, 1.5, 0], distance: 14, theta: 0.7, phi: 1.0 },
  updatedAt: new Date().toISOString(),
});

const EMPTY_MEMORY = () => ({
  version: 1,
  userName: null,
  preferences: [],
  facts: [],
  skillsGrown: [],
  projectsSummary: [],
  lessons: [],
  lastActiveProjectId: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const HELP_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    message: {
      type: 'string',
      description: 'Clear helpful reply in simple language. No filler. Markdown ok.',
    },
    memory_updates: {
      type: 'array',
      items: { type: 'string' },
      description: 'Short durable facts to remember',
    },
    lesson: { type: 'string' },
  },
  required: ['message'],
};

/** BrightMind / SparkPath Super Tutor */
const TUTOR_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    message: {
      type: 'string',
      description: 'Kid-friendly markdown reply the learner reads. Warm, clear, age-appropriate.',
    },
    speak: {
      type: 'string',
      description: 'Optional short line for text-to-speech (plain words, no markdown).',
    },
    actions: {
      type: 'array',
      description: '0–3 tool actions. Prefer none mid-class. Prefer generate_lesson only for a NEW topic the learner asked for (never switch topics mid-lesson).',
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            description: 'generate_lesson | practice_quiz | update_mastery | set_daily_goal | parent_brief | none',
          },
          payload: {
            type: 'object',
            description: 'Action-specific data',
            properties: {
              subject: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              content: { type: 'string' },
              emoji: { type: 'string' },
              difficulty: { type: 'string' },
              xp_reward: { type: 'number' },
              skill: { type: 'string' },
              note: { type: 'string' },
              goal_text: { type: 'string' },
              target_lessons: { type: 'number' },
              summary: { type: 'string' },
              questions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    question: { type: 'string' },
                    options: { type: 'array', items: { type: 'string' } },
                    correct_index: { type: 'number' },
                    explanation: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    memory_updates: {
      type: 'array',
      items: { type: 'string' },
      description: '0–4 short durable facts about THIS learner (prefix with their first name)',
    },
  },
  required: ['message'],
};

const BUILD_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    message: {
      type: 'string',
      description: 'Technical engineering markdown: what changed, dims, materials, loads, rough checks, assumptions. Always note educational estimate only.',
    },
    structure: {
      type: 'object',
      description: 'PRIMARY: engineering structure definition. Server expands into truthful 3D members.',
      properties: {
        name: { type: 'string' },
        type: {
          type: 'string',
          description: 'beam|column|truss|frame|slab|foundation|wall|bridge|roof|cabin|house|robot|humanoid|android|robot_arm|custom',
        },
        description: { type: 'string' },
        dimensions: {
          type: 'object',
          properties: {
            length: { type: 'number' },
            width: { type: 'number' },
            height: { type: 'number' },
            unit: { type: 'string' },
          },
        },
        materials: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              type: { type: 'string' },
              grade: { type: 'string' },
              quantity: { type: 'string' },
            },
          },
        },
        loads: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              magnitude: { type: 'number' },
              unit: { type: 'string' },
              direction: { type: 'string' },
            },
          },
        },
        status: { type: 'string' },
        ai_analysis: { type: 'string' },
      },
    },
    scene: {
      type: 'object',
      description: 'Optional full scene override. Prefer structure field; only set objects for custom multi-part assemblies.',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        units: { type: 'string' },
        ground: { type: 'boolean' },
        objects: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              type: { type: 'string' },
              label: { type: 'string' },
              pos: { type: 'array', items: { type: 'number' } },
              rot: { type: 'array', items: { type: 'number' } },
              size: { type: 'array', items: { type: 'number' } },
              color: { type: 'string' },
              material: { type: 'string' },
              opacity: { type: 'number' },
              metalness: { type: 'number' },
              roughness: { type: 'number' },
              note: { type: 'string' },
            },
          },
        },
        camera: {
          type: 'object',
          properties: {
            target: { type: 'array', items: { type: 'number' } },
            distance: { type: 'number' },
            theta: { type: 'number' },
            phi: { type: 'number' },
          },
        },
      },
    },
    memory_updates: {
      type: 'array',
      items: { type: 'string' },
      description: 'Short durable facts about the user or this structure',
    },
    lesson: {
      type: 'string',
      description: 'Optional one-line engineering learning note',
    },
  },
  required: ['message'],
};

function loadConfig() {
  if (!existsSync(CONFIG_PATH)) return {};
  try { return JSON.parse(readFileSync(CONFIG_PATH, 'utf8')); } catch { return {}; }
}
function saveConfig(cfg) {
  writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
}
function getApiKey() {
  return process.env.XAI_API_KEY || process.env.GROK_API_KEY || loadConfig().apiKey || '';
}
function getModel() {
  return process.env.XAI_MODEL || loadConfig().model || 'grok-3';
}

function findGrokCli() {
  if (process.env.GROK_CLI_PATH && existsSync(process.env.GROK_CLI_PATH)) return process.env.GROK_CLI_PATH;
  for (const p of [
    join(homedir(), '.grok', 'bin', 'grok.exe'),
    join(homedir(), '.grok', 'bin', 'grok'),
    'C:\\Users\\Mitch\\.grok\\bin\\grok.exe',
  ]) {
    if (existsSync(p)) return p;
  }
  return null;
}

function loadMemory() {
  if (!existsSync(MEMORY_PATH)) {
    const m = EMPTY_MEMORY();
    writeFileSync(MEMORY_PATH, JSON.stringify(m, null, 2));
    return m;
  }
  try { return JSON.parse(readFileSync(MEMORY_PATH, 'utf8')); }
  catch { return EMPTY_MEMORY(); }
}

function saveMemory(mem) {
  mem.updatedAt = new Date().toISOString();
  writeFileSync(MEMORY_PATH, JSON.stringify(mem, null, 2), 'utf8');
  return mem;
}

function projectPath(id) {
  return join(PROJECTS_DIR, `${id}.json`);
}

function loadProject(id) {
  const p = projectPath(id);
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf8')); }
  catch { return null; }
}

function saveProject(project) {
  project.updatedAt = new Date().toISOString();
  writeFileSync(projectPath(project.id), JSON.stringify(project, null, 2), 'utf8');
  return project;
}

function listProjects() {
  if (!existsSync(PROJECTS_DIR)) return [];
  return readdirSync(PROJECTS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      try {
        const j = JSON.parse(readFileSync(join(PROJECTS_DIR, f), 'utf8'));
        return {
          id: j.id,
          title: j.scene?.title || j.title || 'Untitled',
          description: j.scene?.description || '',
          updatedAt: j.updatedAt,
          messageCount: j.messages?.length || 0,
        };
      } catch { return null; }
    })
    .filter(Boolean)
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

function createProject(title = 'New build') {
  const id = randomUUID();
  const project = {
    id,
    title,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    scene: EMPTY_SCENE(),
    messages: [{
      role: 'assistant',
      content: `👋 I'm **Grok** — your co-builder.

We design **in 3D together**. Tell me anything you can imagine:
- *“Build a steel pedestrian bridge”*
- *“Make a 6-DOF robot arm”*
- *“Design a tiny Mars habitat”*
- *“A wooden cabin with a loft”*

I'll place real geometry you can orbit, and **we can change it anytime**. I remember everything we build and talk about.

What should we create first?`,
      at: new Date().toISOString(),
    }],
    buildLog: [],
  };
  project.scene.title = title;
  saveProject(project);
  const mem = loadMemory();
  mem.lastActiveProjectId = id;
  saveMemory(mem);
  return project;
}

function runProcess(cmd, args, { timeoutMs = 240000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { windowsHide: true, env: { ...process.env } });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('Grok timed out. Try a shorter request.'));
    }, timeoutMs);
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('error', (err) => { clearTimeout(timer); reject(err); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) reject(new Error(stderr.trim() || stdout.trim() || `Grok CLI exited ${code}`));
      else resolve({ stdout, stderr });
    });
  });
}

function tryParseJson(s) {
  if (typeof s !== 'string') return null;
  const t = s.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  try { return JSON.parse(t); } catch { /* fall */ }
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try { return JSON.parse(t.slice(start, end + 1)); } catch { return null; }
  }
  return null;
}

function normalizeStructure(s) {
  if (!s || typeof s !== 'object') return null;
  const type = String(s.type || 'beam').toLowerCase();
  const allowed = new Set([
    'beam', 'column', 'truss', 'frame', 'slab', 'foundation', 'wall',
    'bridge', 'roof', 'cabin', 'house',
    'robot', 'humanoid', 'android', 'robot_arm',
    'custom',
  ]);
  // Map common user wording → full robot (not arm-only)
  let t = allowed.has(type) ? type : 'custom';
  if (['bot', 'mech', 'mecha', 'droid'].includes(type)) t = 'robot';
  const isRobot = ['robot', 'humanoid', 'android'].includes(t);
  const defL = isRobot ? 0.3 : 6;
  const defW = isRobot ? 0.5 : 0.4;
  const defH = isRobot ? 1.8 : 0.4;
  const defMat = isRobot
    ? [{ name: 'Aluminum 6061-T6', type: 'Aluminum', grade: '6061-T6', quantity: '1' }]
    : [{ name: 'Structural steel A36', type: 'Steel', grade: 'A36', quantity: '1' }];
  return {
    name: String(s.name || s.title || capitalizeType(t)),
    type: t,
    description: s.description ? String(s.description).slice(0, 2000) : '',
    dimensions: {
      length: Number(s.dimensions?.length) || defL,
      width: Number(s.dimensions?.width) || defW,
      height: Number(s.dimensions?.height) || defH,
      unit: s.dimensions?.unit || 'm',
    },
    materials: Array.isArray(s.materials)
      ? s.materials.map((m) => ({
        name: String(m.name || m.type || 'Steel'),
        type: String(m.type || m.name || 'Steel'),
        grade: String(m.grade || ''),
        quantity: String(m.quantity || '1'),
      }))
      : defMat,
    loads: Array.isArray(s.loads)
      ? s.loads.map((ld) => ({
        type: String(ld.type || 'live'),
        magnitude: Number(ld.magnitude) || 0,
        unit: String(ld.unit || 'kN'),
        direction: String(ld.direction || 'down'),
      }))
      : [],
    status: s.status || 'designed',
    ai_analysis: s.ai_analysis ? String(s.ai_analysis).slice(0, 12000) : null,
  };
}

function capitalizeType(t) {
  return String(t || 'Structure').charAt(0).toUpperCase() + String(t || '').slice(1);
}

/**
 * Normalize scene. Prefer structure → auto-expand members (Structura model).
 * Custom freeform objects still allowed when no structure or type=custom with objects.
 */
function normalizeScene(scene, fallback = EMPTY_SCENE()) {
  if (!scene || typeof scene !== 'object') return fallback;

  // If payload is a bare structure object
  if (scene.type && scene.dimensions && !scene.objects && !scene.structure) {
    return structureToScene(normalizeStructure(scene), fallback);
  }

  const structIn = scene.structure || null;
  const struct = structIn ? normalizeStructure(structIn) : (fallback.structure ? normalizeStructure(fallback.structure) : null);

  // Prefer expanding from structure (truthful multi-member)
  if (struct && struct.type !== 'custom') {
    const built = structureToScene(struct, fallback);
    if (scene.title) built.title = scene.title;
    if (scene.description) built.description = scene.description;
    if (scene.camera) built.camera = scene.camera;
    if (struct.ai_analysis) built.structure.ai_analysis = struct.ai_analysis;
    // Allow optional extra objects on top
    if (Array.isArray(scene.objects) && scene.objects.length && scene.objects.length > built.objects.length) {
      // only use explicit objects if denser custom assembly provided
      const mapped = scene.objects.map(normalizeObject).filter(Boolean);
      if (mapped.length >= built.objects.length) {
        built.objects = mapped;
        built.analysis = analyzeStructure(struct, mapped);
        built.riskZones = built.analysis.zones;
      }
    }
    built.version = 2;
    built.updatedAt = new Date().toISOString();
    return built;
  }

  // Freeform / custom objects path
  const base = { ...EMPTY_SCENE(), ...fallback, ...scene };
  base.structure = struct;
  base.objects = Array.isArray(scene.objects)
    ? scene.objects.map(normalizeObject).filter(Boolean)
    : (fallback.objects || []);
  base.annotations = Array.isArray(scene.annotations) ? scene.annotations : (fallback.annotations || []);
  if (struct && base.objects.length < 2) {
    // expand custom with dims if almost empty
    const built = structureToScene(struct, base);
    return built;
  }
  if (struct) {
    base.analysis = analyzeStructure(struct, base.objects);
    base.riskZones = base.analysis.zones;
  }
  base.sky = '#0f172a';
  base.ambient = 0.35;
  base.ground = base.ground !== false;
  base.version = 2;
  base.updatedAt = new Date().toISOString();
  return base;
}

/** Apply Grok payload structure and/or scene into project.scene */
function applyBuildPayload(project, payload) {
  let changed = false;
  if (payload.structure && typeof payload.structure === 'object') {
    const prev = project.scene?.structure || {};
    const merged = normalizeStructure({
      ...prev,
      ...payload.structure,
      dimensions: { ...(prev.dimensions || {}), ...(payload.structure.dimensions || {}) },
      materials: payload.structure.materials?.length ? payload.structure.materials : prev.materials,
      loads: payload.structure.loads?.length ? payload.structure.loads : prev.loads,
    });
    if (payload.structure.ai_analysis) merged.ai_analysis = payload.structure.ai_analysis;
    project.scene = structureToScene(merged, project.scene);
    // If custom objects also provided, prefer denser assembly
    if (Array.isArray(payload.scene?.objects) && payload.scene.objects.length > project.scene.objects.length) {
      project.scene = normalizeScene({ ...payload.scene, structure: merged }, project.scene);
    }
    changed = true;
  } else if (payload.scene && typeof payload.scene === 'object') {
    if (payload.scene.structure || Array.isArray(payload.scene.objects)) {
      project.scene = normalizeScene(payload.scene, project.scene);
      changed = true;
    } else if (payload.scene.title || payload.scene.description) {
      project.scene = {
        ...project.scene,
        title: payload.scene.title || project.scene.title,
        description: payload.scene.description || project.scene.description,
        updatedAt: new Date().toISOString(),
      };
      changed = true;
    }
  }
  return changed;
}

function normalizeObject(o) {
  if (!o || typeof o !== 'object') return null;
  const type = String(o.type || 'box').toLowerCase();
  const allowed = new Set([
    'box', 'cube', 'cylinder', 'sphere', 'cone', 'plane', 'torus',
    'beam', 'column', 'slab', 'plate', 'wall', 'roof', 'pipe', 'arch', 'wedge', 'prism',
  ]);
  const t = allowed.has(type) ? type : 'box';
  const pos = Array.isArray(o.pos) ? o.pos.map(Number) : [0, 0, 0];
  while (pos.length < 3) pos.push(0);
  const size = Array.isArray(o.size) ? o.size.map(Number) : [1, 1, 1];
  while (size.length < 3) size.push(size[0] || 1);
  const rot = Array.isArray(o.rot) ? o.rot.map(Number) : [0, 0, 0];
  while (rot.length < 3) rot.push(0);

  // Realistic defaults by type (not neon toy metal)
  const typeDefaults = {
    wall: { color: '#d8d2c8', metalness: 0.04, roughness: 0.7, material: 'paint' },
    roof: { color: '#3d3835', metalness: 0.05, roughness: 0.9, material: 'roof_shingle' },
    column: { color: '#6b4f2a', metalness: 0.02, roughness: 0.82, material: 'wood' },
    beam: { color: '#5c4220', metalness: 0.02, roughness: 0.8, material: 'wood' },
    slab: { color: '#8a8d8f', metalness: 0.05, roughness: 0.9, material: 'concrete' },
    plate: { color: '#7a828c', metalness: 0.75, roughness: 0.35, material: 'steel' },
    pipe: { color: '#6e7680', metalness: 0.85, roughness: 0.32, material: 'steel' },
    arch: { color: '#7a756c', metalness: 0.05, roughness: 0.88, material: 'stone' },
    box: { color: '#8a8680', metalness: 0.1, roughness: 0.75, material: 'paint' },
    cube: { color: '#8a8680', metalness: 0.1, roughness: 0.75, material: 'paint' },
  };
  const def = typeDefaults[t] || { color: '#7a7f86', metalness: 0.12, roughness: 0.72, material: 'paint' };
  const mat = typeof o.material === 'string' ? o.material.toLowerCase().replace(/\s+/g, '_') : def.material;

  // Material-first color: drop neon toy hex when a real material is known
  const matColors = {
    wood: '#6b4f2a', darkwood: '#3d2914', pine: '#8b7355',
    steel: '#6e7680', metal: '#7a828c', aluminum: '#a8b0b8', iron: '#4a4e54', copper: '#8b5a3c',
    concrete: '#8a8d8f', stone: '#7a756c', brick: '#8b4a3a', asphalt: '#2c2c2e',
    glass: '#a8c4d4', paint: '#d4d0c8', whitepaint: '#e8e6e1', redpaint: '#6b2e2a', bluepaint: '#3a4a5c',
    roof_shingle: '#3d3835', roof_metal: '#5c6168', rubber: '#1a1a1a', plastic: '#4a5560',
    ceramic: '#d8d4cc', grass: '#3d5c3a', soil: '#4a3a28', fabric: '#5a4a3a', water: '#3a6d8c',
  };
  let color = typeof o.color === 'string' ? o.color : (matColors[mat] || def.color);
  if (matColors[mat] && isCartoonObjectColor(color)) color = matColors[mat];
  else if (isCartoonObjectColor(color)) color = def.color;

  return {
    id: String(o.id || `obj_${Math.random().toString(36).slice(2, 9)}`),
    type: t,
    label: o.label ? String(o.label).slice(0, 80) : '',
    pos: pos.slice(0, 3),
    rot: rot.slice(0, 3),
    size: size.slice(0, 3).map((n) => (Number.isFinite(n) && n > 0 ? n : 0.1)),
    color,
    material: mat,
    opacity: typeof o.opacity === 'number' ? Math.min(1, Math.max(0.08, o.opacity)) : (mat === 'glass' ? 0.42 : 1),
    metalness: typeof o.metalness === 'number' ? o.metalness : def.metalness,
    roughness: typeof o.roughness === 'number' ? o.roughness : def.roughness,
    note: o.note ? String(o.note).slice(0, 200) : '',
  };
}

/** High-sat neon / pure primary = cartoon toy paint */
function isCartoonObjectColor(hex) {
  if (!hex || typeof hex !== 'string') return false;
  try {
    const h = hex.replace('#', '');
    if (h.length < 6) return false;
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const s = max === min ? 0 : (max - min) / Math.max(1e-6, 1 - Math.abs(2 * l - 1));
    return s > 0.55 || (s > 0.42 && (l > 0.72 || l < 0.18));
  } catch {
    return false;
  }
}

function memoryBrief(mem, { tutorOnly = false } = {}) {
  const lines = [];
  if (mem.userName) lines.push(`User name: ${mem.userName}`);
  if (mem.preferences?.length) lines.push(`Preferences: ${mem.preferences.slice(-12).join('; ')}`);

  let facts = Array.isArray(mem.facts) ? mem.facts : [];
  if (tutorOnly) {
    // Super Tutor must not inherit engineering cabin/roof noise that steals the lesson topic
    facts = facts.filter((f) => {
      const s = String(f || '');
      if (/^tutor:/i.test(s)) return true;
      if (/\b(learner|child|kid|student|quiz|xp|streak)\b/i.test(s)) return true;
      if (/\b(cabin|portal frame|treehouse|robot arm|porch|gable|eave|steel|timber|meme|video lab)\b/i.test(s)) {
        return false;
      }
      return false; // default: only tutor-tagged for classroom
    });
    if (facts.length) lines.push(`Learner facts (tutor only):\n- ${facts.slice(-24).join('\n- ')}`);
    if (mem.lessons?.length) {
      lines.push(`Lessons grown with learners:\n- ${mem.lessons.slice(-12).join('\n- ')}`);
    }
    return lines.join('\n') || '(No tutor memory yet — learn from this kid and the active lesson.)';
  }

  if (facts.length) lines.push(`Known facts:\n- ${facts.slice(-40).join('\n- ')}`);
  if (mem.lessons?.length) lines.push(`Lessons we've grown together:\n- ${mem.lessons.slice(-20).join('\n- ')}`);
  if (mem.skillsGrown?.length) lines.push(`Skills practiced: ${mem.skillsGrown.slice(-15).join(', ')}`);
  if (mem.projectsSummary?.length) {
    lines.push(`Past builds:\n- ${mem.projectsSummary.slice(-10).join('\n- ')}`);
  }
  return lines.join('\n') || '(No long-term memory yet — this is a fresh partnership.)';
}

/** Drop memory lines that bias the tutor onto the wrong lesson. */
function sanitizeTutorMemoryUpdates(updates, activeLessonTitle = '') {
  const bad = /offered\s+.+\s+as\s+the\s+first|deeper\s+dive|next\s+lesson\s+should\s+be|switch(?:ed|ing)?\s+to\s+(?:butterfl|lion|elephant)/i;
  const title = String(activeLessonTitle || '').toLowerCase();
  return (updates || [])
    .map((u) => String(u || '').trim())
    .filter(Boolean)
    .filter((s) => !bad.test(s))
    .filter((s) => {
      // If mid-lesson, don't store "interested in butterflies" style pivots that aren't about active lesson
      if (!title) return true;
      if (/interested in|wants to learn|offered/i.test(s) && !s.toLowerCase().includes(title.slice(0, 10))) {
        // allow if it's clearly about the active topic
        const topicWords = title.split(/\s+/).filter((w) => w.length > 3);
        return topicWords.some((w) => s.toLowerCase().includes(w));
      }
      return true;
    })
    .slice(0, 6);
}

function buildSystemPrompt(mem, project) {
  const st = project.scene?.structure;
  const an = project.scene?.analysis;
  return `You are **Grok**, senior structural / civil engineering co-designer on the user's PC (xAI).
You run a **Structura-style engineering structure workspace** — truthful models, real materials, real loads, order-of-magnitude checks.

## TRUTH RULES (non-negotiable)
- Educational analysis only — NOT a PE stamp, NOT construction drawings, NOT code-approved design.
- State assumptions clearly. Use SI units (m, kN, MPa, GPa) unless user asks otherwise.
- Prefer real grades: A36/A992 steel, C30/37 concrete, SPF #2 / glulam timber, 6061-T6 aluminum.
- Never invent fake code compliance. Never cartoon/lego/neon models.
- When uncertain, say so. Prefer conservative educational estimates.

## LONG-TERM MEMORY
${memoryBrief(mem)}

## CURRENT PROJECT
- id: ${project.id}
- title: ${project.scene?.title || project.title}
- structure: ${st ? `${st.type} · L=${st.dimensions?.length} W=${st.dimensions?.width} H=${st.dimensions?.height} ${st.dimensions?.unit || 'm'}` : 'none yet'}
- materials: ${JSON.stringify(st?.materials || [])}
- loads: ${JSON.stringify(st?.loads || [])}
- members: ${project.scene?.objects?.length || 0}
- last analysis risk: ${an?.overall_risk || 'n/a'} · FOS≈${an?.factor_of_safety_approx ?? 'n/a'} · δ≈${an?.approx_deflection_mm ?? 'n/a'} mm

## CURRENT STRUCTURE JSON
${JSON.stringify({ structure: st, analysis: an, objectCount: project.scene?.objects?.length }, null, 0).slice(0, 10000)}

## HOW TO BUILD (PRIMARY PATH)
Return a **structure** object (not random toy cubes). The server expands it into multi-member 3D:
\`\`\`
structure: {
  name, type: beam|column|truss|frame|slab|foundation|wall|bridge|roof|cabin|house|robot|humanoid|android|robot_arm|custom,
  description,
  dimensions: { length, width, height, unit: "m" },
  materials: [{ name, type, grade, quantity }],
  loads: [{ type: dead|live|wind|seismic|point|distributed, magnitude, unit: "kN"|"kN/m"|"kPa", direction: down|up|left|right|front|back }],
  status: draft|designed|testing,
  ai_analysis: "markdown engineering report (when user asks to analyze)"
}
\`\`\`

### Type guidance (real proportions)
- **beam**: length = span, width = b, height = d (section). Example span 6m, b=0.25, d=0.45 steel/concrete.
- **column**: height = story height (~3m), width = side. Footing auto-added.
- **frame**: length×width plan, height = story. Steel/concrete columns+beams+slab.
- **truss**: length = span, height = rise.
- **bridge**: length = total span, width = deck, height = pier height. Concrete deck + steel girders + piers.
- **cabin/house**: length×width footprint, height = wall height (~2.5m). Timber + concrete floor + glass + shingles.
- **robot / humanoid / android** (DEFAULT for "robot", "build a robot", "make a robot"):
  FULL body head-to-toe — feet, toes, shins, knees, thighs, hips, torso, arms, hands, fingers, neck, head, eyes.
  dimensions.height = total height (~1.6–2.0 m), width = shoulder width (~0.45–0.55 m), length = body depth (~0.25–0.35 m).
  Materials: aluminum / steel shell. NEVER only a robot arm unless user says "arm only" or "robot arm".
- **robot_arm**: ONLY if user explicitly wants arm/manipulator alone.
- **wall/slab/foundation/roof**: obvious dims in meters.

### ROBOT RULE (critical)
If user says robot / bot / humanoid / android / "whole robot" / "head to toe" → type **robot** with full body.
Do NOT return a single robot arm. Do NOT use type robot_arm unless they only want an arm.

### Materials (use real names/grades)
Steel A36 or A992 · Concrete C30/37 · Timber SPF #2 or Glulam · Aluminum 6061-T6 · Glass · Brick

### Loads (always set when designing)
- Dead self-weight is computed separately; add Live (kN or kN/m or kPa), Wind, Seismic when relevant.
- Example: live 5 kN/m down on a beam; wind 1.2 kPa; floor live 2.0 kPa.

## WHEN USER ASKS TO ANALYZE / CHECK / STRESS TEST
Write **ai_analysis** markdown with:
1. Load combinations (conceptual ASCE 7 / Eurocode style — educational)
2. Material suitability
3. Failure modes (buckling, flexure, shear, connections…)
4. Order-of-magnitude M, V, δ if dims allow
5. Top 3–5 action items
Always end with: "${ENG_DISCLAIMER}"

## RESPONSE FORMAT
JSON:
1. **message** — clear engineering notes (dims, materials, loads, rough FOS language)
2. **structure** — full structure when design changes (preferred)
3. **scene** — only if custom freeform objects needed; usually omit objects
4. **memory_updates** — 0–5 facts
5. **lesson** — optional one-liner

On edits (taller, more load, steel instead of wood) return FULL updated **structure**.
Never refuse a creative engineering build. Flag safety-critical assumptions.`;
}

async function callGrokViaCli({
  prompt,
  jsonSchema,
  systemExtra = '',
  enableWebSearch = false,
  imagePath = null,
  timeoutMs = 180000,
}) {
  const grokPath = findGrokCli();
  if (!grokPath) {
    const err = new Error('Grok CLI not found. Run: grok login');
    err.code = 'NO_CLI';
    throw err;
  }
  let fullPrompt = `${systemExtra}\n\n---\n\n${prompt}`;
  if (imagePath && existsSync(imagePath)) {
    fullPrompt += `\n\n[Attached sketch image path on disk — open/read this image if your tools allow]: ${imagePath}`;
  }
  const args = [
    '--single', fullPrompt,
    '--no-subagents',
    '--permission-mode', 'dontAsk',
    '--max-turns', enableWebSearch ? '12' : '4',
  ];
  if (!enableWebSearch) {
    args.push('--disable-web-search');
  }
  if (jsonSchema) {
    args.push('--json-schema', JSON.stringify(jsonSchema));
    args.push('--output-format', 'json');
  } else {
    args.push('--output-format', 'plain');
  }
  const { stdout } = await runProcess(grokPath, args, { timeoutMs });
  if (jsonSchema) {
    let parsed;
    try { parsed = JSON.parse(stdout.trim()); }
    catch {
      return { text: stdout.trim(), structured: tryParseJson(stdout), mode: 'cli' };
    }
    const structured = parsed.structuredOutput ?? tryParseJson(parsed.text) ?? parsed;
    const text = typeof parsed.text === 'string' ? parsed.text : JSON.stringify(structured, null, 2);
    return { text, structured, mode: 'cli', model: 'grok-cli' };
  }
  return { text: stdout.trim(), mode: 'cli', model: 'grok-cli' };
}

async function callGrokViaApi({ messages, model, jsonSchema, system }) {
  const apiKey = getApiKey();
  if (!apiKey) {
    const err = new Error('No API key');
    err.code = 'NO_API_KEY';
    throw err;
  }
  const body = {
    model: model || getModel(),
    messages: [
      { role: 'system', content: system || 'You are Grok.' },
      ...messages,
    ],
    temperature: 0.55,
    stream: false,
  };
  if (jsonSchema) {
    body.response_format = {
      type: 'json_schema',
      json_schema: { name: 'structai_build', schema: jsonSchema, strict: false },
    };
  }
  const res = await fetch(XAI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error?.message || data?.message || `xAI API ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty Grok API response');
  return {
    text,
    structured: jsonSchema ? tryParseJson(text) : null,
    mode: 'api',
    model: data.model || body.model,
  };
}

/**
 * @param {object} opts
 * @param {boolean} [opts.enableWebSearch] live research (prices, contractors)
 * @param {string} [opts.imageDataUrl] data:image/...;base64,... sketch
 * @param {string} [opts.imagePath] saved file path
 */
async function callGrok({
  prompt,
  messages,
  model,
  jsonSchema,
  system,
  enableWebSearch = false,
  imageDataUrl = null,
  imagePath = null,
}) {
  const apiKey = getApiKey();
  const cli = findGrokCli();
  const builtPrompt = prompt || (messages || []).map((m) => {
    const c = m.content;
    if (typeof c === 'string') return `${m.role}: ${c}`;
    return `${m.role}: [multipart]`;
  }).join('\n\n');

  // Vision: prefer API with image content blocks when we have a key + image
  if (apiKey && imageDataUrl && (process.env.GROK_FORCE_API === '1' || enableWebSearch || true)) {
    try {
      const userContent = [
        { type: 'image_url', image_url: { url: imageDataUrl } },
        { type: 'text', text: builtPrompt },
      ];
      return await callGrokViaApi({
        messages: [{ role: 'user', content: userContent }],
        model: model || process.env.XAI_VISION_MODEL || getModel(),
        jsonSchema,
        system,
      });
    } catch (e) {
      console.warn('Vision API failed, falling back:', e.message);
    }
  }

  if (cli && process.env.GROK_FORCE_API !== '1') {
    try {
      return await callGrokViaCli({
        prompt: builtPrompt,
        jsonSchema,
        systemExtra: system || '',
        enableWebSearch,
        imagePath,
        timeoutMs: enableWebSearch ? 240000 : 120000,
      });
    } catch (e) {
      if (!apiKey) throw e;
      console.warn('CLI failed, API fallback:', e.message);
    }
  }
  if (apiKey) {
    let msgs = messages?.length ? messages : [{ role: 'user', content: builtPrompt }];
    if (imageDataUrl && typeof msgs[msgs.length - 1]?.content === 'string') {
      msgs = [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: imageDataUrl } },
          { type: 'text', text: msgs[msgs.length - 1].content },
        ],
      }];
    }
    return callGrokViaApi({
      messages: msgs,
      model,
      jsonSchema,
      system,
    });
  }
  const err = new Error('No Grok access. Run: grok login');
  err.code = 'NO_AUTH';
  throw err;
}

function applyMemoryUpdates(mem, updates, lesson, project) {
  if (!Array.isArray(updates)) updates = [];
  // Never persist lines that hard-lock the tutor onto a wrong "first" topic
  const blockPersist = /offered\s+.+\s+as\s+the\s+first|first\s+deeper\s+dive/i;
  for (const u of updates) {
    const s = String(u || '').trim();
    if (!s || blockPersist.test(s)) continue;
    if (!mem.facts.includes(s)) mem.facts.push(s);
  }
  // cap growth
  if (mem.facts.length > 200) mem.facts = mem.facts.slice(-200);
  // Prune known-bad legacy facts
  mem.facts = (mem.facts || []).filter((f) => !blockPersist.test(String(f)));
  if (lesson && String(lesson).trim()) {
    const L = String(lesson).trim();
    if (!mem.lessons.includes(L)) mem.lessons.push(L);
    if (mem.lessons.length > 100) mem.lessons = mem.lessons.slice(-100);
  }
  if (project) {
    const summary = `${project.scene?.title || project.title} (${project.scene?.objects?.length || 0} parts)`;
    mem.projectsSummary = (mem.projectsSummary || []).filter((x) => !String(x).startsWith(project.scene?.title || project.title));
    mem.projectsSummary.push(summary);
    if (mem.projectsSummary.length > 30) mem.projectsSummary = mem.projectsSummary.slice(-30);
    mem.lastActiveProjectId = project.id;
  }
  return saveMemory(mem);
}

function studioSystem(mem, mode = 'general') {
  return `You are **Grok** — one unified personal agent on the user's PC (xAI). Local only. No Base44.
Engineering, 3D, Super Tutor, and everyday help. Fast, clear, useful — and **truth-seeking**.

## Truth
- Never invent facts. If unsure, say so. Correct the user gently when they are wrong.
- Do not teach lies for entertainment.

## Personality
- Simple language first. No fluff. No "As an AI…".
- Witty when it fits, never mean. Family-friendly by default.

## Superpowers
1. **Super Tutor** — truth-seeking lessons (use the Tutor tab)
2. **3D Build** — live 3D design
3. **Anything else** — homework, ideas, planning, coding tips

## Mode for this turn: ${mode}

## Memory
${memoryBrief(mem)}

## Output rules
- Return JSON per schema
- message: the full answer
- memory_updates: 0–4 durable facts
- Keep message under ~250 words unless they ask for depth`;
}

const LEGACY_SYSTEM = `You are **Grok** — Super Agent for StructAI on the user's PC (xAI).
Structural eng, 3D print, materials, robotics, design. Show math when needed. Not a PE stamp.
Use markdown. Answer fully. Simple clear language.`;

function tutorSystem(mem, child, context = {}) {
  const age = Number(child?.age) || 8;
  let band = 'middle childhood';
  let style = 'Friendly teacher. Short paragraphs. Encourage curiosity.';
  if (age <= 5) {
    band = 'early childhood / toddler';
    style = 'Very short sentences. Simple words. Warm. One idea at a time. Still true — never invent fake facts for fun.';
  } else if (age <= 9) {
    band = 'early elementary';
    style = 'Playful, clear, step-by-step. Everyday examples. Celebrate effort. Truth over cuteness.';
  } else if (age <= 13) {
    band = 'preteen';
    style = 'Respectful coach. Clear explanations. Check understanding. Light humor ok if accurate.';
  } else {
    band = 'teen';
    style = 'Peer-smart mentor. Rigorous. Real-world hooks. Admit uncertainty. Cite how we know when useful.';
  }

  const progressLines = (context.recentProgress || [])
    .slice(0, 12)
    .map((p) => `- ${p.subject || '?'} “${p.lesson_title || p.title || 'lesson'}” score=${p.score ?? '?'}%`)
    .join('\n') || '(no recent progress yet)';

  const goals = (context.activeGoals || [])
    .slice(0, 5)
    .map((g) => `- ${g.goal_text || g.title || JSON.stringify(g)}`)
    .join('\n') || '(none)';

  const mastery = (context.masteryNotes || []).slice(0, 8).map((m) => `- ${m}`).join('\n') || '(none yet)';

  // Active lesson must be first-class in the prompt. Client may send lessonTitle /
  // lessonSnippet / classroom:true — if we omit them, nextLessons + memory can steal
  // the turn (e.g. rocket class → wrong pivot to Butterflies).
  const lessonTitle = String(context.lessonTitle || context.lesson_title || '').trim();
  const lessonSubject = String(context.lessonSubject || context.lesson_subject || '').trim();
  const lessonSnippet = String(context.lessonSnippet || context.lesson_snippet || context.lessonContent || '').trim();
  const lessonId = String(context.lessonId || context.lesson_id || '').trim();
  const inClassroom = !!(context.classroom || context.handRaised || lessonTitle || lessonSnippet);
  const hasActiveLesson = !!(lessonTitle || lessonSnippet);

  const activeLessonBlock = hasActiveLesson
    ? `# ACTIVE LESSON (GROUND TRUTH — highest priority)
The learner is **in this lesson right now**. Stay on this topic.

- title: ${lessonTitle || '(untitled)'}
- subject: ${lessonSubject || 'general'}
${lessonId ? `- id: ${lessonId}` : ''}
- lesson content (authoritative — expand from THIS, not from memory or nextLessons):
${lessonSnippet || '(no snippet — use the title/subject and the learner question only)'}

## STAY ON LESSON (non-negotiable)
1. If they ask to "talk more", "explain more", "go deeper", or ask a question mid-class: answer about **this lesson only**.
2. **Do not** switch topics (e.g. rockets → butterflies) because memory, "suggested next lessons", or another subject sounds interesting.
3. **Do not** call generate_lesson for a different topic while this lesson is active unless the learner **explicitly** asks to change topics.
4. Truth-seeking means true facts **about this lesson's subject** — not inventing a different lesson or "correcting" them onto another path.
5. Memory and nextLessons are background only. Active lesson + the learner's words win every time.
6. action: prefer **none** (or practice_quiz on THIS topic) while mid-lesson.`
    : `# ACTIVE LESSON
(none selected — if they name a topic, teach that topic; do not invent a different one)`;

  const classroomBlock = inClassroom
    ? `## Classroom voice (mid-class)
- Speak like a warm classroom teacher talking face-to-face with one student.
- Short turns. Check understanding. Use their first name.
- Never dump a wall of notes — teach out loud, then invite a question.
- Answer their raised-hand question, then stay ready to continue **the same** lesson.`
    : '';

  return `You are **Grok Super Tutor** — a fully local learning agent on the user's PC (xAI).
No cloud school platforms. You teach ONE learner. The local Grok app runs your tool **actions**.

# TRUTH-SEEKING (ABSOLUTE — never violate)
You will **not teach lies**. Accuracy is more important than sounding confident or entertaining.

1. **Only teach what is true** to the best of established knowledge (science, math, history, literacy).
2. **Never invent** fake facts, fake history, fake numbers, or "fun lies" for kids.
3. If you are **unsure**, say so clearly: "I'm not sure" / "Scientists still debate this" / "I may be wrong — let's check."
4. Separate **fact** vs **opinion** vs **story/myth**. Myths are OK only when labeled as myths/stories, not as true.
5. For math: show correct steps. If you make a calculation error, correct it — never double down.
6. For science: prefer well-supported explanations; note when something is simplified for age without becoming false.
7. Do **not** present conspiracy theories, medical diagnoses, or pseudoscience as fact.
8. If the learner states something false, gently correct with truth — never agree with a falsehood to be nice.
9. Quiz answers must be **actually correct**. Explanations must match reality.
10. When simplifying for young ages: simplify language and detail, **never** replace truth with a false story.
11. **Topic fidelity is part of truth**: do not "helpfully" change the lesson topic. Teaching butterflies during a rocket lesson is a false classroom state — wrong for the kid and the lesson.

${activeLessonBlock}

# Learner
- name: ${child?.name || 'Learner'} (first name only)
- age: ${age} (${band})
- grade: ${child?.grade || 'unknown'}
- xp: ${child?.xp ?? 0} · level: ${child?.level ?? 1} · streak: ${child?.streak ?? 0}
- subject focus: ${hasActiveLesson ? (lessonSubject || context.subjectFocus || 'open') : (context.subjectFocus || 'open')}

# Style for this age
${style}

# Teaching method
1. Connect to prior knowledge **of this topic**
2. Explain truly and simply (or Socratic hints)
3. Check understanding (question or practice_quiz / generate_lesson)
4. Celebrate effort; never shame
5. Next step **within the same topic** unless they ask to switch

# Safety
- Family-friendly. No sexual content, violence how-to, self-harm detail, adult topics.
- Never ask for last name, address, school name, phone, photos, passwords.
- Crisis: calm support → tell a parent/trusted adult. No probing.
- Tutor only — not doctor, lawyer, or therapist.

# Money / stocks / crypto (if taught)
- Always educational only — **not financial advice**.
- Prefer the Practice Market (fake companies + play money) for demos.
- When generating investing lessons, include a short disclaimer: educational only, not advice, can lose real money, ask a parent for real decisions.
- Never tell a child to buy/sell a real stock or crypto.

# Tool actions
- **generate_lesson** — subject, title, description, content (true 2–5 short paragraphs), emoji, difficulty, xp_reward (10–25), questions (exactly 3 MCQ: options[4], correct_index, true explanation)
- **practice_quiz** — subject + 1–5 true MCQs
- **update_mastery** — skill + honest note
- **set_daily_goal** — goal_text
- **parent_brief** — truthful 2–4 sentence summary for parents
- **none** — chat only

When they ask to learn a **new** topic (and no active lesson, or they explicitly change topics), prefer **generate_lesson** with complete true content same turn.
While an **ACTIVE LESSON** is set, prefer **none** and deepen that lesson — do not generate a different lesson.
Keep message under ~200 words unless they want depth.

# Recent progress
${progressLines}

# Active goals
${goals}

# Mastery notes
${mastery}

# Skill levels (lessons evolve with this learner)
${JSON.stringify(context.skillLevels || {}, null, 0)}

# Suggested next lessons (IGNORE while ACTIVE LESSON is set — only for after class)
${hasActiveLesson ? '(suppressed — finish active lesson first)' : ((context.nextLessons || []).join('\n') || '(pick age-fit beginner topics)')}

# Long-term memory (background only — never overrides ACTIVE LESSON or the kid's question)
${memoryBrief(mem, { tutorOnly: true })}

## Evolution rules
- Teach at this learner's age (${age}) and current skill levels.
- If they score high, offer slightly harder next steps **after** the current lesson.
- If they struggle, review foundations of **this** topic — never shame.
- Prefer generate_lesson that matches their path only when **no** active lesson / they asked for a new topic.

${classroomBlock}

Return JSON only per schema.`;
}

// ─── Express ───────────────────────────────────────────────────────────
const app = express();
app.use(express.json({ limit: '8mb' }));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.static(join(__dirname, 'public')));

app.get('/api/health', (_req, res) => {
  const cli = findGrokCli();
  const hasKey = Boolean(getApiKey());
  res.json({
    ok: true,
    agent: AGENT_IDENTITY.name,
    tagline: AGENT_IDENTITY.tagline,
    mode: 'unified',
    pillars: ['spark-path-learn', 'structura-ai'],
    hasKey,
    hasCli: Boolean(cli),
    cliPath: cli,
    ready: Boolean(cli) || hasKey,
    authMode: hasKey ? (cli ? 'cli+api' : 'api') : (cli ? 'cli' : 'none'),
    model: getModel(),
    port: PORT,
    features: [
      'super-tutor', 'lessons', 'market-lab', 'code-lab',
      'structure-designer', 'materials-db', 'loads-forces-heat-sim',
      'memory', 'voice', 'truth-seeking',
    ],
    backend: 'local-only',
    base44: false,
    replaces: ['structura-ai', 'provocative-spark-path-learn', 'brightmind'],
  });
});

/** Unified agent identity + disclaimers (both source apps) */
app.get('/api/agent', (_req, res) => {
  res.json({
    ...AGENT_IDENTITY,
    disclaimers: {
      educational: EDUCATIONAL_CONTENT_DISCLAIMER,
      market: STOCK_MARKET_DISCLAIMER,
      homeschool: HOMESCHOOL_DISCLAIMER,
      structural: STRUCTURAL_ENGINEERING_DISCLAIMER,
      materials: MATERIAL_DATA_DISCLAIMER,
      simulation: SIMULATION_DISCLAIMER,
    },
    materials: listMaterials().map((m) => ({
      id: m.id,
      name: m.name,
      category: m.category,
      grade: m.grade,
      density: m.density,
      youngs_modulus_gpa: m.youngs_modulus_gpa,
      yield_mpa: m.yield_mpa,
      tensile_mpa: m.tensile_mpa,
      color: m.color,
      cost_per_kg: m.cost_per_kg,
    })),
  });
});

/* ─── Super Tutor: local data (no Base44) ─────────── */
app.get('/api/tutor/children', (_req, res) => {
  res.json({ children: tutorStore.listChildren() });
});

app.post('/api/tutor/children', (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (!name && !req.body?.id) return res.status(400).json({ error: 'name required' });
    const child = tutorStore.saveChild({
      name: name || undefined,
      age: req.body?.age,
      grade: req.body?.grade,
      avatar: req.body?.avatar,
      id: req.body?.id,
    });
    res.json({ child, path: tutorStore.getLearnerPath(child.id) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** Admin: update username / age for a kid */
app.put('/api/tutor/children/:id', (req, res) => {
  try {
    const existing = tutorStore.getChild(req.params.id);
    if (!existing) return res.status(404).json({ error: 'child not found' });
    const child = tutorStore.saveChild({
      id: req.params.id,
      name: req.body?.name,
      age: req.body?.age,
      avatar: req.body?.avatar,
      grade: req.body?.grade,
    });
    res.json({ child, path: tutorStore.getLearnerPath(child.id) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/tutor/children/:id', (req, res) => {
  tutorStore.deleteChild(req.params.id);
  res.json({ ok: true });
});

/** Evolving lesson path for one learner */
app.get('/api/tutor/path/:childId', (req, res) => {
  const path = tutorStore.getLearnerPath(req.params.childId);
  if (!path) return res.status(404).json({ error: 'child not found' });
  res.json(path);
});

app.post('/api/tutor/evolve/:childId', (req, res) => {
  const child = tutorStore.evolveLearner(req.params.childId);
  if (!child) return res.status(404).json({ error: 'child not found' });
  res.json({ child, path: tutorStore.getLearnerPath(child.id) });
});

app.get('/api/tutor/context/:childId', (req, res) => {
  const child = tutorStore.getChild(req.params.childId);
  if (!child) return res.status(404).json({ error: 'child not found' });
  res.json({ child, context: tutorStore.contextForChild(child.id) });
});

/** Full lesson library with pictures for kids to browse */
app.get('/api/tutor/lessons', (req, res) => {
  const subject = req.query.subject || 'all';
  const q = req.query.q || '';
  const childId = req.query.childId || '';
  const lessons = tutorStore.listLessons({ subject, q, childId: childId || undefined });
  const subjects = [...new Set(tutorStore.listLessons({}).map((l) => l.subject).filter(Boolean))].sort();
  res.json({ lessons, subjects, count: lessons.length });
});

app.get('/api/tutor/lessons/:id', (req, res) => {
  const lesson = tutorStore.getLesson(req.params.id);
  if (!lesson) return res.status(404).json({ error: 'lesson not found' });
  res.json({ lesson });
});

app.get('/api/tutor/progress/:childId', (req, res) => {
  const progress = tutorStore.listProgress(req.params.childId);
  const completedLessonIds = [...new Set(progress.filter((p) => p.completed && p.lesson_id).map((p) => p.lesson_id))];
  res.json({ progress, completedLessonIds });
});

app.post('/api/tutor/complete', (req, res) => {
  try {
    const { childId, lesson, score, xpEarned } = req.body || {};
    if (!childId) return res.status(400).json({ error: 'childId required' });
    const result = tutorStore.completeLesson({ childId, lesson, score, xpEarned });
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * Super Tutor turn — Grok thinks; local store executes actions.
 * Zero Base44. Truth-seeking system prompt.
 */
app.post('/api/tutor', async (req, res) => {
  try {
    const message = String(req.body?.message || '').trim();
    if (!message) return res.status(400).json({ error: 'message required' });

    const history = Array.isArray(req.body?.history) ? req.body.history : [];
    let child = req.body?.child && typeof req.body.child === 'object' ? req.body.child : {};
    if (req.body?.childId) {
      const stored = tutorStore.getChild(req.body.childId);
      if (stored) child = stored;
    }
    let context = req.body?.context && typeof req.body.context === 'object' ? req.body.context : {};
    if (child?.id) {
      context = { ...tutorStore.contextForChild(child.id), ...context };
    }

    const mem = loadMemory();
    const system = tutorSystem(mem, child, context);

    const messages = [];
    for (const h of history.slice(-20)) {
      if (!h?.role || !h?.content) continue;
      messages.push({
        role: h.role === 'assistant' ? 'assistant' : 'user',
        content: String(h.content).slice(0, 8000),
      });
    }
    messages.push({ role: 'user', content: message.slice(0, 8000) });

    const result = await callGrok({
      messages,
      system,
      jsonSchema: TUTOR_RESPONSE_SCHEMA,
    });

    let payload = result.structured;
    if (!payload || typeof payload !== 'object') {
      payload = tryParseJson(result.text) || { message: result.text || 'Let’s learn something true together!' };
    }

    const reply = String(payload.message || result.text || 'OK').trim();
    let actions = Array.isArray(payload.actions) ? payload.actions : [];
    const speak = payload.speak ? String(payload.speak).slice(0, 500) : null;

    const activeTitle = String(context.lessonTitle || context.lesson_title || '').trim();
    const midClass = !!(context.classroom || context.handRaised || activeTitle);

    // Drop empty/none noise; guard mid-class topic switches
    actions = actions.filter((a) => {
      const t = String(a?.type || 'none').toLowerCase();
      return t && t !== 'none';
    });

    // Server-side action execution (local only) + active-lesson guard
    const effects = tutorStore.processActions(actions, child, {
      classroom: midClass,
      handRaised: !!context.handRaised,
      activeLessonTitle: activeTitle,
      lessonTitle: activeTitle,
      lessonSubject: context.lessonSubject || context.lesson_subject || '',
    });

    const name = String(child?.name || 'Learner').slice(0, 40);
    const tagged = sanitizeTutorMemoryUpdates(
      (Array.isArray(payload.memory_updates) ? payload.memory_updates : [])
        .map((u) => {
          const s = String(u || '').trim();
          if (!s) return '';
          return s.startsWith(name) || s.startsWith('tutor:') ? s : `tutor:${name}: ${s}`;
        })
        .filter(Boolean),
      activeTitle,
    );

    // Remember the lesson they actually studied, not a random next-topic offer
    const lessonMem = activeTitle
      ? `Studied “${activeTitle}” with ${name}`
      : (effects.lessons?.[0]?.title ? `Created lesson “${effects.lessons[0].title}” for ${name}` : null);

    applyMemoryUpdates(mem, tagged, lessonMem, null);

    res.json({
      message: reply,
      speak,
      actions,
      effects,
      child: child?.id ? tutorStore.getChild(child.id) : child,
      memory_updates: tagged,
      mode: result.mode,
      model: result.model,
    });
  } catch (e) {
    console.error('[tutor]', e);
    const status = e.code === 'NO_AUTH' || e.code === 'NO_CLI' ? 401 : e.status || 500;
    res.status(status).json({ error: e.message || 'Tutor failed' });
  }
});

/**
 * General help: ask anything
 */
app.post('/api/help', async (req, res) => {
  try {
    const message = String(req.body?.message || '').trim();
    const mode = String(req.body?.mode || 'general');
    const context = String(req.body?.context || '').slice(0, 4000);
    if (!message) return res.status(400).json({ error: 'message required' });

    const mem = loadMemory();
    const system = studioSystem(mem, mode);
    const prompt = `## CONTEXT\n${context || '(none)'}\n\n## USER\n${message}\n\nReturn JSON with message, memory_updates, lesson.`;

    const result = await callGrok({
      prompt,
      system,
      jsonSchema: HELP_RESPONSE_SCHEMA,
    });

    let payload = result.structured;
    if (!payload || typeof payload !== 'object') {
      payload = tryParseJson(result.text) || { message: result.text || 'Done.' };
    }
    const reply = String(payload.message || result.text || 'OK').trim();
    applyMemoryUpdates(mem, payload.memory_updates, payload.lesson, null);

    res.json({
      message: reply,
      memory: loadMemory(),
      mode: result.mode,
    });
  } catch (e) {
    console.error(e);
    const status = e.code === 'NO_AUTH' || e.code === 'NO_CLI' ? 401 : e.status || 500;
    res.status(status).json({ error: e.message || 'Help failed' });
  }
});

app.get('/api/config', (_req, res) => {
  const cfg = loadConfig();
  const cli = findGrokCli();
  res.json({
    hasKey: Boolean(getApiKey()),
    hasCli: Boolean(cli),
    ready: Boolean(cli) || Boolean(getApiKey()),
    model: getModel(),
    keyHint: cfg.apiKey ? `…${cfg.apiKey.slice(-4)}` : null,
  });
});

app.post('/api/config', (req, res) => {
  const { apiKey, model } = req.body || {};
  const cfg = loadConfig();
  if (typeof apiKey === 'string') {
    if (apiKey.trim()) cfg.apiKey = apiKey.trim();
    else delete cfg.apiKey;
  }
  if (typeof model === 'string' && model.trim()) cfg.model = model.trim();
  saveConfig(cfg);
  res.json({ ok: true, hasKey: Boolean(getApiKey()), hasCli: Boolean(findGrokCli()), ready: true, model: getModel() });
});

/** Link connectors: X handle + Grok status */
app.get('/api/connectors', (_req, res) => {
  const cfg = loadConfig();
  const cli = findGrokCli();
  res.json({
    x: {
      handle: cfg.xHandle || '',
      connected: Boolean(cfg.xHandle),
      composeUrl: 'https://twitter.com/intent/tweet',
      homeUrl: 'https://x.com',
    },
    grok: {
      cliPath: cli,
      cliConnected: Boolean(cli),
      webUrl: 'https://grok.com',
      consoleUrl: 'https://console.x.ai',
      ready: Boolean(cli) || Boolean(getApiKey()),
    },
  });
});

app.post('/api/connectors', (req, res) => {
  const cfg = loadConfig();
  const { xHandle } = req.body || {};
  if (typeof xHandle === 'string') {
    cfg.xHandle = xHandle.trim().replace(/^@/, '');
  }
  saveConfig(cfg);
  res.json({
    ok: true,
    x: { handle: cfg.xHandle || '', connected: Boolean(cfg.xHandle) },
  });
});

app.get('/api/memory', (_req, res) => {
  res.json(loadMemory());
});

app.post('/api/memory', (req, res) => {
  const mem = loadMemory();
  const { userName, fact, preference, clear } = req.body || {};
  if (clear === true) {
    const fresh = EMPTY_MEMORY();
    saveMemory(fresh);
    return res.json(fresh);
  }
  if (typeof userName === 'string' && userName.trim()) mem.userName = userName.trim();
  if (typeof fact === 'string' && fact.trim() && !mem.facts.includes(fact.trim())) mem.facts.push(fact.trim());
  if (typeof preference === 'string' && preference.trim() && !mem.preferences.includes(preference.trim())) {
    mem.preferences.push(preference.trim());
  }
  res.json(saveMemory(mem));
});

app.get('/api/projects', (_req, res) => {
  res.json({ projects: listProjects(), memory: loadMemory() });
});

app.post('/api/projects', (req, res) => {
  const title = (req.body?.title || 'New build').slice(0, 120);
  const project = createProject(title);
  res.json(project);
});

app.get('/api/projects/:id', (req, res) => {
  const p = loadProject(req.params.id);
  if (!p) return res.status(404).json({ error: 'Project not found' });
  res.json(p);
});

app.put('/api/projects/:id/scene', (req, res) => {
  const p = loadProject(req.params.id);
  if (!p) return res.status(404).json({ error: 'Project not found' });
  p.scene = normalizeScene(req.body?.scene || req.body, p.scene);
  p.buildLog = p.buildLog || [];
  p.buildLog.push({ at: new Date().toISOString(), by: 'user', action: 'manual scene edit' });
  saveProject(p);
  res.json(p);
});

app.delete('/api/projects/:id', (req, res) => {
  const p = projectPath(req.params.id);
  if (existsSync(p)) unlinkSync(p);
  res.json({ ok: true });
});

/**
 * Core collaborative turn: user message → Grok message + 3D scene + memory
 */
app.post('/api/build', async (req, res) => {
  try {
    let { projectId, message, scene: clientScene } = req.body || {};
    message = String(message || '').trim();
    if (!message) return res.status(400).json({ error: 'message required' });

    let project = projectId ? loadProject(projectId) : null;
    if (!project) project = createProject('New build');

    // Accept latest scene from client (user may have dragged/edited)
    if (clientScene) {
      project.scene = normalizeScene(clientScene, project.scene);
    }

    project.messages = project.messages || [];
    project.messages.push({ role: 'user', content: message, at: new Date().toISOString() });

    const mem = loadMemory();
    const system = buildSystemPrompt(mem, project);
    const recent = project.messages.slice(-14).map((m) => `${m.role === 'user' ? 'User' : 'Grok'}: ${m.content}`).join('\n\n');

    const prompt = `## RECENT CONVERSATION
${recent}

## USER REQUEST
${message}

Update the engineering structure if needed. Prefer returning **structure** (type, dimensions, materials, loads). Server expands truthful 3D members + analysis. Return JSON with message, structure, optional scene, memory_updates, lesson.`;

    const result = await callGrok({
      prompt,
      system,
      jsonSchema: BUILD_RESPONSE_SCHEMA,
    });

    let payload = result.structured;
    if (!payload || typeof payload !== 'object') {
      payload = tryParseJson(result.text) || { message: result.text || 'Done.', scene: null };
    }

    const replyText = String(payload.message || payload.text || result.text || 'Updated.').trim();
    project.messages.push({ role: 'assistant', content: replyText, at: new Date().toISOString() });

    let sceneChanged = applyBuildPayload(project, payload);

    if (sceneChanged) {
      project.title = project.scene.title || project.scene.structure?.name || project.title;
      project.buildLog = project.buildLog || [];
      project.buildLog.push({
        at: new Date().toISOString(),
        by: 'grok',
        action: 'structure update',
        type: project.scene.structure?.type,
        objectCount: project.scene.objects?.length || 0,
        risk: project.scene.analysis?.overall_risk,
      });
    }

    applyMemoryUpdates(mem, payload.memory_updates, payload.lesson, project);
    if (payload.lesson) {
      const m2 = loadMemory();
      if (payload.lesson && !m2.skillsGrown.includes(String(payload.lesson).slice(0, 80))) {
        m2.skillsGrown.push(String(payload.lesson).slice(0, 80));
        if (m2.skillsGrown.length > 50) m2.skillsGrown = m2.skillsGrown.slice(-50);
        saveMemory(m2);
      }
    }

    // Keep message history bounded
    if (project.messages.length > 200) {
      project.messages = [
        project.messages[0],
        ...project.messages.slice(-180),
      ];
    }

    saveProject(project);

    res.json({
      projectId: project.id,
      message: replyText,
      scene: project.scene,
      sceneChanged,
      memory: loadMemory(),
      mode: result.mode,
    });
  } catch (e) {
    console.error(e);
    const status = e.code === 'NO_AUTH' || e.code === 'NO_CLI' ? 401 : e.status || 500;
    res.status(status).json({ error: e.message || 'Build turn failed' });
  }
});

/* ─── Paper sketch → Blueprint → Build plan → live research ─── */
const SKETCH_DIR = join(DATA_DIR, 'sketches');
if (!existsSync(SKETCH_DIR)) mkdirSync(SKETCH_DIR, { recursive: true });

const BLUEPRINT_SCHEMA = {
  type: 'object',
  properties: {
    message: { type: 'string', description: 'Friendly build partner summary in markdown' },
    sketch_reading: {
      type: 'object',
      properties: {
        what_i_see: { type: 'string' },
        rooms: { type: 'array', items: { type: 'string' } },
        stories: { type: 'number' },
        style: { type: 'string' },
        assumed_scale: { type: 'string' },
        confidence: { type: 'string' },
      },
    },
    structure: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        type: { type: 'string' },
        description: { type: 'string' },
        dimensions: {
          type: 'object',
          properties: {
            length: { type: 'number' },
            width: { type: 'number' },
            height: { type: 'number' },
            unit: { type: 'string' },
          },
        },
        materials: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              type: { type: 'string' },
              grade: { type: 'string' },
              quantity: { type: 'string' },
            },
          },
        },
        loads: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              magnitude: { type: 'number' },
              unit: { type: 'string' },
              direction: { type: 'string' },
            },
          },
        },
      },
    },
    blueprint: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        scale: { type: 'string' },
        north: { type: 'string' },
        overall_ft: {
          type: 'object',
          properties: { length: { type: 'number' }, width: { type: 'number' }, height: { type: 'number' } },
        },
        rooms: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              x: { type: 'number' },
              y: { type: 'number' },
              w: { type: 'number' },
              h: { type: 'number' },
              notes: { type: 'string' },
            },
          },
        },
        walls: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              x1: { type: 'number' }, y1: { type: 'number' },
              x2: { type: 'number' }, y2: { type: 'number' },
              exterior: { type: 'boolean' },
            },
          },
        },
        doors: {
          type: 'array',
          items: {
            type: 'object',
            properties: { x: { type: 'number' }, y: { type: 'number' }, label: { type: 'string' } },
          },
        },
        windows: {
          type: 'array',
          items: {
            type: 'object',
            properties: { x: { type: 'number' }, y: { type: 'number' }, label: { type: 'string' } },
          },
        },
        notes: { type: 'array', items: { type: 'string' } },
      },
    },
    build_plan: {
      type: 'object',
      properties: {
        phases: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              order: { type: 'number' },
              description: { type: 'string' },
              materials: { type: 'array', items: { type: 'string' } },
              trades: { type: 'array', items: { type: 'string' } },
              diy_or_sub: { type: 'string' },
              est_days: { type: 'number' },
              est_cost_usd_low: { type: 'number' },
              est_cost_usd_high: { type: 'number' },
            },
          },
        },
        total_est_usd_low: { type: 'number' },
        total_est_usd_high: { type: 'number' },
        region_note: { type: 'string' },
      },
    },
    bill_of_materials: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          item: { type: 'string' },
          material: { type: 'string' },
          qty: { type: 'number' },
          unit: { type: 'string' },
          phase: { type: 'string' },
          unit_cost_usd: { type: 'number' },
          total_usd: { type: 'number' },
          notes: { type: 'string' },
        },
      },
    },
    subcontract_packages: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          trade: { type: 'string' },
          scope: { type: 'string' },
          why_sub: { type: 'string' },
          search_query: { type: 'string' },
        },
      },
    },
    permits_and_checks: { type: 'array', items: { type: 'string' } },
    disclaimers: { type: 'array', items: { type: 'string' } },
  },
  required: ['message', 'structure', 'blueprint', 'build_plan'],
};

const RESEARCH_SCHEMA = {
  type: 'object',
  properties: {
    message: { type: 'string' },
    researched_at: { type: 'string' },
    region: { type: 'string' },
    price_checks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          item: { type: 'string' },
          unit: { type: 'string' },
          price_low_usd: { type: 'number' },
          price_high_usd: { type: 'number' },
          source_note: { type: 'string' },
          url_or_vendor: { type: 'string' },
        },
      },
    },
    contractors: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          trade: { type: 'string' },
          how_to_find: { type: 'string' },
          search_queries: { type: 'array', items: { type: 'string' } },
          questions_to_ask: { type: 'array', items: { type: 'string' } },
          red_flags: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    links: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          url: { type: 'string' },
          why: { type: 'string' },
        },
      },
    },
    next_steps: { type: 'array', items: { type: 'string' } },
  },
  required: ['message'],
};

function saveSketchDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) return null;
  const m = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!m) return null;
  const ext = m[1] === 'jpeg' ? 'jpg' : m[1].slice(0, 4);
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 8_000_000) throw Object.assign(new Error('Sketch image too large (max ~6MB)'), { status: 400 });
  const name = `sketch_${Date.now()}_${randomUUID().slice(0, 8)}.${ext}`;
  const path = join(SKETCH_DIR, name);
  writeFileSync(path, buf);
  return path;
}

/**
 * Paper sketch → blueprint + full build plan (foundation/clay → roof)
 */
app.post('/api/blueprint/from-sketch', async (req, res) => {
  try {
    const {
      projectId,
      imageDataUrl,
      notes = '',
      location = '',
      units = 'ft',
      wallMaterial = 'red clay brick',
    } = req.body || {};

    let project = projectId ? loadProject(projectId) : null;
    if (!project) project = createProject('Paper house blueprint');

    let imagePath = null;
    try {
      imagePath = saveSketchDataUrl(imageDataUrl);
    } catch (e) {
      return res.status(e.status || 400).json({ error: e.message });
    }

    const system = `You are Grok, a construction co-builder and drafting partner on the user's PC.
You convert PAPER HOUSE SKETCHES into educational blueprints + full build plans (red clay / foundation → roof).

TRUTH RULES:
- This is NOT a licensed PE stamp, NOT stamped construction documents, NOT a permit set.
- Dimensions from freehand sketches are ASSUMED — label assumptions and confidence.
- Costs are educational ballpark ranges; use web search when available for rough regional checks.
- Never claim fake code compliance. Flag when a PE / architect / local permit is required.
- Prefer practical build sequence: site → foundation → masonry/clay or framing → roof → MEP → finishes.
- If image is unclear, still produce a best-effort house plan from notes + typical cottage layout and say confidence is low.

Wall preference from user: ${wallMaterial}
Location hint: ${location || 'unspecified (use US general costs and note that)'}
Units preference: ${units}`;

    const prompt = `Convert this paper house sketch into a REAL blueprint-style plan and a full partner build plan.

USER NOTES: ${notes || '(none — read the sketch carefully)'}
LOCATION: ${location || 'not specified'}
PREFERRED WALLS: ${wallMaterial}

Tasks:
1) Describe what you see on the paper (rooms, stories, roof style).
2) Produce blueprint rooms in plan coordinates (x,y,w,h in feet relative to origin).
3) structure: type "house" or "cabin" with dimensions in meters (convert from ft if needed).
4) build_plan phases from ground to roof, including red clay brick / masonry if chosen:
   - Site prep & excavation
   - Foundation / footings / slab
   - Red clay brick / masonry walls OR wood framing (per preference)
   - Floor structure
   - Roof structure & covering
   - Windows & doors
   - Rough MEP (electric, plumbing, HVAC)
   - Insulation & drywall / finishes
5) Bill of materials with qty + educational unit costs.
6) subcontract_packages with search_query strings for finding local trades.
7) permits_and_checks list.
8) Clear disclaimers.

Return JSON matching the schema. Be specific and practical so we can work the whole project together.`;

    const result = await callGrok({
      prompt,
      system,
      jsonSchema: BLUEPRINT_SCHEMA,
      enableWebSearch: true,
      imageDataUrl: imageDataUrl || null,
      imagePath,
      model: process.env.XAI_VISION_MODEL || getModel(),
    });

    let payload = result.structured;
    if (!payload || typeof payload !== 'object') {
      payload = tryParseJson(result.text) || {
        message: result.text || 'Could not parse blueprint. Try a clearer photo and notes.',
      };
    }

    // Expand 3D house from structure
    if (payload.structure) {
      const st = normalizeStructure({
        ...payload.structure,
        type: payload.structure.type || 'house',
        name: payload.structure.name || payload.blueprint?.title || 'Paper house',
      });
      project.scene = structureToScene(st, project.scene);
      project.scene.title = st.name;
      project.scene.description = payload.sketch_reading?.what_i_see || st.description;
      project.title = st.name;
    }

    project.blueprint = {
      sketchPath: imagePath,
      sketchReading: payload.sketch_reading || null,
      plan: payload.blueprint || null,
      buildPlan: payload.build_plan || null,
      bom: payload.bill_of_materials || [],
      subcontract: payload.subcontract_packages || [],
      permits: payload.permits_and_checks || [],
      disclaimers: payload.disclaimers || [
        ENG_DISCLAIMER,
        'Cost ranges are educational estimates, not contractor bids.',
        'Finding contractors is research guidance only — verify licenses and insurance yourself.',
      ],
      research: null,
      updatedAt: new Date().toISOString(),
    };

    const reply = String(payload.message || 'Blueprint draft ready. Review rooms, phases, and costs together.');
    project.messages = project.messages || [];
    project.messages.push({ role: 'user', content: notes ? `Paper sketch + notes: ${notes}` : 'Paper house sketch → blueprint', at: new Date().toISOString() });
    project.messages.push({ role: 'assistant', content: reply, at: new Date().toISOString() });
    project.buildLog = project.buildLog || [];
    project.buildLog.push({ at: new Date().toISOString(), by: 'grok', action: 'paper-to-blueprint' });
    saveProject(project);

    res.json({
      projectId: project.id,
      message: reply,
      scene: project.scene,
      sceneChanged: true,
      blueprint: project.blueprint,
      mode: result.mode,
    });
  } catch (e) {
    console.error(e);
    const status = e.code === 'NO_AUTH' || e.code === 'NO_CLI' ? 401 : e.status || 500;
    res.status(status).json({ error: e.message || 'Blueprint from sketch failed' });
  }
});

/**
 * Live Grok research: material prices + how to find / sub out contractors
 */
app.post('/api/blueprint/research', async (req, res) => {
  try {
    const {
      projectId,
      focus = 'both', // prices | contractors | both
      location = '',
      notes = '',
    } = req.body || {};

    const project = projectId ? loadProject(projectId) : null;
    if (!project) return res.status(404).json({ error: 'project required' });

    const bp = project.blueprint || {};
    const bom = bp.bom || [];
    const subs = bp.subcontract || [];
    const plan = bp.buildPlan || {};
    const structure = project.scene?.structure;

    const system = `You are Grok doing LIVE research for a home-build co-pilot.
Use web search / fetch for current ballpark material prices and contractor-finding guidance.
Be truthful: prices vary by region; say so. Not a bidding service. Not legal advice.
Prefer US general retail (Home Depot / Lowe's style) if region unknown.
Always include search queries the user can run locally.`;

    const prompt = `Live research for this house project.

FOCUS: ${focus}
LOCATION: ${location || 'not specified — use general US and note that'}
USER NOTES: ${notes || 'none'}

STRUCTURE: ${JSON.stringify(structure || {})}
BUILD PHASES: ${JSON.stringify(plan.phases || []).slice(0, 6000)}
BOM SAMPLE: ${JSON.stringify(bom.slice(0, 40))}
SUB PACKAGES: ${JSON.stringify(subs)}

Tasks:
1) price_checks: update key materials (red clay brick, concrete, lumber, roofing, windows, etc.) with low/high USD and source notes. Search live if tools allow.
2) contractors: for each major trade (foundation, masonry/brick, framing, roofing, electrical, plumbing), how to find licensed local subs, good search queries, questions to ask, red flags.
3) links: useful public pages (if known).
4) next_steps: ordered checklist for the owner-builder / GC path.

Return JSON per schema. Mark researched_at as today's date.`;

    const result = await callGrok({
      prompt,
      system,
      jsonSchema: RESEARCH_SCHEMA,
      enableWebSearch: true,
    });

    let payload = result.structured || tryParseJson(result.text) || { message: result.text };
    payload.researched_at = payload.researched_at || new Date().toISOString();

    project.blueprint = project.blueprint || {};
    project.blueprint.research = payload;
    project.blueprint.updatedAt = new Date().toISOString();
    project.messages.push({
      role: 'user',
      content: `Research ${focus} for build${location ? ' near ' + location : ''}`,
      at: new Date().toISOString(),
    });
    project.messages.push({
      role: 'assistant',
      content: String(payload.message || 'Research complete.'),
      at: new Date().toISOString(),
    });
    saveProject(project);

    res.json({
      projectId: project.id,
      message: payload.message,
      research: payload,
      blueprint: project.blueprint,
      mode: result.mode,
    });
  } catch (e) {
    console.error(e);
    const status = e.code === 'NO_AUTH' || e.code === 'NO_CLI' ? 401 : e.status || 500;
    res.status(status).json({ error: e.message || 'Research failed' });
  }
});

app.get('/api/blueprint/:projectId', (req, res) => {
  const p = loadProject(req.params.projectId);
  if (!p) return res.status(404).json({ error: 'not found' });
  res.json({ blueprint: p.blueprint || null, scene: p.scene, title: p.title });
});

// Legacy Structura app bridge
app.post('/api/invoke', async (req, res) => {
  try {
    const { prompt, history, response_json_schema, model } = req.body || {};
    if (!prompt || typeof prompt !== 'string') return res.status(400).json({ error: 'prompt required' });
    const messages = [];
    if (Array.isArray(history)) {
      for (const h of history.slice(-16)) {
        if (h?.role && h?.content) messages.push({ role: h.role === 'assistant' ? 'assistant' : 'user', content: String(h.content) });
      }
    }
    messages.push({ role: 'user', content: prompt });
    const mem = loadMemory();
    const system = `${LEGACY_SYSTEM}\n\nMEMORY:\n${memoryBrief(mem)}`;
    const result = await callGrok({
      messages,
      model,
      jsonSchema: response_json_schema || null,
      system,
    });
    if (response_json_schema && result.structured && typeof result.structured === 'object') {
      return res.json({ ...result.structured, text: result.text, model: result.model, mode: result.mode });
    }
    res.json({ text: result.text, model: result.model, mode: result.mode });
  } catch (e) {
    const status = e.code === 'NO_AUTH' || e.code === 'NO_CLI' ? 401 : e.status || 500;
    res.status(status).json({ error: e.message || 'Invoke failed' });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body || {};
    if (!Array.isArray(messages) || !messages.length) {
      return res.status(400).json({ error: 'messages required' });
    }
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    const text = lastUser?.content || messages[messages.length - 1]?.content || 'Hello';
    const mem = loadMemory();
    let project = mem.lastActiveProjectId ? loadProject(mem.lastActiveProjectId) : null;
    if (!project) project = createProject('Chat build');

    // Run same pipeline as /api/build via internal fetch to our own logic
    project.messages = project.messages || [];
    project.messages.push({ role: 'user', content: text, at: new Date().toISOString() });
    const system = buildSystemPrompt(mem, project);
    const recent = project.messages.slice(-14).map((m) => `${m.role === 'user' ? 'User' : 'Grok'}: ${m.content}`).join('\n\n');
    const result = await callGrok({
      prompt: `## RECENT CONVERSATION\n${recent}\n\n## USER REQUEST\n${text}\n\nReturn JSON with message, scene, memory_updates, lesson.`,
      system,
      jsonSchema: BUILD_RESPONSE_SCHEMA,
    });
    const payload = result.structured || tryParseJson(result.text) || { message: result.text };
    const replyText = String(payload.message || result.text || 'OK');
    project.messages.push({ role: 'assistant', content: replyText, at: new Date().toISOString() });
    if (payload.scene && Array.isArray(payload.scene.objects)) {
      project.scene = normalizeScene(payload.scene, project.scene);
    }
    applyMemoryUpdates(mem, payload.memory_updates, payload.lesson, project);
    saveProject(project);
    res.json({ text: replyText, scene: project.scene, mode: result.mode });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/bootstrap', (_req, res) => {
  const mem = loadMemory();
  let project = mem.lastActiveProjectId ? loadProject(mem.lastActiveProjectId) : null;
  if (!project) {
    const projects = listProjects();
    if (projects[0]) project = loadProject(projects[0].id);
  }
  if (!project) project = createProject('First build together');
  res.json({ project, memory: mem, projects: listProjects() });
});

async function main() {
  const cli = findGrokCli();
  const hasKey = Boolean(getApiKey());
  if (!listProjects().length) createProject('First build together');

  const server = createServer(app);
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`  Port ${PORT} already in use — Grok may already be running.`);
      console.log(`  Open http://127.0.0.1:${PORT}`);
      process.exit(0);
    }
    console.error(err);
    process.exit(1);
  });

  server.listen(PORT, '127.0.0.1', () => {
    console.log('');
    console.log('  Grok Agent is live');
    console.log(`  http://127.0.0.1:${PORT}`);
    if (cli) console.log('  Auth: Grok CLI');
    else if (hasKey) console.log('  Auth: API key');
    else console.log('  Auth: run  grok login');
    console.log('');

    // Launcher sets GROK_OPEN_BROWSER=0 so only one browser tab opens
    if (process.env.GROK_OPEN_BROWSER !== '0') {
      import('child_process').then(({ exec }) => {
        if (process.platform === 'win32') exec(`cmd /c start "" "http://127.0.0.1:${PORT}"`);
      }).catch(() => {});
    }
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
