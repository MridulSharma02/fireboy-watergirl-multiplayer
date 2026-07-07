import { Router } from "express";
import { CreateRoomBody, GetRoomParams } from "@workspace/api-zod";
import { createRoom, getRoomInfo } from "../lib/rooms";

const router = Router();

router.post("/rooms", (req, res) => {
  const parsed = CreateRoomBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const room = createRoom(parsed.data.level);
  if (!room) {
    res.status(503).json({ error: "Server at capacity. Please try again shortly." });
    return;
  }

  res.status(201).json({
    code: room.code,
    playerCount: 0,
    status: room.status,
    level: room.level,
    createdAt: room.createdAt.toISOString(),
  });
});

router.get("/rooms/:code", (req, res) => {
  const parsed = GetRoomParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid room code" });
    return;
  }

  const info = getRoomInfo(parsed.data.code);
  if (!info) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  res.json(info);
});

export default router;
