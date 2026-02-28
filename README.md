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
