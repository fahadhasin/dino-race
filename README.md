# 🦕 Dino Race

**Your internet connection speed is your dino's speed.**

A real-time multiplayer racing game where your latency, stability, and bandwidth determine how fast your dinosaur runs. No skill required — just a good connection.

👉 **Play now:** [https://dinorace.tail2d2d73.ts.net](https://dinorace.tail2d2d73.ts.net)

---

## How It Works

Every 1.5 seconds, each player's browser independently measures three things:

| Metric | How it's measured | Effect on speed |
|--------|-------------------|-----------------|
| **RTT (ping)** | `fetch()` timed to Cloudflare's nearest PoP — real internet latency, no server proximity bias | Lower = faster |
| **Jitter** | Standard deviation of the last 10 RTT samples | High variance = penalised |
| **Mbps** | 1 MB download from Cloudflare, timed | Logarithmic boost on top |

The velocity formula uses sigmoid curves (diminishing returns — each improvement matters more at the low end):

```
velocity = 45 × rttScore × stabilityScore × mbpsScore

rttScore       = 1 / (1 + avgRtt / 40)       — half-speed at 40 ms
stabilityScore = 1 / (1 + jitter / 20)        — half-speed at 20 ms jitter
mbpsScore      = 1 + log10(Mbps + 1) / 7      — 10M→+15%, 100M→+29%, 1G→+43%
```

**Example race outcomes:**

| Connection | RTT | Jitter | Mbps | Velocity | Result |
|------------|-----|--------|------|----------|--------|
| Fibre | 12 ms | 4 ms | 500 | ~36 | Finishes in ~28 s |
| Good WiFi | 20 ms | 6 ms | 100 | ~27 | Finishes in ~37 s |
| Avg broadband | 35 ms | 10 ms | 30 | ~18 | Finishes in ~56 s |
| Mobile 4G | 50 ms | 18 ms | 15 | ~11 | Covers ~66% |
| Poor/satellite | 80 ms | 35 ms | 5 | ~5 | Covers ~30% |

---

## Features

- **Real-time multiplayer** — up to 6 players per room via WebSockets
- **Room codes** — create a room and share a 6-character code to invite friends
- **Invite links** — share a direct link that pre-fills the room code
- **Live stats overlay** — see everyone's RTT, jitter, and Mbps in real time during the race
- **Pixel-art dinos** — each player gets a uniquely named and coloured dino; dino freezes at finish line
- **60-second race** — ends at 60 s, or immediately if all players cross the finish line
- **Shareable result card** — canvas image with final standings and connection stats for each player
- **Share to X / WhatsApp** — one-click sharing with a challenge message and invite link
- **Organizer system** — room creator controls the start; role transfers automatically if they leave

---

## Running Locally

**Requirements:** Node.js 18+

```bash
git clone https://github.com/fahadhasin/dino-race
cd dino-race
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000) in two browser tabs to test with two players.

---

## Self-Hosting

The server is a single Express + Socket.io process with no database. It runs comfortably on a Raspberry Pi.

```bash
npm install --omit=dev
PORT=3456 node server.js
```

To deploy to a Raspberry Pi with a permanent public HTTPS URL, use the included deploy script (requires SSH access and [Tailscale](https://tailscale.com) Funnel):

```bash
./deploy.sh
```

The script rsyncs the project, installs dependencies, and restarts the systemd service. The Tailscale Funnel gives a stable `*.ts.net` URL that survives reboots — free for personal use, no domain needed.

---

## Tech Stack

- **Backend:** Node.js, Express, Socket.io
- **Frontend:** Vanilla JS, HTML5 Canvas (zero framework dependencies)
- **Speed measurement:** Cloudflare CDN (`speed.cloudflare.com`) — independent of game server location
- **Hosting:** Raspberry Pi 5 + Tailscale Funnel (permanent HTTPS, free)

---

## Project Structure

```
server.js      — game server (rooms, race tick, position broadcasting, results)
index.html     — entire frontend (canvas rendering, CDN RTT loop, UI)
deploy.sh      — rsync + systemd deploy script for Raspberry Pi
```
