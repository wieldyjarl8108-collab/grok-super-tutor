/**
 * Lesson visuals — MUST match the lesson topic (elephants show elephants, not tigers).
 * Search is title-first; results are filtered by required keywords.
 */

/** Known lesson topics → exact search + must-match + must-NOT-match */
const TOPIC_MAP = [
  { match: /\blions?\b|savanna.*lion|pride/i, query: 'African lion', must: ['lion'], ban: ['tiger', 'leopard', 'cheetah', 'cat ', 'puma', 'cougar', 'panther'] },
  { match: /\belephants?\b|gentle giant/i, query: 'African elephant', must: ['elephant'], ban: ['mammoth', 'tiger', 'lion', 'rhino'] },
  { match: /\bdolphins?\b/i, query: 'bottlenose dolphin', must: ['dolphin'], ban: ['shark', 'whale', 'porpoise'] },
  { match: /\bpenguins?\b/i, query: 'emperor penguin antarctica', must: ['penguin'], ban: ['puffin', 'auk'] },
  { match: /\bbutterfl/i, query: 'butterfly insect flower', must: ['butterfl'], ban: ['moth'] },
  { match: /\brocket|falcon\s*9|how rockets/i, query: 'SpaceX rocket launch', must: ['rocket', 'spacex', 'launch', 'saturn v', 'falcon'], ban: ['car ', 'plane'] },
  { match: /\bastronaut|space station|iss\b/i, query: 'astronaut ISS space station', must: ['astronaut', 'iss', 'space station'], ban: [] },
  { match: /\bblack hole|galax|milky way/i, query: 'Milky Way galaxy astronomy', must: ['galaxy', 'milky', 'black hole', 'nebula', 'cosmos'], ban: [] },
  { match: /\bsolar system|planets?\b/i, query: 'solar system planets diagram', must: ['planet', 'solar', 'mars', 'jupiter', 'saturn', 'earth from space'], ban: [] },
  { match: /\bphotosynth/i, query: 'photosynthesis plant leaf chloroplast', must: ['plant', 'leaf', 'photosynth', 'chlorophyll'], ban: [] },
  { match: /\bwater cycle|evaporat|precipitat/i, query: 'water cycle diagram rain cloud', must: ['water', 'rain', 'cloud', 'cycle'], ban: [] },
  { match: /\baddition|add numbers|plus\b/i, query: 'addition math numbers kids', must: ['math', 'number', 'addition', 'arithmetic', 'plus'], ban: [] },
  { match: /\bmultipl/i, query: 'multiplication math times table', must: ['multipl', 'math', 'times'], ban: [] },
  { match: /\bfraction/i, query: 'fraction pizza pie chart math', must: ['fraction', 'pie', 'pizza', 'math'], ban: [] },
  { match: /\begypt|pharaoh|pyramid|hieroglyph/i, query: 'Great Pyramid of Giza Egypt', must: ['egypt', 'pyramid', 'pharaoh', 'giza', 'hieroglyph'], ban: [] },
  { match: /\bstock\b|shareholder|owning a piece/i, query: 'stock market board finance education', must: ['stock', 'market', 'finance', 'share', 'trading'], ban: [] },
  { match: /\bcrypto|bitcoin|blockchain/i, query: 'bitcoin cryptocurrency illustration', must: ['bitcoin', 'crypto', 'blockchain'], ban: [] },
  { match: /\bcompound interest/i, query: 'compound interest growth chart', must: ['interest', 'growth', 'money', 'chart'], ban: [] },
  { match: /\bdiversif|eggs in one basket/i, query: 'diversification investment eggs basket', must: ['diversif', 'investment', 'portfolio', 'basket'], ban: [] },
  { match: /\bmoney\b|what is money|fiat|barter/i, query: 'coins currency money education', must: ['money', 'coin', 'currency', 'cash'], ban: [] },
  { match: /\bcoding|program|python|binary/i, query: 'computer coding programming education', must: ['code', 'computer', 'program', 'laptop'], ban: [] },
  { match: /\bmusic note|treble|staff\b/i, query: 'musical staff notes sheet music', must: ['music', 'note', 'staff', 'piano', 'treble'], ban: [] },
  { match: /\bcolor|emotion.*art|artists use color/i, query: 'color wheel art painting', must: ['color', 'paint', 'art', 'palette'], ban: [] },
  { match: /\bstor(y|ies)|reading|character|setting/i, query: 'children reading storybook', must: ['book', 'read', 'story', 'library'], ban: [] },
  { match: /\bhealthy|sleep|exercise|habit/i, query: 'kids healthy exercise vegetables', must: ['health', 'exercise', 'vegetable', 'sport', 'sleep'], ban: [] },
  { match: /\bcontinent|geography|world map/i, query: 'world map continents globe', must: ['map', 'continent', 'globe', 'earth'], ban: [] },
];

