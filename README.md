# 🎨 DankDraw.io

> Multiplayer pictionary, but extra dank. Originally a 2024 Global Game Jam project — fully renovated in v2.0 with a state-of-the-art stack and a brand-new "Neo-Dank" feel.

![hero](https://img.shields.io/badge/v2.0-Neo--Dank-FF6BD6) ![stack](https://img.shields.io/badge/stack-React%20%2B%20Fastify%20%2B%20Socket.IO-7CC4FF)

## ✨ Features (v2.0)

- 🏠 **Rooms with shareable codes** — public + private, host configures everything
- 🎨 **Smooth pressure-sensitive drawing** — pen, marker, eraser, fill bucket; undo, clear, custom colors, mobile/touch/stylus parity
- 🎯 **Server-authoritative game state** — drawer never leaks the word; guesses validated server-side; "you're close!" hints for near-misses
- 🧠 **3-word selection** — drawer picks easy / medium / hard, harder words score more
- 🔡 **Progressive hint reveal** — letters unmask over time
- 🏆 **Time-weighted scoring** — fast guesses + first-to-guess bonuses; drawer also scores
- 🎮 **4 modes** — Classic, Speedrun, Custom Words, Teams (coming)
- 💬 **Sanitized chat** — XSS-proof; spoiler-blocking for the drawer; system messages styled separately
- 🥇 **Animated podium + confetti** at game end
- 📱 **Fully responsive** — playable on phones in portrait
- ♿ **Accessibility** — keyboard shortcuts, reduced-motion support, ARIA labels
- 🎨 **3 themes** baked in: Neo-Dank (default), Light, Goblin

## 🏗️ Architecture

```
dankdraw/
├── apps/
│   ├── client/        # Vite + React 18 + TypeScript + Tailwind + Zustand
│   └── server/        # Fastify + Socket.IO + TypeScript
├── packages/
│   └── shared/        # Zod schemas, types, word list, constants — used by both
├── legacy/            # The original 2024 GGJ build, archived for reference
└── pnpm-workspace.yaml
```

The state machine: `lobby → wordChoice → drawing → roundEnd → (loop) → gameEnd → lobby`.
All transitions are owned by the server; the client renders whatever phase the server reports.

## 🚀 Getting started

### Prerequisites
- **Node 20+**
- **pnpm 9+** — install with `npm i -g pnpm`

### Install + run (dev)
```bash
pnpm install
pnpm dev
```

This runs the server on **http://localhost:3000** and the Vite dev client on **http://localhost:5173**. Open the client URL — Vite proxies `/socket.io` and `/api` to the server.

### Production build
```bash
pnpm build
pnpm start
```
The server now serves the built client from a single port. Visit **http://localhost:3000**.

### Type-check / lint / format
```bash
pnpm typecheck
pnpm format
```

## ☁️ Deploy

> **Heads-up:** Vercel and other "serverless-only" hosts do **not** work for
> DankDraw — the Socket.IO server holds room state in memory and needs a real,
> long-lived Node process with persistent WebSockets. Pick a host that runs a
> real container (Render, Fly, Railway, your own VPS).

### Render.com (no credit card required)

A `render.yaml` blueprint is checked in. Steps:

1. Push the repo to GitHub (already there if you cloned this).
2. Go to https://render.com → **New** → **Blueprint** → connect the repo.
3. Render reads `render.yaml`, provisions a free web service, builds the
   Dockerfile, and gives you a URL like `https://dankdraw.onrender.com`.

Free-tier caveat: the service sleeps after ~15 min idle (first reconnect
takes ~30 s to wake). Upgrade to Starter ($7/mo) for always-on. Render's
proxy forwards WebSocket upgrades correctly out of the box.

### Fly.io

A `Dockerfile` + `fly.toml` are checked in. **Note:** Fly removed their
no-card-required free tier in late 2024 — you'll need to add a payment
method, but you won't actually be charged unless you exceed the free
allowances (which one small app comfortably stays under).

```bash
fly apps create <unique-name> --org personal
# edit fly.toml: app = "<unique-name>"
fly deploy
```

(`fly launch --copy-config` has a CLI quirk where it ignores the region;
`fly apps create` + `fly deploy` is the reliable path.)

The config:
- Sleeps the machine to zero when idle (free-tier friendly)
- Health-checks `/api/health` every 30 s
- Caps each machine at ~250 concurrent connections so Socket.IO sticky-session
  problems never come up — one room = one machine

To scale up later: `fly scale memory 512` / `fly scale count 2 --max-per-region 2`
(beyond one machine you'd want to add the Socket.IO Redis adapter).

### Plain Docker
```bash
docker build -t dankdraw .
docker run -p 3000:3000 dankdraw
```

### Render / Railway / VPS
Anything that runs the Dockerfile works. Expose port 3000, point traffic at it,
make sure the proxy forwards WebSocket upgrades.

## 🎮 How to play

1. Pick a name + avatar + color on the landing page.
2. **Create** a room (you become host) or **Join** with a 6-character code.
3. Host configures: # of rounds, draw time, max players, mode, custom words, hints, public/private.
4. Hit **Start**. Each round one player is the drawer; they pick 1 of 3 words and have the timer to draw.
5. Everyone else types guesses in chat. Faster + harder = more points. First guess gets a bonus.
6. After all rounds, the podium shows up with confetti.

### Keyboard shortcuts (drawer only)

| Key | Action |
|---|---|
| `B` | Pen |
| `M` | Marker |
| `E` | Eraser |
| `F` | Fill bucket |
| `[` / `]` | Decrease / increase brush size |
| `Ctrl+Z` | Undo |

## 🛣️ Roadmap

- [x] **Phase 0** — monorepo + foundation
- [x] **Phase 1** — fully playable end-to-end game
- [ ] **Phase 2** — cursor presence, emote reactions, sticker drop, replay scrubber, profanity filter, sound/music settings
- [ ] **Phase 3** — Teams mode, Sketch Telephone (Gartic-style), Daily Doodle + persistent leaderboard, achievements
- [ ] **Phase 4** — Spectator mode, AI guess-bot, Discord OAuth, replay sharing, seasonal themes

## 👥 Original team (GGJ 2024)

DankDraw.io was originally made by:

- [@OneAutumnLeef](https://github.com/OneAutumnLeef) (Deraj)
- [@Sharankarthick](https://github.com/Sharankarthick) (Sharan Karthick)
- [@SHAN2004-IIIT](https://github.com/SHAN2004-IIIT) (Shanmathe SA)
- [@MaithreyanM05](https://github.com/MaithreyanM05) (Maithreyan M)
- [@YashwanthS-7](https://github.com/YashwanthS-7) (Yashwanth S)

Heavily inspired by [skribbl.io](https://skribbl.io/).

## 📄 License

MIT — go nuts.
