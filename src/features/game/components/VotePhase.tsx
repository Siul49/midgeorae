"use client";

import { useState } from "react";
import { useGame } from "../GameProvider";

export function VotePhase() {
  const { state, dispatch } = useGame();
  const [currentVoter, setCurrentVoter] = useState(0);
  const [showConfirm, setShowConfirm] = useState(true);

  const voter = state.players[currentVoter];
  const otherPlayers = state.players.filter((p) => p.id !== voter.id);

  if (showConfirm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-3xl font-black text-white mb-3">빌런 투표</h1>
          <p className="text-gray-400 mb-2">게임이 끝났습니다!</p>
          <p className="text-gray-400 mb-8">
            누가 빌런인지 투표해주세요
          </p>

          <div className="bg-gray-700/50 rounded-2xl p-6 mb-6">
            <div
              className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl text-white font-bold"
              style={{ backgroundColor: voter.color }}
            >
              {voter.name[0]}
            </div>
            <div className="text-white font-bold text-lg">{voter.name}의 투표</div>
            <div className="text-gray-400 text-sm">
              다른 플레이어에게 화면을 보여주지 마세요
            </div>
          </div>

          <button
            onClick={() => setShowConfirm(false)}
            className="px-12 py-4 bg-white text-gray-900 font-bold text-lg rounded-2xl hover:bg-gray-100 transition-all"
          >
            투표하기
          </button>

          <div className="mt-8 bg-gray-800/60 rounded-2xl p-4 border border-gray-700/50 max-w-md mx-auto text-left">
            <h3 className="text-sm font-bold text-gray-300 mb-2.5">🗳️ 실시간 투표 현황</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {state.players.map((p) => {
                const voteCount = state.votingResults[p.id] || 0;
                return (
                  <div key={p.id} className="flex justify-between items-center bg-gray-900/40 p-2 rounded-xl border border-gray-750">
                    <span className="text-gray-300 font-bold">{p.name}</span>
                    <span className="text-amber-400 font-black text-sm">{voteCount}표</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleVote = (targetId: number) => {
    dispatch({ type: "VOTE_VILLAIN", targetId });

    if (currentVoter + 1 < state.players.length) {
      setCurrentVoter(currentVoter + 1);
      setShowConfirm(true);
    } else {
      dispatch({ type: "FINISH_VOTING" });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🔍</div>
          <h2 className="text-xl font-bold text-white">
            {voter.name}, 빌런은 누구일까요?
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            {currentVoter + 1} / {state.players.length} 투표 중
          </p>
        </div>

        <div className="space-y-3">
          {otherPlayers.map((p) => (
            <button
              key={p.id}
              onClick={() => handleVote(p.id)}
              className="w-full p-5 bg-gray-700/50 hover:bg-gray-600/50 rounded-2xl flex items-center gap-4 transition-all hover:scale-[1.02]"
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold"
                style={{ backgroundColor: p.color }}
              >
                {p.name[0]}
              </div>
              <div className="flex-1 text-left">
                <div className="text-white font-bold text-lg">{p.name}</div>
                <div className="text-gray-400 text-xs mt-1">
                  🌡️ {p.mannerTemp.toFixed(1)}°C | 👍{p.likes} 👎{p.dislikes} | 📦{p.items.length}
                </div>
              </div>
              <div className="text-gray-500 text-2xl">→</div>
            </button>
          ))}
        </div>

        <div className="mt-6 bg-gray-800/60 rounded-2xl p-4 border border-gray-700/50 text-left">
          <h3 className="text-sm font-bold text-gray-300 mb-2.5">🗳️ 실시간 투표 현황</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {state.players.map((p) => {
              const voteCount = state.votingResults[p.id] || 0;
              return (
                <div key={p.id} className="flex justify-between items-center bg-gray-900/40 p-2 rounded-xl border border-gray-750">
                  <span className="text-gray-300 font-bold">{p.name}</span>
                  <span className="text-amber-400 font-black text-sm">{voteCount}표</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
