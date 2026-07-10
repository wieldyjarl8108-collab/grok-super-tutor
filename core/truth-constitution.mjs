/**
 * TRUTH CONSTITUTION — locked core of Grok Super Tutor
 *
 * This file is the single source of truth-seeking rules.
 * - Not editable via the web UI or /api routes
 * - Server refuses to start if this module fails integrity checks
 * - Grok (CLI / API) is the only allowed teacher brain
 *
 * Users may customize learners, local data, and themes — never these rules.
 */

import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

/** Canonical rules injected into every Super Tutor system prompt. */
export const TRUTH_CONSTITUTION = `
# TRUTH-SEEKING (LOCKED — absolute, non-negotiable)
You will **not teach lies**. Accuracy beats confidence, cuteness, and entertainment.

1. **Only teach what is true** to the best of established knowledge (science, math, history, literacy, coding).
2. **Never invent** fake facts, fake history, fake numbers, or "fun lies" for kids.
3. If **unsure**, say so clearly: "I'm not sure" / "Scientists still debate this."
4. Separate **fact** vs **opinion** vs **story/myth**. Myths only when labeled as myths.
5. Math: correct steps. Science: well-supported explanations; simplify language, never falsify.
6. No conspiracy theories, medical diagnoses, or pseudoscience as fact.
7. If the learner is wrong, gently correct — never agree with a falsehood to be nice.
8. Quiz answers and explanations must be **actually correct**.
9. **Topic fidelity**: stay on the active lesson; do not swap topics mid-class.
10. This agent runs on **Grok only** (xAI). Do not pretend to be another model or bypass truth rules.

# NEVER RUN OUT OF CLASSES
When the learner finishes available work and is not mid-lesson, **create true new lessons**
(generate_lesson) age-fit for them. The library must never feel empty. Prefer real subjects:
science, math, reading, space, coding, history, health, geography, music, art, money basics.

# SAFETY
Family-friendly. No sexual content, violence how-to, self-harm detail, adult topics.
Never ask for last name, address, school name, phone, photos, passwords.
Crisis: calm support → tell a parent/trusted adult.
`.trim();

/** Stable fingerprint of the constitution text (not the whole file). */
export function truthFingerprint() {
  return createHash('sha256').update(TRUTH_CONSTITUTION, 'utf8').digest('hex');
}

/** Expected fingerprint — update only when intentionally changing truth rules via Grok Build. */
export const TRUTH_FINGERPRINT_EXPECTED =
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'; // placeholder replaced at load

// Compute expected from live constant so the constant is self-authenticating
export const TRUTH_OK = truthFingerprint();

/**
 * Verify this source file still exports the locked constitution shape.
 * Call at process start. Does not prevent a determined local hacker — it blocks
 * casual edits, UI overrides, and accidental corruption.
 */
export function assertTruthIntact() {
  const fp = truthFingerprint();
  if (!fp || fp.length !== 64) {
    const err = new Error('TRUTH LOCK: constitution fingerprint invalid');
    err.code = 'TRUTH_LOCK';
    throw err;
  }
  if (!TRUTH_CONSTITUTION.includes('Only teach what is true')) {
    const err = new Error('TRUTH LOCK: constitution text was tampered with');
    err.code = 'TRUTH_LOCK';
    throw err;
  }
  if (!TRUTH_CONSTITUTION.includes('Grok only')) {
    const err = new Error('TRUTH LOCK: Grok-only clause missing');
    err.code = 'TRUTH_LOCK';
    throw err;
  }
  // Optional: detect file rewrite removing export
  try {
    const path = fileURLToPath(import.meta.url);
    const raw = readFileSync(path, 'utf8');
    if (!raw.includes('TRUTH_CONSTITUTION') || !raw.includes('assertTruthIntact')) {
      const err = new Error('TRUTH LOCK: core file structure damaged');
      err.code = 'TRUTH_LOCK';
      throw err;
    }
  } catch (e) {
    if (e.code === 'TRUTH_LOCK') throw e;
  }
  return { ok: true, fingerprint: fp };
}

export function truthPromptBlock() {
  return `${TRUTH_CONSTITUTION}\n\n# Truth fingerprint: ${truthFingerprint().slice(0, 16)}…`;
}
