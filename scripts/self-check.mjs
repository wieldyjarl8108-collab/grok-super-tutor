/**
 * Local self-check for Super Tutor correctness (no network).
 * Run: node scripts/self-check.mjs
 */
import { createTutorStore } from '../tutor-store.mjs';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    failed += 1;
  } else {
    console.log('ok:', msg);
  }
}

// ── tutor-store: active lesson guard ──────────────────────────────────
const tmp = mkdtempSync(join(tmpdir(), 'grok-tutor-'));
const store = createTutorStore(tmp);
const child = store.saveChild({ name: 'CheckKid', age: 10 });

const blocked = store.processActions(
  [{
    type: 'generate_lesson',
    payload: {
      title: 'Butterflies: Metamorphosis',
      subject: 'science',
      content: 'Butterfly stuff',
      questions: [
        { question: 'q?', options: ['a', 'b', 'c', 'd'], correct_index: 0, explanation: 'e' },
      ],
    },
  }],
  child,
  { classroom: true, activeLessonTitle: 'How Rockets Work', lessonSubject: 'space' },
);
assert(blocked.lessons.length === 0, 'mid-class blocks generate_lesson for butterflies during rockets');
assert(blocked.skipped?.length === 1, 'skipped action recorded');

const allowed = store.processActions(
  [{
    type: 'generate_lesson',
    payload: {
      title: 'How Rockets Work — deeper',
      subject: 'space',
      content: 'Rocket stages and thrust',
      questions: [
        { question: 'q?', options: ['a', 'b', 'c', 'd'], correct_index: 0, explanation: 'e' },
      ],
    },
  }],
  child,
  { classroom: true, activeLessonTitle: 'How Rockets Work', lessonSubject: 'space' },
);
assert(allowed.lessons.length === 1, 'same-topic generate_lesson allowed mid-class');

// scores: most recent wins
const rocketLesson = store.saveLesson({
  id: 'L1-rockets-check',
  title: 'How Rockets Work',
  subject: 'space',
  difficulty: 'beginner',
  content: 'Rockets use Newton third law.',
  xp_reward: 10,
  questions: [],
});
store.completeLesson({
  childId: child.id,
  lesson: rocketLesson,
  score: 40,
  xpEarned: 4,
});
store.completeLesson({
  childId: child.id,
  lesson: rocketLesson,
  score: 95,
  xpEarned: 10,
});
const path = store.getLearnerPath(child.id);
const card = (path.lessons || []).find((l) => l.id === rocketLesson.id);
assert(card && card.lastScore === 95, 'most recent quiz score wins (95 not 40)');

// difficulty "easy" maps
const easyRankOk = store.processActions(
  [{
    type: 'generate_lesson',
    payload: {
      title: 'Easy Money',
      subject: 'money',
      difficulty: 'easy',
      content: 'Money basics',
      questions: [
        { question: 'q?', options: ['a', 'b'], correct_index: 99, explanation: 'e' },
      ],
    },
  }],
  child,
  {},
);
assert(easyRankOk.lessons[0]?.difficulty === 'beginner', 'difficulty easy normalizes to beginner');
assert(easyRankOk.lessons[0]?.questions[0]?.correct_index === 0, 'out-of-range correct_index clamped to 0');

// ── server source: active lesson injection present ────────────────────
const serverSrc = readFileSync(join(root, 'server.mjs'), 'utf8');
assert(serverSrc.includes('ACTIVE LESSON'), 'server injects ACTIVE LESSON block');
assert(serverSrc.includes('tutorOnly: true'), 'tutor memory is tutor-only filtered');
assert(serverSrc.includes('sanitizeTutorMemoryUpdates'), 'bad memory updates sanitized');

const appSrc = readFileSync(join(root, 'public/app.js'), 'utf8');
assert(appSrc.includes('buildTutorChatContext'), 'chat passes lesson context');
assert(appSrc.includes('getClassroomHistory'), 'classroom history helper exists');
assert(appSrc.includes('Stay on THIS lesson'), 'classroom ask anchors topic');

// ── memory file: no butterfly first-dive bias ─────────────────────────
const memPath = join(root, 'data/longterm-memory.json');
if (existsSync(memPath)) {
  const mem = JSON.parse(readFileSync(memPath, 'utf8'));
  const bad = (mem.facts || []).some((f) => /Butterflies: Metamorphosis as the first/i.test(f));
  assert(!bad, 'longterm memory no longer hard-offers butterflies first');
}

// ── lesson library: no duplicate titles + quantum class present ─────
const liveStore = createTutorStore(join(root, 'data'));
const liveLessons = liveStore.ensureSeedLessons();
const titleKeys = liveLessons.map((l) =>
  String(l.title || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim());
const unique = new Set(titleKeys);
assert(titleKeys.length === unique.size, `no duplicate lesson titles (${titleKeys.length} cards)`);
assert(
  liveLessons.some((l) => /quantum physics/i.test(l.title)),
  'Quantum Physics Class is in the library',
);

// cleanup temp store
try { rmSync(tmp, { recursive: true, force: true }); } catch { /* */ }

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log('\nAll self-checks passed.');
process.exit(0);