/**
 * One-click launcher — keeps Grok running, opens browser, writes log if fail
 */
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, appendFileSync, writeFileSync, mkdirSync } from 'fs';
import { exec } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.GROK_AGENT_PORT || 3847);
const URL = `http://127.0.0.1:${PORT}`;
const HEALTH = `${URL}/api/health`;
const LOG_DIR = join(__dirname, 'data');
const LOG = join(LOG_DIR, 'launch.log');

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });
    appendFileSync(LOG, line);
  } catch { /* */ }
  console.log(msg);
}

async function isUp() {
  try {
    const r = await fetch(HEALTH, { signal: AbortSignal.timeout(2000) });
    if (!r.ok) return false;
    const j = await r.json();
    return Boolean(j?.ok);
  } catch {
    return false;
  }
}

function openBrowser(url) {
  if (process.platform === 'win32') {
    // start via cmd so it never blocks
    spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
  } else {
    exec(`xdg-open "${url}"`);
  }
}

function findNode() {
  if (process.execPath && existsSync(process.execPath)) return process.execPath;
  const candidates = [
    join(process.env.ProgramFiles || 'C:\\Program Files', 'nodejs', 'node.exe'),
    join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'nodejs', 'node.exe'),
  ];
  for (const p of candidates) if (existsSync(p)) return p;
  return 'node';
}

function startServer() {
  const node = findNode();
  const server = join(__dirname, 'server.mjs');
  if (!existsSync(server)) throw new Error('server.mjs missing');

  // On Windows: use detached + ignore stdio, and spawn via cmd start /b as fallback
  const outLog = join(LOG_DIR, 'server-out.log');
  const errLog = join(LOG_DIR, 'server-err.log');
  try {
    if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });
    writeFileSync(outLog, '');
    writeFileSync(errLog, '');
  } catch { /* */ }

  const child = spawn(node, [server], {
    cwd: __dirname,
    detached: true,
    stdio: ['ignore', 'ignore', 'ignore'],
    env: {
      ...process.env,
      GROK_OPEN_BROWSER: '0',
      PATH: `${join(process.env.ProgramFiles || 'C:\\Program Files', 'nodejs')};${process.env.PATH || ''}`,
    },
    windowsHide: true,
  });
  child.unref();
  log(`Started server pid=${child.pid} via ${node}`);
  return child.pid;
}

async function waitReady(ms = 60000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (await isUp()) return true;
    await new Promise((r) => setTimeout(r, 350));
  }
  return false;
}

async function main() {
  // --no-browser: login/startup mode (server only). Default: open UI.
  const noBrowser = process.argv.includes('--no-browser')
    || process.env.GROK_LAUNCH_NO_BROWSER === '1';

  log(`Launch requested${noBrowser ? ' (server only, no browser)' : ''}`);

  if (await isUp()) {
    log(noBrowser ? 'Already running — leave browser alone' : 'Already running — opening browser');
    if (!noBrowser) openBrowser(URL);
    await new Promise((r) => setTimeout(r, 400));
    process.exit(0);
  }

  log('Server down — starting…');
  try {
    startServer();
  } catch (e) {
    log(`Start failed: ${e.message}`);
    process.exit(1);
  }

  const ok = await waitReady(60000);
  if (!ok) {
    log('Server did not become ready in 60s');
    // Try once more with visible node in case silent spawn failed
    try {
      const node = findNode();
      spawn(node, [join(__dirname, 'server.mjs')], {
        cwd: __dirname,
        detached: true,
        stdio: 'ignore',
        env: { ...process.env, GROK_OPEN_BROWSER: '0' },
        windowsHide: false,
      }).unref();
      if (await waitReady(30000)) {
        if (!noBrowser) openBrowser(URL);
        process.exit(0);
      }
    } catch (e) {
      log(`Retry failed: ${e.message}`);
    }
    process.exit(1);
  }

  if (noBrowser) {
    log('Ready — background only (no browser)');
  } else {
    log('Ready — opening browser');
    openBrowser(URL);
  }
  await new Promise((r) => setTimeout(r, 500));
  process.exit(0);
}

main().catch((e) => {
  log(String(e?.stack || e));
  process.exit(1);
});
