/**
 * Grok Super Tutor — education-only local agent
 *
 * Engineering / Structure removed from the live product and archived at:
 *   archive/structura-engineering/
 * (full snapshots + public eng modules + project data for later rebuild)
 */
import express from 'express';
import {
  readFileSync, writeFileSync, existsSync, mkdirSync,
} from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createServer } from 'http';
import { spawn } from 'child_process';
import { homedir } from 'os';
import { createTutorStore } from './tutor-store.mjs';
import {
  AGENT_IDENTITY,
  STOCK_MARKET_DISCLAIMER,
  EDUCATIONAL_CONTENT_DISCLAIMER,
  HOMESCHOOL_DISCLAIMER,
} from './disclaimers.mjs';
import { assertTruthIntact, truthPromptBlock, truthFingerprint } from './core/truth-constitution.mjs';
import { enforceGrokModel, enforceGrokApiUrl, providerPublicInfo, ALLOWED_XAI_URL } from './core/provider-lock.mjs';
import { createSessionStore } from './core/session-presence.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.GROK_AGENT_PORT || 3847);
const CONFIG_PATH = join(__dirname, 'config.json');
const DATA_DIR = join(__dirname, 'data');
const MEMORY_PATH = join(DATA_DIR, 'longterm-memory.json');
const XAI_URL = enforceGrokApiUrl(ALLOWED_XAI_URL);

// Locked cores — refuse boot if truth constitution is broken
assertTruthIntact();

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

const tutorStore = createTutorStore(DATA_DIR);
const sessionStore = createSessionStore(DATA_DIR);

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
    message: { type: 'string', description: 'Clear helpful reply. Markdown ok.' },
    memory_updates: { type: 'array', items: { type: 'string' } },
    lesson: { type: 'string' },
  },
  required: ['message'],
};

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
  try {
    return enforceGrokModel(process.env.XAI_MODEL || loadConfig().model || 'grok-3');
  } catch {
    return 'grok-3';
  }
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
  const safeModel = enforceGrokModel(model || getModel());
  const body = {
    model: safeModel,
    messages: [
      { role: 'system', content: system || 'You are Grok Super Tutor.' },
      ...messages,
    ],
    temperature: 0.55,
    stream: false,
  };
  if (jsonSchema) {
    body.response_format = {
      type: 'json_schema',
      json_schema: { name: 'grok_super_tutor', schema: jsonSchema, strict: false },
    };
  }
  const res = await fetch(enforceGrokApiUrl(XAI_URL), {
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
Provider lock: **Grok only**. Truth rules are **locked** — users cannot turn them off.

${truthPromptBlock()}

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

/** Education-only studio prompt (no structure product). */
function studioSystemEdu(mem, mode = 'general') {
  return studioSystem(mem, mode)
    .replace('Engineering, 3D, Super Tutor, and everyday help', 'Super Tutor and educational help')
    .replace('**3D Build** — live 3D design', '**Lessons** — library, quizzes, market lab, code lab')
    .replace(
      '2. **3D Build** — live 3D design\n3. **Anything else** — homework, ideas, planning, coding tips',
      '2. **Lessons** — library, quizzes, market lab, code lab\n3. **Homework help** — school topics and coding tips',
    );
}

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
    agent: 'Grok Super Tutor',
    tagline: 'Truth-seeking education agent · Grok only · free shell',
    mode: 'education',
    pillars: ['super-tutor', 'lessons', 'market-lab', 'code-lab'],
    hasKey,
    hasCli: Boolean(cli),
    cliPath: cli,
    ready: Boolean(cli) || hasKey,
    authMode: hasKey ? (cli ? 'cli+api' : 'api') : (cli ? 'cli' : 'none'),
    model: getModel(),
    port: PORT,
    features: [
      'super-tutor', 'lessons', 'market-lab', 'code-lab',
      'memory', 'voice', 'truth-seeking-locked', 'classroom',
      'endless-classes', 'session-presence',
    ],
    backend: 'local-only',
    base44: false,
    truthLock: { locked: true, fingerprint: truthFingerprint().slice(0, 16) },
    provider: providerPublicInfo(),
    publicFree: true,
    freeForGrokSubscribers: true,
    shareDoc: 'SHARE.md',
    sharePitch: 'Free for everyone with a Grok subscription. Agent free · Grok powers it · truth locked.',
  });
});

