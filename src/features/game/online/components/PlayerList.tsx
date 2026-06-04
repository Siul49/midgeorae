import { Crown, Search, Handshake, FileText } from "lucide-react";
import type { PublicPlayer } from "../../server/types/game-server-types";
import { CardImage } from "./CardImage";
import { categoryLabel, conditionLabel } from "../constants/ui-constants";

interface PlayerListProps {
  players: PublicPlayer[];
  myPlayerId: string;
  currentTurnPlayerId: string | null;
}

export function PlayerList({
  players,
  myPlayerId,
  currentTurnPlayerId,
}: PlayerListProps) {
  return (
    <section className="space-y-2">
      <div className="space-y-2">
        {players.map((player) => (
          <div
            key={player.id}
            className={`player-lane px-2 py-2 ${
              player.id === currentTurnPlayerId
                ? "table-player-mat-turn"
                : player.id === myPlayerId
                  ? "table-player-mat-my"
                  : "table-player-mat"
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-stone-700/20 bg-[radial-gradient(circle_at_35%_25%,#f8d9a4,#b87332)] text-base font-black text-stone-950">
                {player.name.slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  {player.isHost && <Crown size={13} className="shrink-0 text-orange-700" />}
                  <span className="truncate text-sm font-black text-stone-950">
                    {player.name}
                  </span>
                  {player.id === myPlayerId && (
                    <span className="rounded bg-green-700 px-2 py-0.5 text-[10px] font-black text-white">
                      나
                    </span>
                  )}
                  {player.isBot && (
                    <span className="rounded bg-stone-800 px-2 py-0.5 text-[10px] font-black text-white">
                      BOT
                    </span>
                  )}
                  {player.id === currentTurnPlayerId && (
                    <span className="rounded bg-orange-600 px-2 py-0.5 text-[10px] font-black text-white">
                      차례
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-2 text-[11px] font-black text-stone-600">
                  <span className="text-orange-700">🌡️ 매너온도 {player.manner.toFixed(1)}°C</span>
                  <span>물건 {player.itemCount}개</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
