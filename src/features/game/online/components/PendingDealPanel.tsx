import { useState, useEffect } from "react";
import { FileText, ThumbsUp, ThumbsDown, Ban, Handshake, Check, Search } from "lucide-react";
import type { RoomSnapshot, ItemCardSnapshot, PlayerSnapshot } from "../../server/types/game-server-types";
import type { DealCardChoice } from "../../server/types/game-server-types";
import { moneyLabel, categoryLabel, conditionLabel, CARD_BACK } from "../constants/ui-constants";
import { CardImage } from "./CardImage";

function playerName(snapshot: RoomSnapshot, playerId: string) {
  return (
    snapshot.players.find((player) => player.id === playerId)?.name ?? "플레이어"
  );
}

interface PendingDealPanelProps {
  snapshot: RoomSnapshot;
  item: ItemCardSnapshot | null;
  isDealParty: boolean;
  myChoice: DealCardChoice | undefined;
  onChoose: (choice: DealCardChoice, scam?: boolean) => void;
  onNego: (price: number) => void;
  me: PlayerSnapshot | null;
  onUseInspectToken?: () => void;
  onUseNegoToken?: () => void;
}

export function PendingDealPanel({
  snapshot,
  item,
  isDealParty,
  myChoice,
  onChoose,
  onNego,
  me,
  onUseInspectToken,
  onUseNegoToken,
}: PendingDealPanelProps) {
  const deal = snapshot.pendingDeal;
  const currentPrice = deal ? (deal.currentOffer !== undefined ? deal.currentOffer : deal.askingPrice) : 0;
  const [negoPrice, setNegoPrice] = useState(currentPrice);
  const [showNegoInput, setShowNegoInput] = useState(false);

  useEffect(() => {
    setNegoPrice(currentPrice);
  }, [currentPrice]);

  if (!deal) return null;

  return (
    <section className="motion-panel-strong deal-note">
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-orange-900/10 pb-3">
          <div>
            <h2 className="text-xl font-black text-orange-950">거래 장부 (진행 중)</h2>
            <p className="mt-1 text-sm font-bold text-orange-800">
              {playerName(snapshot, deal.requesterId)} →{" "}
              {playerName(snapshot, deal.ownerId)} · 최초가: {moneyLabel(deal.askingPrice)}
            </p>
          </div>
          <FileText className="text-orange-700 opacity-60" size={32} />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-[128px_1fr]">
          <div className="deal-card-lift mx-auto w-full max-w-32">
            {item ? (
              <CardImage src={item.imagePath} alt={item.name} />
            ) : (
              <CardImage src={CARD_BACK} alt="뒤집힌 물건" />
            )}
          </div>
          <div className="market-card-lane bg-white/78 p-4">
            <div className="text-xs font-black uppercase text-orange-700">물건</div>
            <div className="mt-1 text-2xl font-black text-stone-950">
              {item?.name ?? "뒤집힌 물건"}
            </div>
            {item?.originalPrice ? (
              <div className="mt-2 text-xs font-bold text-stone-500 line-through decoration-stone-400">
                정가 {moneyLabel(item.originalPrice)}
              </div>
            ) : null}
            <div className="mt-1 text-sm font-bold text-stone-500">
              시장가 {item && item.marketPrice > 0 ? moneyLabel(item.marketPrice) : "시세 미공개"}
            </div>
            {item?.category && (
              <div className="mt-2 text-xs font-black text-stone-500">
                {categoryLabel(item.category)} · {conditionLabel(item.condition)}
              </div>
            )}

            <div className="mt-3 border-t border-stone-200/60 pt-3">
              <div className="text-lg font-black text-orange-700 flex items-center gap-2">
                제안 가격: {moneyLabel(currentPrice)}
                {deal.negoCount !== undefined && deal.negoCount > 0 && (
                  <span className="text-xs border border-orange-200 bg-orange-50 px-2 py-0.5 rounded text-orange-600 font-bold">
                    흥정 {deal.negoCount}회째
                  </span>
                )}
              </div>
            </div>

            {deal.inspectedResult && (
              <div className={`mt-3 rounded-lg border p-3 ${
                deal.inspectedResult === "scam"
                  ? "border-red-300 bg-red-50 text-red-800"
                  : "border-emerald-300 bg-emerald-50 text-emerald-800"
              }`}>
                <div className="text-xs font-black uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Search size={12} />
                  정밀 감정 결과
                </div>
                <div className="text-sm font-black">
                  {deal.inspectedResult === "scam"
                    ? "🚨 경고: 이 물품은 사기(벽돌)입니다!"
                    : "✅ 확인: 이 물품은 정상 제품(정품)입니다."}
                </div>
              </div>
            )}

            {isDealParty ? (
              myChoice ? (
                <div className="mt-5 inline-flex items-center gap-2 border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-black text-stone-700">
                  <Check size={16} />
                  내 거래 카드 선택 완료
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  {showNegoInput ? (
                    <div className="bg-orange-50/50 border border-orange-100 p-3 rounded-lg">
                      <div className="text-xs font-black text-orange-800 uppercase mb-2">원하는 가격으로 흥정(역제안)</div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={negoPrice <= 0}
                          onClick={() => setNegoPrice(Math.max(0, negoPrice - 50000))}
                          className="flex h-9 w-12 items-center justify-center border border-stone-300 bg-white hover:bg-stone-100 disabled:opacity-50 text-stone-700 font-black text-xs transition-colors"
                        >
                          -5만
                        </button>
                        <input
                          type="number"
                          value={negoPrice}
                          onChange={(event) => setNegoPrice(Math.max(0, Number(event.target.value)))}
                          min={0}
                          step={50000}
                          className="w-32 text-center border border-stone-300 bg-white px-2 py-1.5 text-sm font-bold focus:outline-none focus:border-orange-500"
                        />
                        <button
                          type="button"
                          onClick={() => setNegoPrice(negoPrice + 50000)}
                          className="flex h-9 w-12 items-center justify-center border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 font-black text-xs transition-colors"
                        >
                          +5만
                        </button>
                        <button
                          onClick={() => {
                            onNego(negoPrice);
                            setShowNegoInput(false);
                          }}
                          className="motion-button inline-flex items-center justify-center gap-1.5 bg-orange-600 px-4 py-2 text-sm font-black text-white hover:bg-orange-700 transition-colors"
                        >
                          <Handshake size={15} />
                          역제안 보내기
                        </button>
                        <button
                          onClick={() => setShowNegoInput(false)}
                          className="motion-button inline-flex items-center justify-center gap-1.5 border border-stone-300 bg-white px-4 py-2 text-sm font-black hover:bg-stone-100 transition-colors"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <button
                          onClick={() => onChoose("cool")}
                          className="motion-button inline-flex items-center justify-center gap-2 bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-700"
                        >
                          <ThumbsUp size={17} />
                          쿨거래
                        </button>
                        <button
                          onClick={() => onChoose("cancel")}
                          className="motion-button inline-flex items-center justify-center gap-2 border border-red-300 bg-red-50 px-4 py-3 text-sm font-black text-red-700 hover:bg-red-100"
                        >
                          <Ban size={17} />
                          거래취소
                        </button>
                      </div>

                      {deal.lastOfferPlayerId !== me?.id ? (
                        <button
                          onClick={() => setShowNegoInput(true)}
                          className="motion-button flex w-full items-center justify-center gap-2 border border-orange-300 bg-orange-50 px-4 py-2.5 text-sm font-black text-orange-700 hover:bg-orange-100"
                        >
                          <Handshake size={17} />
                          흥정하기 (역제안)
                        </button>
                      ) : (
                        <div className="text-xs font-bold text-stone-500 bg-stone-50 border border-stone-150 p-2.5 rounded text-center">
                          ⏱️ 내가 가격을 제안했습니다. 상대방의 결정을 기다리는 중입니다.
                        </div>
                      )}

                      {me?.role === "villain" && deal.requesterId === me.id && (
                        <div className="mt-3 rounded-lg border border-red-900/10 bg-red-50/50 p-3">
                          <div className="text-[10px] font-black text-red-800 uppercase tracking-widest mb-1.5">
                            ⚠️ 빌런 전용 사기 행동
                          </div>
                          <button
                            onClick={() => onChoose("cool", true)}
                            className="motion-button flex w-full items-center justify-center gap-2 bg-red-800 px-4 py-3 text-sm font-black text-white hover:bg-red-900 shadow-sm transition-all"
                          >
                            <ThumbsUp size={17} />
                            [빌런 행동] 반값 후려치기 쿨거래
                          </button>
                          <p className="mt-1.5 text-center text-[10px] font-bold text-red-700">
                            * 상대에게는 정상 쿨거래로 보이지만, 실제 정산 시 50%의 금액만 이체됩니다.
                          </p>
                        </div>
                      )}

                      {/* 감정 토큰 사용 버튼 */}
                      {isDealParty && !myChoice && me && deal.requesterId === me.id && !deal.inspectedResult && me.inspectTokens !== undefined && me.inspectTokens >= 1 && (
                        <button
                          onClick={onUseInspectToken}
                          className="motion-button flex w-full items-center justify-center gap-2 border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-black text-blue-700 hover:bg-blue-100"
                        >
                          <Search size={17} />
                          [감정 토큰] 사용하기 (남은 개수: {me.inspectTokens}개)
                        </button>
                      )}

                      {/* 네고 토큰 사용 버튼 */}
                      {isDealParty && !myChoice && me && me.negoTokens !== undefined && me.negoTokens >= 1 && deal.inspectedResult !== "scam" && (
                        <button
                          onClick={onUseNegoToken}
                          className="motion-button flex w-full items-center justify-center gap-2 border border-violet-300 bg-violet-50 px-4 py-2.5 text-sm font-black text-violet-700 hover:bg-violet-100"
                        >
                          <Handshake size={17} />
                          [네고 토큰] 50% 강제 할인 및 즉시 수락 (남은 개수: {me.negoTokens}개)
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            ) : (
              <p className="mt-5 text-sm font-bold text-stone-500">
                거래 당사자의 선택을 기다리는 중입니다.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
