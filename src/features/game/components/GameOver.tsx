"use client";

import { useGame } from "../GameProvider";
import { calculateScore } from "../engine/game-engine";

function formatWon(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

export function GameOver() {
  const { state, dispatch } = useGame();
  const villain = state.players.find((p) => p.role === "villain")!;
  const villainCaught =
    state.revealedVillain !== null &&
    Object.entries(state.votingResults).reduce((a, b) =>
      b[1] > a[1] ? b : a
    )[0] === String(villain.id);

  const missionComplete = villain.mission?.checkComplete(villain, state.logs) ?? false;
  const winner = state.players.find((p) => p.id === state.winner);

  const sortedPlayers = [...state.players]
    .map((p) => {
      let score = calculateScore(p);
      if (p.role === "villain") {
        if (missionComplete && !villainCaught) score += 300000;
        else if (missionComplete) score += 100000;
        else if (villainCaught) score -= 200000;
      } else if (villainCaught) {
        score += 100000;
      }
      return { ...p, finalScore: score };
    })
    .sort((a, b) => b.finalScore - a.finalScore);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-4">
      <div className="max-w-md mx-auto">
        {/* Winner announcement */}
        <div className="text-center mb-8 pt-8">
          <div className="text-6xl mb-4">🏆</div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">게임 종료!</h1>
          {winner && (
            <div className="inline-block bg-white px-6 py-3 rounded-2xl shadow-lg">
              <span className="text-2xl font-black" style={{ color: winner.color }}>
                {winner.name}
              </span>
              <span className="text-gray-500 text-lg ml-2">우승!</span>
            </div>
          )}
        </div>

        {/* Villain reveal */}
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
          <h2 className="text-center text-lg font-bold text-gray-800 mb-4">
            🦹 빌런 정체 공개
          </h2>
          <div className="text-center">
            <div
              className="w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center text-3xl text-white font-bold"
              style={{ backgroundColor: villain.color }}
            >
              {villain.name[0]}
            </div>
            <div className="text-2xl font-black text-red-600 mb-2">
              {villain.name} = 빌런!
            </div>

            {villain.mission && (
              <div className="bg-red-50 rounded-xl p-3 mb-3">
                <div className="text-sm text-red-500 font-semibold">
                  비밀 미션: {villain.mission.emoji} {villain.mission.title}
                </div>
                <div className="text-xs text-red-400 mt-1">
                  {villain.mission.description}
                </div>
                <div className={`mt-2 text-sm font-bold ${missionComplete ? "text-green-600" : "text-red-600"}`}>
                  {missionComplete ? "✅ 미션 완료!" : "❌ 미션 실패"}
                </div>
              </div>
            )}

            <div className={`text-sm font-bold ${villainCaught ? "text-green-600" : "text-red-600"}`}>
              {villainCaught
                ? "🎉 시민들이 빌런을 찾아냈습니다!"
                : "😈 빌런이 끝까지 숨었습니다!"}
            </div>
          </div>
        </div>

        {/* Scoreboard */}
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
          <h2 className="text-center text-lg font-bold text-gray-800 mb-4">
            📊 최종 순위
          </h2>
          <div className="space-y-3">
            {sortedPlayers.map((p, rank) => (
              <div
                key={p.id}
                className={`p-4 rounded-2xl flex items-center gap-3 ${
                  rank === 0 ? "bg-amber-50 ring-2 ring-amber-300" : "bg-gray-50"
                }`}
              >
                <div className="text-2xl font-black text-gray-300 w-8">
                  {rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : `${rank + 1}`}
                </div>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: p.color }}
                >
                  {p.name[0]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{p.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      p.role === "villain" ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                    }`}>
                      {p.role === "villain" ? "빌런" : "시민"}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    💰{formatWon(p.money)} 📦{p.items.length}개 🌡️{p.mannerTemp.toFixed(1)}°C
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-black text-xl text-orange-600">
                    {formatWon(p.finalScore)}
                  </div>
                  <div className="text-[10px] text-gray-400">최종 점수</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Score breakdown */}
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
          <h3 className="text-sm font-bold text-gray-600 mb-3">점수 계산법</h3>
          <div className="text-xs text-gray-500 space-y-1">
            <div>• 최종 점수 = 보유금 + 물건 가치 + 매너 보너스 - (싫어요 × 50,000원)</div>
            <div>• 매너 38°C↑: +200,000원 / 36.5°C↑: +100,000원</div>
            <div>• 빌런 미션 성공 + 미적발: +300,000원</div>
            <div>• 빌런 미션 성공 + 적발: +100,000원</div>
            <div>• 빌런 적발 (미션 실패): -200,000원</div>
            <div>• 시민이 빌런 적발 시: +100,000원</div>
          </div>
        </div>

        {/* Restart */}
        <button
          onClick={() => dispatch({ type: "RESTART" })}
          className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg rounded-2xl shadow-lg transition-all mb-8"
        >
          다시 하기 🔄
        </button>
      </div>
    </div>
  );
}
