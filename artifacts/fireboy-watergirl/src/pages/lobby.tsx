import { useCreateRoom } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Flame, Droplet } from "lucide-react";
import { motion } from "framer-motion";

export default function LobbyPage() {
  const [, setLocation] = useLocation();
  const createRoomMutation = useCreateRoom();
  
  const [level, setLevel] = useState("1");
  const [joinCode, setJoinCode] = useState("");
  
  const handleCreateRoom = () => {
    createRoomMutation.mutate(
      { data: { level: parseInt(level, 10) } },
      {
        onSuccess: (room) => {
          localStorage.setItem(`fbwg_role_${room.code}`, "fireboy");
          setLocation(`/room/${room.code}`);
        },
      }
    );
  };
  
  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.trim().length > 0) {
      const code = joinCode.trim().toUpperCase();
      localStorage.setItem(`fbwg_role_${code}`, "watergirl");
      setLocation(`/room/${code}`);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center p-4 relative overflow-hidden bg-background">
      {/* Background decoration */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 text-center mb-12"
      >
        <h1 className="text-6xl md:text-8xl font-display tracking-wider mb-2">
          <span className="text-primary fire-text">FIREBOY</span>
          <span className="text-foreground mx-4">&</span>
          <span className="text-secondary water-text">WATERGIRL</span>
        </h1>
        <p className="text-muted-foreground text-lg uppercase tracking-[0.2em]">Multiplayer Online</p>
      </motion.div>

      <div className="z-10 grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="h-full border-primary/20 bg-card/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl font-display tracking-wide flex items-center gap-2">
                <Flame className="w-6 h-6 text-primary" /> Create Room
              </CardTitle>
              <CardDescription>Play as Fireboy and invite a friend.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Select Level</label>
                <Select value={level} onValueChange={setLevel}>
                  <SelectTrigger className="w-full bg-background border-border">
                    <SelectValue placeholder="Level 1 - Forest Temple" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Level 1 - Forest Temple</SelectItem>
                    <SelectItem value="2">Level 2 - Ice Temple</SelectItem>
                    <SelectItem value="3">Level 3 - Fire & Water Temple</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg font-display tracking-widest h-12"
                onClick={handleCreateRoom}
                disabled={createRoomMutation.isPending}
              >
                {createRoomMutation.isPending ? "CREATING..." : "CREATE ROOM"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="h-full border-secondary/20 bg-card/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl font-display tracking-wide flex items-center gap-2">
                <Droplet className="w-6 h-6 text-secondary" /> Join Room
              </CardTitle>
              <CardDescription>Play as Watergirl with a friend's code.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleJoinRoom} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Room Code</label>
                  <Input 
                    placeholder="Enter 4-letter code" 
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    maxLength={4}
                    className="w-full bg-background border-border font-mono text-center text-xl uppercase h-12"
                  />
                </div>
                <Button 
                  type="submit"
                  className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground text-lg font-display tracking-widest h-12"
                  disabled={joinCode.length !== 4}
                >
                  JOIN ROOM
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
