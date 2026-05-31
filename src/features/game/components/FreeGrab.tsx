"use client";

import { useState, useEffect, useCallback } from "react";
import { useGame } from "../GameProvider";

function formatWon(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

export function FreeGrab() {
  const { state, dispatch } = useGame();
  const item = state.freeGrabItem;
  const [countdown, setCountdown] = useState(3);
  const [grabbed, setGrabbed] = useState(false);
  const canGrab = countdown <= 0;

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleGrab = useCallback(
    (playerId: number) => {
      if (!canGrab || grabbed) return;
      setGrabbed(true);
      dispatch({ type: "FREE_GRAB", playerId });
    },
    [canGrab, grabbed, dispatch]
  );

  if (!item) return null;

  if (state.freeGrabWinnerId !== null) {
    const winner = state.players.find((p) => p.id === state.freeGrabWinnerId);
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {winner?.name}이(가) 획득!
          </h2>
          <div className="inline-flex items-center gap-2 bg-white px-6 py-3 rounded-2xl shadow-lg">
            <span className="text-3xl">{item.emoji}</span>
            <span className="font-bold text-gray-800">{item.name}</span>
            <span className="text-green-600 font-bold">무료!</span>
          </div>
          <button
            onClick={() => dispatch({ type: "END_TURN" })}
            className="mt-6 block mx-auto px-8 py-3 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl"
          >
            다음 →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="text-5xl mb-2">🎁</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-1">무료나눔!</h2>

        <div className="bg-white p-6 rounded-2xl shadow-lg mb-6 inline-block">
          <div className="text-4xl mb-2">{item.emoji}</div>
          <div className="font-bold text-lg">{item.name}</div>
          <div className="text-green-600 font-bold">시장가 {formatWon(item.basePrice)} → 무료!</div>
        </div>

        {countdown > 0 ? (
          <div>
            <div className="text-8xl font-black text-pink-500 animate-pulse mb-4">
              {countdown}
            </div>
            <p className="text-gray-500">준비하세요...</p>
          </div>
        ) : (
          <div>
            <p className="text-xl font-bold text-pink-600 mb-6 animate-bounce">
              광클! 가장 먼저 누르세요!
            </p>
            <div className="grid grid-cols-2 gap-4">
              {state.players.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleGrab(p.id)}
                  disabled={grabbed}
                  className="py-6 rounded-2xl text-white font-bold text-lg transition-all hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50"
                  style={{ backgroundColor: p.color }}
                >
                  {p.name}
                  <div className="text-xs mt-1 opacity-80">탭!</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
