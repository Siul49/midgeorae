"use client";

import React, { useState, useEffect } from "react";
import {
  Handshake,
  Check,
  ThumbsUp,
  ThumbsDown,
  Ban,
  ShoppingBag,
  MessageCircleWarning,
  Repeat2,
  Recycle,
  RotateCcw,
} from "lucide-react";
import type {
  RoomSnapshot,
  ItemCardSnapshot,
  DealCardChoice,
  ActionCardSnapshot,
  PublicPlayer,
} from "@/features/game/server/types";
import {
  moneyLabel,
  categoryLabel,
  conditionLabel,
  isTradeRequestAction,
  playerName,
  productIcon,
} from "./OnlineHelpers";
import { ThemedBoardModal } from "./ThemedBoardModal";

// --- PriceInputControl ---
interface PriceInputControlProps {
  value: number; // in won, e.g. 150000
  onChange: (value: number) => void; // in won
  disabled?: boolean;
  marketPrice?: number; // 정가 정보
}

export function PriceInputControl({ value, onChange, disabled, marketPrice }: PriceInputControlProps) {
  const manValue = Math.round(value / 10000);

  const handleIncrement = () => {
    onChange((manValue + 1) * 10000);
  };

  const handleDecrement = () => {
    if (manValue > 0) {
      onChange((manValue - 1) * 10000);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = Number(e.target.value);
    if (!isNaN(num) && num >= 0) {
      onChange(num * 10000);
    }
  };

  // 정가 기준 80%, 60%, 40% 계산 값 구하기
  const prices = marketPrice && marketPrice > 0 ? {
    mint: Math.round((marketPrice * 0.8) / 10000) * 10000,
    used: Math.round((marketPrice * 0.6) / 10000) * 10000,
    broken: Math.round((marketPrice * 0.4) / 10000) * 10000,
  } : null;

  return (
    <div className="flex flex-col gap-2 items-center shrink-0">
      <div className="flex items-center gap-2 select-none">
        <button
          type="button"
          disabled={disabled || manValue <= 0}
          onClick={handleDecrement}
          className="px-3 py-1.5 bg-stone-900 border border-amber-500/20 hover:border-amber-400 text-stone-300 hover:text-white text-[14px] font-black rounded cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          -1만
        </button>
        <div className="relative flex items-center bg-[rgba(0,0,0,0.45)] border border-amber-500/30 focus-within:border-amber-400 rounded px-2.5 py-1">
          <input
            type="number"
            value={manValue}
            onChange={handleInputChange}
            disabled={disabled}
            min={0}
            className="w-16 text-center text-white bg-transparent text-[16px] font-black focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="text-[13px] text-amber-400/80 font-black ml-1 select-none">만</span>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={handleIncrement}
          className="px-3 py-1.5 bg-stone-900 border border-amber-500/20 hover:border-amber-400 text-stone-300 hover:text-white text-[14px] font-black rounded cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          +1만
        </button>
      </div>
      {prices && !disabled && (
        <div className="flex gap-1.5 mt-1">
          <button
            type="button"
            onClick={() => onChange(prices.mint)}
            className="px-2 py-1 bg-emerald-950/40 border border-emerald-500/30 hover:border-emerald-400 text-emerald-400 hover:text-white text-[11px] font-bold rounded cursor-pointer transition-all"
            title="정가의 80%"
          >
            미개봉({Math.round(prices.mint / 10000)}만)
          </button>
          <button
            type="button"
            onClick={() => onChange(prices.used)}
            className="px-2 py-1 bg-amber-950/40 border border-amber-500/30 hover:border-amber-400 text-amber-400 hover:text-white text-[11px] font-bold rounded cursor-pointer transition-all"
            title="정가의 60%"
          >
            사용감({Math.round(prices.used / 10000)}만)
          </button>
          <button
            type="button"
            onClick={() => onChange(prices.broken)}
            className="px-2 py-1 bg-red-950/40 border border-red-500/30 hover:border-red-400 text-red-400 hover:text-white text-[11px] font-bold rounded cursor-pointer transition-all"
            title="정가의 40%"
          >
            하자({Math.round(prices.broken / 10000)}만)
          </button>
        </div>
      )}
    </div>
  );
}

// Global Helpers for Discover Cards
const playAudio = (type: "hover" | "select" | "flip") => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const audioCtx = new AudioCtx();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    if (type === "hover") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(260, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(130, audioCtx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.03, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
    } else if (type === "select") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(320, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(640, audioCtx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    } else if (type === "flip") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(100, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(280, audioCtx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
    }
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  } catch (e) {}
};

const categoryColors = {
  electronics: "border-amber-500 bg-amber-950/40 shadow-[0_0_12px_rgba(245,158,11,0.25)] text-amber-200",
  fashion: "border-purple-500 bg-purple-950/40 shadow-[0_0_12px_rgba(168,85,247,0.25)] text-purple-200",
  hobby: "border-emerald-500 bg-emerald-950/40 shadow-[0_0_12px_rgba(16,185,129,0.25)] text-emerald-200",
  living: "border-blue-500 bg-blue-950/40 shadow-[0_0_12px_rgba(59,130,246,0.25)] text-blue-200",
};

const categoryTextColors = {
  electronics: "text-amber-400",
  fashion: "text-purple-400",
  hobby: "text-emerald-400",
  living: "text-blue-400",
};

// --- PendingDealPanel ---
interface PendingDealPanelProps {
  snapshot: RoomSnapshot;
  item: ItemCardSnapshot | null;
  isDealParty: boolean;
  myChoice: DealCardChoice | undefined;
  onChoose: (choice: DealCardChoice) => void;
  onPropose: (price: number) => void;
}

export function PendingDealPanel({
  snapshot,
  item,
  isDealParty,
  myChoice,
  onChoose,
  onPropose,
}: PendingDealPanelProps) {
  const deal = snapshot.pendingDeal;
  if (!deal) return null;

  const me = snapshot.me;
  const isSale = deal.actionType === "saleRequest";
  const buyerName = playerName(snapshot, deal.requesterId);
  const sellerName = playerName(snapshot, deal.ownerId);
  const itemName = item?.name ? `[${item.name}]` : "[물건]";

  const [proposalPrice, setProposalPrice] = useState<number>(() => {
    if (deal && deal.askingPrice > 0) return deal.askingPrice;
    return item && item.marketPrice > 0 ? Math.round((item.marketPrice * 0.7) / 10000) * 10000 : 100000;
  });

  const [giftFlipped, setGiftFlipped] = useState(false);

  useEffect(() => {
    setGiftFlipped(false);
  }, [deal?.id]);

  useEffect(() => {
    if (deal) {
      if (deal.askingPrice > 0) {
        setProposalPrice(deal.askingPrice);
      } else {
        setProposalPrice(item && item.marketPrice > 0 ? Math.round((item.marketPrice * 0.7) / 10000) * 10000 : 100000);
      }
    }
  }, [deal?.id, deal?.askingPrice, item?.marketPrice]);

  const isOwner = me && deal.ownerId === me.id;
  const isPriceNeeded = deal.askingPrice === 0 && deal.actionType !== "freeGive";

  let dealMessage = "거래 진행 중";
  if (me) {
    if (deal.actionType === "freeGive") {
      dealMessage = `📢 ${sellerName}님이 무료나눔(0원) 거래를 제안했습니다.`;
    } else if (!isPriceNeeded) {
      if (isDealParty) {
        dealMessage = `📢 ${sellerName}님이 ${moneyLabel(deal.askingPrice)}을 제시했습니다.`;
      } else {
        dealMessage = `📢 ${sellerName}님이 ${buyerName}님에게 ${moneyLabel(deal.askingPrice)} 거래를 제시했습니다.`;
      }
    } else if (!isSale) {
      if (deal.ownerId === me.id) {
        dealMessage = `📢 ${buyerName}님이 내 ${itemName}을(를) 원합니다.`;
      } else if (deal.requesterId === me.id) {
        dealMessage = `📢 ${sellerName}님에게 ${itemName} 구매 제안을 보냈습니다.`;
      } else {
        dealMessage = `📢 ${buyerName}님이 ${sellerName}님의 ${itemName} 구매 제안을 협상 중입니다.`;
      }
    } else {
      if (deal.requesterId === me.id) {
        dealMessage = `📢 ${sellerName}님이 나에게 ${itemName}을(를) 판매하고 싶어합니다.`;
      } else if (deal.ownerId === me.id) {
        dealMessage = `📢 ${buyerName}님에게 ${itemName} 판매 제안을 보냈습니다.`;
      } else {
        dealMessage = `📢 ${sellerName}님이 ${buyerName}님에게 ${itemName} 판매 제안을 협상 중입니다.`;
      }
    }
  }

  // Build Actions Node
  let actionsNode: React.ReactNode = null;
  if (isDealParty) {
    if (isPriceNeeded) {
      if (isOwner) {
        actionsNode = (
          <>
            <button
              onClick={() => onPropose(proposalPrice)}
              className="btn-flat-orange flex-1 cursor-pointer"
            >
              가격 제시 및 수락
            </button>
            <button
              onClick={() => onChoose("cancel")}
              className="btn-flat-cancel flex-1 cursor-pointer"
            >
              거래취소
            </button>
          </>
        );
      } else {
        actionsNode = (
          <div className="flex flex-col gap-2.5 items-center w-full">
            <div className="text-xs font-bold text-stone-400 animate-pulse">
              판매자가 가격을 제시하길 기다리고 있습니다...
            </div>
            <button
              onClick={() => onChoose("cancel")}
              className="btn-flat-cancel cursor-pointer"
            >
              거래취소
            </button>
          </div>
        );
      }
    } else if (myChoice) {
      actionsNode = (
        <div className="wait-status-panel text-center w-full">
          <Check size={14} className="inline mr-1" />
          내 결정 완료 (상대방의 결정을 기다리는 중)
        </div>
      );
    } else {
      if (deal.actionType === "freeGive" && me?.id === deal.requesterId) {
        actionsNode = (
          <div className="flex justify-center w-full">
            <button
              onClick={() => onChoose("cool")}
              disabled={!giftFlipped}
              className={`btn-flat-orange flex-1 max-w-[320px] cursor-pointer ${
                giftFlipped ? "btn-golden-glow animate-pulse" : "opacity-40 cursor-not-allowed"
              }`}
            >
              <ThumbsUp size={14} className="inline mr-1.5" />
              선물 받기
            </button>
          </div>
        );
      } else {
        actionsNode = (
          <>
            <button
              onClick={() => onChoose("cool")}
              className="btn-flat-orange flex-1 cursor-pointer"
            >
              <ThumbsUp size={14} className="inline mr-1.5" />
              쿨거래
            </button>
            {deal.actionType !== "freeGive" && proposalPrice !== deal.askingPrice && (
              <button
                onClick={() => onPropose(proposalPrice)}
                className="btn-flat-sky flex-1 cursor-pointer"
              >
                <RotateCcw size={14} className="inline mr-1.5" />
                다시 제안
              </button>
            )}
            <button
              onClick={() => onChoose("cancel")}
              className="btn-flat-cancel flex-1 cursor-pointer"
            >
              <Ban size={14} className="inline mr-1.5" />
              거래취소
            </button>
          </>
        );
      }
    }
  } else {
    actionsNode = (
      <div className="text-xs font-bold text-stone-400 animate-pulse py-1 w-full text-center">
        상대방의 결정을 기다리는 중...
      </div>
    );
  }

  return (
    <ThemedBoardModal
      headerText={dealMessage}
      title={
        !isDealParty
          ? (deal.actionType === "freeGive" ? "무료 나눔 관전" : "거래 협상 관전")
          : (deal.actionType === "freeGive" ? "무료 나눔 심사" : "거래 제안 심사")
      }
      actions={actionsNode}
    >
      <div className="modal-details-panel space-y-3.5">
        {deal.actionType === "freeGive" && item ? (
          <div className="flex flex-col items-center justify-center py-4">
            <div
              className={`discover-card-container w-[140px] h-[190px] select-none ${
                (me?.id !== deal.requesterId || giftFlipped) ? "is-flipped" : ""
              } ${me?.id === deal.requesterId && !giftFlipped ? "cursor-pointer" : ""}`}
              onClick={() => {
                if (me?.id !== deal.requesterId || giftFlipped) return;
                setGiftFlipped(true);
                playAudio("flip");
                setTimeout(() => playAudio("select"), 200);
              }}
              onMouseEnter={() => {
                if (me?.id === deal.requesterId && !giftFlipped) {
                  playAudio("hover");
                }
              }}
            >
              <div className="discover-card-inner w-full h-full">
                {/* Card Back */}
                <div className="discover-card-back bg-gradient-to-br from-amber-600 to-amber-900 border-2 border-amber-500 shadow-xl flex flex-col items-center justify-center rounded-2xl absolute inset-0 gap-2">
                  <span className="text-stone-100 font-black text-5xl select-none animate-bounce">🎁</span>
                  <span className="text-[10px] font-black text-amber-200 tracking-wider">클릭하여 열기</span>
                </div>

                {/* Card Front */}
                <div
                  className={`discover-card-front border-2 p-3.5 flex flex-col justify-between rounded-2xl absolute inset-0 ${
                    item.isBrick 
                      ? "border-red-500 bg-red-950/50 shadow-[0_0_15px_rgba(239,68,68,0.35)] text-red-200"
                      : (item.category ? categoryColors[item.category as keyof typeof categoryColors] : "border-stone-700 bg-stone-900/40")
                  }`}
                >
                  <div className={`flex-1 flex items-center justify-center mt-1 ${
                    item.isBrick ? "text-red-400" : (item.category ? categoryTextColors[item.category as keyof typeof categoryTextColors] : "text-stone-300")
                  }`}>
                    {productIcon(item, 52)}
                  </div>
                  <div className="w-full text-center pb-2">
                    <div className="font-extrabold text-white text-[13px] tracking-tight truncate w-full px-1">
                      {item.name}
                    </div>
                    <div className="font-black text-[#ff8e53] text-[11px] mt-0.5 leading-none">
                      {moneyLabel(item.marketPrice)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Description Text */}
            <div className="text-center mt-4 h-6">
              {me?.id === deal.requesterId ? (
                giftFlipped ? (
                  <span className="text-xs font-black text-orange-400">
                    {item.isBrick ? "🚨 어머나! [벽돌]을 선물받았습니다!" : "🎉 [정상 물품]을 선물받았습니다!"}
                  </span>
                ) : (
                  <span className="text-xs font-bold text-amber-500/70 animate-pulse">
                    도착한 선물 상자를 클릭하여 열어보세요!
                  </span>
                )
              ) : (
                <span className="text-xs font-bold text-stone-400">
                  {playerName(snapshot, deal.requesterId)}님이 선물을 열어보고 있습니다...
                </span>
              )}
            </div>
          </div>
        ) : item ? (
          <>
            <div className="details-grid">
              <div className="details-item">
                <span className="details-label">제안 상품</span>
                <span className="details-value highlight">{item.name ?? "알수 없음"}</span>
              </div>
              <div className="details-item">
                <span className="details-label">현재 정가</span>
                <span className="details-value">{item.marketPrice > 0 ? moneyLabel(item.marketPrice) : "정가 미공개"}</span>
              </div>
              <div className="details-item">
                <span className="details-label">아이템 종류</span>
                <span className="details-value">
                  {item.category ? `${categoryLabel(item.category)} (${conditionLabel(item.condition)})` : "일반"}
                </span>
              </div>
            </div>
            {!isPriceNeeded ? (
              <div className="border-t border-white/5 pt-3.5 flex flex-col items-center gap-3">
                <div className="flex items-center justify-center gap-5 font-bold text-[18px]">
                  <span className="text-stone-400">상대 제시 가격</span>
                  <span className="text-orange-400 font-black text-[20px]">{moneyLabel(deal.askingPrice)}</span>
                </div>
                {deal.actionType !== "freeGive" && isDealParty && !myChoice && (
                  <div className="flex items-center justify-center gap-5 font-bold text-[16px] border-t border-white/5 pt-2.5 w-full">
                    <span className="text-stone-400">내가 제안할 가격</span>
                    <PriceInputControl
                      value={proposalPrice}
                      onChange={setProposalPrice}
                      marketPrice={item?.marketPrice}
                    />
                  </div>
                )}
              </div>
            ) : (
              isOwner ? (
                <div className="border-t border-white/5 pt-3 flex flex-col items-center justify-center gap-3 font-bold text-[18px]">
                  <span className="text-stone-400">제시할 가격</span>
                  <PriceInputControl
                    value={proposalPrice}
                    onChange={setProposalPrice}
                    marketPrice={item?.marketPrice}
                  />
                </div>
              ) : (
                <div className="border-t border-white/5 pt-3.5 flex items-center justify-center gap-5 font-bold text-[18px]">
                  <span className="text-stone-400">제시 가격</span>
                  <div className="text-stone-400 animate-pulse text-[15px]">판매자의 가격 제시를 기다리는 중...</div>
                </div>
              )
            )}
          </>
        ) : (
          <div className="text-center text-xs font-bold text-stone-400">물건 정보: 가려짐</div>
        )}
      </div>
    </ThemedBoardModal>
  );
}

// --- ReviewPanel ---
interface ReviewPanelProps {
  snapshot: RoomSnapshot;
  playerId: string;
  onReview: (targetPlayerId: string, satisfied: boolean) => void;
}

export function ReviewPanel({ snapshot, playerId, onReview }: ReviewPanelProps) {
  const myReviews = snapshot.pendingReviews.filter((r) => r.reviewerId === playerId);

  if (myReviews.length === 0) return null;

  return (
    <ThemedBoardModal
      headerText="🎉 거래가 성사되었습니다!"
      headerType="success"
      title="거래 후기 작성"
      description="이번 거래는 만족스러우셨나요? 상대방에 대한 평가를 작성해주세요."
    >
      <div className="flex flex-col gap-4 w-full">
        {myReviews.map((review) => (
          <div
            key={`${review.tradeId}-${review.targetPlayerId}`}
            className="flex flex-col gap-2.5 border-t border-white/5 pt-4 first:border-t-0 first:pt-0"
          >
            <div className="modal-details-panel center-align">
              <div className="details-desc">
                상대방: <span className="highlight text-orange-400 font-extrabold">{playerName(snapshot, review.targetPlayerId)}</span>
              </div>
            </div>
            <div className="modal-actions">
              <button
                onClick={() => onReview(review.targetPlayerId, true)}
                className="btn-flat-sky cursor-pointer"
              >
                <ThumbsUp size={14} className="inline mr-1.5" />
                만족
              </button>
              <button
                onClick={() => onReview(review.targetPlayerId, false)}
                className="btn-flat-cancel cursor-pointer"
              >
                <ThumbsDown size={14} className="inline mr-1.5" />
                불만족
              </button>
            </div>
          </div>
        ))}
      </div>
    </ThemedBoardModal>
  );
}

// --- ActionPanel ---
interface ActionPanelProps {
  action: ActionCardSnapshot | null;
  isMyTurn: boolean;
  loading: boolean;
  myHand: ItemCardSnapshot[];
  selectedItemId: string;
  setSelectedItemId: (value: string) => void;
  otherPlayers: PublicPlayer[];
  requestableItems: ItemCardSnapshot[];
  dealTargetId: string;
  setDealTargetId: (value: string) => void;
  askingPrice: number;
  setAskingPrice: (value: number) => void;
  actionTargetId: string;
  setActionTargetId: (value: string) => void;
  pendingDealActive: boolean;
  currentPlayerName: string;
  onDraw: () => void;
  onRequestTrade: () => void;
  onTerror: () => void;
  onRecycle: (itemInstanceId: string) => void;
  onSwap: () => void;
  onSkip: () => void;
  compact?: boolean;
  error?: string;
  clearError?: () => void;
}

export function ActionPanel({
  action,
  isMyTurn,
  loading,
  myHand,
  selectedItemId,
  setSelectedItemId,
  otherPlayers,
  requestableItems,
  dealTargetId,
  setDealTargetId,
  askingPrice,
  setAskingPrice,
  actionTargetId,
  setActionTargetId,
  pendingDealActive,
  currentPlayerName,
  onDraw,
  onRequestTrade,
  onTerror,
  onRecycle,
  onSwap,
  onSkip,
  compact = false,
  error = "",
  clearError,
}: ActionPanelProps) {
  const isRequestingOthersItem = isTradeRequestAction(action);
  const isDealAction = Boolean(
    action &&
    ["tradeRequest", "freeGive", "directTrade", "saleRequest"].includes(action.type)
  );
  const isSale = action?.type === "saleRequest";
  const isFreeGive = action?.type === "freeGive";
  const isSaleOrGive = isSale || isFreeGive;

  const [shuffledCards, setShuffledCards] = useState<ItemCardSnapshot[]>([]);

  useEffect(() => {
    if (isFreeGive && myHand.length > 0) {
      const shuffled = [...myHand].sort(() => Math.random() - 0.5);
      setShuffledCards(shuffled);
      setSelectedItemId("");
    } else {
      setShuffledCards([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFreeGive, action?.title]);

  const selectedItem = (
    isRequestingOthersItem ? requestableItems : myHand
  ).find((item) => item.instanceId === selectedItemId);
  
  const recycleItemId = selectedItemId || (myHand[0]?.instanceId ?? "");

  // Local turnStateCopy helper inside component
  const getPanelCopy = () => {
    if (!isMyTurn) {
      return {
        title: "대기 중",
        body: `${currentPlayerName || "다른 플레이어"}님의 차례입니다.`,
      };
    }
    if (pendingDealActive) {
      return {
        title: "내 턴: 거래 응답 대기",
        body: "진행 중인 거래 카드 선택이 끝나면 다음 단계로 넘어갑니다.",
      };
    }
    if (!action) {
      return {
        title: "내 턴: 행동카드 뽑기",
        body: "아래 액션 패널에서 행동카드를 먼저 뽑으세요.",
      };
    }
    if (isTradeRequestAction(action)) {
      return {
        title: `내 턴: ${action.title}`,
        body: "상대의 물건을 고르고 가격을 정해 거래를 신청하세요.",
      };
    }
    if (action.type === "saleRequest") {
      return {
        title: `내 턴: ${action.title}`,
        body: "내 물건을 골라 상대에게 판매를 신청하세요.",
      };
    }
    return {
      title: `내 턴: ${action.title}`,
      body: action.description,
    };
  };

  const panelCopy = getPanelCopy();
  const panelTitle = action ? action.title : "행동카드";
  const panelBody =
    action || pendingDealActive || !isMyTurn
      ? (action && isDealAction
        ? (isFreeGive
          ? "내 손패에서 무료나눔할 물건을 고르고, 나눔할 상대 플레이어를 선택하여 거래를 신청하세요. (상대 프로필은 아래의 선택 버튼이나 화면의 프로필을 직접 클릭하여 선택할 수 있습니다.)"
          : isSale
          ? "내 손패에서 판매할 물건을 고르고, 판매할 상대 플레이어와 가격을 입력하여 제안을 보내세요. (상대 프로필은 아래의 선택 버튼이나 화면의 프로필을 직접 클릭하여 선택할 수 있습니다.)"
          : "상대의 물건을 고르고, 거래할 상대 플레이어를 선택하여 거래를 신청하세요. (상대 프로필은 아래의 선택 버튼이나 화면의 프로필을 직접 클릭하여 선택할 수 있습니다.)")
        : panelCopy.body)
      : "내 턴이면 여기서 행동카드를 뽑습니다.";

  // Determine children (middle content)
  let modalContent: React.ReactNode = null;
  let modalActions: React.ReactNode = null;

  if (!isMyTurn) {
    modalActions = (
      <div className="text-xs font-bold text-stone-400 py-2 bg-stone-900/40 rounded border border-white/5 w-full text-center">
        지금은 {currentPlayerName || "다른 플레이어"}님의 턴입니다.
      </div>
    );
  } else if (pendingDealActive) {
    modalActions = (
      <div className="text-xs font-bold text-stone-400 py-2 bg-stone-900/40 rounded border border-white/5 w-full text-center">
        진행 중인 거래가 끝나면 다음 턴으로 넘어갑니다.
      </div>
    );
  } else if (!action) {
    modalActions = (
      <button
        onClick={onDraw}
        disabled={loading}
        className="btn-flat-orange cursor-pointer"
      >
        <ShoppingBag size={14} className="inline mr-1.5" />
        행동카드 뽑기
      </button>
    );
  } else if (isDealAction) {
    if (isFreeGive) {
      modalContent = (
        <div className="modal-details-panel w-full space-y-4">
          {/* 1. 나눔 상대 선택 */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest text-left">
              나눔 상대 선택 {dealTargetId ? "✅" : "⚠️"}
            </label>
            <div className="flex gap-2 justify-center">
              {otherPlayers.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setDealTargetId(p.id)}
                  className={`flex-1 py-1.5 px-3 text-xs font-black rounded-lg border transition-all cursor-pointer ${
                    dealTargetId === p.id 
                      ? "border-orange-500 bg-orange-950/40 text-orange-400 font-extrabold shadow-[0_0_12px_rgba(249,115,22,0.2)]" 
                      : "border-white/10 bg-black/20 text-stone-300 hover:bg-stone-800"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* 2. 카드 발견 (Discover) UI */}
          <div className="border-t border-white/5 pt-4">
            <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest text-left block mb-3">
              나눔할 카드 무작위 선택 {selectedItemId ? "✅" : "⚠️"}
            </label>
            
            <div className="flex justify-center gap-5 py-2">
              {shuffledCards.map((item, index) => {
                const isSelected = selectedItemId === item.instanceId;
                
                return (
                  <div
                    key={item.instanceId}
                    className={`discover-card-container w-[115px] h-[155px] select-none ${
                      isSelected ? "is-selected" : ""
                    }`}
                    onClick={() => {
                      setSelectedItemId(item.instanceId);
                      playAudio("select");
                    }}
                    onMouseEnter={() => playAudio("hover")}
                  >
                    <div className="discover-card-inner w-full h-full">
                      {/* Card Back */}
                      <div className="discover-card-back bg-stone-900 border-2 border-stone-700/60 shadow-lg flex items-center justify-center rounded-xl absolute inset-0">
                        <span className="text-stone-600 font-black text-4xl select-none">?</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Status / Instruction text */}
            <div className="text-center mt-3 h-5">
              {selectedItemId ? (
                <span className="text-xs font-black text-orange-400 animate-pulse">
                  🎁 무료나눔할 카드가 선택되었습니다. (어떤 카드인지 공개되지 않음)
                </span>
              ) : (
                <span className="text-xs font-bold text-amber-500/70 animate-pulse">
                  뒷면인 카드를 클릭하여 선택하세요!
                </span>
              )}
            </div>
          </div>
        </div>
      );
      modalActions = (
        <>
          <button
            onClick={onRequestTrade}
            disabled={!selectedItemId || !dealTargetId || loading}
            className={`btn-flat-orange cursor-pointer ${
              selectedItemId && dealTargetId && !loading ? "btn-golden-glow" : ""
            }`}
          >
            <Handshake size={14} className="inline mr-1" />
            {loading ? "처리 중..." : "무료나눔 확정"}
          </button>
          <button
            onClick={onSkip}
            disabled={loading}
            className="btn-flat-cancel cursor-pointer"
          >
            넘기기
          </button>
        </>
      );
    } else {
      modalContent = (
        <div className="modal-details-panel w-full space-y-3.5">
          {(!dealTargetId || !selectedItemId) ? (
            <div className="p-3 bg-red-950/20 border border-red-900/40 rounded text-center">
              <span className="text-xs font-black text-red-400 block">⚠️ 선택 필요</span>
              <span className="text-xs font-bold text-stone-400 mt-1 block">
                {isSale
                  ? "화면의 상대 프로필을 클릭하여 판매 대상을 지정하고, 하단 내 손패에서 물건 카드를 선택하세요."
                  : "화면의 상대 프로필과 요청할 상대의 물건 카드를 각각 클릭하여 선택하세요."}
              </span>
            </div>
          ) : (
            <div className="space-y-3.5">
              <div className="details-grid">
                <div className="details-item">
                  <span className="details-label">상대</span>
                  <span className="details-value highlight text-amber-400 truncate">
                    {otherPlayers.find(p => p.id === dealTargetId)?.name ?? "미선택"}
                  </span>
                </div>
                <div className="details-item">
                  <span className="details-label">{isSale ? "판매물건" : "요청물건"}</span>
                  <span className="details-value highlight text-orange-400 truncate" title={selectedItem?.name}>
                    {selectedItem ? selectedItem.name : "선택 안됨"}
                  </span>
                </div>
                <div className="details-item">
                  <span className="details-label">정가</span>
                  <span className="details-value">
                    {selectedItem && selectedItem.marketPrice > 0 ? moneyLabel(selectedItem.marketPrice) : "정가 미공개"}
                  </span>
                </div>
              </div>
              {isSale ? (
                <div className="border-t border-white/5 pt-3.5 flex flex-col items-center justify-center gap-3 font-bold text-[18px]">
                  <span className="text-stone-400">제시 가격</span>
                  <PriceInputControl
                    value={askingPrice}
                    onChange={setAskingPrice}
                    marketPrice={selectedItem?.marketPrice}
                  />
                </div>
              ) : null}
            </div>
          )}
        </div>
      );
      modalActions = (
        <>
          <button
            onClick={onRequestTrade}
            disabled={!selectedItemId || !dealTargetId || loading}
            className="btn-flat-orange cursor-pointer"
          >
            <Handshake size={14} className="inline mr-1" />
            {loading ? "처리 중..." : "거래 신청"}
          </button>
          <button
            onClick={onSkip}
            disabled={loading}
            className="btn-flat-cancel cursor-pointer"
          >
            넘기기
          </button>
        </>
      );
    }
  } else if (action.type === "badReview" || action.type === "swap") {
    const isTerror = action.type === "badReview";
    const selectedPlayer = otherPlayers.find(p => p.id === actionTargetId);
    
    modalContent = (
      <div className="modal-details-panel w-full space-y-3">
        {!actionTargetId ? (
          <div className="p-3 bg-red-950/20 border border-red-900/40 rounded text-center">
            <span className="text-xs font-black text-red-400 block">⚠️ 대상 미지목</span>
            <span className="text-xs font-bold text-stone-400 mt-1 block">
              상대 프로필을 클릭하여 선택하세요. (테이블 상에서 액션을 적용할 대상 플레이어를 직접 클릭)
            </span>
          </div>
        ) : (
          <div className="space-y-2 text-left text-sm font-bold">
            <div className="flex justify-between">
              <span className="text-stone-400">지목된 대상</span>
              <span className="text-amber-400 font-black">{selectedPlayer?.name ?? "알 수 없음"}</span>
            </div>
          </div>
        )}
        <div className="flex flex-col gap-1.5 mt-2.5">
          <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest text-left">지목할 상대 선택</label>
          <div className="flex gap-2">
            {otherPlayers.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setActionTargetId(p.id)}
                className={`flex-1 py-1.5 px-2 text-xs font-black rounded border transition-all cursor-pointer ${
                  actionTargetId === p.id 
                    ? "border-orange-500 bg-orange-950/40 text-orange-400 font-extrabold" 
                    : "border-white/10 bg-black/20 text-stone-300 hover:bg-stone-800"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
    modalActions = (
      <>
        <button
          onClick={isTerror ? onTerror : onSwap}
          disabled={!actionTargetId || loading}
          className="btn-flat-orange cursor-pointer"
          style={isTerror ? { backgroundColor: "#ef4444", color: "#1c1917" } : undefined}
        >
          {isTerror ? <MessageCircleWarning size={14} className="inline mr-1" /> : <Repeat2 size={14} className="inline mr-1" />}
          {loading ? "처리 중..." : (isTerror ? "악플테러" : "물물교환")}
        </button>
        <button
          onClick={onSkip}
          disabled={loading}
          className="btn-flat-cancel cursor-pointer"
        >
          넘기기
        </button>
      </>
    );
  } else if (action.type === "recycle") {
    modalContent = (
      <div className="modal-details-panel w-full space-y-3">
        {!recycleItemId ? (
          <div className="p-3 bg-red-950/20 border border-red-900/40 rounded text-center">
            <span className="text-xs font-black text-red-400 block">⚠️ 물건 미선택</span>
            <span className="text-xs font-bold text-stone-400 mt-1 block">
              하단 내 손패에서 분리수거할 물건 카드를 직접 클릭하세요!
            </span>
          </div>
        ) : (
          <div className="space-y-2 text-left text-sm font-bold">
            <div className="flex justify-between">
              <span className="text-stone-400">선택된 물건</span>
              <span className="text-teal-400 font-black">
                {myHand.find(item => item.instanceId === recycleItemId)?.name ?? "물건"}
              </span>
            </div>
          </div>
        )}
      </div>
    );
    modalActions = (
      <>
        <button
          onClick={() => onRecycle(recycleItemId)}
          disabled={!recycleItemId || loading}
          className="btn-flat-orange cursor-pointer"
          style={{ backgroundColor: "#10b981", color: "#1c1917" }} // emerald/teal accent
        >
          <Recycle size={14} className="inline mr-1.5" />
          {loading ? "처리 중..." : "분리수거"}
        </button>
        <button
          onClick={onSkip}
          disabled={loading}
          className="btn-flat-cancel cursor-pointer"
        >
          넘기기
        </button>
      </>
    );
  }

  return (
    <ThemedBoardModal
      headerText={isMyTurn ? `📢 내 턴: ${panelTitle}` : "⏳ 대기 중"}
      title={panelTitle}
      description={panelBody}
      actions={modalActions}
    >
      {error && (
        <div className="p-3 bg-red-950/40 border border-red-900/40 rounded text-center text-xs font-black text-red-400 mb-3 flex items-center justify-between animate-fade-in select-text">
          <span>⚠️ {error}</span>
          {clearError && (
            <button
              type="button"
              onClick={clearError}
              className="text-red-300 hover:text-white cursor-pointer font-black ml-2"
            >
              ✕
            </button>
          )}
        </div>
      )}
      {modalContent}
    </ThemedBoardModal>
  );
}
