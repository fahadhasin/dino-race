# 🦕 Dino Race

**Your internet connection speed is your dino's speed.**

A real-time multiplayer racing game where your ping, jitter, and bandwidth determine how fast your dinosaur runs. No skill required — just a good connection.

👉 **Play now:** [https://dinorace.tail2d2d73.ts.net](https://dinorace.tail2d2d73.ts.net)

---

## How It Works

Every 2 seconds, each player's browser measures three things:

| Metric | How it's measured | Effect on speed |
|--------|-------------------|-----------------|
| **RTT (ping)** | WebSocket round-trip time | Lower ping = faster dino |
| **Jitter** | Variance between consecutive pings | Unstable connection = slower dino |
| **Mbps** | Downloads a 200 KB payload, measures throughput | Higher bandwidth = small boost |

The velocity formula:

```
velocity = 40 × rttScore × stabilityScore × mbpsScore

rttScore      = 1 / (1 + avgRtt / 60)
stabilityScore = 1 / (1 + jitter / 100)
mbpsScore     = 1 + log10(Mbps + 1) / 7
```

A player on 5 ms ping with stable WiFi finishes in ~23 seconds. A player on 200 ms ping with 80 ms jitter might only cover 33% of the track in the 60-second race.

---

## Features

- **Real-time multiplayer** — up to 6 players per room via WebSockets
- **Room codes** — create a room and share a 6-character code to invite friends
- **Invite links** — share a direct link that pre-fills the room code
- **Live stats overlay** — see everyone's ping, jitter, and Mbps in real time during the race
- **Pixel-art dinos** — each player gets a uniquely named and coloured dino
- **Countdown + 60-second race** — 5-second countdown, then the full race runs regardless of who finishes
- **Results card** — shareable canvas image with final standings and connection stats
- **Share to X / WhatsApp** — one-click sharing with a pre-written challenge message
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
# On your server
npm install --omit=dev
PORT=3456 node server.js
```

To deploy to a Raspberry Pi with a permanent public URL, use the included deploy script (requires SSH access and [Tailscale](https://tailscale.com) Funnel):

```bash
./deploy.sh
```

The script rsyncs the project, installs dependencies, and restarts the systemd service.

---

## Tech Stack

- **Backend:** Node.js, Express, Socket.io
- **Frontend:** Vanilla JS, HTML5 Canvas (zero dependencies, no framework)
- **Hosting:** Raspberry Pi 5 + Tailscale Funnel (permanent HTTPS, free)

---

## Project Structure

```
server.js      — game server (rooms, race tick, velocity cap, results)
index.html     — entire frontend (canvas rendering, ping loop, UI)
deploy.sh      — rsync + systemd deploy script for Raspberry Pi
```