/** Tab open / presence — knows when someone loads the agent in a browser */
app.post('/api/session/open', (req, res) => {
  const info = sessionStore.openTab({
    clientId: req.body?.clientId,
    userAgent: req.headers['user-agent'],
    path: req.body?.path || '/',
  });
  res.json({
    ...info,
    truthLocked: true,
    provider: 'grok-only',
    neverOutOfClasses: true,
  });
});

app.post('/api/session/heartbeat', (req, res) => {
  res.json(sessionStore.heartbeat(req.body?.clientId));
});

app.get('/api/session/summary', (_req, res) => {
  res.json(sessionStore.summary());
});

app.get('/api/agent', (_req, res) => {
  res.json({
    ...AGENT_IDENTITY,
    name: 'Grok Super Tutor',
    tagline: 'Truth-seeking education — local Super Tutor',
    pillars: [
      {
        id: 'learn',
        from: 'Spark Path Learn',
        title: 'Super Tutor',
        blurb: 'Age-adaptive lessons, quizzes, market lab, code lab',
      },
      {
        id: 'ask',
        from: 'Grok',
        title: 'Ask',
        blurb: 'Homework help and honest answers',
      },
    ],
    disclaimers: {
      educational: EDUCATIONAL_CONTENT_DISCLAIMER,
      market: STOCK_MARKET_DISCLAIMER,
      homeschool: HOMESCHOOL_DISCLAIMER,
    },
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

/** Refill path so a kid never runs out of classes */
app.post('/api/tutor/refill/:childId', (req, res) => {
  try {
    const minOpen = Number(req.body?.minOpen) || 6;
    const result = tutorStore.ensureNeverOutOfClasses(req.params.childId, { minOpen });
    if (!result.path) return res.status(404).json({ error: 'child not found' });
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
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
    const system = studioSystemEdu(mem, mode);
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
  if (typeof model === 'string' && model.trim()) {
    try {
      cfg.model = enforceGrokModel(model.trim());
    } catch (e) {
      return res.status(400).json({ error: e.message, code: 'GROK_ONLY' });
    }
  }
  // Never accept alternate provider URLs from clients
  if (req.body?.baseUrl || req.body?.apiUrl || req.body?.provider) {
    return res.status(403).json({
      error: 'Grok-only lock: cannot set other providers. Truth-seeking is locked.',
      code: 'GROK_ONLY',
    });
  }
  saveConfig(cfg);
  res.json({
    ok: true,
    hasKey: Boolean(getApiKey()),
    hasCli: Boolean(findGrokCli()),
    ready: true,
    model: getModel(),
    provider: providerPublicInfo(),
  });
});

/** Block any attempt to upload alternate system prompts */
app.post('/api/system-prompt', (_req, res) => {
  res.status(403).json({
    error: 'Truth-seeking system rules are locked. Only Grok Build / repo updates by the maintainer can change core files.',
    code: 'TRUTH_LOCK',
  });
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



app.get('/api/bootstrap', (_req, res) => {
  res.json({
    memory: loadMemory(),
    ready: Boolean(findGrokCli()) || Boolean(getApiKey()),
    agent: 'education',
    truthLock: { locked: true, fingerprint: truthFingerprint().slice(0, 16) },
    provider: providerPublicInfo(),
    neverOutOfClasses: true,
    publicFree: true,
    share: {
      doc: 'SHARE.md',
      requires: 'Grok subscription / grok login or xAI API key',
      agentCost: 'free',
    },
  });
});

async function main() {
  try {
    assertTruthIntact();
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }

  const cli = findGrokCli();
  const hasKey = Boolean(getApiKey());
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
    console.log('  Grok Super Tutor is live (education only)');
    console.log(`  http://127.0.0.1:${PORT}`);
    console.log('  Truth-seeking: LOCKED · Provider: Grok only · Classes: endless');
    if (cli) console.log('  Auth: Grok CLI');
    else if (hasKey) console.log('  Auth: API key');
    else console.log('  Auth: run  grok login');
    console.log('  Share: see SHARE.md (free agent · needs Grok access)');
    console.log('');
    if (process.env.GROK_OPEN_BROWSER !== '0') {
      import('child_process').then(({ exec }) => {
        if (process.platform === 'win32') {
          exec(`cmd /c start "" "http://127.0.0.1:${PORT}"`);
        }
      });
    }
  });
}

main();
