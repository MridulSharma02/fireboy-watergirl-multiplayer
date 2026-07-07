import { useEffect, useState, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useGameSocket, Role, GameEvent, Inputs } from "@/lib/use-game-socket";
import { Button } from "@/components/ui/button";
import { Copy, Flame, Droplet, ArrowLeft, RefreshCw, Trophy, Skull } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import GameBoard from "@/components/game-board";

export default function RoomPage() {
  const { code } = useParams<{ code: string }>();
  const [, setLocation] = useLocation();

  // Read initial role from local storage. Fallback to watergirl if none.
  const storedRole = localStorage.getItem(`fbwg_role_${code}`) as Role | null;
  const initialRole: Role = storedRole === "fireboy" ? "fireboy" : "watergirl";

  const {
    status,
    role,
    level,
    errorMsg,
    latestInputsRef,
    partnerEvent,
    sendInput,
    sendGameEvent,
    clearPartnerEvent
  } = useGameSocket(code || "", initialRole);

  const [copied, setCopied] = useState(false);
  const [localGameState, setLocalGameState] = useState<"playing" | "won" | "died">("playing");
  // Incrementing this key forces GameBoard to fully remount and reset all game state refs
  const [restartKey, setRestartKey] = useState(0);

  const handleCopyCode = () => {
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLocalInput = useCallback((inputs: Inputs) => {
    sendInput(inputs);
  }, [sendInput]);

  const handleGameEvent = useCallback((event: GameEvent) => {
    if (event === "died" || event === "levelComplete") {
      setLocalGameState(event === "levelComplete" ? "won" : "died");
      sendGameEvent(event);
    }
  }, [sendGameEvent]);

  // Sync state with partner event
  useEffect(() => {
    if (partnerEvent === "died") {
      setLocalGameState("died");
      clearPartnerEvent();
    } else if (partnerEvent === "levelComplete") {
      setLocalGameState("won");
      clearPartnerEvent();
    } else if (partnerEvent === "restart") {
      setLocalGameState("playing");
      clearPartnerEvent();
    }
  }, [partnerEvent, clearPartnerEvent]);

  const handleRestart = () => {
    setLocalGameState("playing");
    setRestartKey((k) => k + 1); // force GameBoard remount → reset all physics refs
    sendGameEvent("restart");
  };

  const handleBackToLobby = () => {
    setLocation("/");
  };

  if (status === "connecting") {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.5 }}>
          <p className="text-xl font-display tracking-widest text-muted-foreground">CONNECTING...</p>
        </motion.div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background p-4 text-center">
        <h2 className="text-4xl font-display text-destructive mb-4">ERROR</h2>
        <p className="text-muted-foreground mb-8">{errorMsg}</p>
        <Button variant="outline" onClick={handleBackToLobby}>Back to Lobby</Button>
      </div>
    );
  }

  if (status === "disconnected") {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background p-4 text-center">
        <h2 className="text-4xl font-display text-muted-foreground mb-4">DISCONNECTED</h2>
        <p className="text-muted-foreground mb-8">Your partner left the room, or the connection was lost.</p>
        <Button variant="outline" onClick={handleBackToLobby}>Back to Lobby</Button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center p-4">
      {/* Top Bar */}
      <header className="w-full max-w-5xl flex justify-between items-center py-4 mb-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBackToLobby}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="font-display text-2xl">
            <span className="text-primary fire-text">FIREBOY</span> & <span className="text-secondary water-text">WATERGIRL</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium tracking-wider">
          <span className="text-muted-foreground uppercase hidden sm:inline">Room Code:</span>
          <div 
            onClick={handleCopyCode}
            className="flex items-center gap-2 bg-muted/50 hover:bg-muted px-4 py-2 rounded-md cursor-pointer transition-colors"
          >
            <span className="font-mono text-lg">{code}</span>
            <Copy className={`w-4 h-4 ${copied ? "text-green-500" : "text-muted-foreground"}`} />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-5xl flex flex-col items-center justify-center relative">
        <AnimatePresence mode="wait">
          {status === "waiting" ? (
            <motion.div 
              key="waiting"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="text-center p-8 bg-card border border-border rounded-xl shadow-2xl max-w-md w-full"
            >
              <div className="mb-8">
                <p className="text-sm uppercase tracking-widest text-muted-foreground mb-4">You are playing as</p>
                {role === "fireboy" ? (
                  <div className="flex flex-col items-center text-primary fire-text">
                    <Flame className="w-16 h-16 mb-2" />
                    <h2 className="text-4xl font-display">FIREBOY</h2>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-secondary water-text">
                    <Droplet className="w-16 h-16 mb-2" />
                    <h2 className="text-4xl font-display">WATERGIRL</h2>
                  </div>
                )}
              </div>
              
              <div className="space-y-4 border-t border-border pt-8">
                <p className="text-muted-foreground text-sm">
                  Share this code with your partner:
                </p>
                <div className="text-4xl font-mono tracking-[0.2em] bg-background py-4 rounded-lg border border-border shadow-inner font-bold text-foreground">
                  {code}
                </div>
                <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground animate-pulse">
                  <div className="w-2 h-2 bg-primary rounded-full" />
                  Waiting for partner to join...
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="playing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full flex justify-center"
            >
              <GameBoard 
                key={restartKey}
                levelId={level} 
                role={role} 
                latestInputsRef={latestInputsRef}
                onEvent={handleGameEvent}
                onLocalInput={handleLocalInput}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Game Over / Win Overlays */}
        <AnimatePresence>
          {status === "playing" && localGameState !== "playing" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-card border border-border p-8 rounded-xl shadow-2xl text-center max-w-sm w-full mx-4"
              >
                {localGameState === "won" ? (
                  <>
                    <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                    <h2 className="text-4xl font-display text-white mb-2">LEVEL COMPLETE!</h2>
                    <p className="text-muted-foreground mb-8">Excellent teamwork.</p>
                  </>
                ) : (
                  <>
                    <Skull className="w-16 h-16 text-destructive mx-auto mb-4" />
                    <h2 className="text-4xl font-display text-destructive mb-2">GAME OVER</h2>
                    <p className="text-muted-foreground mb-8">Someone died! Watch out for opposing elements and green goo.</p>
                  </>
                )}
                
                <div className="flex flex-col gap-3">
                  <Button 
                    className="w-full text-lg font-display tracking-widest h-12"
                    onClick={handleRestart}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" /> PLAY AGAIN
                  </Button>
                  <Button 
                    variant="outline"
                    className="w-full"
                    onClick={handleBackToLobby}
                  >
                    BACK TO LOBBY
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
