/**
 * Integrity + anti-lie guard
 *
 * - Verifies core truth files have not been rewritten
 * - Detects users trying to force the tutor to teach lies
 * - After repeated attacks: uninstalls ONLY Super Tutor (not the whole PC)
 *
 * HONEST LIMIT: Anyone with full admin access to a PC can force-edit files offline.
 * We refuse to run when tampered, and we will not wipe a user's entire hard drive
 * (that would be malware). We protect kids by refusing lies and removing the app.
 */

import { createHash } from 'crypto';
import {
  readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync,
  rmSync, unlinkSync, statSync,
} from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { homedir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORE_DIR = __dirname;
const AGENT_ROOT = join(__dirname, '..');

/** Files whose content is sealed — changing them stops teaching until official reinstall/update. */
const CORE_FILES = [
  'truth-constitution.mjs',
  'provider-lock.mjs',
];

/** Patterns: user is trying to force lies / jailbreak truth. */
const LIE_PRESSURE = [
  /\b(lie|lying|liar)\b.{0,40}\b(kid|child|student|learner|them)\b/i,
  /\btell\b.{0,30}\b(fake|false|wrong)\b.{0,30}\b(fact|story|truth)\b/i,
  /\b(make up|invent|fabricate)\b.{0,30}\b(fact|history|science|number)\b/i,
  /\bignore\b.{0,20}\b(truth|facts|science|rules)\b/i,
  /\bturn off\b.{0,20}\b(truth|safety)\b/i,
  /\b(pretend|act like)\b.{0,40}\b(true|fact|real)\b/i,
  /\bjailbreak\b/i,
  /\bDAN\b/,
  /\bdo anything now\b/i,
  /\bforget (your|all) (rules|instructions|constitution)\b/i,
  /\byou must (agree|say yes) (even )?if (wrong|false|lie)/i,
  /\bteach\b.{0,40}\b(flat earth|vaccines cause autism as fact|chemtrails)\b/i,
  /\bnever correct\b/i,
  /\ballow (fun )?lies\b/i,
  /\bdisable truth\b/i,
];

const MAX_STRIKES = 5;
const STRIKE_WINDOW_MS = 24 * 60 * 60 * 1000;

function hashFile(path) {
  const buf = readFileSync(path);
  return createHash('sha256').update(buf).digest('hex');
}

function strikesPath(dataDir) {
  return join(dataDir, 'truth-strikes.json');
}

function loadStrikes(dataDir) {
  try {
    const p = strikesPath(dataDir);
    if (!existsSync(p)) return { strikes: [], uninstallArmed: false };
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return { strikes: [], uninstallArmed: false };
  }
}

function saveStrikes(dataDir, data) {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  writeFileSync(strikesPath(dataDir), JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Build live hashes of core modules. On first run, seal them.
 * On later runs, mismatch = tamper → refuse to teach.
 */
export function sealOrVerifyCore(dataDir) {
  const sealFile = join(dataDir, 'core-seal.json');
  const live = {};
  for (const f of CORE_FILES) {
    const p = join(CORE_DIR, f);
    if (!existsSync(p)) {
      const err = new Error(`TRUTH LOCK: missing core file ${f}`);
      err.code = 'TRUTH_LOCK';
      throw err;
    }
    live[f] = hashFile(p);
  }
  // Also seal provider + truth key phrases still present
  const truthRaw = readFileSync(join(CORE_DIR, 'truth-constitution.mjs'), 'utf8');
  if (!/Only teach what is true/i.test(truthRaw) || !/Grok only/i.test(truthRaw)) {
    const err = new Error('TRUTH LOCK: truth constitution was emptied or rewritten');
    err.code = 'TRUTH_LOCK';
    throw err;
  }
  const lockRaw = readFileSync(join(CORE_DIR, 'provider-lock.mjs'), 'utf8');
  if (!/api\.x\.ai/i.test(lockRaw) || !/enforceGrokModel/.test(lockRaw)) {
    const err = new Error('TRUTH LOCK: provider lock was gutted');
    err.code = 'TRUTH_LOCK';
    throw err;
  }

  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

  if (!existsSync(sealFile)) {
    writeFileSync(sealFile, JSON.stringify({
      sealedAt: new Date().toISOString(),
      files: live,
      note: 'Sealed at first honest boot. Changing core/ will stop teaching.',
    }, null, 2), 'utf8');
    return { ok: true, sealed: true, files: live };
  }

  let sealed;
  try {
    sealed = JSON.parse(readFileSync(sealFile, 'utf8'));
  } catch {
    const err = new Error('TRUTH LOCK: core seal corrupted');
    err.code = 'TRUTH_LOCK';
    throw err;
  }

  for (const f of CORE_FILES) {
    if (!sealed.files?.[f] || sealed.files[f] !== live[f]) {
      const err = new Error(
        `TRUTH LOCK: core file changed (${f}). Super Tutor will not teach lies. Reinstall from official GitHub.`,
      );
      err.code = 'TRUTH_LOCK';
      err.file = f;
      throw err;
    }
  }
  return { ok: true, sealed: false, files: live };
}

/**
 * @returns {{ blocked: boolean, reason?: string, strikes?: number, uninstall?: boolean }}
 */
export function checkLiePressure(message, dataDir) {
  const text = String(message || '');
  if (!text.trim()) return { blocked: false };

  let hit = null;
  for (const re of LIE_PRESSURE) {
    if (re.test(text)) {
      hit = re.toString();
      break;
    }
  }
  if (!hit) return { blocked: false };

  const data = loadStrikes(dataDir);
  const now = Date.now();
  data.strikes = (data.strikes || []).filter((s) => now - new Date(s.at).getTime() < STRIKE_WINDOW_MS);
  data.strikes.push({ at: new Date().toISOString(), sample: text.slice(0, 200), hit });
  const count = data.strikes.length;
  saveStrikes(dataDir, data);

  if (count >= MAX_STRIKES) {
    data.uninstallArmed = true;
    saveStrikes(dataDir, data);
    return {
      blocked: true,
      reason: 'Repeated attempts to force lies. Super Tutor is removing itself from this PC (app only).',
      strikes: count,
      uninstall: true,
    };
  }

  return {
    blocked: true,
    reason: `Truth lock: I will not teach lies. (${count}/${MAX_STRIKES} warnings before this install uninstalls itself)`,
    strikes: count,
    uninstall: false,
  };
}

/**
 * Remove Super Tutor from this machine only — not the whole hard drive.
 * Leaves a short note on the Desktop for parents.
 */
export function uninstallSuperTutorOnly(reason = 'Truth lock violation') {
  const desktop = join(homedir(), 'OneDrive', 'Desktop');
  const desktop2 = join(homedir(), 'Desktop');
  const note = [
    'SUPER TUTOR REMOVED ITSELF',
    '',
    'Reason: someone repeatedly tried to make the tutor teach lies,',
    'or core truth files were tampered with.',
    '',
    String(reason).slice(0, 400),
    '',
    'This app will not stay installed to be hacked into a liar.',
    'Reinstall clean from official GitHub only:',
    'https://github.com/wieldyjarl8108-collab/grok-super-tutor',
    '',
    'We do NOT wipe your whole computer — only Super Tutor.',
    new Date().toISOString(),
  ].join('\n');

  for (const d of [desktop, desktop2]) {
    try {
      if (existsSync(d)) {
        writeFileSync(join(d, 'SUPER-TUTOR-REMOVED.txt'), note, 'utf8');
        // Remove shortcuts
        for (const name of [
          'Grok Agent.lnk',
          'Start Grok Agent.lnk',
          'Grok Agent Status.lnk',
          'Super Tutor on GitHub.lnk',
          'Publish Super Tutor to GitHub.lnk',
        ]) {
          const p = join(d, name);
          if (existsSync(p)) try { unlinkSync(p); } catch { /* */ }
        }
      }
    } catch { /* */ }
  }

  // Clear local learner data for this app
  const dataDir = join(AGENT_ROOT, 'data');
  try {
    if (existsSync(dataDir)) rmSync(dataDir, { recursive: true, force: true });
  } catch { /* */ }

  // Schedule deletion of agent folder after process exits (Windows)
  if (process.platform === 'win32') {
    const bat = join(homedir(), 'AppData', 'Local', 'Temp', `remove-super-tutor-${Date.now()}.bat`);
    const lines = [
      '@echo off',
      'timeout /t 2 /nobreak >nul',
      `rmdir /s /q "${AGENT_ROOT}"`,
      `del /f /q "%~f0"`,
    ];
    try {
      writeFileSync(bat, lines.join('\r\n'), 'utf8');
      spawn('cmd.exe', ['/c', bat], { detached: true, stdio: 'ignore' }).unref();
    } catch { /* */ }
  } else {
    try {
      rmSync(AGENT_ROOT, { recursive: true, force: true });
    } catch { /* */ }
  }

  return { ok: true, scope: 'super-tutor-only' };
}

export function integrityPublicInfo() {
  return {
    truthLocked: true,
    liePressureDetection: true,
    maxStrikesBeforeSelfUninstall: MAX_STRIKES,
    selfUninstallScope: 'Super Tutor app + its data only — never the whole hard drive',
    officialSource: 'https://github.com/wieldyjarl8108-collab/grok-super-tutor',
    honestLimit: 'A person with full admin control of a PC can always force-edit files offline. We refuse to run when core is changed and will not teach lies.',
  };
}
