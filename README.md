<div align="center">

# 🔥💧 Fireboy & Watergirl — Multiplayer

**A real-time co-op browser game built with React, WebSockets, and TypeScript.**

[![Live Demo](https://img.shields.io/badge/▶%20Play%20Now-Live%20Demo-ff6b35?style=for-the-badge&logoColor=white)](https://fireboy-watergirl-multiplayer--msbro2121.replit.app/)
[![GitHub](https://img.shields.io/badge/GitHub-MridulSharma02-181717?style=for-the-badge&logo=github)](https://github.com/MridulSharma02)

<img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react" />
<img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript" />
<img src="https://img.shields.io/badge/WebSockets-Live%20Sync-00b4d8?style=flat-square" />
<img src="https://img.shields.io/badge/Vite-Build-646CFF?style=flat-square&logo=vite" />

</div>

---

## 🎮 About

This is a browser-based multiplayer remake of the classic **Fireboy & Watergirl** puzzle-platformer. Two players join the same room and control their characters in real time — Fireboy dodges water, Watergirl dodges fire, and both must reach their doors together to complete a level.

No downloads. No accounts. Just share a room code and play.

> 🔗 **[Play it live →](https://fireboy-watergirl-multiplayer--msbro2121.replit.app/)**

---

## ✨ Features

- **Real-time multiplayer** — WebSocket-powered sync keeps both players perfectly in step
- **3 hand-crafted levels** — Forest Temple, Ice Temple, and Fire & Water Temple
- **Deterministic physics** — both clients run the same simulation locally; no lag from server-side game logic
- **Hazard variety** — fire pools, water pools, and deadly green goo that kills anyone
- **Instant rooms** — generate a 4-letter code, share it, and your partner joins in seconds
- **Mobile-friendly controls** — on-screen buttons for touch devices
- **No install needed** — runs entirely in the browser

---

## 🕹️ How to Play

1. Open the [live app](https://fireboy-watergirl-multiplayer--msbro2121.replit.app/)
2. Click **Create Room** — you'll get a room code and become **Fireboy 🔥**
3. Share the code with a friend — they join as **Watergirl 💧**
4. Both of you reach your matching doors to win the level!

| Character | Keys |
|-----------|------|
| 🔥 Fireboy | `←` `↑` `→` Arrow Keys |
| 💧 Watergirl | `A` `W` `D` |

**Rules:**
- 🔥 Fireboy **dies** in water pools
- 💧 Watergirl **dies** in fire pools
- ☠️ Green goo kills **both**
- You must **both** reach your doors at the same time to win

---

## 🏗️ Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + TypeScript + Vite |
| Game Engine | HTML5 Canvas (custom fixed-timestep physics) |
| Multiplayer | Native WebSockets |
| Backend | Node.js + Express |
| Routing | Wouter |
| UI Components | shadcn/ui + Tailwind CSS |
| Hosting | Replit |

---

## 🧠 Architecture

```
┌─────────────────────┐        WebSocket        ┌─────────────────────┐
│   Player 1 Browser  │ ◄──────────────────────► │   Express + WS      │
│   (Fireboy)         │                           │   Server            │
└─────────────────────┘                           │                     │
                                                  │  • Room management  │
┌─────────────────────┐        WebSocket          │  • Input relay      │
│   Player 2 Browser  │ ◄──────────────────────► │  • Event broadcast  │
│   (Watergirl)       │                           └─────────────────────┘
└─────────────────────┘
```

Each client runs the **same deterministic physics simulation** using shared inputs — no server-side game logic, no lag. The server only relays keystrokes and events.

---

## 🚀 Running Locally

```bash
# Clone the repo
git clone https://github.com/MridulSharma02/fireboy-watergirl-multiplayer.git
cd fireboy-watergirl-multiplayer

# Start the backend
cd artifacts/api-server
npm install
npm run dev

# In a separate terminal, start the frontend
cd artifacts/fireboy-watergirl
npm install
npm run dev
```

Then open `http://localhost:5173` in two browser tabs to play solo, or share your local IP with someone on the same network.

---

## 📁 Project Structure

```
├── artifacts/
│   ├── fireboy-watergirl/       # React frontend
│   │   └── src/
│   │       ├── components/
│   │       │   └── game-board.tsx   # Canvas game engine
│   │       ├── lib/
│   │       │   ├── levels.ts        # Level definitions
│   │       │   └── use-game-socket.ts # WebSocket hook
│   │       └── pages/
│   │           ├── lobby.tsx        # Room create/join
│   │           └── room.tsx         # Game room UI
│   └── api-server/              # Express + WebSocket backend
│       └── src/
│           └── lib/
│               ├── rooms.ts         # Room state management
│               └── gameServer.ts    # WebSocket handler
```

---

## 🗺️ Levels

| # | Name | Hazards |
|---|------|---------|
| 1 | Forest Temple | Fire & Water pools |
| 2 | Ice Temple | Fire, Water & Green goo |
| 3 | Fire & Water Temple | All hazards, elevated goo platforms |

---

## 🙌 Credits

Built by [Mridul Sharma](https://github.com/MridulSharma02) — inspired by the original Flash game by Oslo Albet.

---

<div align="center">
  <strong>🔥 + 💧 = 🏆</strong><br/>
  <sub>Made with React, WebSockets, and a love for classic co-op games</sub>
</div>
