/**
 * Build education-only server.mjs from archived full server.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const full = readFileSync(join(root, 'archive/structura-engineering/snapshots/server.full.mjs'), 'utf8');

function extractFunction(src, name) {
  const re = new RegExp(`(async function |function )${name}\\s*\\(`);
  const m = re.exec(src);
  if (!m) throw new Error('missing ' + name);
  const i = m.index;
  // Walk past parameter list (handles default objects like { timeoutMs = 1 })
  let p = src.indexOf('(', i);
  let depth = 0;
  let bodyStart = -1;
  for (let j = p; j < src.length; j++) {
    const ch = src[j];
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) {
        // next { is function body
        bodyStart = src.indexOf('{', j + 1);
        break;
      }
    }
  }
  if (bodyStart < 0) throw new Error('no body for ' + name);
  depth = 0;
  for (let j = bodyStart; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') {
      depth--;
      if (depth === 0) return src.slice(i, j + 1);
    }
  }
  throw new Error('unclosed ' + name);
}

function extractConst(src, name) {
  const re = new RegExp(`const ${name} = `);
  const m = re.exec(src);
  if (!m) throw new Error('missing const ' + name);
  const after = src.slice(m.index);
  const eq = after.indexOf('=');
  let j = eq + 1;
  while (/\s/.test(after[j])) j++;
  if (after[j] === '{') {
    let depth = 0;
    for (let k = j; k < after.length; k++) {
      if (after[k] === '{') depth++;
      else if (after[k] === '}') {
        depth--;
        if (depth === 0) {
          let end = k + 1;
          if (after[end] === ';') end++;
          return after.slice(0, end);
        }
      }
    }
  }
  throw new Error('could not extract const ' + name);
}

const names = [
  'loadConfig', 'saveConfig', 'getApiKey', 'getModel', 'findGrokCli', 'loadMemory', 'saveMemory',
  'runProcess', 'tryParseJson', 'memoryBrief', 'sanitizeTutorMemoryUpdates',
  'callGrokViaCli', 'callGrokViaApi', 'callGrok', 'applyMemoryUpdates', 'studioSystem', 'tutorSystem',
];
const fns = names.map((n) => extractFunction(full, n)).join('\n\n');
const tutorSchema = extractConst(full, 'TUTOR_RESPONSE_SCHEMA');

const rStart = full.indexOf('/* ─── Super Tutor: local data');
const rEnd = full.indexOf("app.get('/api/projects'");
if (rStart < 0 || rEnd < 0) throw new Error('route markers missing');
let tutorRoutes = full.slice(rStart, rEnd);
tutorRoutes = tutorRoutes.replace(
  'const system = studioSystem(mem, mode);',
  'const system = studioSystemEdu(mem, mode);',
);

const out = `/**
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

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.GROK_AGENT_PORT || 3847);
const CONFIG_PATH = join(__dirname, 'config.json');
const DATA_DIR = join(__dirname, 'data');
const MEMORY_PATH = join(DATA_DIR, 'longterm-memory.json');
const XAI_URL = 'https://api.x.ai/v1/chat/completions';

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

const tutorStore = createTutorStore(DATA_DIR);

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

${tutorSchema}

${fns}

/** Education-only studio prompt (no structure product). */
function studioSystemEdu(mem, mode = 'general') {
  return studioSystem(mem, mode)
    .replace('Engineering, 3D, Super Tutor, and everyday help', 'Super Tutor and educational help')
    .replace('**3D Build** — live 3D design', '**Lessons** — library, quizzes, market lab, code lab')
    .replace(
      '2. **3D Build** — live 3D design\\n3. **Anything else** — homework, ideas, planning, coding tips',
      '2. **Lessons** — library, quizzes, market lab, code lab\\n3. **Homework help** — school topics and coding tips',
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
    tagline: 'Truth-seeking education agent',
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
      'memory', 'voice', 'truth-seeking', 'classroom',
    ],
    backend: 'local-only',
    base44: false,
    archive: 'archive/structura-engineering',
  });
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

${tutorRoutes}

app.get('/api/bootstrap', (_req, res) => {
  res.json({
    memory: loadMemory(),
    ready: Boolean(findGrokCli()) || Boolean(getApiKey()),
    agent: 'education',
  });
});

async function main() {
  const cli = findGrokCli();
  const hasKey = Boolean(getApiKey());
  const server = createServer(app);
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(\`  Port \${PORT} already in use — Grok may already be running.\`);
      console.log(\`  Open http://127.0.0.1:\${PORT}\`);
      process.exit(0);
    }
    console.error(err);
    process.exit(1);
  });
  server.listen(PORT, '127.0.0.1', () => {
    console.log('');
    console.log('  Grok Super Tutor is live (education only)');
    console.log(\`  http://127.0.0.1:\${PORT}\`);
    if (cli) console.log('  Auth: Grok CLI');
    else if (hasKey) console.log('  Auth: API key');
    else console.log('  Auth: run  grok login');
    console.log('  Eng archive: archive/structura-engineering/');
    console.log('');
    if (process.env.GROK_OPEN_BROWSER !== '0') {
      import('child_process').then(({ exec }) => {
        if (process.platform === 'win32') {
          exec(\`cmd /c start "" "http://127.0.0.1:\${PORT}"\`);
        }
      });
    }
  });
}

main();
`;

writeFileSync(join(root, 'server.mjs'), out, 'utf8');
console.log('Wrote education server.mjs', out.length, 'chars');
