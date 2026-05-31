"use client";

import { useState } from "react";
import { useGame } from "../GameProvider";

function formatWon(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

export function TradeDialog() {
  const { state, dispatch } = useGame();
  const trade = state.currentTrade;
  const [offerPrice, setOfferPrice] = useState(0);

  if (!trade) return null;

  const seller = state.players.find((p) => p.id === trade.sellerId)!;
  const buyer = trade.buyerId !== null ? state.players.find((p) => p.id === trade.buyerId) : null;
  const otherPlayers = state.players.filter(
    (p) => p.id !== trade.sellerId
  );

  // Listing phase - waiting for a buyer
  if (trade.phase === "listing") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="text-5xl mb-2">🤝</div>
            <h2 className="text-2xl font-bold text-gray-800">거래 진행 중</h2>
            <p className="text-gray-500 text-sm mt-1">
              {seller.name}이(가) 물건을 판매합니다
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-lg mb-6">
            <div className="flex items-center gap-4">
              <div className="text-4xl">{trade.item.item.emoji}</div>
              <div className="flex-1">
                <div className="font-bold text-lg">{trade.item.item.name}</div>
                <div className="text-amber-600 font-bold">
                  희망가: {formatWon(trade.askingPrice)}
                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-gray-600 font-semibold mb-4">
            구매하실 분은?
          </p>

          <div className="space-y-3 mb-4">
            {otherPlayers.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setOfferPrice(trade.askingPrice);
                  dispatch({ type: "JOIN_TRADE", buyerId: p.id });
                }}
                disabled={p.money < Math.round(trade.askingPrice * 0.5)}
                className={`w-full p-4 rounded-2xl flex items-center gap-3 transition-all ${
                  p.money >= Math.round(trade.askingPrice * 0.5)
                    ? "bg-white hover:bg-purple-50 shadow-md hover:shadow-lg"
                    : "bg-gray-100 opacity-50 cursor-not-allowed"
                }`}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: p.color }}
                >
                  {p.name[0]}
                </div>
                <div className="flex-1 text-left">
                  <div className="font-bold">{p.name}</div>
                  <div className="text-xs text-gray-400">💰 {formatWon(p.money)}</div>
                </div>
                <div className="text-sm text-gray-400">
                  🌡️ {p.mannerTemp.toFixed(1)}°C
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={() => dispatch({ type: "CANCEL_TRADE" })}
            className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-600 font-semibold rounded-xl"
          >
            판매 취소
          </button>
        </div>
      </div>
    );
  }

  // Negotiating phase
  if (trade.phase === "negotiating" && buyer) {
    const minOffer = Math.round(trade.askingPrice * 0.3);
    const maxOffer = Math.round(trade.askingPrice * 1.5);

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">💬 흥정 중!</h2>
            <p className="text-gray-500 text-sm">
              {buyer.name} ↔ {seller.name}
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-lg mb-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="text-3xl">{trade.item.item.emoji}</div>
              <div className="flex-1">
                <div className="font-bold">{trade.item.item.name}</div>
                <div className="text-sm text-gray-400">
                  시장가: {formatWon(trade.item.item.basePrice)}
                </div>
              </div>
              <div className="text-amber-600 font-bold text-lg">
                {formatWon(trade.askingPrice)}
              </div>
            </div>
            {trade.negoCount > 0 && (
              <div className="text-xs text-gray-400 text-center">
                흥정 {trade.negoCount}회째
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-lg mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              {buyer.name}의 제안 가격
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setOfferPrice(Math.max(minOffer, offerPrice - 10000))}
                className="w-12 h-12 bg-gray-100 hover:bg-gray-200 rounded-xl text-xl font-bold"
              >
                -
              </button>
              <input
                type="number"
                value={offerPrice}
                onChange={(e) => {
                  const v = parseInt(e.target.value) || 0;
                  setOfferPrice(Math.max(minOffer, Math.min(maxOffer, v)));
                }}
                className="flex-1 text-center text-2xl font-bold border-2 border-gray-200 rounded-xl py-2 focus:border-purple-400 focus:outline-none"
              />
              <button
                onClick={() => setOfferPrice(Math.min(maxOffer, offerPrice + 10000))}
                className="w-12 h-12 bg-gray-100 hover:bg-gray-200 rounded-xl text-xl font-bold"
              >
                +
              </button>
            </div>
            <div className="text-center text-sm text-gray-400 mt-1">원</div>

            <div className="flex gap-2 mt-3">
              {[0.5, 0.7, 0.85, 1].map((ratio) => (
                <button
                  key={ratio}
                  onClick={() => setOfferPrice(Math.round(trade.askingPrice * ratio))}
                  className="flex-1 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold"
                >
                  {Math.round(ratio * 100)}%
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                dispatch({ type: "MAKE_OFFER", price: offerPrice });
              }}
              disabled={offerPrice <= 0 || buyer.money < offerPrice}
              className="flex-1 py-4 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white font-bold rounded-xl transition-all"
            >
              제안하기
            </button>
            <button
              onClick={() => dispatch({ type: "CANCEL_TRADE" })}
              className="py-4 px-6 bg-gray-200 hover:bg-gray-300 text-gray-600 font-bold rounded-xl"
            >
              거래 파기
            </button>
          </div>

          {trade.currentOffer > 0 && (
            <div className="mt-4 p-4 bg-amber-50 rounded-2xl border border-amber-200">
              <p className="text-center text-amber-700 font-semibold mb-3">
                현재 제안: {formatWon(trade.currentOffer)}
              </p>
              <p className="text-center text-sm text-gray-500 mb-3">
                {seller.name}, 이 가격에 판매하시겠습니까?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => dispatch({ type: "ACCEPT_OFFER" })}
                  className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl"
                >
                  수락 ✅
                </button>
                <button
                  onClick={() => dispatch({ type: "REJECT_OFFER" })}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl"
                >
                  거절 ❌
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
