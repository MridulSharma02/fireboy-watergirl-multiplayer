# Fireboy & Watergirl Multiplayer

A browser-based multiplayer co-op game where two players on separate computers play Fireboy & Watergirl together in real time over WebSockets.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API + WebSocket server (port 8080, routed at `/api` and `/ws`)
- `pnpm --filter @workspace/fireboy-watergirl run dev` — run the frontend (Vite, routed at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind + framer-motion + wouter
- Game engine: HTML5 Canvas 2D (procedurally drawn — no image assets)
- Multiplayer: WebSockets (`ws` package) on the Express server
- API: Express 5
- DB: PostgreSQL + Drizzle ORM (provisioned but not yet used — rooms are in-memory)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)

## Where things live

- `artifacts/fireboy-watergirl/src/pages/lobby.tsx` — Create/Join room landing page
- `artifacts/fireboy-watergirl/src/pages/room.tsx` — Waiting screen + game overlays
- `artifacts/fireboy-watergirl/src/components/game-board.tsx` — Canvas game engine, physics, rendering
- `artifacts/fireboy-watergirl/src/lib/use-game-socket.ts` — WebSocket hook (join, inputs, events)
- `artifacts/fireboy-watergirl/src/lib/levels.ts` — Level data (3 levels)
- `artifacts/api-server/src/lib/gameServer.ts` — WebSocket server: room relay, input broadcast
- `artifacts/api-server/src/lib/rooms.ts` — In-memory room store (max 500 rooms, 2-hr TTL)
- `artifacts/api-server/src/routes/rooms.ts` — REST: POST /rooms, GET /rooms/:code
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for REST API)

## Architecture decisions

- **Input relay model**: Server relays each player's key state to both clients; each client runs identical deterministic physics for both characters. Avoids server-side game simulation complexity.
- **In-memory room store**: Rooms are held in memory (Map) with a 500-room cap and 2-hour TTL auto-eviction. No DB needed for a casual game — no persistence between server restarts.
- **`restartKey` pattern**: GameBoard is force-remounted on restart by incrementing a React key, cleanly resetting all physics refs without complex state management.
- **WS message validation**: All incoming WebSocket payloads are strictly validated before processing — malformed messages are silently dropped (no crash risk).
- **Room occupancy from connected count**: `playerCount` and "playing" status are derived from `connected === true` players only, preventing stale disconnected entries from affecting room state.
- **`/ws` in artifact.toml paths**: Required for the Replit proxy to forward WebSocket upgrade requests to the API server.

## Product

- Lobby: player 1 creates a room (chooses level 1–3), gets a 4-letter code
- Share the code with player 2 who joins as Watergirl
- Waiting screen shows the code and controls until partner connects
- Game canvas: Fireboy (arrow keys) and Watergirl (WASD) cooperate to reach their colored doors simultaneously
- Hazards: fire pools kill Watergirl, water pools kill Fireboy, green pools kill both
- 3 levels: Forest Temple, Ice Temple, Fire & Water Temple
- Mobile touch controls available as on-screen overlay buttons

## User preferences

_Populate as you build._

## Gotchas

- After any OpenAPI spec change, run `pnpm --filter @workspace/api-spec run codegen` before touching the frontend or server route imports.
- Do not call `configureWorkflow` for artifact services — they have managed workflows already.
- `/ws` must stay in `artifacts/api-server/.replit-artifact/artifact.toml` paths array or WebSocket connections are silently dropped by the proxy.
