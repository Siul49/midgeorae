"use client";

import { useMemo } from "react";
import { useGame } from "../GameProvider";
import { BOARD_SPACES } from "../data/board";
import { MANNER_SELL_THRESHOLD } from "../types";

function formatWon(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

export function BuyAction() {
  const { state, dispatch } = useGame();
  const player = state.players[state.currentPlayerIndex];
  const space = BOARD_SPACES[player.position];
  const isNego = space.type === "nego";
  const isGolden = space.type === "golden";

  // Memoize prices so they don't change on re-render
  const itemsWithPrices = useMemo(() => {
    return state.marketItems.map((item) => {
      let price = item.marketPrice;
      if (isNego) {
        const seed = Array.from(item.id).reduce(
          (sum, char) => sum + char.charCodeAt(0),
          0,
        );
        price = Math.round(price * (0.7 + (seed % 61) / 100));
      }
      if (player.hasDiscount) {
        price = Math.round(price * 0.5);
      }
      return { item, price };
    });
  }, [state.marketItems, isNego, player.hasDiscount]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">{space.emoji}</div>
          <h2 className="text-2xl font-bold text-gray-800">{space.name}</h2>
          {isNego && (
            <p className="text-amber-600 text-sm mt-1">
              흥정 가능! 가격이 ±30% 변동됩니다
            </p>
          )}
          {isGolden && (
            <p className="text-yellow-600 text-sm mt-1">
              프리미엄 물건이 등장했습니다!
            </p>
          )}
          {player.hasDiscount && (
            <p className="text-green-600 text-sm font-bold mt-1">
              🏷️ 50% 할인 쿠폰 적용 중!
            </p>
          )}
          <p className="text-gray-500 text-sm mt-2">💰 보유금: {formatWon(player.money)}</p>
        </div>

        <div className="space-y-3 mb-6">
          {itemsWithPrices.map(({ item, price }) => {
            const canAfford = player.money >= price;

            return (
              <button
                key={item.id}
                onClick={() => {
                  let negoMultiplier;
                  if (isNego) {
                    const seed = Array.from(item.id).reduce(
                      (sum, char) => sum + char.charCodeAt(0),
                      0,
                    );
                    negoMultiplier = 0.7 + (seed % 61) / 100;
                  }
                  dispatch({ type: "BUY_ITEM", itemId: item.id, negoMultiplier });
                }}
                disabled={!canAfford}
                className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all ${
                  canAfford
                    ? "bg-white hover:bg-green-50 shadow-md hover:shadow-lg hover:scale-[1.02]"
                    : "bg-gray-100 opacity-50 cursor-not-allowed"
                }`}
              >
                <div className="text-3xl">{item.emoji}</div>
                <div className="flex-1 text-left">
                  <div className="font-bold text-gray-800">{item.name}</div>
                  <div className="text-xs text-gray-400">{item.category}</div>
                </div>
                <div className="text-right">
                  {isNego && (
                    <div className="text-xs text-gray-400 line-through">
                      {formatWon(item.marketPrice)}
                    </div>
                  )}
                  <div className={`font-bold text-lg ${canAfford ? "text-green-600" : "text-gray-400"}`}>
                    {formatWon(price)}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => dispatch({ type: "SKIP_BUY" })}
          className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-600 font-semibold rounded-xl transition-all"
        >
          구매 안 함
        </button>
      </div>
    </div>
  );
}

export function SellAction() {
  const { state, dispatch } = useGame();
  const player = state.players[state.currentPlayerIndex];

  if (player.mannerTemp < MANNER_SELL_THRESHOLD) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-red-600">판매 불가!</h2>
          <p className="text-gray-500 mt-2">매너 온도가 너무 낮아 아무도 사주지 않습니다.</p>
          <p className="text-sm text-gray-400 mt-1">현재 매너 온도: {player.mannerTemp.toFixed(1)}°C</p>
          <button
            onClick={() => dispatch({ type: "SKIP_BUY" })}
            className="mt-6 px-8 py-3 bg-gray-200 hover:bg-gray-300 text-gray-600 font-semibold rounded-xl"
          >
            넘어가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-yellow-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">💰</div>
          <h2 className="text-2xl font-bold text-gray-800">판매존</h2>
          <p className="text-gray-500 text-sm">팔 물건을 선택하세요</p>
        </div>

        {player.items.length === 0 ? (
          <div className="text-center p-8">
            <div className="text-4xl mb-2">📦</div>
            <p className="text-gray-500">판매할 물건이 없습니다</p>
            <button
              onClick={() => dispatch({ type: "SKIP_BUY" })}
              className="mt-4 px-8 py-3 bg-gray-200 hover:bg-gray-300 text-gray-600 font-semibold rounded-xl"
            >
              넘어가기
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-6">
              {player.items.map((owned, idx) => (
                <button
                  key={idx}
                  onClick={() => dispatch({ type: "START_SELL", itemIndex: idx })}
                  className="w-full p-4 bg-white rounded-2xl flex items-center gap-4 shadow-md hover:shadow-lg hover:bg-amber-50 transition-all hover:scale-[1.02]"
                >
                  <div className="text-3xl">{owned.item.emoji}</div>
                  <div className="flex-1 text-left">
                    <div className="font-bold text-gray-800">{owned.item.name}</div>
                    <div className="text-xs text-gray-400">
                      구매가: {formatWon(owned.purchasePrice)}
                    </div>
                  </div>
                  <div className="text-amber-600 font-bold">
                    {formatWon(owned.item.marketPrice)}
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => dispatch({ type: "SKIP_BUY" })}
              className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-600 font-semibold rounded-xl"
            >
              판매 안 함
            </button>
          </>
        )}
      </div>
    </div>
  );
}
