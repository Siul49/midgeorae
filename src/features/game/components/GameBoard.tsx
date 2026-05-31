"use client";

import { useGame } from "../GameProvider";
import { BOARD_SPACES } from "../data/board";
import { MANNER_SELL_THRESHOLD, MANNER_BAN_THRESHOLD } from "../types";

function formatWon(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

function MannerGauge({ temp }: { temp: number }) {
  const percent = Math.max(0, Math.min(100, ((temp - 30) / 12) * 100));
  const color =
    temp >= 38 ? "#22c55e" :
    temp >= 36.5 ? "#3b82f6" :
    temp >= 35 ? "#f59e0b" :
    temp >= 33 ? "#ef4444" : "#991b1b";

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1">
        <span>🌡️ {temp.toFixed(1)}°C</span>
        {temp < MANNER_SELL_THRESHOLD && (
          <span className="text-red-500 font-bold">판매 불가!</span>
        )}
        {temp < MANNER_BAN_THRESHOLD && (
          <span className="text-red-700 font-bold">거래 정지!</span>
        )}
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// Board layout: positions around the perimeter of a 6x6 grid (20 cells)
// Top row (0-5): left to right
// Right col (6-8): top to bottom
// Bottom row (9-14): right to left
// Left col (15-19): bottom to top
const BOARD_POSITIONS: { row: number; col: number }[] = [
  // Top row: 0-5 (left to right)
  { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 },
  { row: 0, col: 3 }, { row: 0, col: 4 }, { row: 0, col: 5 },
  // Right column: 6-9 (top to bottom, skip corner already placed)
  { row: 1, col: 5 }, { row: 2, col: 5 }, { row: 3, col: 5 },
  { row: 4, col: 5 },
  // Bottom row: 10-15 (right to left)
  { row: 4, col: 4 }, { row: 4, col: 3 }, { row: 4, col: 2 },
  { row: 4, col: 1 }, { row: 4, col: 0 },
  // Left column: 15-19 (bottom to top, skip corners)
  { row: 3, col: 0 }, { row: 2, col: 0 }, { row: 1, col: 0 },
  { row: 1, col: 1 }, { row: 1, col: 2 },
];

const SPACE_BG: Record<string, string> = {
  start: "bg-orange-100 border-orange-300",
  buy: "bg-green-50 border-green-200",
  sell: "bg-amber-50 border-amber-200",
  freebie: "bg-pink-50 border-pink-200",
  event: "bg-violet-50 border-violet-200",
  manner: "bg-yellow-50 border-yellow-200",
  nego: "bg-teal-50 border-teal-200",
  golden: "bg-amber-100 border-amber-300",
  rest: "bg-blue-50 border-blue-200",
};

export function GameBoard() {
  const { state, dispatch } = useGame();
  const player = state.players[state.currentPlayerIndex];

  // Create a 5x6 grid with spaces placed around the perimeter
  const grid: (number | null)[][] = Array.from({ length: 5 }, () =>
    Array.from({ length: 6 }, () => null)
  );

  BOARD_POSITIONS.forEach((pos, idx) => {
    if (idx < BOARD_SPACES.length) {
      grid[pos.row][pos.col] = idx;
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 p-3">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-gray-500">
          라운드 {state.round}/{state.maxRounds}
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-5 rounded-full"
            style={{ backgroundColor: player.color }}
          />
          <span className="text-sm font-bold text-orange-600">
            {player.name}의 턴
          </span>
        </div>
      </div>

      {/* Board */}
      <div className="bg-white rounded-2xl shadow-xl p-2 mb-3">
        <div className="grid grid-cols-6 gap-1">
          {grid.flat().map((spaceIdx, cellIdx) => {
            if (spaceIdx === null) {
              return (
                <div
                  key={`empty-${cellIdx}`}
                  className="aspect-square rounded-lg"
                />
              );
            }

            const space = BOARD_SPACES[spaceIdx];
            const playersHere = state.players.filter(
              (p) => p.position === spaceIdx
            );
            const isCurrent = player.position === spaceIdx;

            return (
              <div
                key={space.id}
                className={`relative aspect-square rounded-lg flex flex-col items-center justify-center text-center border transition-all ${
                  SPACE_BG[space.type] || "bg-gray-50 border-gray-200"
                } ${isCurrent ? "ring-2 ring-orange-400 scale-110 z-10 shadow-lg" : ""}`}
              >
                <div className="text-base leading-none">{space.emoji}</div>
                <div className="text-[7px] font-bold text-gray-600 mt-0.5 leading-tight truncate w-full px-0.5">
                  {space.name}
                </div>
                {playersHere.length > 0 && (
                  <div className="absolute -top-1 -right-1 flex -space-x-1.5">
                    {playersHere.map((p) => (
                      <div
                        key={p.id}
                        className="w-3.5 h-3.5 rounded-full border border-white shadow-sm"
                        style={{ backgroundColor: p.color }}
                        title={p.name}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Center area: game info */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ display: "none" }}>
          <div className="text-center">
            <div className="text-2xl">🥕</div>
            <div className="text-[10px] font-bold text-gray-400">당근겜</div>
          </div>
        </div>
      </div>

      {/* Player info cards */}
      <div className="space-y-2 mb-3">
        {state.players.map((p) => {
          const isActive = p.id === player.id;
          return (
            <div
              key={p.id}
              className={`p-3 rounded-2xl transition-all ${
                isActive ? "bg-white shadow-lg ring-2" : "bg-white/60"
              }`}
              style={isActive ? { "--tw-ring-color": p.color } as React.CSSProperties : {}}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{ backgroundColor: p.color }}
                >
                  {p.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm">{p.name}</span>
                    {isActive && p.role === "villain" && (
                      <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] rounded font-bold">
                        🦹 빌런
                      </span>
                    )}
                    {p.hasDiscount && (
                      <span className="px-1.5 py-0.5 bg-green-100 text-green-600 text-[10px] rounded font-bold">
                        🏷️ 할인
                      </span>
                    )}
                  </div>
                  <MannerGauge temp={p.mannerTemp} />
                </div>
                <div className="text-right text-xs space-y-0.5 flex-shrink-0">
                  <div className="font-semibold">💰 {formatWon(p.money)}</div>
                  <div>📦 {p.items.length}개</div>
                  <div className="text-[10px] text-gray-400">
                    👍{p.likes} 👎{p.dislikes}
                  </div>
                </div>
              </div>

              {isActive && p.role === "villain" && p.mission && (
                <div className="mt-2 p-2 bg-red-50 rounded-lg border border-red-100">
                  <div className="text-[10px] text-red-500 font-bold">
                    🎯 비밀 미션: {p.mission.emoji} {p.mission.title}
                  </div>
                  <div className="text-[10px] text-red-400">
                    {p.mission.description}
                  </div>
                </div>
              )}

              {isActive && p.items.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {p.items.map((item, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-100 rounded text-[10px]"
                      title={`${item.item.name} (${formatWon(item.item.marketPrice)})`}
                    >
                      {item.item.emoji} {item.item.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action button */}
      <button
        onClick={() => dispatch({ type: "END_TURN" })}
        className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg rounded-2xl shadow-lg transition-all active:scale-95"
      >
        턴 종료 →
      </button>

      {/* Game log */}
      <div className="mt-3 p-3 bg-white/60 rounded-2xl max-h-28 overflow-y-auto">
        <div className="text-xs text-gray-400 font-semibold mb-1">📋 게임 로그</div>
        {state.logs.slice(-6).reverse().map((log, i) => (
          <div key={i} className="text-[10px] text-gray-500 py-0.5 border-b border-gray-100 last:border-0">
            <span className="font-semibold text-gray-600">
              {log.playerId >= 0 ? state.players[log.playerId]?.name : "시스템"}
            </span>
            {" "}{log.details}
          </div>
        ))}
      </div>
    </div>
  );
}