const STOP = new Set([
  'what', 'with', 'from', 'that', 'this', 'about', 'made', 'your', 'their', 'kings',
  'gentle', 'giants', 'magic', 'power', 'world', 'learn', 'lesson', 'today', 'class',
  'into', 'have', 'does', 'when', 'where', 'which', 'they', 'them', 'than', 'then',
  'only', 'just', 'very', 'much', 'more', 'most', 'some', 'such', 'also', 'into',
]);

function detectTopic(lesson) {
  const blob = `${lesson.title || ''} ${lesson.description || ''} ${lesson.emoji || ''}`;
  for (const t of TOPIC_MAP) {
    if (t.match.test(blob)) return t;
  }
  return null;
}

function titleFocusWords(title) {
  return String(title || '')
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .map((w) => w.toLowerCase())
    .filter((w) => w.length > 3 && !STOP.has(w));
}

/**
 * Build tight search queries from the ACTUAL lesson title/topic.
 */
function queriesForLesson(lesson) {
  const topic = detectTopic(lesson);
  const qs = [];
  if (topic) {
    qs.push(topic.query);
    // Second pass: exact noun only (very strict)
    if (topic.must[0]) qs.push(topic.must[0]);
  }
  const words = titleFocusWords(lesson.title);
  // Prefer concrete nouns from title (elephant, dolphin…) over fluff
  if (words.length) {
    qs.push(words.slice(0, 3).join(' '));
    if (words[0]) qs.push(words[0]);
  }
  // Subject only as last resort for non-animal generic lessons
  const sub = String(lesson.subject || '').toLowerCase();
  if (!topic && sub && sub !== 'animals') {
    const fallback = {
      math: 'mathematics education numbers',
      science: 'science education classroom',
      space: 'astronomy space education',
      reading: 'children reading books',
      history: 'history museum artifact',
      art: 'art education painting',
      music: 'music education instruments',
      coding: 'programming computer education',
      investing: 'financial literacy education coins',
      geography: 'world map globe',
      health: 'healthy lifestyle kids',
      life_skills: 'children learning skills',
    };
    if (fallback[sub]) qs.push(fallback[sub]);
  }
  return [...new Set(qs.filter(Boolean))].slice(0, 4);
}

function mustTerms(lesson) {
  const topic = detectTopic(lesson);
  if (topic) return topic.must.map((m) => m.toLowerCase());
  return titleFocusWords(lesson.title).slice(0, 3);
}

function banTerms(lesson) {
  const topic = detectTopic(lesson);
  return (topic?.ban || []).map((b) => b.toLowerCase());
}

/** Keep only images whose file title/alt matches the topic */
function matchesTopic(visual, must, ban) {
  const hay = `${visual.alt || ''} ${visual.src || ''}`.toLowerCase();
  for (const b of ban) {
    if (b && hay.includes(b)) return false;
  }
  if (!must.length) return true;
  // At least one must-term must appear in the image title
  return must.some((m) => m && hay.includes(m));
}

async function searchCommons(query, limit = 8) {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  url.searchParams.set('action', 'query');
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');
  url.searchParams.set('generator', 'search');
  url.searchParams.set('gsrnamespace', '6');
  // Prefer photos of the exact subject — intitle helps a lot
  const primary = String(query).split(/\s+/)[0];
  url.searchParams.set(
    'gsrsearch',
    `${query} ${primary ? `intitle:${primary}` : ''} filetype:bitmap|drawing -comic -cartoon -logo -icon -svg`,
  );
  url.searchParams.set('gsrlimit', String(limit));
  url.searchParams.set('prop', 'imageinfo');
  url.searchParams.set('iiprop', 'url|mime|size');
  url.searchParams.set('iiurlwidth', '960');

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(9000) });
  if (!res.ok) return [];
  const data = await res.json();
  const pages = data?.query?.pages || {};
  const out = [];
  for (const p of Object.values(pages)) {
    const info = p.imageinfo?.[0];
    if (!info) continue;
    const mime = info.mime || '';
    const src = info.thumburl || info.url;
    if (!src) continue;
    // Skip tiny icons
    if (info.width && info.width < 200) continue;
    if (mime.startsWith('image/')) {
      out.push({ type: 'image', src, alt: p.title || query, title: p.title || '' });
    } else if (mime.startsWith('video/') && info.url) {
      out.push({ type: 'video', src: info.url, alt: p.title || query, title: p.title || '' });
    }
  }
  return out;
}

