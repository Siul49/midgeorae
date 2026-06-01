"use client";

import { useGame } from "../GameProvider";

export function MannerVote() {
  const { state, dispatch } = useGame();
  const player = state.players[state.currentPlayerIndex];
  const isAfterTrade = state.mannerVoteTo !== null;

  // After trade: specific target
  if (isAfterTrade && state.mannerVoteTo !== null) {
    const target = state.players.find((p) => p.id === state.mannerVoteTo)!;
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="text-5xl mb-4">⭐</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">매너 평가</h2>
          <p className="text-gray-500 mb-6">
            {target.name}과의 거래는 어땠나요?
          </p>

          <div className="bg-white p-4 rounded-2xl shadow-lg mb-6">
            <div
              className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl text-white font-bold"
              style={{ backgroundColor: target.color }}
            >
              {target.name[0]}
            </div>
            <div className="font-bold text-lg">{target.name}</div>
            <div className="text-sm text-gray-400">
              현재 매너 온도: {target.mannerTemp.toFixed(1)}°C
            </div>
          </div>

          <div className="flex gap-4 mb-4">
            <button
              onClick={() =>
                dispatch({ type: "VOTE_MANNER", targetId: target.id, isLike: true })
              }
              className="flex-1 py-6 bg-blue-500 hover:bg-blue-600 text-white font-bold text-xl rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-lg"
            >
              👍
              <div className="text-sm mt-1">좋아요</div>
            </button>
            <button
              onClick={() =>
                dispatch({ type: "VOTE_MANNER", targetId: target.id, isLike: false })
              }
              className="flex-1 py-6 bg-red-500 hover:bg-red-600 text-white font-bold text-xl rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-lg"
            >
              👎
              <div className="text-sm mt-1">싫어요</div>
            </button>
          </div>

          <button
            onClick={() => dispatch({ type: "SKIP_MANNER_VOTE" })}
            className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-500 font-semibold rounded-xl"
          >
            평가 건너뛰기
          </button>
        </div>
      </div>
    );
  }

  // On manner space: choose who to rate
  const otherPlayers = state.players.filter((p) => p.id !== player.id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="text-5xl mb-4">⭐</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">매너 평가</h2>
        <p className="text-gray-500 mb-6">
          평가할 플레이어를 선택하세요
        </p>

        <div className="space-y-3 mb-4">
          {otherPlayers.map((p) => (
            <div key={p.id} className="bg-white p-4 rounded-2xl shadow-md">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: p.color }}
                >
                  {p.name[0]}
                </div>
                <div className="flex-1 text-left">
                  <div className="font-bold">{p.name}</div>
                  <div className="text-xs text-gray-400">
                    🌡️ {p.mannerTemp.toFixed(1)}°C
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    dispatch({ type: "VOTE_MANNER", targetId: p.id, isLike: true })
                  }
                  className="flex-1 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold rounded-xl text-sm"
                >
                  👍 좋아요
                </button>
                <button
                  onClick={() =>
                    dispatch({ type: "VOTE_MANNER", targetId: p.id, isLike: false })
                  }
                  className="flex-1 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl text-sm"
                >
                  👎 싫어요
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => dispatch({ type: "SKIP_MANNER_VOTE" })}
          className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-500 font-semibold rounded-xl"
        >
          평가 건너뛰기
        </button>
      </div>
    </div>
  );
}
