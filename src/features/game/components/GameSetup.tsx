"use client";

import { useState } from "react";
import { useGame } from "../GameProvider";

import { getRandomMission } from "../data/missions";
import { getRandomItems } from "../data/items";

export function GameSetup() {
  const { dispatch } = useGame();
  const [playerCount, setPlayerCount] = useState(4);
  const [names, setNames] = useState(["", "", "", "", ""]);

  const handleStart = () => {
    const players = names
      .slice(0, playerCount)
      .map((name, i) => ({ name: name.trim() || `플레이어 ${i + 1}` }));
    const villainIndex = Math.floor(Math.random() * playerCount);
    const mission = getRandomMission();
    const marketItems = getRandomItems(6);
    dispatch({
      type: "START_GAME",
      players,
      villainIndex,
      mission,
      marketItems,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🥕</div>
          <h1 className="text-3xl font-black text-gray-900">당근겜</h1>
          <p className="text-gray-500 mt-2">중고거래 서바이벌 보드게임</p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            플레이어 수
          </label>
          <div className="flex gap-3">
            {[3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => {
                  setPlayerCount(n);
                  setNames((prev) => {
                    const next = [...prev];
                    while (next.length < n) next.push("");
                    return next;
                  });
                }}
                className={`flex-1 py-3 rounded-xl font-bold text-lg transition-all ${
                  playerCount === n
                    ? "bg-orange-500 text-white shadow-lg scale-105"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {n}명
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3 mb-8">
          <label className="block text-sm font-semibold text-gray-700">
            플레이어 이름
          </label>
          {Array.from({ length: playerCount }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#A78BFA"][i],
                }}
              />
              <input
                type="text"
                placeholder={`플레이어 ${i + 1}`}
                value={names[i]}
                onChange={(e) => {
                  const next = [...names];
                  next[i] = e.target.value;
                  setNames(next);
                }}
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:outline-none text-gray-800"
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleStart}
          className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xl rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg"
        >
          게임 시작! 🎮
        </button>

        <div className="mt-6 p-4 bg-amber-50 rounded-xl">
          <p className="text-xs text-amber-700 leading-relaxed">
            <strong>🎯 게임 설명:</strong> 플레이어 중 한 명은 <strong>빌런</strong>!
            나머지는 <strong>시민</strong>입니다. 빌런은 비밀 미션을 수행하고,
            시민들은 빌런을 찾아내세요. 매너 온도를 관리하며 물건을 사고팔아
            최고 점수를 노려보세요!
          </p>
        </div>
      </div>
    </div>
  );
}
