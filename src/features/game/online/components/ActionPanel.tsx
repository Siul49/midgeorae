import { type ReactNode } from "react";
import {
  Gift,
  Heart,
  Handshake,
  Eye,
  MessageCircleWarning,
  Recycle,
  Repeat2,
  ShoppingBag,
  AlertTriangle,
} from "lucide-react";
import type { ActionCardSnapshot, ActionCardType, PublicPlayer, ItemCardSnapshot } from "../../server/types/game-server-types";
import { moneyLabel, categoryLabel, CARD_BACK } from "../constants/ui-constants";
import { CardImage } from "./CardImage";
import { SelectLabel } from "./StatusComponents";

function isTradeRequestAction(card: ActionCardSnapshot | null) {
  return (
    card?.type === "tradeRequest" ||
    card?.type === "freeGive" ||
    card?.type === "directTrade" ||
    card?.type === "forceBuy" ||
    card?.type === "freeShare"
  );
}

function actionIcon(type: ActionCardType) {
  switch (type) {
    case "freeGive":
      return <Gift size={18} />;
    case "freeShare":
      return <Heart size={18} />;
    case "forceBuy":
      return <Handshake size={18} />;
    case "directTrade":
      return <Eye size={18} />;
    case "badReview":
      return <MessageCircleWarning size={18} />;
    case "recycle":
      return <Recycle size={18} />;
    case "swap":
      return <Repeat2 size={18} />;
    case "tradeRequest":
    default:
      return <ShoppingBag size={18} />;
  }
}

function turnStateCopy({
  action,
  isMyTurn,
  pendingDealActive,
  currentPlayerName,
}: {
  action: ActionCardSnapshot | null;
  isMyTurn: boolean;
  pendingDealActive: boolean;
  currentPlayerName: string;
}) {
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
    if (action.type === "freeGive") {
      return {
        title: `내 턴: ${action.title}`,
        body: "상대의 물건을 강제로 0원에 빼앗아 올 플레이어와 물품을 고르세요.",
      };
    }
    if (action.type === "freeShare") {
      return {
        title: `내 턴: ${action.title}`,
        body: "자신의 물품을 0원에 무료나눔할 플레이어와 내 물품을 고르세요.",
      };
    }
    if (action.type === "forceBuy") {
      return {
        title: `내 턴: ${action.title}`,
        body: "자신의 물품을 설정한 가격에 강매할 플레이어와 내 물품을 고르세요.",
      };
    }
    return {
      title: `내 턴: ${action.title}`,
      body: "상대의 물건을 고르고 가격을 정해 거래를 신청하세요.",
    };
  }
  return {
    title: `내 턴: ${action.title}`,
    body: action.description,
  };
}

