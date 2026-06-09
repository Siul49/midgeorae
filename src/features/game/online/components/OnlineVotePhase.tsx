"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import type { RoomSnapshot, PublicPlayer } from "@/features/game/server/types";
import { playerName } from "./OnlineHelpers";

interface OnlineVotePhaseProps {
  snapshot: RoomSnapshot;
  otherPlayers: PublicPlayer[];
  onReport: (targetPlayerId: string) => void;
}

export function OnlineVotePhase({
  snapshot,
  otherPlayers,
  onReport,
}: OnlineVotePhaseProps) {
  const me = snapshot.me;
  const reports = snapshot.reports || {};
  const hasVoted = Boolean(me && reports[me.id]);

  return (
    <section className="motion-panel market-card-table p-5">
      <div className="relative">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-black text-orange-500">최종 신고</h2>
            <p className="mt-1.5 text-sm font-bold text-stone-700">
              {snapshot.reportsCast}/{snapshot.players.length}명 신고 접수
            </p>
          </div>
          <AlertTriangle className="text-orange-500" size={26} />
        </div>

        {hasVoted ? (
          <div className="bg-emerald-950/40 border border-emerald-900/40 p-4 rounded-xl text-center my-4">
            <div className="text-emerald-400 font-black text-sm mb-1.5">✓ 신고 접수 완료</div>
            <p className="text-stone-300 text-xs font-bold leading-normal">
              신고가 안전하게 접수되었습니다.<br />
              다른 플레이어들이 신고를 완료하기를 기다리고 있습니다.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {otherPlayers.map((player) => (
              <button
                key={player.id}
                onClick={() => onReport(player.id)}
                className="motion-button flex items-center justify-between border border-[var(--stone-container-border)] themed-panel hover:bg-orange-950/40 hover:border-orange-500 px-3.5 py-3 rounded-lg text-left font-black cursor-pointer"
              >
                {player.name}
                <AlertTriangle size={16} className="text-orange-500" />
              </button>
            ))}
          </div>
        )}

        {/* 실시간 투표 현황 */}
        <div className="mt-6 border-t border-white/5 pt-4">
          <h3 className="text-xs font-extrabold text-stone-300 mb-3 flex items-center gap-1.5 justify-center">
            🗳️ 실시간 투표 현황
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {snapshot.players.map((player) => {
              const playerVoted = Boolean(reports[player.id]);
              const votesReceived = Object.values(reports).filter((tId) => tId === player.id).length;
              return (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-[var(--stone-container-border)] bg-[rgba(0,0,0,0.25)]"
                >
                  <div>
                    <div className="font-extrabold text-xs text-white flex items-center gap-1.5">
                      {player.name}
                      {player.id === me?.id && <span className="text-[9px] px-1 themed-panel rounded border">나</span>}
                    </div>
                    <div className="text-[10px] font-bold mt-1">
                      {playerVoted ? (
                        <span className="text-emerald-400">투표 완료 👍</span>
                      ) : (
                        <span className="text-amber-400 animate-pulse font-extrabold">투표 중... 🗳️</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-orange-500">{votesReceived}표</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
