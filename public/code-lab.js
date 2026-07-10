/**
 * Code Lab — kids write and run real JavaScript with a teacher coach.
 */

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const CHALLENGES = [
  {
    id: 'hello',
    title: '1. Say hello',
    level: 'beginner',
    minAge: 6,
    goal: 'Make the computer print Hello, world!',
    teach: 'In JavaScript, console.log writes a message. Text goes inside quotes.',
    starter: `// Type your code below, then press Run\nconsole.log("Hello, world!");\n`,
    check: (out) => /hello,\s*world!?/i.test(out),
    hint: 'Use: console.log("Hello, world!");',
    solution: `console.log("Hello, world!");`,
  },
  {
    id: 'name',
    title: '2. Use your name',
    level: 'beginner',
    minAge: 7,
    goal: 'Store your name in a variable and print Hi, NAME!',
    teach: 'A variable is a labeled box. let name = "Mia"; saves a value. Then use it in a message.',
    starter: `let name = "Sam";\n// Print: Hi, Sam!\n`,
    check: (out) => /hi,\s*\w+/i.test(out),
    hint: 'After let name = "...", write console.log("Hi, " + name + "!");',
    solution: `let name = "Sam";\nconsole.log("Hi, " + name + "!");`,
  },
  {
    id: 'math',
    title: '3. Do math',
    level: 'beginner',
    minAge: 7,
    goal: 'Add 7 + 5 and print the answer (should be 12).',
    teach: 'Computers calculate with + - * /. You can print the result of 7 + 5.',
    starter: `let a = 7;\nlet b = 5;\n// print a + b\n`,
    check: (out) => out.includes('12'),
    hint: 'console.log(a + b);',
    solution: `let a = 7;\nlet b = 5;\nconsole.log(a + b);`,
  },
  {
    id: 'if',
    title: '4. If decisions',
    level: 'beginner',
    minAge: 8,
    goal: 'If score is 90 or more, print Pass. Otherwise print Try again.',
    teach: 'if (condition) { ... } else { ... } chooses a path. >= means greater or equal.',
    starter: `let score = 92;\n// if score >= 90 print Pass else Try again\n`,
    check: (out) => /pass/i.test(out),
    hint: 'if (score >= 90) { console.log("Pass"); } else { console.log("Try again"); }',
    solution: `let score = 92;\nif (score >= 90) {\n  console.log("Pass");\n} else {\n  console.log("Try again");\n}`,
  },
  {
    id: 'loop',
    title: '5. Loops count',
    level: 'intermediate',
    minAge: 9,
    goal: 'Print the numbers 1 2 3 4 5 (one per line or together).',
    teach: 'A for loop repeats work. for (let i = 1; i <= 5; i++) runs five times.',
    starter: `// Print 1 through 5\n`,
    check: (out) => {
      const nums = out.match(/\d+/g) || [];
      return ['1', '2', '3', '4', '5'].every((n) => nums.includes(n));
    },
    hint: 'for (let i = 1; i <= 5; i++) { console.log(i); }',
    solution: `for (let i = 1; i <= 5; i++) {\n  console.log(i);\n}`,
  },
  {
    id: 'fn',
    title: '6. Make a function',
    level: 'intermediate',
    minAge: 10,
    goal: 'Write a function double(n) that returns n * 2, then print double(6) → 12.',
    teach: 'Functions are reusable recipes. function double(n) { return n * 2; }',
    starter: `// function double(n) { ... }\n// console.log(double(6));\n`,
    check: (out) => out.includes('12'),
    hint: 'function double(n) { return n * 2; }\nconsole.log(double(6));',
    solution: `function double(n) {\n  return n * 2;\n}\nconsole.log(double(6));`,
  },
  {
    id: 'array',
    title: '7. Lists (arrays)',
    level: 'intermediate',
    minAge: 10,
    goal: 'Make an array of 3 colors and print the first one.',
    teach: 'Arrays hold many values: let colors = ["red", "green", "blue"]; First item is colors[0].',
    starter: `let colors = ["red", "green", "blue"];\n// print the first color\n`,
    check: (out) => /red/i.test(out),
    hint: 'console.log(colors[0]);',
    solution: `let colors = ["red", "green", "blue"];\nconsole.log(colors[0]);`,
  },
  {
    id: 'bugfix',
    title: '8. Fix the bug',
    level: 'intermediate',
    minAge: 9,
    goal: 'This code is broken. Fix it so it prints Ready!',
    teach: 'Bugs are normal. Read error messages. Check spelling and quotes.',
    starter: `// Fix me!\nconsole.log(Ready!);\n`,
    check: (out) => /ready!?/i.test(out),
    hint: 'Text needs quotes: console.log("Ready!");',
    solution: `console.log("Ready!");`,
  },
];

function runSandboxed(code) {
  const logs = [];
  const errors = [];
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(
      'console',
      `"use strict";\n${code}`,
    );
    const fakeConsole = {
      log: (...args) => logs.push(args.map(String).join(' ')),
      info: (...args) => logs.push(args.map(String).join(' ')),
      warn: (...args) => logs.push(args.map(String).join(' ')),
      error: (...args) => errors.push(args.map(String).join(' ')),
    };
    fn(fakeConsole);
  } catch (e) {
    errors.push(e.message || String(e));
  }
  return { out: logs.join('\n'), err: errors.join('\n') };
}

