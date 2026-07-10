import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const src = readFileSync(join(root, 'archive/structura-engineering/snapshots/index.full.html'), 'utf8');

const t0 = src.indexOf('<!-- SUPER TUTOR');
const t1 = src.indexOf('<!-- STRUCTURAL DESIGNER');
if (t0 < 0 || t1 < 0) throw new Error('tutor section markers missing');
const tutor = src.slice(t0, t1);

const a0 = src.indexOf('<!-- ASK -->');
const a1 = src.indexOf('</main>');
if (a0 < 0 || a1 < 0) throw new Error('ask section markers missing');
const ask = src
  .slice(a0, a1)
  .replace('Same Grok — builds, school, ideas', 'School help · ideas · honest answers')
  .replace('Grok remembers what you build and talk about', 'Grok remembers lessons and learner facts (local only)')
  .replace('id="userName"', 'id="memName"')
  .replace('id="btnSaveName"', 'id="memSaveName"')
  .replace('id="btnClearMem"', 'id="memClear"');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Grok Super Tutor</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect fill='%23000000' width='64' height='64' rx='14'/><text x='50%' y='54%' font-size='28' text-anchor='middle' dominant-baseline='middle' fill='%23fff'>G</text></svg>" />
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <link rel="stylesheet" href="/styles.css?v=edu2" />
</head>
<body>
  <div id="offlineBanner" class="offline-banner" hidden>
    <strong>Grok is offline</strong>
    <span>Double-click the Desktop shortcut <b>Grok Agent</b>, then come back here.</span>
    <button type="button" id="btnRetryServer" class="btn primary">Retry</button>
  </div>
  <div class="app">
    <aside class="nav">
      <div class="nav-brand">
        <div class="logo">G</div>
        <div>
          <strong>Grok Tutor</strong>
          <small id="statusLine">Starting…</small>
        </div>
      </div>
      <p class="nav-tagline">Truth-seeking Super Tutor</p>
      <nav class="nav-tabs">
        <button type="button" class="nav-btn" data-tab="home">Home</button>
        <button type="button" class="nav-btn active" data-tab="tutor">Learn</button>
        <button type="button" class="nav-btn" data-tab="ask">Ask</button>
        <button type="button" class="nav-btn" data-tab="about">Truth</button>
      </nav>
      <div class="headset-box">
        <p class="headset-title">Headset</p>
        <button type="button" id="btnHeadsetListen" class="btn soft full">Listen (mic on)</button>
        <button type="button" id="btnHeadsetStopTalk" class="btn soft full">Stop talking</button>
        <p id="headsetStatus" class="sub">Plug in headset · talk &amp; listen</p>
      </div>
      <div class="connectors-box">
        <p class="headset-title">Links</p>
        <button type="button" id="btnConnectGrok" class="btn soft full">Grok web</button>
        <button type="button" id="btnConnectX" class="btn soft full">Open X</button>
        <div class="x-handle-row">
          <input type="text" id="xHandle" placeholder="@yourhandle" />
          <button type="button" id="btnSaveX" class="btn">Save</button>
        </div>
        <p id="connectorStatus" class="sub">Connect X handle for posts</p>
      </div>
      <div class="nav-foot">
        <label class="switch"><input type="checkbox" id="ttsToggle" checked /> Speak replies</label>
        <span id="statusDot" class="dot"></span>
      </div>
    </aside>

    <main class="main">
      <section id="tab-home" class="tab">
        <div class="hero">
          <p class="hero-kicker">Education only · local · no Base44</p>
          <h1>Grok Super Tutor</h1>
          <p class="hero-sub">
            Lessons, classroom teaching, quizzes, market lab, and code lab.
            Truth first — the engineering Structure product is archived for a later rebuild.
          </p>
        </div>
        <div class="big-grid">
          <button type="button" class="big-card" data-go="tutor">
            <span class="emoji">🎓</span>
            <span class="card-from">Learn</span>
            <h3>Super Tutor</h3>
            <p>Kids &amp; adults · age-fit lessons · quizzes · market lab · code lab</p>
          </button>
          <button type="button" class="big-card" data-go="ask">
            <span class="emoji">💬</span>
            <span class="card-from">Ask</span>
            <h3>Ask Grok</h3>
            <p>Homework help and honest answers with local memory</p>
          </button>
          <button type="button" class="big-card soft-card" data-go="about">
            <span class="emoji">⚖️</span>
            <span class="card-from">Truth</span>
            <h3>Disclaimers</h3>
            <p>Educational only · play-money market · local data</p>
          </button>
        </div>
      </section>

      <section id="tab-about" class="tab">
        <div class="about-wrap panel">
          <h2>Truth rules · Super Tutor</h2>
          <p class="sub">This agent is education-only. Structure/engineering is saved under <code>archive/structura-engineering/</code> for a later rebuild.</p>
          <div class="about-grid">
            <div class="about-card">
              <h3>Learn</h3>
              <ul>
                <li>Age-adaptive Super Tutor</li>
                <li>Lessons evolve with quiz scores</li>
                <li>Market lab = play money only</li>
                <li>Code lab = real JavaScript</li>
                <li>Parent briefs stay local</li>
              </ul>
              <p class="disclaimer-box" id="discEdu"></p>
              <p class="disclaimer-box" id="discMarket"></p>
              <p class="disclaimer-box" id="discHome"></p>
            </div>
            <div class="about-card">
              <h3>Not in this build</h3>
              <ul>
                <li>3D structure designer</li>
                <li>Paper to blueprint</li>
                <li>Materials catalog / load analysis</li>
              </ul>
              <p class="sub">Those files live in the archive so they can be rebuilt properly later.</p>
            </div>
          </div>
          <p class="sub" style="margin-top:16px">Data lives under <code>data/tutor/</code> on this computer.</p>
        </div>
      </section>

${tutor}
${ask}
    </main>
  </div>
  <script type="module" src="/app.js?v=edu2"></script>
</body>
</html>
`;

writeFileSync(join(root, 'public/index.html'), html, 'utf8');
const hasBuild = /tab-build|data-tab="build"/.test(html);
console.log('wrote index.html', html.length, 'chars; has build tab?', hasBuild);
if (hasBuild) process.exit(1);
