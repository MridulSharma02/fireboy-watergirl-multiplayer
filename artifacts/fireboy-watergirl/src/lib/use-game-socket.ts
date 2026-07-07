import { useEffect, useRef, useState } from "react";

export type Role = "fireboy" | "watergirl";

export type Inputs = {
  left: boolean;
  right: boolean;
  up: boolean;
};

export type GameEvent = "died" | "won" | "levelComplete" | "restart";

interface WsJoinMessage {
  type: "join";
  roomCode: string;
  role: Role;
}

interface WsInputMessage {
  type: "input";
  keys: Inputs;
}

interface WsEventMessage {
  type: "gameEvent";
  event: GameEvent;
}

interface WsPingMessage {
  type: "ping";
}

type ClientMessage = WsJoinMessage | WsInputMessage | WsEventMessage | WsPingMessage;

export interface ServerInputs {
  fireboy: Inputs;
  watergirl: Inputs;
}

interface ServerJoinedMessage {
  type: "joined";
  role: Role;
  roomCode: string;
  level: number;
  status: string;
}

interface ServerPartnerJoinedMessage {
  type: "partnerJoined";
  role: string;
}

interface ServerPartnerLeftMessage {
  type: "partnerLeft";
  role: string;
}

interface ServerInputsMessage {
  type: "inputs";
  fireboy: Inputs;
  watergirl: Inputs;
}

interface ServerPartnerEventMessage {
  type: "partnerEvent";
  event: GameEvent;
  from: string;
}

interface ServerPongMessage {
  type: "pong";
}

interface ServerErrorMessage {
  type: "error";
  message: string;
}

interface ServerRoomFullMessage {
  type: "roomFull";
  message: string;
}

type ServerMessage = 
  | ServerJoinedMessage 
  | ServerPartnerJoinedMessage 
  | ServerPartnerLeftMessage 
  | ServerInputsMessage 
  | ServerPartnerEventMessage 
  | ServerPongMessage 
  | ServerErrorMessage 
  | ServerRoomFullMessage;

type GameStatus = "connecting" | "waiting" | "playing" | "disconnected" | "error";

export function useGameSocket(roomCode: string, initialRole: Role) {
  const [status, setStatus] = useState<GameStatus>("connecting");
  const [role, setRole] = useState<Role>(initialRole);
  const [level, setLevel] = useState<number>(1);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [partnerEvent, setPartnerEvent] = useState<GameEvent | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<number | null>(null);

  // We expose a ref to inputs so the game loop can read them synchronously
  const latestInputsRef = useRef<ServerInputs>({
    fireboy: { left: false, right: false, up: false },
    watergirl: { left: false, right: false, up: false }
  });

  useEffect(() => {
    if (!roomCode) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = protocol + '//' + window.location.host + '/ws';
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: "join",
        roomCode,
        role: initialRole
      } as WsJoinMessage));

      // Setup ping every 30s
      pingIntervalRef.current = window.setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 30000);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as ServerMessage;
        switch (msg.type) {
          case "joined":
            setRole(msg.role);
            setLevel(msg.level);
            setStatus(msg.status === "playing" ? "playing" : "waiting");
            break;
          case "partnerJoined":
            setStatus("playing");
            break;
          case "partnerLeft":
            setStatus("disconnected");
            break;
          case "inputs":
            latestInputsRef.current.fireboy = msg.fireboy;
            latestInputsRef.current.watergirl = msg.watergirl;
            break;
          case "partnerEvent":
            setPartnerEvent(msg.event);
            break;
          case "error":
            setStatus("error");
            setErrorMsg(msg.message);
            break;
          case "roomFull":
            setStatus("error");
            setErrorMsg(msg.message || "Room is full");
            break;
        }
      } catch (err) {
        console.error("Failed to parse WS message", err);
      }
    };

    ws.onclose = () => {
      if (status !== "error") {
        setStatus("disconnected");
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
    };

    return () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      ws.close();
    };
  }, [roomCode, initialRole]);

  const sendInput = (keys: Inputs) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "input", keys }));
    }
  };

  const sendGameEvent = (event: GameEvent) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "gameEvent", event }));
    }
  };

  const clearPartnerEvent = () => setPartnerEvent(null);

  return {
    status,
    role,
    level,
    errorMsg,
    latestInputsRef,
    partnerEvent,
    sendInput,
    sendGameEvent,
    clearPartnerEvent
  };
}
