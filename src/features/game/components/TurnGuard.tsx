"use client";

import { useGame } from "../GameProvider";

export function TurnGuard() {
  const { state, dispatch } = useGame();
  const player = state.players[state.currentPlayerIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="mb-4 text-gray-400 text-lg">
          라운드 {state.round} / {state.maxRounds}
        </div>

        <div
          className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center text-4xl shadow-xl"
          style={{ backgroundColor: player.color }}
        >
          {player.name[0]}
        </div>

        <h1 className="text-4xl font-black text-white mb-3">
          {player.name}의 차례
        </h1>

        <p className="text-gray-400 mb-8 text-lg">
          다른 플레이어에게 화면을 보여주지 마세요!
        </p>

        <button
          onClick={() => dispatch({ type: "CONFIRM_TURN" })}
          className="px-12 py-5 bg-white text-gray-900 font-bold text-xl rounded-2xl hover:bg-gray-100 transition-all hover:scale-105 active:scale-95 shadow-2xl"
        >
          준비 완료 ✋
        </button>

        <p className="mt-6 text-gray-500 text-sm animate-pulse">
          탭하면 당신의 정보가 표시됩니다
        </p>
      </div>
    </div>
  );
}
