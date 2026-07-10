/**
 * Know when someone opens the Super Tutor tab / agent in a browser.
 * Local-only presence log (no tracking cloud). Parents/hosts can see opens.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

export function createSessionStore(dataDir) {
  const dir = dataDir;
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const path = join(dir, 'sessions.json');

  function read() {
    try {
      if (!existsSync(path)) return { version: 1, opens: [], active: {} };
      return JSON.parse(readFileSync(path, 'utf8'));
    } catch {
      return { version: 1, opens: [], active: {} };
    }
  }

  function write(data) {
    writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
    return data;
  }

  /**
   * Tab opened or focused.
   * @param {{ clientId?: string, userAgent?: string, path?: string }} info
   */
  function openTab(info = {}) {
    const data = read();
    const clientId = String(info.clientId || randomUUID()).slice(0, 64);
    const now = new Date().toISOString();
    const row = {
      id: randomUUID(),
      clientId,
      at: now,
      path: String(info.path || '/').slice(0, 120),
      userAgent: String(info.userAgent || '').slice(0, 160),
    };
    data.opens.unshift(row);
    if (data.opens.length > 200) data.opens.length = 200;
    data.active[clientId] = { lastSeen: now, path: row.path };
    write(data);
    return {
      clientId,
      message: 'Super Tutor is live in this tab. Truth-seeking is locked. Grok-only.',
      at: now,
      activeTabs: Object.keys(data.active).length,
    };
  }

  function heartbeat(clientId) {
    const data = read();
    const id = String(clientId || '').slice(0, 64);
    if (!id) return { ok: false };
    const now = new Date().toISOString();
    data.active[id] = { ...(data.active[id] || {}), lastSeen: now };
    // Drop stale (> 30 min)
    const cutoff = Date.now() - 30 * 60 * 1000;
    for (const [k, v] of Object.entries(data.active)) {
      if (new Date(v.lastSeen).getTime() < cutoff) delete data.active[k];
    }
    write(data);
    return { ok: true, at: now, activeTabs: Object.keys(data.active).length };
  }

  function summary() {
    const data = read();
    return {
      recentOpens: (data.opens || []).slice(0, 10),
      activeTabs: Object.keys(data.active || {}).length,
      totalOpensLogged: (data.opens || []).length,
    };
  }

  return { openTab, heartbeat, summary };
}
