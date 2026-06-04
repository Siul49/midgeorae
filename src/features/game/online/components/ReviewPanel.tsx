import { ThumbsUp, ThumbsDown } from "lucide-react";
import type { RoomSnapshot } from "../../server/types/game-server-types";

function playerName(snapshot: RoomSnapshot, playerId: string) {
  return (
    snapshot.players.find((player) => player.id === playerId)?.name ?? "플레이어"
  );
}

interface ReviewPanelProps {
  snapshot: RoomSnapshot;
  onReview: (targetPlayerId: string, satisfied: boolean) => void;
}

export function ReviewPanel({ snapshot, onReview }: ReviewPanelProps) {
  return (
    <section className="motion-panel-strong border border-sky-300 bg-sky-50/90 p-5">
      <h2 className="text-xl font-black text-sky-950">거래 후기</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {snapshot.pendingReviews.map((review) => (
          <div key={`${review.tradeId}-${review.targetPlayerId}`} className="deal-card-lift border border-sky-200 bg-white p-4">
            <div className="text-sm font-bold text-sky-700">상대</div>
            <div className="mt-1 text-xl font-black">
              {playerName(snapshot, review.targetPlayerId)}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => onReview(review.targetPlayerId, true)}
                className="motion-button inline-flex items-center justify-center gap-2 bg-sky-600 px-3 py-2 text-sm font-black text-white hover:bg-sky-700"
              >
                <ThumbsUp size={16} />
                만족
              </button>
              <button
                onClick={() => onReview(review.targetPlayerId, false)}
                className="motion-button inline-flex items-center justify-center gap-2 border border-red-300 bg-red-50 px-3 py-2 text-sm font-black text-red-700 hover:bg-red-100"
              >
                <ThumbsDown size={16} />
                불만족
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
