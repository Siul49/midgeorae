"use client";

import { useState, useEffect } from "react";
import { useGame } from "../GameProvider";
import { BOARD_SPACES } from "../data/board";

function formatWon(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

const DICE_FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

export function DiceRoll() {
  const { state, dispatch } = useGame();
  const [rolling, setRolling] = useState(false);
  const [displayFace, setDisplayFace] = useState("⚀");
  const player = state.players[state.currentPlayerIndex];

  useEffect(() => {
    if (!rolling) return;
    const interval = setInterval(() => {
      setDisplayFace(DICE_FACES[Math.floor(Math.random() * 6)]);
    }, 80);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      dispatch({ type: "ROLL_DICE" });
      setRolling(false);
    }, 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [rolling, dispatch]);

  if (state.phase === "moving" && state.diceValue) {
    const targetSpace = BOARD_SPACES[player.position];
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-8xl mb-6">{DICE_FACES[state.diceValue - 1]}</div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            {state.diceValue} 칸 이동!
          </h2>
          <div className="mt-4 p-4 bg-white rounded-2xl shadow-lg inline-block">
            <div className="text-4xl mb-2">{targetSpace.emoji}</div>
            <div className="text-xl font-bold text-gray-800">{targetSpace.name}</div>
            <div className="text-sm text-gray-500 mt-1">{targetSpace.description}</div>
          </div>
          <button
            onClick={() => dispatch({ type: "MOVE_COMPLETE" })}
            className="mt-6 block mx-auto px-8 py-4 bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-lg rounded-2xl transition-all"
          >
            확인 →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="mb-4">
          <span
            className="inline-block w-10 h-10 rounded-full mr-2 align-middle"
            style={{ backgroundColor: player.color }}
          />
          <span className="text-xl font-bold text-gray-700">{player.name}</span>
          {player.role === "villain" && (
            <span className="ml-2 px-2 py-1 bg-red-100 text-red-600 text-xs rounded-full font-bold">
              빌런 🦹
            </span>
          )}
        </div>

        {player.role === "villain" && player.mission && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-xl max-w-xs mx-auto">
            <div className="text-xs text-red-400 font-semibold">비밀 미션</div>
            <div className="text-sm text-red-700 font-bold">{player.mission.emoji} {player.mission.title}</div>
            <div className="text-xs text-red-500 mt-1">{player.mission.description}</div>
          </div>
        )}

        <div className="flex justify-center gap-4 mb-6 text-sm">
          <div className="bg-white px-3 py-2 rounded-xl shadow">
            💰 {formatWon(player.money)}
          </div>
          <div className="bg-white px-3 py-2 rounded-xl shadow">
            🌡️ {player.mannerTemp.toFixed(1)}°C
          </div>
          <div className="bg-white px-3 py-2 rounded-xl shadow">
            📦 {player.items.length}개
          </div>
        </div>

        <div
          className={`text-9xl mb-8 transition-transform ${
            rolling ? "animate-bounce" : ""
          }`}
        >
          {rolling ? displayFace : "🎲"}
        </div>

        <button
          onClick={() => setRolling(true)}
          disabled={rolling}
          className="px-12 py-5 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-400 text-white font-bold text-xl rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-xl"
        >
          {rolling ? "굴리는 중..." : "주사위 굴리기! 🎲"}
        </button>
      </div>
    </div>
  );
}
