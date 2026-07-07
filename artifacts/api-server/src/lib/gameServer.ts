import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage, Server } from "http";
import { logger } from "./logger";
import { createRoom, getRoom, connectedCount, type PlayerRole } from "./rooms";

// ── Validated message shapes ─────────────────────────────────────────────────

interface JoinMessage {
  type: "join";
  roomCode: string;
  role: PlayerRole;
}

interface InputMessage {
  type: "input";
  keys: { left: boolean; right: boolean; up: boolean };
}

interface GameEventMessage {
  type: "gameEvent";
  event: "died" | "won" | "restart" | "levelComplete";
}

interface PingMessage {
  type: "ping";
}

// ── Validation helpers ───────────────────────────────────────────────────────

const VALID_ROLES: Set<string> = new Set(["fireboy", "watergirl"]);
const VALID_GAME_EVENTS: Set<string> = new Set(["died", "won", "restart", "levelComplete"]);

function parseMessage(
  raw: string
): JoinMessage | InputMessage | GameEventMessage | PingMessage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const msg = parsed as Record<string, unknown>;

  if (typeof msg.type !== "string") return null;

  switch (msg.type) {
    case "ping":
      return { type: "ping" };

    case "join": {
      if (typeof msg.roomCode !== "string" || !VALID_ROLES.has(msg.role as string)) {
        return null;
      }
      const code = (msg.roomCode as string).toUpperCase().trim();
      if (!/^[A-Z2-9]{4}$/.test(code)) return null;
      return { type: "join", roomCode: code, role: msg.role as PlayerRole };
    }

    case "input": {
      const keys = msg.keys;
      if (
        typeof keys !== "object" ||
        keys === null ||
        typeof (keys as Record<string, unknown>).left !== "boolean" ||
        typeof (keys as Record<string, unknown>).right !== "boolean" ||
        typeof (keys as Record<string, unknown>).up !== "boolean"
      ) {
        return null;
      }
      return {
        type: "input",
        keys: {
          left: (keys as Record<string, boolean>).left,
          right: (keys as Record<string, boolean>).right,
          up: (keys as Record<string, boolean>).up,
        },
      };
    }

    case "gameEvent": {
      if (!VALID_GAME_EVENTS.has(msg.event as string)) return null;
      return { type: "gameEvent", event: msg.event as GameEventMessage["event"] };
    }

    default:
      return null;
  }
}

// ── Send helpers ─────────────────────────────────────────────────────────────

function safeSend(ws: WebSocket, data: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function broadcastToRoom(ws1: WebSocket | undefined, ws2: WebSocket | undefined, data: unknown) {
  const msg = JSON.stringify(data);
  if (ws1 && ws1.readyState === WebSocket.OPEN) ws1.send(msg);
  if (ws2 && ws2.readyState === WebSocket.OPEN) ws2.send(msg);
}

// ── WebSocket server ─────────────────────────────────────────────────────────

export function attachWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  logger.info("WebSocket server attached at /ws");

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    logger.info({ url: req.url }, "WebSocket client connected");

    let joinedRoomCode: string | null = null;
    let joinedRole: PlayerRole | null = null;

    ws.on("message", (raw) => {
      const msg = parseMessage(raw.toString());
      if (!msg) {
        // Silently discard malformed messages — don't crash or reply
        return;
      }

      if (msg.type === "ping") {
        safeSend(ws, { type: "pong" });
        return;
      }

      // ── join ──────────────────────────────────────────────────────────────
      if (msg.type === "join") {
        const code = msg.roomCode;
        const room = getRoom(code);

        if (!room) {
          safeSend(ws, { type: "error", message: "Room not found" });
          return;
        }

        // If already connected by this socket, ignore duplicate joins
        if (joinedRoomCode === code && joinedRole === msg.role) return;

        // Check if role is already taken by an *active* player
        const existingPlayer = room.players.get(msg.role);
        if (existingPlayer && existingPlayer.connected) {
          safeSend(ws, { type: "roomFull", message: "Role already taken" });
          return;
        }

        const otherRole: PlayerRole = msg.role === "fireboy" ? "watergirl" : "fireboy";
        const otherPlayer = room.players.get(otherRole);

        joinedRoomCode = code;
        joinedRole = msg.role;

        room.players.set(msg.role, {
          ws,
          role: msg.role,
          keys: { left: false, right: false, up: false },
          connected: true,
        });

        // Only start the game when 2 players with ACTIVE connections are present
        if (connectedCount(room) === 2) {
          room.status = "playing";
        }

        safeSend(ws, {
          type: "joined",
          role: msg.role,
          roomCode: code,
          level: room.level,
          status: room.status,
        });

        // Notify partner if already present
        if (otherPlayer && otherPlayer.connected) {
          safeSend(otherPlayer.ws, { type: "partnerJoined", role: msg.role });
          safeSend(ws, { type: "partnerJoined", role: otherRole });
        }

        logger.info({ code, role: msg.role }, "Player joined room");
        return;
      }

      // All subsequent message types require an active session
      if (!joinedRoomCode || !joinedRole) {
        safeSend(ws, { type: "error", message: "Not in a room. Send join first." });
        return;
      }

      const room = getRoom(joinedRoomCode);
      if (!room) return;

      const otherRole: PlayerRole = joinedRole === "fireboy" ? "watergirl" : "fireboy";
      const otherPlayer = room.players.get(otherRole);

      // ── input ─────────────────────────────────────────────────────────────
      if (msg.type === "input") {
        const thisPlayer = room.players.get(joinedRole);
        if (thisPlayer) {
          thisPlayer.keys = msg.keys;
        }

        const fireboyPlayer = room.players.get("fireboy");
        const watergirlPlayer = room.players.get("watergirl");

        broadcastToRoom(fireboyPlayer?.ws, watergirlPlayer?.ws, {
          type: "inputs",
          fireboy: fireboyPlayer?.keys ?? { left: false, right: false, up: false },
          watergirl: watergirlPlayer?.keys ?? { left: false, right: false, up: false },
        });
        return;
      }

      // ── gameEvent ─────────────────────────────────────────────────────────
      if (msg.type === "gameEvent") {
        if (otherPlayer && otherPlayer.connected) {
          safeSend(otherPlayer.ws, {
            type: "partnerEvent",
            event: msg.event,
            from: joinedRole,
          });
        }

        if (msg.event === "levelComplete") {
          room.status = "completed";
        } else if (msg.event === "restart") {
          room.status = "playing";
        }

        logger.info({ code: joinedRoomCode, role: joinedRole, event: msg.event }, "Game event");
        return;
      }
    });

    ws.on("close", () => {
      if (!joinedRoomCode || !joinedRole) return;

      const room = getRoom(joinedRoomCode);
      if (!room) return;

      const player = room.players.get(joinedRole);
      if (player) {
        player.connected = false;
      }

      const otherRole: PlayerRole = joinedRole === "fireboy" ? "watergirl" : "fireboy";
      const otherPlayer = room.players.get(otherRole);
      if (otherPlayer && otherPlayer.connected) {
        safeSend(otherPlayer.ws, { type: "partnerLeft", role: joinedRole });
      }

      if (room.status === "playing") {
        room.status = "waiting";
      }

      logger.info({ code: joinedRoomCode, role: joinedRole }, "Player disconnected");
    });

    ws.on("error", (err) => {
      logger.error({ err }, "WebSocket client error");
    });
  });

  return wss;
}
