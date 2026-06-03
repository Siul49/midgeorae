"use client";

import { useGame } from "../GameProvider";

function formatWon(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

export function EventCardView() {
  const { state, dispatch } = useGame();
  const event = state.currentEvent;

  if (!event) return null;

  const effectText = () => {
    switch (event.effect.type) {
      case "money":
        return event.effect.amount > 0
          ? `💰 +${formatWon(event.effect.amount)}`
          : `💸 ${formatWon(event.effect.amount)}`;
      case "manner":
        return event.effect.amount > 0
          ? `🌡️ +${event.effect.amount}°C`
          : `🌡️ ${event.effect.amount}°C`;
      case "loseItem":
        return "📦 물건 1개 손실";
      case "gainLike":
        return `👍 좋아요 +${event.effect.count}`;
      case "gainDislike":
        return `👎 싫어요 +${event.effect.count}`;
      case "discount":
        return `🏷️ 다음 구매 ${event.effect.percent}% 할인`;
      case "revealAssets":
        return "👀 모든 자산 공개";
      case "forceTrade":
        return "⚡ 즉석 거래";
      case "stealItem":
        return "🤫 물건 훔치기";
      case "skipTurn":
        return "⏭️ 다음 턴 건너뜀";
      case "extraTurn":
        return "🔥 추가 턴 획득";
      case "swapItems":
        return "🔄 물건 교환";
    }
  };

  const isNegative = (() => {
    switch (event.effect.type) {
      case "money": return event.effect.amount < 0;
      case "manner": return event.effect.amount < 0;
      case "loseItem":
      case "gainDislike":
      case "skipTurn":
        return true;
      default:
        return false;
    }
  })();

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div
          className={`p-8 rounded-3xl shadow-2xl ${
            isNegative
              ? "bg-gradient-to-br from-red-500 to-pink-600"
              : "bg-gradient-to-br from-green-500 to-emerald-600"
          }`}
        >
          <div className="text-center text-white">
            <div className="text-xs font-bold uppercase tracking-wider opacity-70 mb-2">
              이벤트 카드
            </div>
            <div className="text-6xl mb-4">{event.emoji}</div>
            <h2 className="text-2xl font-black mb-3">{event.title}</h2>
            <p className="text-sm opacity-90 mb-6 leading-relaxed">
              {event.description}
            </p>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl py-3 px-4 text-lg font-bold">
              {effectText()}
            </div>
          </div>
        </div>

        {event.effect.type === "revealAssets" && (
          <div className="mt-4 space-y-2">
            {state.players.map((p) => (
              <div key={p.id} className="bg-white p-3 rounded-xl flex items-center gap-3 shadow">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: p.color }}
                >
                  {p.name[0]}
                </div>
                <div className="flex-1 text-sm">
                  <span className="font-bold">{p.name}</span>
                </div>
                <div className="text-xs text-gray-500">
                  💰{formatWon(p.money)} 📦{p.items.length}개 🌡️{p.mannerTemp.toFixed(1)}°C
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => {
            const player = state.players[state.currentPlayerIndex];
            let loseItemIndex;
            let stolenPlayerId;
            let stolenItemIndex;

            if (event.effect.type === "loseItem") {
              if (player.items.length > 0) {
                loseItemIndex = Math.floor(Math.random() * player.items.length);
              }
            } else if (event.effect.type === "stealItem") {
              const otherPlayers = state.players.filter((p) => p.id !== player.id && p.items.length > 0);
              if (otherPlayers.length > 0) {
                const victim = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
                stolenPlayerId = victim.id;
                stolenItemIndex = Math.floor(Math.random() * victim.items.length);
              }
            }

            dispatch({
              type: "RESOLVE_EVENT",
              loseItemIndex,
              stolenPlayerId,
              stolenItemIndex,
            });
          }}
          className="mt-6 w-full py-4 bg-white hover:bg-gray-50 text-gray-800 font-bold text-lg rounded-2xl shadow-lg transition-all"
        >
          확인
        </button>
      </div>
    </div>
  );
}
