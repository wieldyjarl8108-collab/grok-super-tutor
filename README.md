# Grok Super Tutor

**Free for everyone with a Grok subscription.**

Local education agent for kids and families.  
Truth-seeking is **locked on**. Runs on **Grok only** (xAI). Endless classes so learners never run out.

> **Independent project.** Not affiliated with, employed by, or endorsed by Elon Musk, xAI, Grok, or X.  
> Grok is a product of xAI â€” use your own account under their terms.

## Quick start

### Requirements

- [Node.js](https://nodejs.org) 18+ (LTS)
- [Grok](https://grok.com) access: `grok login` **or** an [xAI API key](https://console.x.ai)

### Install (Windows)

```powershell
git clone https://github.com/wieldyjarl8108-collab/grok-super-tutor.git
cd grok-super-tutor
npm install
powershell -ExecutionPolicy Bypass -File .\Install-Grok-Agent.ps1
grok login
```

Then double-click **Grok Agent** on the desktop, or open http://127.0.0.1:3847

### Manual start

```bash
npm install
npm start
```

## What you get

| Feature | Description |
|--------|-------------|
| **Super Tutor** | Age-fit lessons, classroom teaching, quizzes |
| **Endless classes** | New topics mint when the path gets thin |
| **Market lab** | Play money only + educational disclaimer |
| **Code lab** | Real JavaScript challenges |
| **Truth lock** | Cannot disable truth-seeking or swap AI providers |
| **Local data** | Learners & progress stay on your PC under `data/` |

## Cost

| Piece | Cost |
|-------|------|
| This agent (code + app) | **Free** (MIT) |
| Public GitHub hosting | **Free** for public repos |
| Grok / xAI | **Your** subscription or API usage |

## Share with others

See **[SHARE.md](SHARE.md)** â€” one-page install path + disclaimer for parents.

## Security & privacy

- `config.json` and `data/` are **gitignored** (never publish keys or kid records)
- Truth core: `core/truth-constitution.mjs`
- Provider lock: `core/provider-lock.mjs`

## Engineering archive

Older Structure / 3D work is archived under `archive/structura-engineering/` for a later rebuild. Live product is **education only**.

## License

MIT â€” see [LICENSE](LICENSE). Still educational-only in use; not a school or financial advisor.

## Checks

```bash
npm run check
```
