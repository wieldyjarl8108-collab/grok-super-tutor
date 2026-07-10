# Share Grok Super Tutor

## The deal (simple)

**Free for everyone who has a Grok subscription.**

| | |
|--|--|
| **Super Tutor agent** (this app) | **Free** â€” share with anyone |
| **Grok** (xAI) | **Their** subscription / login â€” powers teaching |
| **Truth-seeking** | **Locked on** â€” cannot be turned off |
| **Other AIs** | **Not allowed** â€” Grok only |

No Base44. No paywall on the tutor itself. If they can use Grok, they can use Super Tutor.

## What people need

| Piece | Cost | Notes |
|-------|------|--------|
| **This agent** (Super Tutor app) | Free | Copy the folder or clone the repo |
| **Grok access** | Their Grok / xAI subscription | `grok login` **or** xAI API key |
| **Node.js** | Free | https://nodejs.org LTS |

## Path to give people (install)

### Option A â€” Folder copy (simple)

1. Copy the whole `grok-agent` folder to their PC.  
2. Install Node.js LTS if missing.  
3. In that folder:

```powershell
npm install
powershell -ExecutionPolicy Bypass -File .\Install-Grok-Agent.ps1
```

4. They sign in to Grok:

```text
grok login
```

   (or put an xAI API key in `config.json` as `apiKey` â€” still Grok only)

5. Double-click **Grok Agent** on the desktop â†’ http://127.0.0.1:3847

### Option B â€” Public GitHub (recommended)

```text
git clone https://github.com/wieldyjarl8108-collab/grok-super-tutor.git
cd grok-super-tutor
npm install
npm run install-pc
grok login
```

Then open **Grok Agent**.

Public GitHub repos are **free**. Agent code is free. They only need **their** Grok subscription.

### Option C â€” One-line story for parents / friends

> â€œIf you have Grok, Super Tutor is free. Install it on your PC, sign in with Grok, and kids get endless true lessons. Truth-seeking stays on â€” no other AI.â€

## What is locked (users cannot change)

These live under `core/` and are enforced by the server:

| Lock | Meaning |
|------|---------|
| **Truth constitution** | `core/truth-constitution.mjs` â€” always injected; boot fails if broken |
| **Grok only** | `core/provider-lock.mjs` â€” only `grok-*` models + `api.x.ai` |
| **No system-prompt API** | `POST /api/system-prompt` â†’ 403 |
| **No other providers in config** | Setting OpenAI/etc. URLs is rejected |

Learner data (kids, progress, memory) **is** editable â€” thatâ€™s personal.  
**Truth rules and provider lock are not.**

## Who can update the agent

| Who | How |
|-----|-----|
| **You + Grok Build** | Edit the repo / folder, improve code, `npm run check`, redeploy folder or git |
| **End users** | Use the agent; they should **not** need to edit `core/` |
| **Auto updates (later)** | Optional: git pull from your public repo on start |

Recommended: publish a **read-only** public repo; users pull updates; you push truth-safe releases only.

## Endless classes

Kids **never run out of classes**:

- After quizzes / when the path is thin, the agent **mints new age-fit lessons** from a locked topic bank.  
- Grok can still `generate_lesson` for deeper custom topics while staying truth-seeking.

## Tab presence

When someone opens Super Tutor in a browser tab, the agent logs a **local** session open (`data/sessions.json`) and heartbeats while the tab is active. Nothing is sold to advertisers â€” itâ€™s so the host PC knows the agent is in use.

## Disclaimer

Educational only. Not a school, PE stamp, or financial advisor. Market lab is play money. Parents remain responsible for childrenâ€™s learning and for their own Grok account terms.