export function createCodeLab(root, { getChild, askGrok } = {}) {
  let challengeId = CHALLENGES[0].id;
  let code = CHALLENGES[0].starter;
  let lastResult = { out: '', err: '', ok: null };
  let coach = 'Pick a challenge. Read the goal. Write code. Press Run. I will coach you.';

  function challengesForAge() {
    const age = Number(getChild?.()?.age) || 10;
    return CHALLENGES.filter((c) => age >= (c.minAge || 6));
  }

  function current() {
    return CHALLENGES.find((c) => c.id === challengeId) || CHALLENGES[0];
  }

  function selectChallenge(id) {
    challengeId = id;
    const c = current();
    code = c.starter;
    lastResult = { out: '', err: '', ok: null };
    coach = c.teach;
    render();
  }

  function run() {
    const c = current();
    const { out, err } = runSandboxed(code);
    let ok = null;
    if (err) {
      ok = false;
      coach = `Bug found: ${err}. <em>Teacher:</em> Read the error carefully. Check quotes, spelling, and parentheses.`;
    } else if (c.check(out)) {
      ok = true;
      coach = `Yes! You did it. <em>Teacher:</em> ${c.teach} Try the next challenge when ready.`;
    } else {
      ok = false;
      coach = `Your code ran, but the output was not quite right. Output was: “${out || '(empty)'}”. Hint: ${c.hint}`;
    }
    lastResult = { out, err, ok };
    render();
  }

  function showSolution() {
    const c = current();
    code = c.solution;
    coach = 'Here is one correct solution. Read it, then try rewriting it from memory.';
    render();
  }

  async function askTeacher() {
    const c = current();
    const child = getChild?.() || {};
    const q = `I am learning to code. Challenge: ${c.title}. Goal: ${c.goal}. My code:\n${code}\nOutput: ${lastResult.out}\nError: ${lastResult.err}\nExplain like a classroom teacher for age ${child.age || 10}. Do not just paste the full answer first — guide me.`;
    coach = 'Asking Teacher Grok…';
    render();
    try {
      if (typeof askGrok === 'function') {
        const reply = await askGrok(q);
        coach = reply || 'Try the hint button and run again.';
      } else {
        coach = c.hint;
      }
    } catch (e) {
      coach = e.message || c.hint;
    }
    render();
  }

  function render() {
    const list = challengesForAge();
    const c = current();
    const kid = getChild?.();
    root.innerHTML = `
      <div class="code-lab">
        <div class="code-side">
          <h3>💻 Code Lab</h3>
          <p class="sub">${kid ? `Coder: <strong>${esc(kid.name)}</strong> · age ${kid.age}` : 'Pick a kid in Admin first for age-fit challenges.'}</p>
          <div class="code-challenges">
            ${list.map((ch) => `
              <button type="button" class="code-ch ${ch.id === c.id ? 'on' : ''}" data-id="${ch.id}">
                <strong>${esc(ch.title)}</strong>
                <span>${esc(ch.level)}</span>
              </button>`).join('')}
          </div>
        </div>
        <div class="code-main">
          <div class="code-goal">
            <h4>${esc(c.title)}</h4>
            <p><strong>Goal:</strong> ${esc(c.goal)}</p>
            <p class="sub"><strong>Teacher:</strong> ${esc(c.teach)}</p>
          </div>
          <label class="sub">Your JavaScript</label>
          <textarea id="codeEditor" class="code-editor" spellcheck="false">${esc(code)}</textarea>
          <div class="row gap wrap" style="margin:8px 0">
            <button type="button" class="btn primary" id="codeRun">▶ Run code</button>
            <button type="button" class="btn soft" id="codeHint">💡 Hint</button>
            <button type="button" class="btn soft" id="codeSol">Show solution</button>
            <button type="button" class="btn soft" id="codeAsk">Ask teacher</button>
          </div>
          <div class="code-out ${lastResult.ok === true ? 'ok' : lastResult.ok === false ? 'bad' : ''}">
            <div class="sub">Output</div>
            <pre>${esc(lastResult.err ? `Error: ${lastResult.err}` : (lastResult.out || '— run your code —'))}</pre>
            ${lastResult.ok === true ? '<p class="code-badge win">✅ Challenge complete!</p>' : ''}
            ${lastResult.ok === false && !lastResult.err ? '<p class="code-badge lose">Not quite — try again</p>' : ''}
          </div>
          <div class="code-coach">
            <strong>👩‍🏫 Coding teacher</strong>
            <p>${coach}</p>
          </div>
        </div>
      </div>
    `;

    root.querySelectorAll('.code-ch').forEach((b) => {
      b.onclick = () => selectChallenge(b.dataset.id);
    });
    const ta = root.querySelector('#codeEditor');
    ta?.addEventListener('input', () => { code = ta.value; });
    root.querySelector('#codeRun')?.addEventListener('click', run);
    root.querySelector('#codeHint')?.addEventListener('click', () => {
      coach = `Hint: ${c.hint}`;
      render();
    });
    root.querySelector('#codeSol')?.addEventListener('click', showSolution);
    root.querySelector('#codeAsk')?.addEventListener('click', () => askTeacher());
  }

  return {
    start() { render(); },
    stop() {},
    render,
  };
}
