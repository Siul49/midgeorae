"use client";

import React from "react";
import { Star } from "lucide-react";
import type { RoomSnapshot, RoomAction } from "@/features/game/server/types";
import { playerName, StatusBox } from "./OnlineHelpers";

interface OnlineGameOverProps {
  snapshot: RoomSnapshot;
  submitAction: (action: RoomAction) => void;
  leaveRoom: () => void;
  loading: boolean;
}

export function OnlineGameOver({
  snapshot,
  submitAction,
  leaveRoom,
  loading,
}: OnlineGameOverProps) {
  const result = snapshot.result;
  if (!result) return null;

  const villainName = result.villainId ? playerName(snapshot, result.villainId) : "-";
  const winnerName = playerName(snapshot, result.winnerId);
  const eliminatedName = result.eliminatedPlayerId
    ? playerName(snapshot, result.eliminatedPlayerId)
    : "-";

  return (
    <section className="motion-panel-strong market-card-table p-5 animate-fade-in relative z-25">
      <div className="relative">
        <div className="flex items-center gap-3">
          <Star className="text-orange-500" size={28} />
          <div>
            <h2 className="text-2xl font-black text-orange-500">결과 공개</h2>
            <p className="mt-1.5 text-base font-black text-stone-950">
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

        {/* 플레이어별 상세 결과 */}
        <div className="mt-6 border-t border-stone-800/10 pt-4">
          <h3 className="text-[13px] font-black text-stone-900 mb-2.5">플레이어별 최종 정산 결과</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-stone-800/10 text-stone-500">
                  <th className="py-2 font-bold">플레이어</th>
                  <th className="py-2 font-bold">역할 / 직업</th>
                  <th className="py-2 font-bold text-center">평판 (좋아요)</th>
                  <th className="py-2 font-bold text-right">최종 자산</th>
                  <th className="py-2 font-bold text-center">미션 달성</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.players.map((p) => {
                  const isWinner = p.id === result.winnerId;
                  return (
                    <tr 
                      key={p.id} 
                      className={`border-b border-stone-800/5 ${isWinner ? 'bg-orange-50/80 font-black text-orange-950' : 'text-stone-700'}`}
                    >
                      <td className="py-2.5 pr-2">
                        <span className="flex items-center gap-1">
                          {p.name}
                          {isWinner && <span className="text-[10px] bg-orange-100 text-orange-700 px-1 py-0.5 rounded font-black">👑 우승</span>}
                        </span>
                      </td>
                      <td className="py-2.5">
                        {p.role === "villain" ? (
                          <span className="text-red-500 font-bold">빌런 😈</span>
                        ) : (
                          <span>시민 ({p.job?.title || "일반 시민"})</span>
                        )}
                      </td>
                      <td className="py-2.5 text-center">
                        <span className="font-mono">{p.reputationTokens}</span>/5 (👍 <span className="font-mono">{p.likes}</span>)
                      </td>
                      <td className="py-2.5 text-right font-mono pr-2">
                        {p.totalAssets !== undefined ? `${p.totalAssets.toLocaleString()}원` : "-"}
                      </td>
                      <td className="py-2.5 text-center">
                        {p.isMissionComplete ? (
                          <span className="text-emerald-600 font-black">성공 🎉</span>
                        ) : (
                          <span className="text-stone-400">실패 ❌</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          {snapshot.me?.isHost ? (
            <button
              onClick={() => submitAction({ type: "restartGame" })}
              disabled={loading}
              className="motion-button px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-stone-950 font-black text-sm rounded-xl shadow-lg cursor-pointer flex items-center justify-center gap-2 transition-all border border-orange-500/20"
            >
              {loading ? "처리 중..." : "다시하기 🔄"}
            </button>
          ) : (
            <button
              disabled
              className="px-5 py-2.5 themed-panel text-stone-500 font-bold text-xs rounded-xl border flex items-center justify-center gap-2"
            >
              호스트 재시작 대기 중... ⏳
            </button>
          )}
          <button
            onClick={leaveRoom}
            disabled={loading}
            className="motion-button px-5 py-2.5 bg-red-950/80 hover:bg-red-900 text-red-200 font-black text-sm rounded-xl border border-red-800 shadow-lg cursor-pointer flex items-center justify-center gap-2 transition-all"
          >
            나가기 🚪
          </button>
        </div>
      </div>
    </section>
  );
}