function TargetAction({
  players,
  targetId,
  setTargetId,
  buttonLabel,
  icon,
  onSubmit,
  onSkip,
}: {
  players: PublicPlayer[];
  targetId: string;
  setTargetId: (value: string) => void;
  buttonLabel: string;
  icon: ReactNode;
  onSubmit: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="market-card-lane mt-4 space-y-3 p-4">
      <SelectLabel label="대상">
        <select
          value={targetId}
          onChange={(event) => setTargetId(event.target.value)}
          className="w-full border border-stone-300 bg-white px-3 py-2 text-sm font-bold"
        >
          <option value="">-- 대상 선택 --</option>
          {players.map((player) => (
            <option key={player.id} value={player.id}>
              {player.name}
            </option>
          ))}
        </select>
      </SelectLabel>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onSubmit}
          disabled={!targetId}
          className="motion-button inline-flex items-center justify-center gap-2 bg-stone-950 px-4 py-3 text-sm font-black text-white hover:bg-orange-700 disabled:bg-stone-300"
        >
          {icon}
          {buttonLabel}
        </button>
        <button
          onClick={onSkip}
          className="motion-button border border-stone-300 px-4 py-3 text-sm font-black hover:bg-stone-100"
        >
          넘기기
        </button>
      </div>
    </div>
  );
}

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
}: ActionPanelProps) {
  const tradeActionActive = isTradeRequestAction(action);
  const isRequestFromOther =
    action?.type !== "forceBuy" && action?.type !== "freeShare";
  const selectedItem = (
    isRequestFromOther ? requestableItems : myHand
  ).find((item) => item.instanceId === selectedItemId);
  const bricks = myHand.filter((item) => item.isBrick);
  const recycleItemId = bricks.some((item) => item.instanceId === selectedItemId)
    ? selectedItemId
    : (bricks[0]?.instanceId ?? "");
  const panelCopy = turnStateCopy({
    action,
    isMyTurn,
    pendingDealActive,
    currentPlayerName,
  });
  const panelTitle = action ? action.title : "행동카드";
  const panelBody =
    action || pendingDealActive || !isMyTurn
      ? panelCopy.body
      : "내 턴이면 여기서 행동카드를 뽑습니다.";

  return (
    <section
      className={`motion-panel border ${compact ? "p-4" : "p-5"} ${
        isMyTurn
          ? "border-orange-400 bg-orange-50/95 ring-2 ring-orange-500/40"
          : "border-stone-300 bg-white/90"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">{panelTitle}</h2>
          <p className="mt-1 text-sm font-bold text-stone-500">
            {panelBody}
          </p>
        </div>
        {action && (
          <span className="inline-flex items-center gap-2 border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-black text-orange-700">
            {actionIcon(action.type)}
            {action.title}
          </span>
        )}
      </div>

      {!isMyTurn ? (
        <p className="mt-4 text-sm font-bold text-stone-500">
          지금은 {currentPlayerName || "다른 플레이어"}님의 턴입니다.
        </p>
      ) : pendingDealActive ? (
        <p className="mt-4 text-sm font-bold text-stone-500">
          진행 중인 거래가 끝나면 다음 턴으로 넘어갑니다.
        </p>
      ) : !action ? (
        <div className="action-draw-pad mt-4">
          <button
            onClick={onDraw}
            disabled={loading}
            className="motion-button inline-flex w-full items-center justify-center gap-2 bg-orange-600 px-5 py-4 text-sm font-black text-white hover:bg-orange-700 disabled:opacity-50"
          >
            <ShoppingBag size={18} />
            행동카드 뽑기
          </button>
        </div>
      ) : tradeActionActive ? (
        <div
          className={
            compact
              ? "mt-4 grid gap-3"
              : "mt-4 grid gap-4 lg:grid-cols-[220px_1fr]"
          }
        >
          <div className={`deal-card-lift ${compact ? "mx-auto w-full max-w-36" : ""}`}>
            <CardImage
              src={selectedItem?.imagePath ?? CARD_BACK}
              alt={selectedItem?.name ?? "선택한 물건"}
            />
          </div>
          <div className="market-card-lane space-y-3 p-4">
            {(action?.type === "forceBuy" || action?.type === "freeShare") && (
              <SelectLabel label={action.type === "forceBuy" ? "강매 대상 플레이어" : "무료나눔 대상 플레이어"}>
                <select
                  value={dealTargetId}
                  onChange={(event) => setDealTargetId(event.target.value)}
                  className="w-full border border-stone-300 bg-white px-3 py-2 text-sm font-bold"
                >
                  <option value="">-- 대상 선택 --</option>
                  {otherPlayers.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name}
                    </option>
                  ))}
                </select>
              </SelectLabel>
            )}
            <div className="mb-2 p-3 bg-stone-100 rounded text-sm font-bold text-stone-700">
              {selectedItem ? (
                <>
                  <div className="text-orange-700 mb-1">
                    {action?.type === "freeGive" ? (
                      `[기부천사 강탈] ${otherPlayers.find((p) => p.id === dealTargetId)?.name}님의 물건`
                    ) : action?.type === "forceBuy" ? (
                      `[호갱모집 강매] ${otherPlayers.find((p) => p.id === dealTargetId)?.name}님에게 강제 판매할 내 물건`
                    ) : action?.type === "freeShare" ? (
                      `[무료나눔] ${otherPlayers.find((p) => p.id === dealTargetId)?.name}님에게 강제 나눔할 내 물건`
                    ) : (
                      `[선택됨] ${otherPlayers.find((p) => p.id === dealTargetId)?.name}님의 물건`
                    )}
                  </div>
                  <div>
                    {selectedItem.name || "미공개"} · {categoryLabel(selectedItem.category)}
                  </div>
                </>
              ) : (
                <div className="text-stone-400">
                  {action?.type === "forceBuy" || action?.type === "freeShare" ? (
                    "나의 손패에서 보낼 물건을 선택해주세요."
                  ) : (
                    "좌측 시장 매물판에서 거래할 물건을 선택해주세요."
                  )}
                </div>
              )}
            </div>
            <SelectLabel label="제시 가격">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={action.type === "freeGive" || action.type === "freeShare" || askingPrice <= 0}
                  onClick={() => setAskingPrice(Math.max(0, askingPrice - 50000))}
                  className="flex h-9 w-12 shrink-0 items-center justify-center border border-stone-300 bg-stone-100 hover:bg-stone-200 disabled:opacity-50 text-stone-700 font-black text-xs transition-colors"
                >
                  -5만
                </button>
                <input
                  type="number"
                  value={action.type === "freeGive" || action.type === "freeShare" ? 0 : askingPrice}
                  onChange={(event) => setAskingPrice(Math.max(0, Number(event.target.value)))}
                  disabled={action.type === "freeGive" || action.type === "freeShare"}
                  min={0}
                  step={50000}
                  className="w-full text-center border border-stone-300 bg-white px-3 py-2 text-sm font-bold disabled:bg-stone-100 focus:outline-none focus:border-orange-500"
                />
                <button
                  type="button"
                  disabled={action.type === "freeGive" || action.type === "freeShare"}
                  onClick={() => setAskingPrice(askingPrice + 50000)}
                  className="flex h-9 w-12 shrink-0 items-center justify-center border border-stone-300 bg-stone-100 hover:bg-stone-200 disabled:opacity-50 text-stone-700 font-black text-xs transition-colors"
                >
                  +5만
                </button>
              </div>
            </SelectLabel>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onRequestTrade}
                disabled={
                  !selectedItemId ||
                  !dealTargetId ||
                  (action?.type !== "freeGive" && action?.type !== "forceBuy" && action?.type !== "freeShare" && requestableItems.length === 0)
                }
                className="motion-button inline-flex items-center justify-center gap-2 bg-stone-950 px-4 py-3 text-sm font-black text-white hover:bg-orange-700 disabled:bg-stone-300"
              >
                <Handshake size={17} />
                {action?.type === "freeGive"
                  ? "기부천사 (강탈)"
                  : action?.type === "forceBuy"
                    ? "호갱모집 (강매)"
                    : action?.type === "freeShare"
                      ? "무료나눔 (기부)"
                      : "구매 신청"}
              </button>
              <button
                onClick={onSkip}
                className="motion-button border border-stone-300 px-4 py-3 text-sm font-black hover:bg-stone-100"
              >
                넘기기
              </button>
            </div>
          </div>
        </div>
      ) : action.type === "badReview" ? (
        <TargetAction
          players={otherPlayers}
          targetId={actionTargetId}
          setTargetId={setActionTargetId}
          buttonLabel="악플테러"
          icon={<MessageCircleWarning size={17} />}
          onSubmit={onTerror}
          onSkip={onSkip}
        />
      ) : action.type === "swap" ? (
        <TargetAction
          players={otherPlayers}
          targetId={actionTargetId}
          setTargetId={setActionTargetId}
          buttonLabel="물물교환"
          icon={<Repeat2 size={17} />}
          onSubmit={onSwap}
          onSkip={onSkip}
        />
      ) : action.type === "recycle" ? (
        <div className="mt-4 space-y-3">
          <SelectLabel label="분리수거할 벽돌">
            <select
              value={recycleItemId}
              onChange={(event) => setSelectedItemId(event.target.value)}
              className="w-full border border-stone-300 bg-white px-3 py-2 text-sm font-bold"
            >
              {bricks.length === 0 ? (
                <option value="">벽돌 없음</option>
              ) : (
                bricks.map((item) => (
                  <option key={item.instanceId} value={item.instanceId}>
                    {item.name}
                  </option>
                ))
              )}
            </select>
          </SelectLabel>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onRecycle(recycleItemId)}
              disabled={!recycleItemId}
              className="motion-button inline-flex items-center justify-center gap-2 bg-teal-700 px-4 py-3 text-sm font-black text-white hover:bg-teal-800 disabled:bg-stone-300"
            >
              <Recycle size={17} />
              분리수거
            </button>
            <button
              onClick={onSkip}
              className="motion-button border border-stone-300 px-4 py-3 text-sm font-black hover:bg-stone-100"
            >
              넘기기
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
