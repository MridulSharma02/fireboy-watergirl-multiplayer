import { useEffect, useRef, useState, useCallback } from "react";
import { levels } from "@/lib/levels";
import { ServerInputs, Inputs } from "@/lib/use-game-socket";

const GRAVITY = 0.55;
const MOVE_SPEED = 3.8;
const JUMP_VELOCITY = -12.5;
const CHARACTER_W = 26;
const CHARACTER_H = 36;
const MAX_FALL = 16;

type Pos = { x: number; y: number };
type Velocity = { vx: number; vy: number };
type CharacterState = {
  pos: Pos;
  vel: Velocity;
  alive: boolean;
  atDoor: boolean;
};

interface GameBoardProps {
  levelId: number;
  role: "fireboy" | "watergirl";
  latestInputsRef: React.MutableRefObject<ServerInputs>;
  onEvent: (event: "died" | "won" | "levelComplete") => void;
  onLocalInput: (inputs: Inputs) => void;
}

export default function GameBoard({ levelId, role, latestInputsRef, onEvent, onLocalInput }: GameBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const levelData = levels.find((l) => l.levelId === levelId) || levels[0];
  
  // Game state held in refs to avoid React re-renders
  const gameStateRef = useRef({
    fireboy: {
      pos: { ...levelData.fbSpawn },
      vel: { vx: 0, vy: 0 },
      alive: true,
      atDoor: false
    } as CharacterState,
    watergirl: {
      pos: { ...levelData.wgSpawn },
      vel: { vx: 0, vy: 0 },
      alive: true,
      atDoor: false
    } as CharacterState,
    eventFired: false
  });

  const localInputsRef = useRef<Inputs>({ left: false, right: false, up: false });

  // AABB collision helper
  const rectIntersect = (r1: {x:number, y:number, w:number, h:number}, r2: {x:number, y:number, w:number, h:number}) => {
    return r1.x < r2.x + r2.w && r1.x + r1.w > r2.x &&
           r1.y < r2.y + r2.h && r1.y + r1.h > r2.y;
  };

  const resolveCollision = (charState: CharacterState, charW: number, charH: number, platforms: any[]) => {
    const { pos, vel } = charState;
    // Simple 1D resolution: check X axis, then Y axis independently
    // This requires separating the movement step, but for this simplified engine we'll do basic push out.
    // A better approach: step X, resolve. Step Y, resolve.
    // For now, we assume this is called *after* X and Y are applied.
    
    // Instead, let's just do floor collision to prevent falling through, and basic wall pushing.
    let onGround = false;
    
    // Y resolution
    for (let p of platforms) {
      if (rectIntersect({x: pos.x, y: pos.y, w: charW, h: charH}, p)) {
        // Did we hit from top?
        if (vel.vy > 0 && pos.y + charH - vel.vy <= p.y + 2) {
          pos.y = p.y - charH;
          vel.vy = 0;
          onGround = true;
        }
        // Did we hit from bottom?
        else if (vel.vy < 0 && pos.y - vel.vy >= p.y + p.h - 2) {
          pos.y = p.y + p.h;
          vel.vy = 0;
        }
        // Wall hit from left?
        else if (vel.vx > 0 && pos.x + charW - vel.vx <= p.x + 2) {
          pos.x = p.x - charW;
          vel.vx = 0;
        }
        // Wall hit from right?
        else if (vel.vx < 0 && pos.x - vel.vx >= p.x + p.w - 2) {
          pos.x = p.x + p.w;
          vel.vx = 0;
        }
      }
    }
    
    return onGround;
  };

  const checkHazards = (charState: CharacterState, charType: "fireboy"|"watergirl", level: typeof levelData) => {
    const charRect = { x: charState.pos.x, y: charState.pos.y, w: CHARACTER_W, h: CHARACTER_H };
    
    // Fire pools kill watergirl
    if (charType === "watergirl") {
      for (let p of level.firePools) {
        if (rectIntersect(charRect, p)) charState.alive = false;
      }
    }
    // Water pools kill fireboy
    if (charType === "fireboy") {
      for (let p of level.waterPools) {
        if (rectIntersect(charRect, p)) charState.alive = false;
      }
    }
    // Green pools kill both
    for (let p of level.greenPools) {
      if (rectIntersect(charRect, p)) charState.alive = false;
    }
  };

  const updateCharacter = (
    charState: CharacterState,
    inputs: Inputs,
    type: "fireboy"|"watergirl",
    level: typeof levelData
  ) => {
    if (!charState.alive) return;

    // Apply horizontal velocity
    charState.vel.vx = 0;
    if (inputs.left) charState.vel.vx = -MOVE_SPEED;
    if (inputs.right) charState.vel.vx = MOVE_SPEED;

    // Apply gravity
    charState.vel.vy += GRAVITY;
    if (charState.vel.vy > MAX_FALL) charState.vel.vy = MAX_FALL;

    // Move X
    charState.pos.x += charState.vel.vx;
    // Resolve X
    resolveCollision(charState, CHARACTER_W, CHARACTER_H, level.platforms);

    // Move Y
    charState.pos.y += charState.vel.vy;
    // Resolve Y
    const onGround = resolveCollision(charState, CHARACTER_W, CHARACTER_H, level.platforms);

    // Jump
    if (inputs.up && onGround) {
      charState.vel.vy = JUMP_VELOCITY;
    }

    // Check hazards
    checkHazards(charState, type, level);

    // Check door
    const door = type === "fireboy" ? level.fbDoor : level.wgDoor;
    charState.atDoor = rectIntersect(
      { x: charState.pos.x, y: charState.pos.y, w: CHARACTER_W, h: CHARACTER_H },
      door
    );
  };

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      let changed = false;
      const key = e.code;
      const i = localInputsRef.current;
      
      if (role === "fireboy") {
        if (key === "ArrowLeft" && !i.left) { i.left = true; changed = true; }
        if (key === "ArrowRight" && !i.right) { i.right = true; changed = true; }
        if (key === "ArrowUp" && !i.up) { i.up = true; changed = true; }
      } else {
        if (key === "KeyA" && !i.left) { i.left = true; changed = true; }
        if (key === "KeyD" && !i.right) { i.right = true; changed = true; }
        if (key === "KeyW" && !i.up) { i.up = true; changed = true; }
      }

      if (changed) {
        onLocalInput({ ...localInputsRef.current });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      let changed = false;
      const key = e.code;
      const i = localInputsRef.current;
      
      if (role === "fireboy") {
        if (key === "ArrowLeft" && i.left) { i.left = false; changed = true; }
        if (key === "ArrowRight" && i.right) { i.right = false; changed = true; }
        if (key === "ArrowUp" && i.up) { i.up = false; changed = true; }
      } else {
        if (key === "KeyA" && i.left) { i.left = false; changed = true; }
        if (key === "KeyD" && i.right) { i.right = false; changed = true; }
        if (key === "KeyW" && i.up) { i.up = false; changed = true; }
      }

      if (changed) {
        onLocalInput({ ...localInputsRef.current });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [role, onLocalInput]);

  // Main Game Loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();
    const STEP = 16.666; // approx 60fps
    let accumulator = 0;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = (time: number) => {
      // 1. Fixed timestep physics update
      const dt = time - lastTime;
      lastTime = time;
      accumulator += dt;
      
      while (accumulator >= STEP) {
        const state = gameStateRef.current;
        const netInputs = latestInputsRef.current;
        
        if (!state.eventFired) {
          updateCharacter(state.fireboy, netInputs.fireboy, "fireboy", levelData);
          updateCharacter(state.watergirl, netInputs.watergirl, "watergirl", levelData);

          // Check win/loss
          if (!state.fireboy.alive || !state.watergirl.alive) {
            state.eventFired = true;
            onEvent("died");
          } else if (state.fireboy.atDoor && state.watergirl.atDoor) {
            state.eventFired = true;
            onEvent("levelComplete");
          }
        }
        
        accumulator -= STEP;
      }

      // 2. Draw
      draw(ctx, time);
      animationFrameId = requestAnimationFrame(render);
    };

    const draw = (ctx: CanvasRenderingContext2D, time: number) => {
      const state = gameStateRef.current;

      // Background
      ctx.fillStyle = "#0d0d14";
      ctx.fillRect(0, 0, 800, 500);
      
      // Background texture
      ctx.fillStyle = "#0a0a0f";
      for (let i=0; i<800; i+=40) {
        ctx.fillRect(i, 0, 2, 500);
      }

      // Doors
      ctx.globalAlpha = state.fireboy.atDoor ? 0.8 + Math.sin(time/100)*0.2 : 0.8;
      ctx.fillStyle = "#8a1a1a";
      ctx.beginPath();
      ctx.roundRect(levelData.fbDoor.x, levelData.fbDoor.y, levelData.fbDoor.w, levelData.fbDoor.h, [10, 10, 0, 0]);
      ctx.fill();
      ctx.fillStyle = "#ff6b35";
      ctx.fillRect(levelData.fbDoor.x+6, levelData.fbDoor.y+6, levelData.fbDoor.w-12, levelData.fbDoor.h-6);

      ctx.globalAlpha = state.watergirl.atDoor ? 0.8 + Math.sin(time/100)*0.2 : 0.8;
      ctx.fillStyle = "#0a2e5c";
      ctx.beginPath();
      ctx.roundRect(levelData.wgDoor.x, levelData.wgDoor.y, levelData.wgDoor.w, levelData.wgDoor.h, [10, 10, 0, 0]);
      ctx.fill();
      ctx.fillStyle = "#00b4d8";
      ctx.fillRect(levelData.wgDoor.x+6, levelData.wgDoor.y+6, levelData.wgDoor.w-12, levelData.wgDoor.h-6);
      ctx.globalAlpha = 1.0;

      // Platforms
      ctx.fillStyle = "#555566";
      for (let p of levelData.platforms) {
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.fillStyle = "#8888aa";
        ctx.fillRect(p.x, p.y, p.w, 2);
        ctx.fillStyle = "#555566";
      }

      // Fire Pools
      for (let p of levelData.firePools) {
        ctx.fillStyle = "rgba(255, 107, 53, 0.4)";
        ctx.fillRect(p.x-5, p.y-5, p.w+10, p.h+10);
        
        ctx.fillStyle = "#ff6b35";
        ctx.fillRect(p.x, p.y, p.w, p.h);
        // Flames
        ctx.beginPath();
        for (let ix=0; ix<p.w; ix+=8) {
          const flameH = 4 + Math.sin(time/80 + ix*1.3) * 6;
          ctx.moveTo(p.x+ix, p.y);
          ctx.lineTo(p.x+ix+4, p.y-flameH);
          ctx.lineTo(p.x+ix+8, p.y);
        }
        ctx.fill();
      }

      // Water Pools
      for (let p of levelData.waterPools) {
        ctx.fillStyle = "rgba(0, 180, 216, 0.4)";
        ctx.fillRect(p.x-5, p.y-5, p.w+10, p.h+10);
        
        ctx.fillStyle = "#00b4d8";
        ctx.fillRect(p.x, p.y, p.w, p.h);
        
        ctx.strokeStyle = "#80e5ff";
        ctx.beginPath();
        for (let ix=0; ix<=p.w; ix+=4) {
          const wave = Math.sin(time/150 + ix*0.1) * 3;
          if (ix===0) ctx.moveTo(p.x, p.y + wave);
          else ctx.lineTo(p.x+ix, p.y + wave);
        }
        ctx.stroke();
      }

      // Green Pools
      for (let p of levelData.greenPools) {
        ctx.fillStyle = "rgba(26, 107, 42, 0.6)";
        ctx.fillRect(p.x-5, p.y-5, p.w+10, p.h+10);
        ctx.fillStyle = "#1a6b2a";
        ctx.fillRect(p.x, p.y, p.w, p.h);
      }

      // Fireboy
      if (state.fireboy.alive) {
        const {x, y} = state.fireboy.pos;
        if (state.fireboy.atDoor) {
          ctx.shadowColor = "#ffffff";
          ctx.shadowBlur = 15;
        }
        // Body
        ctx.fillStyle = "#cc3300";
        ctx.fillRect(x+4, y+10, CHARACTER_W-8, CHARACTER_H-10);
        // Head
        ctx.fillStyle = "#ff6b35";
        ctx.beginPath();
        ctx.arc(x+CHARACTER_W/2, y+10, 10, 0, Math.PI*2);
        ctx.fill();
        // Eyes
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x+8, y+6, 3, 3);
        ctx.fillRect(x+15, y+6, 3, 3);
        // Crown
        ctx.beginPath();
        ctx.moveTo(x+6, y);
        ctx.lineTo(x+10, y-6 - Math.random()*4);
        ctx.lineTo(x+13, y);
        ctx.lineTo(x+16, y-8 - Math.random()*4);
        ctx.lineTo(x+20, y);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Watergirl
      if (state.watergirl.alive) {
        const {x, y} = state.watergirl.pos;
        if (state.watergirl.atDoor) {
          ctx.shadowColor = "#ffffff";
          ctx.shadowBlur = 15;
        }
        // Body
        ctx.fillStyle = "#005f8a";
        ctx.fillRect(x+4, y+10, CHARACTER_W-8, CHARACTER_H-10);
        // Head
        ctx.fillStyle = "#00b4d8";
        ctx.beginPath();
        ctx.arc(x+CHARACTER_W/2, y+10, 10, 0, Math.PI*2);
        ctx.fill();
        // Eyes
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x+8, y+6, 3, 3);
        ctx.fillRect(x+15, y+6, 3, 3);
        // Hair drops
        ctx.beginPath();
        ctx.arc(x+13, y-2, 4, 0, Math.PI*2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x+13, y-6);
        ctx.lineTo(x+9, y-2);
        ctx.lineTo(x+17, y-2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // HUD
      ctx.fillStyle = "rgba(13, 13, 20, 0.7)";
      ctx.fillRect(0, 0, 800, 36);
      
      ctx.font = "bold 14px Inter";
      ctx.fillStyle = "#ff6b35";
      ctx.fillText(`FIREBOY [Arrows]`, 30, 24);
      ctx.fillStyle = state.fireboy.alive ? "#ff6b35" : "#555";
      ctx.beginPath(); ctx.arc(15, 19, 5, 0, Math.PI*2); ctx.fill();

      ctx.fillStyle = "#00b4d8";
      ctx.fillText(`WATERGIRL [WASD]`, 630, 24);
      ctx.fillStyle = state.watergirl.alive ? "#00b4d8" : "#555";
      ctx.beginPath(); ctx.arc(785, 19, 5, 0, Math.PI*2); ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText(`LEVEL ${levelId} - ${levelData.name}`, 400, 24);
      ctx.textAlign = "left";
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [levelId, levelData, onEvent, role]);

  return (
    <div className="relative w-full max-w-[800px] aspect-[800/500] rounded-lg overflow-hidden shadow-2xl border border-white/10 ring-4 ring-black/50">
      <canvas 
        ref={canvasRef} 
        width={800} 
        height={500}
        className="w-full h-full block bg-[#0d0d14]"
      />
      {/* Mobile controls overlay (hidden on desktop) */}
      <div className="md:hidden absolute inset-0 pointer-events-none flex justify-between items-end p-4 pb-12">
        <div className="pointer-events-auto flex gap-2">
          {/* Left side: Watergirl or Fireboy mobile controls */}
          <button 
            className="w-14 h-14 bg-white/20 rounded-full active:bg-white/40 backdrop-blur"
            onPointerDown={() => onLocalInput({...localInputsRef.current, left: true})}
            onPointerUp={() => onLocalInput({...localInputsRef.current, left: false})}
            onPointerLeave={() => onLocalInput({...localInputsRef.current, left: false})}
          >L</button>
          <button 
            className="w-14 h-14 bg-white/20 rounded-full active:bg-white/40 backdrop-blur"
            onPointerDown={() => onLocalInput({...localInputsRef.current, right: true})}
            onPointerUp={() => onLocalInput({...localInputsRef.current, right: false})}
            onPointerLeave={() => onLocalInput({...localInputsRef.current, right: false})}
          >R</button>
        </div>
        <div className="pointer-events-auto">
          <button 
            className="w-16 h-16 bg-white/20 rounded-full active:bg-white/40 backdrop-blur font-bold"
            onPointerDown={() => onLocalInput({...localInputsRef.current, up: true})}
            onPointerUp={() => onLocalInput({...localInputsRef.current, up: false})}
            onPointerLeave={() => onLocalInput({...localInputsRef.current, up: false})}
          >JUMP</button>
        </div>
      </div>
    </div>
  );
}
