import { Star } from "lucide-react";
import type { RoomSnapshot } from "../../server/types/game-server-types";
import { moneyLabel } from "../constants/ui-constants";
import { StatusBox } from "./StatusComponents";

function playerName(snapshot: RoomSnapshot, playerId: string) {
  return (
    snapshot.players.find((player) => player.id === playerId)?.name ?? "플레이어"
  );
}

interface ResultPanelProps {
  snapshot: RoomSnapshot;
}

export function ResultPanel({ snapshot }: ResultPanelProps) {
  const result = snapshot.result;
  if (!result) return null;
  const villainName = result.villainId ? playerName(snapshot, result.villainId) : "-";
  const winnerName = playerName(snapshot, result.winnerId);
  const eliminatedName = result.eliminatedPlayerId
    ? playerName(snapshot, result.eliminatedPlayerId)
    : "-";

  return (
    <section className="motion-panel-strong market-card-table p-5">
      <div className="relative">
        <div className="flex items-center gap-3">
          <Star className="text-orange-600" size={28} />
          <div>
            <h2 className="text-2xl font-black">결과 공개</h2>
            <p className="mt-1 text-sm font-bold text-stone-500">
              {result.winningSide === "citizens" ? "시민 승리" : "빌런 승리"}
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <StatusBox label="빌런" value={villainName} />
          <StatusBox label="탈락" value={eliminatedName} />
          <StatusBox label="최종 우승" value={winnerName} />
          <StatusBox
            label="색출"
            value={result.villainCaught ? "성공" : "실패"}
          />
        </div>

        <div className="mt-8 border-t border-stone-200 pt-6">
          <h3 className="text-lg font-black text-stone-800 mb-4">최종 순위 및 평판</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-100 text-stone-600 font-bold uppercase text-xs">
                <tr>
                  <th className="px-4 py-2">순위</th>
                  <th className="px-4 py-2">플레이어</th>
                  <th className="px-4 py-2 text-right">최종 자산</th>
                  <th className="px-4 py-2 text-center">평판</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.players
                  .slice()
                  .sort((a, b) => {
                    const moneyA = snapshot.result?.finalScores?.[a.id]?.totalMoney ?? 0;
                    const moneyB = snapshot.result?.finalScores?.[b.id]?.totalMoney ?? 0;
                    return moneyB - moneyA;
                  })
                  .map((player, index) => {
                    const money = snapshot.result?.finalScores?.[player.id]?.totalMoney;
                    return (
                      <tr key={player.id} className={`border-b border-stone-100 ${player.id === result.winnerId ? "bg-orange-50 font-black text-orange-900" : ""}`}>
                        <td className="px-4 py-3">{index + 1}위</td>
                        <td className="px-4 py-3">
                          {player.name}
                          {player.id === result.villainId && <span className="ml-2 rounded bg-red-100 px-2 py-0.5 text-[10px] font-black text-red-600">빌런</span>}
                        </td>
                        <td className="px-4 py-3 text-right">{money !== undefined ? moneyLabel(money) : "-"}</td>
                        <td className="px-4 py-3 text-center">{player.reputationTokens}/5</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