/**
 * @returns {Promise<Array<{type:'image'|'video', src:string, alt?:string}>>}
 */
export async function fetchLessonVisuals(lesson) {
  const must = mustTerms(lesson || {});
  const ban = banTerms(lesson || {});
  const visuals = [];

  // Lesson poster SVG is topic-branded (emoji + title) — always safe as first frame
  if (lesson?.picture) {
    visuals.push({
      type: 'image',
      src: lesson.picture,
      alt: lesson.title || 'Lesson',
      title: lesson.title || '',
      local: true,
    });
  }

  const queries = queriesForLesson(lesson || {});
  for (const q of queries) {
    try {
      const found = await searchCommons(q, 10);
      for (const f of found) {
        if (!matchesTopic(f, must, ban)) continue;
        if (visuals.some((v) => v.src === f.src)) continue;
        visuals.push(f);
      }
    } catch {
      /* network */
    }
    // Enough real photos after poster
    if (visuals.filter((v) => !v.local).length >= 5) break;
  }

  // If filter was too strict, retry once with only must[0] in title
  if (visuals.filter((v) => !v.local).length === 0 && must[0]) {
    try {
      const found = await searchCommons(must[0], 12);
      for (const f of found) {
        if (!matchesTopic(f, [must[0]], ban)) continue;
        if (!visuals.some((v) => v.src === f.src)) visuals.push(f);
      }
    } catch { /* */ }
  }

  return visuals;
}

export class VisualStage {
  constructor(rootEl) {
    this.root = rootEl;
    this.items = [];
    this.index = 0;
    this._timer = null;
    this.topicLabel = '';
  }

  async load(lesson) {
    this.stopAuto();
    this.topicLabel = lesson?.title || 'Lesson';
    this.root.innerHTML = `<div class="visual-loading">Finding pictures of <strong>${escapeHtml(this.topicLabel)}</strong>…</div>`;
    this.items = await fetchLessonVisuals(lesson);
    if (!this.items.length) {
      this.root.innerHTML = `<div class="visual-fallback"><span>${lesson?.emoji || '📚'}</span><p>Imagine <strong>${escapeHtml(this.topicLabel)}</strong> while we learn.</p></div>`;
      return;
    }
    this.index = 0;
    this.render();
  }

  render() {
    if (!this.root || !this.items.length) return;
    const item = this.items[this.index % this.items.length];
    const cap = item.local
      ? `Lesson art · ${this.topicLabel}`
      : `Photo · ${this.topicLabel}`;
    if (item.type === 'video') {
      this.root.innerHTML = `
        <video class="visual-media kenburns" src="${item.src}" autoplay muted loop playsinline></video>
        <div class="visual-caption">${escapeHtml(cap)}</div>
        <div class="visual-dots"></div>`;
    } else {
      this.root.innerHTML = `
        <img class="visual-media kenburns" src="${item.src}" alt="${escapeHtml(item.alt || this.topicLabel)}" />
        <div class="visual-caption">${escapeHtml(cap)}</div>
        <div class="visual-dots"></div>`;
      // If remote image fails, skip to next matching one
      const img = this.root.querySelector('img');
      if (img && !item.local) {
        img.onerror = () => {
          const i = this.index % Math.max(1, this.items.length);
          this.items.splice(i, 1);
          if (this.items.length) {
            this.index = this.index % this.items.length;
            this.render();
          } else {
            this.root.innerHTML = `<div class="visual-fallback"><span>📚</span><p>Imagine <strong>${escapeHtml(this.topicLabel)}</strong> while we learn.</p></div>`;
          }
        };
      }
    }
    const dots = this.root.querySelector('.visual-dots');
    if (dots) {
      this.items.forEach((_, i) => {
        const d = document.createElement('span');
        d.className = 'vdot' + (i === this.index % this.items.length ? ' on' : '');
        dots.appendChild(d);
      });
    }
  }

  next() {
    if (this.items.length < 2) return;
    this.index = (this.index + 1) % this.items.length;
    this.render();
  }

  showIndex(i) {
    if (!this.items.length) return;
    this.index = i % this.items.length;
    this.render();
  }

  startAuto(ms = 9000) {
    this.stopAuto();
    if (this.items.length < 2) return;
    this._timer = setInterval(() => this.next(), ms);
  }

  stopAuto() {
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
  }
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
