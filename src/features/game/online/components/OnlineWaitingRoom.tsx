"use client";

import { Check, Copy, Crown } from "lucide-react";
import type { RoomSnapshot } from "@/features/game/server/types";
import { ErrorNotice } from "./OnlineHelpers";
import { MIN_PLAYERS } from "../../rules/game-rules";

interface OnlineWaitingRoomProps {
  snapshot: RoomSnapshot;
  session: { code: string; playerId: string; playerToken: string };
  copied: boolean;
  copyInvite: () => void;
  submitAction: (action: any) => void;
  leaveRoom: () => void;
  loading: boolean;
  error: string;
}

export function OnlineWaitingRoom({
  snapshot,
  session,
  copied,
  copyInvite,
  submitAction,
  leaveRoom,
  loading,
  error,
}: OnlineWaitingRoomProps) {
  const me = snapshot.me;

  return (
    <section className="absolute inset-0 z-40 bg-stone-50 flex items-center justify-center p-5">
      <div className="motion-panel w-full max-w-md p-6 border border-stone-300 bg-white">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-stone-950">대기실</h2>
          <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
        </div>
        
        <div className="mt-4 flex items-center justify-between border border-stone-300 bg-white px-4 py-3">
          <div>
            <div className="text-xs font-black text-stone-500 uppercase">방 코드</div>
            <div className="text-xl font-black text-stone-900 tracking-wider mt-0.5">{session.code}</div>
          </div>
          <button
            onClick={copyInvite}
            className="flex h-10 w-10 items-center justify-center border border-stone-900 hover:bg-stone-950 hover:text-white transition-colors"
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
          </button>
        </div>

        <div className="mt-6">
          <label className="text-sm font-bold text-stone-700">참여 중인 플레이어 ({snapshot.players.length}/4)</label>
          <div className="mt-2 grid gap-2">
            {snapshot.players.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between border border-stone-300 bg-white px-4 py-3 text-sm font-bold text-stone-900"
              >
                <div className="flex items-center gap-2">
                  {player.isHost && <Crown size={14} className="text-orange-600" />}
                  {player.name}
                </div>
                {player.isBot && <span className="text-xs px-2 py-0.5 bg-stone-100 text-stone-500 border">봇</span>}
              </div>
            ))}
          </div>
        </div>

        {error && <ErrorNotice message={error} />}

        <div className="mt-8 flex gap-2">
          <button
            onClick={leaveRoom}
            className="motion-button flex-1 border border-stone-900 py-3 text-sm font-black text-stone-950 hover:bg-stone-950 hover:text-white"
          >
            방 나가기
          </button>
          {me?.isHost && (
            <>
              {snapshot.mode === "botTest" && snapshot.players.length < 4 && (
                <button
                  onClick={() => submitAction({ type: "addBot" })}
                  disabled={loading}
                  className="motion-button flex-1 border border-stone-900 py-3 text-sm font-black text-stone-950 hover:bg-stone-950 hover:text-white disabled:opacity-50"
                >
                  봇 추가
                </button>
              )}
              <button
                onClick={() => submitAction({ type: "startGame" })}
                disabled={loading || snapshot.players.length < MIN_PLAYERS}
                className="motion-button flex-1 bg-orange-600 py-3 text-sm font-black text-white hover:bg-orange-700 disabled:opacity-50"
              >
                게임 시작
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
