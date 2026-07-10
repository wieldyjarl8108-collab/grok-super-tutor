/**
 * Local Super Tutor store — no cloud, no Base44.
 * All learner data lives under data/tutor/
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { defaultLessons, ensurePicture, lessonPicture } from './seed-lessons.mjs';
import { pickEndlessTopics } from './core/endless-topics.mjs';

export function createTutorStore(dataDir) {
  const dir = join(dataDir, 'tutor');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const paths = {
    children: join(dir, 'children.json'),
    progress: join(dir, 'progress.json'),
    lessons: join(dir, 'lessons.json'),
    goals: join(dir, 'goals.json'),
    mastery: join(dir, 'mastery.json'),
  };

  function read(key, fallback) {
    try {
      if (!existsSync(paths[key])) return fallback;
      return JSON.parse(readFileSync(paths[key], 'utf8'));
    } catch {
      return fallback;
    }
  }

  function write(key, data) {
    writeFileSync(paths[key], JSON.stringify(data, null, 2), 'utf8');
    return data;
  }

  /** Normalize title so near-identical topics collapse to one card. */
  function lessonKey(title) {
    const stop = new Set([
      'the', 'a', 'a', 'an', 'and', 'or', 'for', 'of', 'in', 'to', 'on', 'at',
      'is', 'are', 'was', 'be', 'do', 'not', 'dont', 'all', 'one', 'put', 'your',
      'with', 'from', 'how', 'what', 'why', 'made', 'fun', 'class', 'lesson',
    ]);
    return String(title || '')
      .toLowerCase()
      .replace(/['’]/g, '')
      .replace(/don t/g, 'dont')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter((w) => w && !stop.has(w) && w.length > 1)
      .join(' ');
  }

  /**
   * Prefer one card per topic: longer true content wins; keep stable seed id when possible.
   */
  function dedupeLessons(list) {
    const byKey = new Map();
    for (const l of list) {
      const key = lessonKey(l.title);
      if (!key) continue;
      const prev = byKey.get(key);
      if (!prev) {
        byKey.set(key, l);
        continue;
      }
      const prevLen = String(prev.content || '').length;
      const nextLen = String(l.content || '').length;
      const prevQs = Array.isArray(prev.questions) ? prev.questions.length : 0;
      const nextQs = Array.isArray(l.questions) ? l.questions.length : 0;
      // Prefer longer content, then more quiz questions, then seeded stable id
      let keep = prev;
      let drop = l;
      if (
        nextLen > prevLen
        || (nextLen === prevLen && nextQs > prevQs)
        || (nextLen === prevLen && nextQs === prevQs && l.seeded && !prev.seeded)
      ) {
        keep = l;
        drop = prev;
      }
      // Merge useful fields from the dropped copy
      byKey.set(key, {
        ...drop,
        ...keep,
        id: keep.seeded ? keep.id : (drop.seeded ? drop.id : keep.id),
        content: String(keep.content || '').length >= String(drop.content || '').length ? keep.content : drop.content,
        questions: (keep.questions?.length || 0) >= (drop.questions?.length || 0) ? keep.questions : drop.questions,
        description: keep.description || drop.description,
        picture: keep.picture || drop.picture,
        child_id: keep.child_id || drop.child_id || null,
        duration_minutes: Math.max(keep.duration_minutes || 0, drop.duration_minutes || 0) || keep.duration_minutes,
        age_min: keep.age_min != null && drop.age_min != null
          ? Math.min(Number(keep.age_min), Number(drop.age_min))
          : (keep.age_min ?? drop.age_min),
        age_max: keep.age_max != null && drop.age_max != null
          ? Math.max(Number(keep.age_max), Number(drop.age_max))
          : (keep.age_max ?? drop.age_max),
      });
    }
    return [...byKey.values()];
  }

  /** Seed library so kids always see picture lesson cards. */
  function ensureSeedLessons() {
    let list = read('lessons', null);
    if (!Array.isArray(list) || list.length === 0) {
      list = defaultLessons();
      write('lessons', list);
      return list;
    }
    const seeds = defaultLessons();
    const byId = new Map(list.map((l) => [l.id, l]));
    const byKey = new Map(list.map((l) => [lessonKey(l.title), l]));
    let changed = false;

    for (const s of seeds) {
      const key = lessonKey(s.title);
      const existing = byId.get(s.id) || byKey.get(key);
      if (existing) {
        // Refresh weaker/shorter copy with seed content when seed is better
        const i = list.findIndex((x) => x.id === existing.id);
        if (i < 0) continue;
        const old = list[i];
        const seedBetter =
          String(s.content || '').length > String(old.content || '').length
          || (s.duration_minutes || 0) > (old.duration_minutes || 0)
          || ((s.questions?.length || 0) > (old.questions?.length || 0));
        if (seedBetter || old.id !== s.id) {
          list[i] = {
            ...old,
            // Prefer stable seed id so re-seeds never re-add a second card
            id: s.id || old.id,
            title: s.title || old.title,
            subject: s.subject || old.subject,
            emoji: s.emoji || old.emoji,
            content: seedBetter ? (s.content || old.content) : (old.content || s.content),
            description: s.description || old.description,
            duration_minutes: Math.max(old.duration_minutes || 0, s.duration_minutes || 0),
            age_min: s.age_min != null ? Math.min(old.age_min ?? s.age_min, s.age_min) : old.age_min,
            age_max: s.age_max != null ? Math.max(old.age_max ?? s.age_max, s.age_max) : old.age_max,
            questions: (s.questions?.length || 0) >= (old.questions?.length || 0) ? s.questions : old.questions,
            xp_reward: s.xp_reward || old.xp_reward,
            difficulty: old.difficulty || s.difficulty,
            seeded: true,
            picture: old.picture || s.picture,
          };
          byId.set(list[i].id, list[i]);
          byKey.set(key, list[i]);
          changed = true;
        }
        continue;
      }
      list.push(s);
      byId.set(s.id, s);
      byKey.set(key, s);
      changed = true;
    }

    const before = list.length;
    list = dedupeLessons(list);
    if (list.length !== before) changed = true;

    list = list.map((l) => {
      if (l.picture) return l;
      changed = true;
      return ensurePicture(l);
    });
    if (changed) write('lessons', list);
    return list;
  }

  function listChildren() {
    return read('children', []);
  }

  function getChild(id) {
    return listChildren().find((c) => c.id === id) || null;
  }

  function saveChild(partial) {
    const list = listChildren();
    const now = new Date().toISOString();
    if (partial.id) {
      const i = list.findIndex((c) => c.id === partial.id);
      if (i >= 0) {
        const next = { ...list[i], ...partial, updatedAt: now };
        if (partial.age != null) next.age = Math.min(99, Math.max(3, Number(partial.age) || list[i].age || 8));
        if (partial.name != null) next.name = String(partial.name).trim().slice(0, 40) || list[i].name;
        if (!next.skillLevels || typeof next.skillLevels !== 'object') next.skillLevels = list[i].skillLevels || {};
        list[i] = next;
        write('children', list);
        return list[i];
      }
    }
    const child = {
      id: randomUUID(),
      name: String(partial.name || 'Learner').trim().slice(0, 40),
      age: Math.min(99, Math.max(3, Number(partial.age) || 8)),
      grade: partial.grade || '',
      avatar: partial.avatar || '🌟',
      xp: 0,
      level: 1,
      streak: 0,
      badges: [],
      skillLevels: {}, // subject -> beginner|intermediate|advanced
      createdAt: now,
      updatedAt: now,
    };
    list.push(child);
    write('children', list);
    return child;
  }

  const DIFF_RANK = {
    beginner: 0,
    easy: 0,
    intro: 0,
    intermediate: 1,
    medium: 1,
    advanced: 2,
    hard: 2,
  };
  const RANK_DIFF = ['beginner', 'intermediate', 'advanced'];

  function normalizeDifficulty(d) {
    const key = String(d || 'beginner').toLowerCase().trim();
    if (DIFF_RANK[key] != null) {
      const rank = DIFF_RANK[key];
      return RANK_DIFF[rank] || 'beginner';
    }
    return 'beginner';
  }

  /**
   * Evolve skill levels from quiz scores. Lessons grow with the learner.
   */
  function evolveLearner(childId) {
    const child = getChild(childId);
    if (!child) return null;

    const progress = listProgress(childId)
      .filter((p) => p.completed)
      .sort((a, b) => new Date(b.completed_at || 0) - new Date(a.completed_at || 0));
    const bySubject = {};
    for (const p of progress) {
      const sub = String(p.subject || 'general').toLowerCase();
      if (!bySubject[sub]) bySubject[sub] = [];
      bySubject[sub].push(Number(p.score) || 0);
    }

    const skillLevels = { ...(child.skillLevels || {}) };
    const notes = [];

    for (const [sub, scores] of Object.entries(bySubject)) {
      const recent = scores.slice(0, 5);
      if (recent.length < 1) continue;
      const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
      let rank = DIFF_RANK[skillLevels[sub] || 'beginner'] ?? 0;

      if (recent.length >= 2 && avg >= 85 && rank < 2) {
        rank += 1;
        notes.push(`${sub}: leveled up to ${RANK_DIFF[rank]} (avg ${Math.round(avg)}%)`);
      } else if (recent.length >= 2 && avg < 55 && rank > 0) {
        rank -= 1;
        notes.push(`${sub}: eased to ${RANK_DIFF[rank]} for review (avg ${Math.round(avg)}%)`);
      } else if (recent.length >= 3 && avg >= 70 && rank === 0) {
        rank = 1;
        notes.push(`${sub}: ready for intermediate`);
      }
      skillLevels[sub] = RANK_DIFF[rank];
    }

    return saveChild({
      id: child.id,
      skillLevels,
      lastEvolvedAt: new Date().toISOString(),
      evolutionNotes: notes.slice(0, 8),
    });
  }

  /**
   * Personalized lesson path: age-fit + skill-fit + recommended next.
   */
  function getLearnerPath(childId) {
    const child = getChild(childId);
    if (!child) return null;

    const age = Number(child.age) || 8;
    const skillLevels = child.skillLevels || {};
    const progress = listProgress(childId)
      .slice()
      .sort((a, b) => new Date(b.completed_at || 0) - new Date(a.completed_at || 0));
    const doneIds = new Set(progress.filter((p) => p.completed && p.lesson_id).map((p) => p.lesson_id));
    // Most recent score wins (progress sorted newest-first)
    const scoresByLesson = {};
    for (const p of progress) {
      if (p.lesson_id && scoresByLesson[p.lesson_id] === undefined) {
        scoresByLesson[p.lesson_id] = p.score;
      }
    }

    const all = ensureSeedLessons().map(ensurePicture);
    const cards = [];

    for (const lesson of all) {
      const min = lesson.age_min != null ? Number(lesson.age_min) : 3;
      const max = lesson.age_max != null ? Number(lesson.age_max) : 18;
      const ageOk = age >= min && age <= max;
      const sub = String(lesson.subject || 'general').toLowerCase();
      const learnerRank = DIFF_RANK[normalizeDifficulty(skillLevels[sub] || 'beginner')] ?? 0;
      const lessonRank = DIFF_RANK[normalizeDifficulty(lesson.difficulty || 'beginner')] ?? 0;
      const done = doneIds.has(lesson.id);
      const score = scoresByLesson[lesson.id];

      let status = 'available'; // available | recommended | stretch | review | done | too_young | too_old
      let reason = '';

      if (!ageOk && age < min) {
        status = 'too_young';
        reason = `Usually for ages ${min}+`;
      } else if (!ageOk && age > max) {
        status = 'too_old';
        reason = `Usually for ages up to ${max}`;
      } else if (done && (score == null || score >= 70)) {
        status = 'done';
        reason = score != null ? `Done · ${score}%` : 'Done';
      } else if (done && score < 70) {
        status = 'review';
        reason = `Review · scored ${score}%`;
      } else if (lessonRank <= learnerRank) {
        status = 'recommended';
        reason = `Fits your ${skillLevels[sub] || 'beginner'} level in ${sub}`;
      } else if (lessonRank === learnerRank + 1) {
        status = 'stretch';
        reason = 'Stretch challenge — try when ready';
      } else if (lessonRank > learnerRank + 1) {
        status = 'stretch';
        reason = 'Advanced — grow into this';
      }

      cards.push({
        ...lesson,
        pathStatus: status,
        pathReason: reason,
        learnerSkill: skillLevels[sub] || 'beginner',
        done,
        lastScore: score ?? null,
      });
    }

    // Sort: recommended → review → available → stretch → done → age-blocked
    const order = { recommended: 0, review: 1, available: 2, stretch: 3, done: 4, too_young: 5, too_old: 6 };
    cards.sort((a, b) => (order[a.pathStatus] ?? 9) - (order[b.pathStatus] ?? 9)
      || String(a.subject).localeCompare(String(b.subject))
      || String(a.title).localeCompare(String(b.title)));

    let nextUp = cards.filter((c) => c.pathStatus === 'recommended' || c.pathStatus === 'review').slice(0, 6);
    // Include available age-fit if recommended list is thin
    if (nextUp.length < 4) {
      const extra = cards.filter((c) => c.pathStatus === 'available').slice(0, 6 - nextUp.length);
      nextUp = [...nextUp, ...extra];
    }
    const forAge = cards.filter((c) => !['too_young', 'too_old'].includes(c.pathStatus));
    const openCount = cards.filter((c) => ['recommended', 'review', 'available', 'stretch'].includes(c.pathStatus)).length;

    return {
      child,
      skillLevels,
      evolutionNotes: child.evolutionNotes || [],
      completedCount: doneIds.size,
      totalForAge: forAge.length,
      openCount,
      neverEmpty: true,
      nextUp,
      lessons: cards,
      needsRefill: openCount < 5,
      message: nextUp.length
        ? `Next for ${child.name} (age ${age}): ${nextUp.map((l) => l.title).slice(0, 3).join(', ')}`
        : `${child.name} will get new classes automatically — Super Tutor never runs out.`,
    };
  }

  /**
   * Mint new age-fit lessons so a kid never runs out of classes.
   * Uses locked endless topic bank (true short content). Idempotent per title.
   */
  function ensureNeverOutOfClasses(childId, { minOpen = 6 } = {}) {
    const child = getChild(childId);
    if (!child) return { minted: [], path: null };

    let path = getLearnerPath(childId);
    let open = path?.openCount ?? 0;
    const minted = [];

    if (open >= minOpen) {
      return { minted, path, openCount: open };
    }

    const existingTitles = ensureSeedLessons().map((l) => l.title);
    const need = minOpen - open + 2;
    const topics = pickEndlessTopics({
      age: child.age,
      existingTitles,
      limit: Math.max(need, 4),
    });

    for (const t of topics) {
      const lesson = saveLesson({
        title: t.title,
        subject: t.subject,
        emoji: t.emoji || '📚',
        description: `Endless class path · age-fit for ${child.name}`,
        content: t.content,
        age_min: t.age_min,
        age_max: t.age_max,
        difficulty: t.difficulty || 'beginner',
        xp_reward: 12,
        duration_minutes: 10,
        endless: true,
        questions: [
          {
            question: `What is one true idea from “${t.title}”?`,
            options: [
              'Something made up for fun only',
              'A real fact from the lesson content',
              'A random guess with no thinking',
              'Ignoring the teacher on purpose',
            ],
            correct_index: 1,
            explanation: 'We learn real facts from the class content — not made-up stories.',
          },
          {
            question: 'If you are unsure about a fact, what should you do?',
            options: [
              'Pretend you are sure',
              'Say you are not sure and check carefully',
              'Make up a louder story',
              'Change the topic to anything else',
            ],
            correct_index: 1,
            explanation: 'Truth-seeking means admitting uncertainty instead of inventing.',
          },
          {
            question: 'Who is this Super Tutor powered by?',
            options: ['Any random model', 'Grok (xAI) only', 'A magic book with no rules', 'Nobody'],
            correct_index: 1,
            explanation: 'This agent runs on Grok only — truth-seeking locked.',
          },
        ],
        child_id: null,
      });
      minted.push(lesson);
    }

    path = getLearnerPath(childId);
    return {
      minted,
      path,
      openCount: path?.openCount ?? 0,
      message: minted.length
        ? `Added ${minted.length} new class(es) so ${child.name} never runs out.`
        : `Path already has enough open classes for ${child.name}.`,
    };
  }

  function deleteChild(id) {
    write('children', listChildren().filter((c) => c.id !== id));
    write('progress', listProgress().filter((p) => p.child_id !== id));
    write('goals', listGoals().filter((g) => g.child_id !== id));
    write('mastery', listMastery().filter((m) => m.child_id !== id));
    return true;
  }

  function listProgress(childId) {
    const all = read('progress', []);
    if (!childId) return all;
    return all.filter((p) => p.child_id === childId);
  }

  function listGoals(childId) {
    const all = read('goals', []);
    if (!childId) return all;
    return all.filter((g) => g.child_id === childId);
  }

  function listMastery(childId) {
    const all = read('mastery', []);
    if (!childId) return all;
    return all.filter((m) => m.child_id === childId);
  }

  function listLessons({ subject, q, childId } = {}) {
    let list = ensureSeedLessons().map(ensurePicture);
    if (subject && subject !== 'all') {
      list = list.filter((l) => String(l.subject).toLowerCase() === String(subject).toLowerCase());
    }
    if (q) {
      const s = String(q).toLowerCase();
      list = list.filter(
        (l) =>
          String(l.title || '').toLowerCase().includes(s) ||
          String(l.description || '').toLowerCase().includes(s) ||
          String(l.subject || '').toLowerCase().includes(s) ||
          String(l.content || '').toLowerCase().includes(s)
      );
    }
    // Age filter optional via child
    if (childId) {
      const child = getChild(childId);
      if (child?.age) {
        const age = Number(child.age);
        list = list.filter((l) => {
          const min = l.age_min != null ? Number(l.age_min) : 3;
          const max = l.age_max != null ? Number(l.age_max) : 18;
          return age >= min && age <= max;
        });
      }
    }
    return list;
  }

  function getLesson(id) {
    return ensureSeedLessons().map(ensurePicture).find((l) => l.id === id) || null;
  }

  function saveLesson(lesson) {
    const list = ensureSeedLessons();
    const emoji = lesson.emoji || '📚';
    const subject = String(lesson.subject || 'general').toLowerCase().replace(/\s+/g, '_');
    const title = lesson.title || 'Tutor lesson';
    const key = lessonKey(title);
    // Never create a second card for the same topic title
    const existingIdx = list.findIndex(
      (l) => l.id === lesson.id || lessonKey(l.title) === key,
    );
    const base = existingIdx >= 0 ? list[existingIdx] : {};
    const row = ensurePicture({
      ...base,
      ...lesson,
      id: base.id || lesson.id || randomUUID(),
      emoji: lesson.emoji || base.emoji || '📚',
      subject,
      title,
      picture: lesson.picture || base.picture || lessonPicture(emoji, subject, title),
      createdAt: base.createdAt || lesson.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    if (existingIdx >= 0) list[existingIdx] = row;
    else list.unshift(row);
    const cleaned = dedupeLessons(list);
    if (cleaned.length > 300) cleaned.length = 300;
    write('lessons', cleaned);
    return cleaned.find((l) => l.id === row.id) || row;
  }

  function addGoal(childId, goal_text, target_lessons = 1) {
    const list = listGoals();
    const g = {
      id: randomUUID(),
      child_id: childId,
      goal_text: String(goal_text || 'Practice today').slice(0, 300),
      target_lessons: Number(target_lessons) || 1,
      completed: false,
      date: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
    };
    list.unshift(g);
    write('goals', list);
    return g;
  }

  function addMastery(childId, skill, note) {
    const list = listMastery();
    const m = {
      id: randomUUID(),
      child_id: childId,
      skill: String(skill || 'general').slice(0, 80),
      note: String(note || '').slice(0, 400),
      at: new Date().toISOString(),
    };
    list.unshift(m);
    if (list.length > 500) list.length = 500;
    write('mastery', list);
    return m;
  }

  function completeLesson({ childId, lesson, score, xpEarned }) {
    const child = getChild(childId);
    if (!child) throw new Error('Child not found');

    const xp = Number(xpEarned) || lesson?.xp_reward || 10;
    const newXp = (child.xp || 0) + xp;
    const newLevel = Math.floor(newXp / 50) + 1;

    const today = new Date().toDateString();
    let streak = child.streak || 0;
    const last = child.lastActivityDay;
    if (last !== today) {
      const y = new Date(Date.now() - 86400000).toDateString();
      streak = last === y ? streak + 1 : 1;
    }

    const updated = saveChild({
      id: child.id,
      xp: newXp,
      level: newLevel,
      streak,
      lastActivityDay: today,
    });

    const progress = {
      id: randomUUID(),
      child_id: childId,
      lesson_id: lesson?.id || null,
      lesson_title: lesson?.title || 'Lesson',
      subject: lesson?.subject || 'general',
      difficulty: lesson?.difficulty || 'beginner',
      completed: true,
      score: Number(score) || 0,
      xp_earned: xp,
      completed_at: new Date().toISOString(),
    };
    const plist = listProgress();
    plist.unshift(progress);
    if (plist.length > 1000) plist.length = 1000;
    write('progress', plist);

    // Lessons evolve with the learner after every completion
    const evolved = evolveLearner(childId) || updated;
    // Never let the path go empty after finishing a class
    const refill = ensureNeverOutOfClasses(childId, { minOpen: 6 });
    const path = refill.path || getLearnerPath(childId);

    return {
      child: evolved,
      progress,
      path,
      evolutionNotes: evolved.evolutionNotes || [],
      minted: refill.minted || [],
    };
  }

  function contextForChild(childId) {
    const progress = listProgress(childId)
      .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
      .slice(0, 12);
    const goals = listGoals(childId).filter((g) => !g.completed).slice(0, 5);
    const mastery = listMastery(childId).slice(0, 10);
    const child = getChild(childId);
    const path = childId ? getLearnerPath(childId) : null;
    return {
      recentProgress: progress.map((p) => ({
        subject: p.subject,
        lesson_title: p.lesson_title,
        score: p.score,
        completed_at: p.completed_at,
      })),
      activeGoals: goals.map((g) => ({
        goal_text: g.goal_text,
        target_lessons: g.target_lessons,
      })),
      masteryNotes: mastery.map((m) => `${m.skill}: ${m.note}`),
      skillLevels: child?.skillLevels || {},
      subjectFocus: progress[0]?.subject || null,
      nextLessons: (path?.nextUp || []).slice(0, 5).map((l) => `${l.title} (${l.pathStatus})`),
      age: child?.age,
      learnerName: child?.name,
      openCount: path?.openCount ?? 0,
      needsRefill: !!path?.needsRefill,
      neverEmpty: true,
    };
  }

  function normalizeQuestions(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
      .map((q) => {
        const options = Array.isArray(q.options) ? q.options.map(String).slice(0, 6) : [];
        let ci = Number.isFinite(Number(q.correct_index)) ? Number(q.correct_index) : 0;
        if (options.length && (ci < 0 || ci >= options.length)) ci = 0;
        return {
          question: String(q.question || '').trim(),
          options,
          correct_index: ci,
          explanation: String(q.explanation || '').trim(),
        };
      })
      .filter((q) => q.question && q.options.length >= 2);
  }

  /**
   * @param {object[]} actions
   * @param {object} child
   * @param {object} [guard] optional { activeLessonTitle, classroom } — blocks off-topic generate_lesson mid-class
   */
  function processActions(actions, child, guard = {}) {
    const out = {
      lessons: [],
      quizzes: [],
      parentBriefs: [],
      goals: [],
      masteryNotes: [],
      skipped: [],
    };
    if (!Array.isArray(actions)) return out;

    const activeTitle = String(guard.activeLessonTitle || guard.lessonTitle || '').trim().toLowerCase();
    const midClass = !!(guard.classroom || guard.handRaised || activeTitle);

    for (const action of actions) {
      const type = String(action?.type || 'none').toLowerCase();
      const p = action?.payload && typeof action.payload === 'object' ? action.payload : {};

      if (type === 'generate_lesson') {
        const newTitle = String(p.title || '').trim().toLowerCase();
        // Mid-class: do not spawn a different lesson (rockets → butterflies bug)
        if (midClass && activeTitle && newTitle) {
          const aWords = activeTitle.split(/[^a-z0-9]+/).filter((w) => w.length > 3);
          const bWords = newTitle.split(/[^a-z0-9]+/).filter((w) => w.length > 3);
          const overlap = aWords.some((w) => newTitle.includes(w)) || bWords.some((w) => activeTitle.includes(w));
          const sameish = newTitle.includes(activeTitle.slice(0, Math.min(12, activeTitle.length)))
            || activeTitle.includes(newTitle.slice(0, Math.min(12, newTitle.length)));
          if (!overlap && !sameish) {
            out.skipped.push({ type, reason: 'active_lesson_guard', title: p.title });
            continue;
          }
        }
        const age = Number(child?.age) || 8;
        const difficulty = normalizeDifficulty(p.difficulty || 'beginner');
        const lesson = saveLesson({
          title: p.title || 'Tutor lesson',
          description: p.description || p.note || '',
          content: p.content || 'Let’s explore this topic.',
          emoji: p.emoji || '✨',
          subject: String(p.subject || 'general').toLowerCase().replace(/\s+/g, '_'),
          age_min: Math.max(3, age - 2),
          age_max: Math.min(99, age + 2),
          difficulty,
          xp_reward: Number(p.xp_reward) || (difficulty === 'advanced' ? 20 : difficulty === 'intermediate' ? 15 : 10),
          questions: normalizeQuestions(p.questions),
          child_id: child?.id || null,
        });
        if (!lesson.questions.length) {
          lesson.questions = [
            {
              question: 'What helps you learn best?',
              options: ['Giving up', 'Practice and honest questions', 'Guessing only', 'Ignoring mistakes'],
              correct_index: 1,
              explanation: 'Practice and honest questions build real understanding.',
            },
          ];
        }
        out.lessons.push(lesson);
      } else if (type === 'practice_quiz') {
        // Prefer active lesson subject when mid-class
        const quizSubject = midClass && guard.lessonSubject
          ? guard.lessonSubject
          : (p.subject || 'practice');
        out.quizzes.push({
          id: randomUUID(),
          subject: quizSubject,
          title: p.title || (activeTitle ? `Practice: ${guard.activeLessonTitle || guard.lessonTitle}` : 'Quick practice'),
          emoji: p.emoji || '🧠',
          questions: normalizeQuestions(p.questions),
        });
      } else if (type === 'set_daily_goal' && child?.id) {
        out.goals.push(addGoal(child.id, p.goal_text || p.summary || 'Practice with Grok today', p.target_lessons));
      } else if (type === 'update_mastery' && child?.id) {
        const note = p.note || p.skill || '';
        if (note) out.masteryNotes.push(addMastery(child.id, p.skill || 'skill', note));
      } else if (type === 'parent_brief') {
        if (p.summary || p.note) out.parentBriefs.push(String(p.summary || p.note));
      }
    }
    return out;
  }

  // Seed on create
  ensureSeedLessons();

  return {
    listChildren,
    getChild,
    saveChild,
    deleteChild,
    listProgress,
    listGoals,
    listMastery,
    listLessons,
    getLesson,
    saveLesson,
    addGoal,
    addMastery,
    completeLesson,
    contextForChild,
    processActions,
    ensureSeedLessons,
    evolveLearner,
    getLearnerPath,
    ensureNeverOutOfClasses,
  };
}
