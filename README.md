# 🎨 DankDraw.io

> Multiplayer pictionary, but extra dank. Originally a 2024 Global Game Jam project — fully renovated in v2 with a state-of-the-art stack and a brand-new "Neo-Dank" feel.

![hero](https://img.shields.io/badge/v2.3-Neo--Dank-FF6BD6) ![stack](https://img.shields.io/badge/stack-React%20%2B%20Fastify%20%2B%20Socket.IO-7CC4FF)

## ✨ Features

- 🏠 **Rooms with shareable codes** — public + private, host configures everything
- 🎨 **Smooth pressure-sensitive drawing** — pen, marker, eraser, fill bucket; undo, clear, custom colors, mobile/touch/stylus parity
- 🎯 **Server-authoritative game state** — drawer never leaks the word; guesses validated server-side; "you're close!" hints for near-misses
- 🧠 **3-word selection** — drawer picks easy / medium / hard, harder words score more
- 🔡 **Progressive hint reveal** — letters unmask over time
- 🏆 **Time-weighted scoring** — fast guesses + first-to-guess bonuses; drawer also scores
- 🎮 **5 modes** — Classic, Telephone (Gartic-style chains), Speedrun, Teams (red vs blue), Custom Words
- 💬 **Sanitized chat with images** — XSS-proof, profanity-masked, spoiler-blocking for the drawer, paperclip image upload, typing indicators
- 👀 **Live cursor presence** + 🔥 floating emote reactions on the canvas
- ⏪ **Round replay scrubber** at the scoreboard
- 🏆 **Persistent leaderboard + 10 achievements** stored in SQLite, top-5 widget on the landing page
- 🥇 **Animated podium + confetti** at game end
- 📱 **Fully responsive** — playable on phones in portrait
- ♿ **Accessibility** — keyboard shortcuts, reduced-motion support, ARIA labels
- 🎨 **3 themes** baked in: Neo-Dank (default), Light, Goblin
- 📡 **In-app round-trip indicator** (coloured `RTT` chip in the room header)

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

> **Heads-up:** Vercel, Netlify, Cloudflare Workers, Deno Deploy and other
> "serverless-only" hosts do **not** work for DankDraw — the Socket.IO server
> holds room state in memory and needs a real, long-lived Node process with
> persistent WebSockets. Pick a host that runs a real container.

### TL;DR — pick by your situation

| Goal | Best option |
|---|---|
| Play with friends *right now*, no signup, lowest latency | **`pnpm share`** (Cloudflare Tunnel / localtunnel — see below) |
| Free forever, low latency in India | **Oracle Cloud Always Free** (Mumbai region) |
| Cheap-but-not-free, painless deploy | **Fly.io** (~$3/mo for always-on) or **Render Starter** ($7/mo) |
| Free, accept the latency, no card | **Render free tier** (Oregon — works but laggy from Asia) |
| You already have a beefy home PC | **Cloudflare Tunnel** + run `pnpm start` locally |

### Quick share via tunnel — `pnpm share`

The fastest path to a public URL with zero cloud signup. Runs the production
build on your machine and exposes it via a free tunnel. Your PC has to stay
on, but latency is fantastic for nearby players and there's no card or quota.

```bash
pnpm install      # one-time, if you haven't already
pnpm share        # builds, starts, and prints a public https URL
```

That's it — share the printed URL with friends. Internally it uses
[localtunnel](https://github.com/localtunnel/localtunnel) (free, no signup).
Press Ctrl+C to stop.

**Other tunnel options** (all free, all support WebSockets):

| Tool | Command | Persistent URL? | Auth needed? |
|---|---|---|---|
| **Cloudflare Tunnel** | `cloudflared tunnel --url http://localhost:3000` | random by default; named tunnels are free | no |
| **localtunnel** | `npx localtunnel --port 3000 --subdomain dankdraw` | requested subdomain if available | no |
| **Tailscale Funnel** | `tailscale funnel 3000` | yes (your-machine.ts.net) | Tailscale account (free for 100 devices) |
| **playit.gg** | install agent, expose port 3000 | yes (free subdomain) | playit account |
| **Serveo** (SSH) | `ssh -R 80:localhost:3000 serveo.net` | random | no |

### Container hosts (managed)

| Host | Free tier? | Closest region (free) | RTT from Mumbai | Card to sign up? |
|---|---|---|---|---|
| **Render** | yes, sleeps after 15 min | Oregon only | ~270 ms | no |
| **Fly.io** | yes (small allowances) | any (Mumbai available) | ~10-30 ms (bom) | **yes** |
| **Koyeb** | yes, 1 service, sleeps | Frankfurt | ~110 ms | yes (verification) |
| **Northflank** | yes, 1 workload | Frankfurt or Iowa | ~110 / 220 ms | yes (verification) |
| **Zeabur** | yes, with caveats | Tokyo / Singapore | ~80-110 ms | phone verification |
| **Railway** | $5 trial credit | global | varies | yes |
| **Glitch** | yes, sleeps after 5 min | US | ~300 ms | no |

### VPS / VM free tiers (forever-free or 12-month)

| Host | Free tier | Mumbai region? | Card? | Notes |
|---|---|---|---|---|
| **Oracle Cloud** | ⭐ **Always Free** (perpetual) | ✅ `ap-mumbai-1` | yes (verification only) | 4-core ARM Ampere + 24 GB RAM. Best free option for low-latency in India. Setup: ~30 min. |
| **Google Cloud** | e2-micro Always Free | ❌ us-west1 / -central1 / -east1 only | yes (verification) | 1 GB / 0.25 vCPU. Works but no Asian region on free. |
| **AWS** | t2.micro / t3.micro 12 months | ✅ `ap-south-1` | yes | Goes paid after 12 months. |
| **Azure** | B1S 12 months | ✅ Central India | yes | Same — 12 months only. |

**Oracle Cloud Always Free quickstart** (the recommended forever-free path
if you're in India):

```bash
# After you've SSH'd into your fresh Mumbai VM:
sudo apt-get update && sudo apt-get install -y docker.io git
sudo systemctl enable --now docker
git clone https://github.com/OneAutumnLeef/DankDraw.io.git
cd DankDraw.io
sudo docker build -t dankdraw .
sudo docker run -d --restart unless-stopped \
  -p 80:3000 -v dankdraw-data:/app/data --name dankdraw dankdraw
```

Open Oracle's "ingress" rule for port 80 and visit the public IP. For HTTPS,
point a free [DuckDNS](https://duckdns.org) subdomain at it and put
[Caddy](https://caddyserver.com/) in front.

There's a pre-baked `cloud-init.yaml` in the repo — paste it during VM
creation and the box comes up with the container already running.

### Render.com (no credit card required)

`render.yaml` is checked in. Push to GitHub → Render → **New > Blueprint** →
pick the repo. Render builds the Dockerfile and gives you a `*.onrender.com`
URL. Free tier sleeps after 15 min idle (~30 s wake) and is region-locked to
Oregon. The in-room header has a coloured `RTT` chip — if it shows red,
you're feeling the Pacific cable, not a code bug. Move closer (above) for
real-time drawing.

### Fly.io (~$3/mo for always-on, or stop the machine to pay nothing)

`Dockerfile` + `fly.toml` are checked in. Fly dropped their no-card free
tier in late 2024, so you'll need to add a payment method during signup —
but with `auto_stop_machines = "stop"` the machine sleeps when idle and
charges for very little.

```bash
fly apps create <unique-name> --org personal
# edit fly.toml: app = "<unique-name>"
fly deploy
```

(`fly launch --copy-config` has a CLI quirk where it ignores the region;
`fly apps create` + `fly deploy` is the reliable path.) Already configured
for `bom` (Mumbai) — change `primary_region` in `fly.toml` if you want
elsewhere.

To scale beyond one machine: `fly scale count 2 --max-per-region 2` — at
that point you'd want the Socket.IO Redis adapter so rooms aren't pinned
to a single VM.

### Plain Docker (anywhere)
```bash
docker build -t dankdraw .
docker run -p 3000:3000 -v dankdraw-data:/app/data dankdraw
```
Works on any VPS or self-hosted box. Mount `/app/data` to persist the
SQLite leaderboard + achievements across restarts.

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
- [x] **Phase 2** — cursor presence, emote reactions, image-in-chat, replay scrubber, profanity filter, sound/music settings
- [x] **Phase 3** — Teams mode, persistent leaderboard, 10 achievements, lifetime stats
- [x] **Phase 4** — Sketch Telephone (Gartic-style chains)
- [ ] **Phase 5** — Daily Doodle, spectator mode, AI guess-bot, Discord OAuth, replay sharing, seasonal themes

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
