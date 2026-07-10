# Structura / Engineering archive

This folder holds the **engineering / Structure** side of Grok Agent after the live product was slimmed to **education only** (Super Tutor).

The eng product needs more work before it should ship again as part of this agent. Everything here is preserved so you can rebuild later without hunting git history.

## What’s here

| Path | Contents |
|------|----------|
| `public/` | `scene3d.js`, `structure-engine.js`, `materials-db.js`, `blueprint.js` |
| `snapshots/server.full.mjs` | Full unified server (tutor + eng) at archive time |
| `snapshots/app.full.js` | Full UI app (tutor + 3D/paper/build) |
| `snapshots/index.full.html` | Full HTML with Structure tab |
| `snapshots/disclaimers.full.mjs` | Disclaimers including PE / materials / sim |
| `projects-data/` | Saved 3D project JSON from `data/projects` |

## Live agent (education)

The running app is **Grok Super Tutor** only:

- Lessons, classroom, quizzes  
- Market lab (play money)  
- Code lab  
- Ask / memory  

It does **not** load Three.js structure design.

## How to rebuild later

1. Copy `public/*` eng modules back into `../../public/`.
2. Restore UI from `snapshots/index.full.html` + `snapshots/app.full.js` (or merge carefully into the edu app).
3. Restore routes from `snapshots/server.full.mjs` (`/api/build`, `/api/projects`, blueprint, structure imports).
4. Re-add eng disclaimers from `snapshots/disclaimers.full.mjs`.
5. Run `npm run check` and manual Structure tests.

## Why it was split

Mixing Super Tutor with a half-finished structure workspace overloaded the product and diluted the education mission (lesson context bugs, shared memory pollution, huge UI). Education first; eng when it’s solid.
