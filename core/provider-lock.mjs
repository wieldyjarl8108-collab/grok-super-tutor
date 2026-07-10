/**
 * Provider lock — Super Tutor runs on Grok (xAI) only.
 * Free public agent shell; brain requires a real Grok subscription / CLI login / API key.
 * No OpenAI, Anthropic, local Ollama swap, or custom base URLs.
 */

export const ALLOWED_XAI_URL = 'https://api.x.ai/v1/chat/completions';

const GROK_MODEL_RE = /^grok[\w.\-]*/i;

/**
 * @param {string} model
 * @returns {string} safe model name
 */
export function enforceGrokModel(model) {
  const m = String(model || 'grok-3').trim() || 'grok-3';
  if (!GROK_MODEL_RE.test(m)) {
    const err = new Error(
      `Grok-only lock: model "${m}" is not allowed. Use a grok-* model (requires Grok / xAI access).`,
    );
    err.code = 'GROK_ONLY';
    throw err;
  }
  return m;
}

/**
 * Block alternate API hosts even if someone edits env vars.
 */
export function enforceGrokApiUrl(url) {
  const u = String(url || ALLOWED_XAI_URL).trim();
  if (!u.startsWith('https://api.x.ai/')) {
    const err = new Error('Grok-only lock: API host must be https://api.x.ai/');
    err.code = 'GROK_ONLY';
    throw err;
  }
  return u;
}

export function providerPublicInfo() {
  return {
    provider: 'xAI Grok only',
    freeAgent: true,
    requires: 'Grok subscription and/or xAI API key / grok login (CLI)',
    allowsOtherModels: false,
    truthSeekingLocked: true,
  };
}
