import { WebSocket } from "ws";

export type PlayerRole = "fireboy" | "watergirl";
export type RoomStatus = "waiting" | "playing" | "completed";

export interface Player {
  ws: WebSocket;
  role: PlayerRole;
  keys: { left: boolean; right: boolean; up: boolean };
  connected: boolean;
}

export interface Room {
  code: string;
  players: Map<PlayerRole, Player>;
  status: RoomStatus;
  level: number;
  createdAt: Date;
}

const rooms = new Map<string, Room>();

const MAX_ROOMS = 500;
const ROOM_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function createRoom(level: number): Room | null {
  if (rooms.size >= MAX_ROOMS) {
    // Evict oldest room before creating new one
    const oldest = [...rooms.entries()].sort(
      (a, b) => a[1].createdAt.getTime() - b[1].createdAt.getTime()
    )[0];
    if (oldest) rooms.delete(oldest[0]);
  }

  let code: string;
  let attempts = 0;
  do {
    code = generateCode();
    attempts++;
    if (attempts > 100) return null; // safety exit
  } while (rooms.has(code));

  const room: Room = {
    code,
    players: new Map(),
    status: "waiting",
    level,
    createdAt: new Date(),
  };

  rooms.set(code, room);

  // Auto-cleanup after TTL
  setTimeout(() => {
    rooms.delete(code);
  }, ROOM_TTL_MS);

  return room;
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code.toUpperCase());
}

export function connectedCount(room: Room): number {
  return [...room.players.values()].filter((p) => p.connected).length;
}

export function getRoomInfo(code: string) {
  const room = getRoom(code);
  if (!room) return null;
  return {
    code: room.code,
    playerCount: connectedCount(room),
    status: room.status,
    level: room.level,
    createdAt: room.createdAt.toISOString(),
  };
}
