# 🦕 Dino Race

Multiplayer racing game where your internet connection is your dino's speed. Better ping, lower jitter, faster download — faster dino.

👉 **Play:** [https://dinorace.tail2d2d73.ts.net](https://dinorace.tail2d2d73.ts.net)

---

## How speed is calculated

Every 1.5 seconds your browser measures three things against Cloudflare's nearest server — independent of where the game is hosted:

| Factor | What it captures | Weight |
|--------|-----------------|--------|
| **RTT** | Round-trip latency to internet | Largest |
| **Jitter** | Stability — how much RTT varies | Medium |
| **Mbps** | Download speed | Logarithmic boost |

All three use diminishing returns: halving your latency matters more if you're already fast.

```
velocity = 45 × rttScore × stabilityScore × mbpsScore

rttScore       = 1 / (1 + avgRtt / 40)     — half-speed at 40 ms RTT
stabilityScore = 1 / (1 + jitter / 20)      — half-speed at 20 ms jitter
mbpsScore      = 1 + log10(Mbps + 1) / 7   — 10 Mbps→+15%, 100 Mbps→+29%, 1 Gbps→+43%
```

---

## Running locally

```bash
git clone https://github.com/fahadhasin/dino-race
cd dino-race
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000) in two tabs to test.

---

## Self-hosting

Runs on anything with Node.js 18+. Hosted here on a Raspberry Pi 5 with [Tailscale Funnel](https://tailscale.com/kb/1223/funnel) for a free permanent HTTPS URL.

```bash
npm install --omit=dev
PORT=3456 node server.js
```
