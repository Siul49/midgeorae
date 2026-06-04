import { AlertTriangle, MessageCircleWarning } from "lucide-react";
import type { RoomSnapshot, PublicPlayer } from "../../server/types/game-server-types";

interface ReportPanelProps {
  snapshot: RoomSnapshot;
  otherPlayers: PublicPlayer[];
  onReport: (targetPlayerId: string) => void;
}

export function ReportPanel({
  snapshot,
  otherPlayers,
  onReport,
}: ReportPanelProps) {
  return (
    <section className="motion-panel border-2 border-red-500 bg-red-50 p-5 shadow-[0_8px_0_rgba(153,27,27,0.2)] rounded-xl">
      <div className="relative">
        <div className="flex items-center justify-between gap-3 border-b border-red-200 pb-3">
          <div>
            <h2 className="text-xl font-black text-red-900">최종 신고 (상소문)</h2>
            <p className="mt-1 text-sm font-bold text-red-700">
              빌런으로 의심되는 플레이어를 신고하세요. ({snapshot.reportsCast}/{snapshot.players.length}명 신고 접수)
            </p>
          </div>
          <div className="animate-pulse rounded-full bg-red-200 p-2 text-red-600">
            <MessageCircleWarning size={28} />
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {otherPlayers.map((player) => (
            <button
              key={player.id}
              onClick={() => onReport(player.id)}
              className="motion-button flex items-center justify-between border border-stone-300 px-3 py-3 text-left font-black hover:bg-stone-100"
            >
              {player.name}
              <AlertTriangle size={16} />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
