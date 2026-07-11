/**
 * Pull clean Super Tutor updates from the official public GitHub only.
 * Does not let random users redefine truth — updates replace files from main branch.
 */

import { createHash } from 'crypto';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

export const OFFICIAL_REPO = 'wieldyjarl8108-collab/grok-super-tutor';
export const OFFICIAL_BRANCH = 'main';
const RAW_BASE = `https://raw.githubusercontent.com/${OFFICIAL_REPO}/${OFFICIAL_BRANCH}`;

/** Files we may refresh from official main (truth-critical).
 * Boot-time updates only touch core/* so we never hot-overwrite a running server.mjs.
 * Full tree refresh: POST /api/update/official with { full: true } then restart.
 */
const CORE_ONLY_PATHS = [
  'core/truth-constitution.mjs',
  'core/provider-lock.mjs',
  'core/integrity-guard.mjs',
  'core/endless-topics.mjs',
  'core/session-presence.mjs',
  'core/auto-update.mjs',
];

const FULL_PATHS = [
  ...CORE_ONLY_PATHS,
  'server.mjs',
  'tutor-store.mjs',
  'seed-lessons.mjs',
  'disclaimers.mjs',
  'INSTALL-ME.bat',
];

async function fetchText(path) {
  const url = `${RAW_BASE}/${path}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Grok-Super-Tutor-AutoUpdate/1.0' },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`update fetch ${path}: ${res.status}`);
  return res.text();
}

/**
 * Download official core files into agentRoot.
 * Reseals integrity after successful pull.
 */
export async function pullOfficialUpdate(agentRoot, dataDir, { full = false } = {}) {
  const list = full ? FULL_PATHS : CORE_ONLY_PATHS;
  const results = [];
  for (const rel of list) {
    try {
      const text = await fetchText(rel);
      // Sanity: truth file must still ban lies
      if (rel.includes('truth-constitution') && !/Only teach what is true/i.test(text)) {
        results.push({ path: rel, ok: false, error: 'rejected: official file missing truth clause' });
        continue;
      }
      if (rel.includes('provider-lock') && !/api\.x\.ai/i.test(text)) {
        results.push({ path: rel, ok: false, error: 'rejected: provider lock invalid' });
        continue;
      }
      const dest = join(agentRoot, rel);
      mkdirSync(join(dest, '..'), { recursive: true });
      writeFileSync(dest, text, 'utf8');
      results.push({
        path: rel,
        ok: true,
        sha256: createHash('sha256').update(text, 'utf8').digest('hex').slice(0, 12),
      });
    } catch (e) {
      results.push({ path: rel, ok: false, error: e.message });
    }
  }

  // Reseal with new hashes so teaching can continue on clean official code
  const sealFile = join(dataDir, 'core-seal.json');
  try {
    const { sealOrVerifyCore } = await import('./integrity-guard.mjs');
    // delete old seal so sealOrVerifyCore reseals
    if (existsSync(sealFile)) {
      writeFileSync(sealFile + '.bak', readFileSync(sealFile));
      // force reseal by writing empty then calling with delete
    }
  } catch { /* */ }

  // Write fresh seal from written files
  try {
    const files = {};
    for (const rel of CORE_ONLY_PATHS) {
      const fp = join(agentRoot, rel);
      if (existsSync(fp)) {
        files[rel.replace('core/', '')] = createHash('sha256')
          .update(readFileSync(fp))
          .digest('hex');
      }
    }
    if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
    writeFileSync(sealFile, JSON.stringify({
      sealedAt: new Date().toISOString(),
      source: `github:${OFFICIAL_REPO}@${OFFICIAL_BRANCH}`,
      files,
    }, null, 2), 'utf8');
  } catch { /* */ }

  const ok = results.filter((r) => r.ok).length;
  return {
    ok: ok > 0,
    updated: ok,
    failed: results.filter((r) => !r.ok).length,
    results,
    source: `https://github.com/${OFFICIAL_REPO}`,
  };
}
