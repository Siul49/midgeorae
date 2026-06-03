"use client";

import {
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  Ban,
  Bike,
  BookOpen,
  Box,
  BrickWall,
  Briefcase,
  Camera,
  Check,
  Copy,
  Crown,
  Eye,
  Gift,
  Gamepad2,
  Guitar,
  Handshake,
  Headphones,
  HelpCircle,
  Keyboard,
  Laptop,
  LogOut,
  MessageCircleWarning,
  Package,
  Play,
  Recycle,
  RefreshCw,
  Repeat2,
  Search,
  Shirt,
  ShoppingBag,
  Smartphone,
  Speaker,
  Star,
  Tablet,
  ThumbsDown,
  ThumbsUp,
  Users,
  Watch,
  FileText,
  Store,
} from "lucide-react";
import Image from "next/image";
import { GameTutorialModal } from "../components/GameTutorialModal";
import { FoldableHelperCard } from "../components/FoldableHelperCard";
import type { ItemCondition } from "../types";
import { ALL_ITEMS } from "../data/items";
import { MAX_PLAYERS, MIN_PLAYERS } from "../rules/game-rules";
import type {
  ActionCardSnapshot,
  ActionCardType,
  DealCardChoice,
  ItemCardSnapshot,
  PublicPlayer,
  RoomMode,
  RoomSnapshot,
  PlayerSnapshot,
  PlayerRole,
} from "@/features/game/server/types";
import { useOnlineGame } from "./hooks/useOnlineGame";

const CARD_BACK = "/game-cards/backs/item-back.png";

const ACTION_PREVIEW_CARDS = [
  { title: "거래 신청", body: "상대 물건에 가격을 제시합니다.", accent: "orange" },
  { title: "가격 협상", body: "가격을 조정합니다.", accent: "orange" },
  { title: "아이템 보호", body: "내 아이템을 1회 보호.", accent: "green" },
  { title: "즉시 구매", body: "시장 아이템을 즉시 구매.", accent: "orange" },
  { title: "리뷰 작성", body: "거래 후 리뷰 작성.", accent: "green" },
] as const;

function moneyLabel(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

function playerName(snapshot: RoomSnapshot, playerId: string) {
  return (
    snapshot.players.find((player) => player.id === playerId)?.name ?? "플레이어"
  );
}

const CATEGORY_LABELS = {
  electronics: "전자기기",
  fashion: "패션",
  hobby: "취미",
  living: "생활",
} as const;

const CONDITION_LABELS = {
  mint: "민트급",
  used: "사용감 있음",
  defective: "하자 있음",
  broken: "파손",
} as const;

function categoryLabel(category: ItemCardSnapshot["category"]) {
  return category ? CATEGORY_LABELS[category] : "미공개";
}

function conditionLabel(condition: ItemCardSnapshot["condition"]) {
  return condition ? CONDITION_LABELS[condition] : "상태 미확인";
}

function marketProgressLabel(snapshot: RoomSnapshot) {
  if (snapshot.marketActionLimit <= 0) return "-";
  return `${snapshot.usedActionCount}/${snapshot.marketActionLimit}`;
}

function actionIcon(type: ActionCardType) {
  switch (type) {
    case "freeGive":
      return <Gift size={18} />;
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

function productIcon(item: ItemCardSnapshot) {
  const iconProps = { size: 72, strokeWidth: 1.8 };
  if (item.isBrick) return <BrickWall {...iconProps} />;

  switch (item.id) {
    case "iphone":
      return <Smartphone {...iconProps} />;
    case "airpods":
      return <Headphones {...iconProps} />;
    case "switch":
      return <Gamepad2 {...iconProps} />;
    case "bicycle":
      return <Bike {...iconProps} />;
    case "books":
      return <BookOpen {...iconProps} />;
    case "sneakers":
      return <Shirt {...iconProps} />;
    case "laptop":
      return <Laptop {...iconProps} />;
    case "camera":
      return <Camera {...iconProps} />;
    case "tablet":
      return <Tablet {...iconProps} />;
    case "keyboard":
      return <Keyboard {...iconProps} />;
    case "guitar":
      return <Guitar {...iconProps} />;
    case "bag":
      return <Briefcase {...iconProps} />;
    case "watch":
      return <Watch {...iconProps} />;
    case "figure":
      return <Box {...iconProps} />;
    case "jacket":
      return <Shirt {...iconProps} />;
    case "speaker":
      return <Speaker {...iconProps} />;
    default:
      return <Package {...iconProps} />;
  }
}

function isTradeRequestAction(card: ActionCardSnapshot | null) {
  return (
    card?.type === "tradeRequest" ||
    card?.type === "freeGive" ||
    card?.type === "directTrade"
  );
}

export function MidgeoraeOnlineGame() {
  const {
    name,
    setName,
    joinCode,
    setJoinCode,
    session,
    pendingDealItem,
    activeTutorialStep,
    setActiveTutorialStep,
    isFullManualOpen,
    setIsFullManualOpen,
    snapshot,
    error,
    loading,
    copied,
    selectedItemId,
    setSelectedItemId,
    dealTargetId,
    setDealTargetId,
    askingPrice,
    setAskingPrice,
    actionTargetId,
    setActionTargetId,
    me,
    myHand,
    currentPlayer,
    isMyTurn,
    otherPlayers,
    requestableItems,
    currentAction,
    pendingDeal,
    tradeActionActive,
    pendingReviews,
    isDealParty,
    myDealChoice,
    fetchSnapshot,
    handleDoNotShowAgain,
    createGameRoom,
    joinGameRoom,
    submitAction,
    leaveRoom,
    copyInvite,
    requestSelectedItem,
  } = useOnlineGame();

  if (!session || !snapshot) {
    return (
      <main className="game-shell min-h-screen text-stone-950">
        <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-5 py-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_420px] lg:items-center">
            <div>
              <div className="token-pop mb-6 inline-flex h-14 w-14 items-center justify-center rounded-lg bg-orange-600 text-3xl font-black text-white shadow-sm">
                믿
              </div>
              <h1 className="max-w-2xl text-5xl font-black leading-tight tracking-normal text-stone-950 sm:text-6xl">
                믿거래
              </h1>
              <p className="mt-4 max-w-xl text-lg leading-8 text-stone-700">
                테이블에 깔린 물건 카드와 거래 제안을 보며 평판을 관리하고,
                숨어 있는 빌런을 찾아내는 중고거래 추론 게임입니다.
              </p>
              <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
                {["카드 테이블", "거래 제안", "평판 추리"].map((label, index) => (
                  <div
                    key={label}
                    className="status-tile border border-stone-300 bg-white/70 px-4 py-3"
                  >
                    <div className="text-sm font-black text-orange-700">
                      0{index + 1}
                    </div>
                    <div className="mt-1 text-sm font-bold text-stone-800">
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="motion-panel market-card-table p-5">
              <div className="relative">
                <label className="text-sm font-bold text-stone-700">
                  플레이어 이름
                </label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="예: 경수"
                  className="mt-2 w-full border border-stone-300 px-4 py-3 text-base font-semibold outline-none focus:border-orange-600"
                />

                <div className="mt-4 grid gap-2">
                  <button
                    onClick={() => createGameRoom("botTest")}
                    disabled={loading}
                    className="motion-button flex w-full items-center justify-center gap-2 bg-orange-600 px-4 py-3 text-base font-black text-white hover:bg-orange-700 disabled:opacity-50"
                  >
                    <Play size={18} />
                    봇 테스트로 시작
                  </button>
                  <button
                    onClick={() => createGameRoom("real")}
                    disabled={loading}
                    className="motion-button flex w-full items-center justify-center gap-2 border border-stone-900 px-4 py-3 text-base font-black text-stone-950 hover:bg-stone-950 hover:text-white disabled:opacity-50"
                  >
                    <Users size={18} />
                    실제 플레이 방 만들기
                  </button>
                </div>

                <div className="my-5 h-px bg-stone-200" />

                <label className="text-sm font-bold text-stone-700">방 코드</label>
                <input
                  value={joinCode}
                  onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                  placeholder="ABCD"
                  className="mt-2 w-full border border-stone-300 px-4 py-3 text-center text-2xl font-black uppercase tracking-[0.25em] outline-none focus:border-orange-600"
                  maxLength={4}
                />
                <button
                  onClick={joinGameRoom}
                  disabled={loading}
                  className="motion-button mt-4 flex w-full items-center justify-center gap-2 border border-stone-900 px-4 py-3 text-base font-black text-stone-950 hover:bg-stone-950 hover:text-white disabled:opacity-50"
                >
                  <Users size={18} />
                  방 입장
                </button>

                {error && <ErrorNotice message={error} />}
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="game-shell game-play-shell min-h-screen text-stone-950">
      {isFullManualOpen && (
        <GameTutorialModal
          isOpen={true}
          onClose={() => setIsFullManualOpen(false)}
          isFullManual={true}
        />
      )}
      {activeTutorialStep !== undefined && (
        <GameTutorialModal
          isOpen={true}
          onClose={() => setActiveTutorialStep(undefined)}
          stepId={activeTutorialStep}
          onDoNotShowAgain={handleDoNotShowAgain}
        />
      )}
      <div className="game-screen-viewport mx-auto">
        <section className="game-frame-shell motion-panel">
          <header className="game-top-strip p-3">
            <div className="game-top-grid relative">
              <div className="min-w-0 border-r border-white/10 pr-4">
                <h1 className="truncate text-4xl font-black tracking-normal text-orange-500">
                  믿거래
                </h1>
                <p className="mt-1 text-xs font-bold text-amber-100/80">
                  3-5인 / 친구와 즐기는 거래 게임
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-4">
                <FrameStat label="Room code" value={snapshot.code} />
                <FrameStat label="Market" value={marketProgressLabel(snapshot)} />
                <FrameStat label="My money" value={moneyLabel(me?.money ?? 0)} />
                <FrameStat
                  label="Turn"
                  value={
                    snapshot.status === "waiting"
                      ? "대기 중"
                      : currentPlayer?.name
                        ? `${currentPlayer.name} 차례`
                        : "대기 중"
                  }
                  accent
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <FrameIconButton label="게임 안내" onClick={() => setIsFullManualOpen(true)}>
                  <HelpCircle size={18} />
                </FrameIconButton>
                <FrameIconButton label="새로고침" onClick={() => fetchSnapshot()}>
                  <RefreshCw size={18} />
                </FrameIconButton>
                <FrameIconButton label={copied ? "복사됨" : "초대복사"} onClick={copyInvite}>
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                </FrameIconButton>
                <FrameIconButton label="나가기" onClick={leaveRoom}>
                  <LogOut size={18} />
                </FrameIconButton>
              </div>
            </div>
          </header>

          {error && <ErrorNotice message={error} />}

          <div className="game-table-layout">
            <aside className="game-left-rail">
              <PlayerList
                players={snapshot.players}
                myPlayerId={me?.id ?? ""}
                currentTurnPlayerId={snapshot.currentTurnPlayerId}
              />
              <LogPanel logs={snapshot.logs} />
            </aside>

            <section className="game-board-stage">
              {snapshot.status === "waiting" && (
                <div className="space-y-3">
                  <FoldableHelperCard stepId="waiting" />
                  <WaitingRoom
                    mode={snapshot.mode}
                    isHost={Boolean(me?.isHost)}
                    playerCount={snapshot.players.length}
                    loading={loading}
                    onAddBot={() => submitAction({ type: "addBot" })}
                  />
                </div>
              )}

              {snapshot.status === "preparing" && (
                <div className="space-y-3">
                  <FoldableHelperCard stepId="preparing" />
                  <PreparationPanel
                    me={me}
                    myHand={myHand}
                    loading={loading}
                    onSubmit={(configs) =>
                      submitAction({ type: "fixPreparation", itemsConfig: configs })
                    }
                  />
                </div>
              )}

              {snapshot.status === "playing" && (
                <div className="min-w-0 space-y-3">
                  <FoldableHelperCard stepId={
                    pendingDeal && isDealParty && !myDealChoice
                      ? "pending_deal"
                      : currentAction
                        ? "playing_action"
                        : "playing_draw"
                  } />

                  {pendingDeal && (
                    <PendingDealPanel
                      snapshot={snapshot}
                      item={pendingDealItem}
                      isDealParty={isDealParty}
                      myChoice={myDealChoice}
                      onChoose={(choice) =>
                        submitAction({ type: "chooseDealCard", choice })
                      }
                      onNego={(price) =>
                        submitAction({ type: "negoDeal", price })
                      }
                      me={me}
                    />
                  )}

                  {tradeActionActive ? (
                    <MarketView
                      otherPlayers={otherPlayers}
                      dealTargetId={dealTargetId}
                      selectedItemId={selectedItemId}
                      onSelectTarget={(ownerId, itemId) => {
                        setDealTargetId(ownerId);
                        setSelectedItemId(itemId);
                      }}
                    />
                  ) : (
                    <MyDashboard
                      me={me}
                      myHand={myHand}
                      isMyTurn={isMyTurn}
                      selectedItemId={selectedItemId}
                      setSelectedItemId={setSelectedItemId}
                    />
                  )}

                  {pendingReviews.length > 0 && (
                    <ReviewPanel
                      snapshot={snapshot}
                      onReview={(targetPlayerId, satisfied) =>
                        submitAction({
                          type: "reviewTrade",
                          targetPlayerId,
                          satisfied,
                        })
                      }
                    />
                  )}
                </div>
              )}

              {snapshot.status === "reporting" && (
                <div className="space-y-3">
                  <FoldableHelperCard stepId="reporting" />
                  <ReportPanel
                    snapshot={snapshot}
                    otherPlayers={otherPlayers}
                    onReport={(targetPlayerId) =>
                      submitAction({ type: "reportSuspiciousPlayer", targetPlayerId })
                    }
                  />
                </div>
              )}

              {snapshot.status === "finished" && snapshot.result && (
                <div className="space-y-3">
                  <FoldableHelperCard stepId="finished" />
                  <ResultPanel snapshot={snapshot} />
                </div>
              )}
            </section>

            <div className="game-right-rail">
              {snapshot.status === "playing" && (
                <ActionPanel
                  action={currentAction}
                  isMyTurn={isMyTurn}
                  loading={loading}
                  myHand={myHand}
                  selectedItemId={selectedItemId}
                  setSelectedItemId={setSelectedItemId}
                  otherPlayers={otherPlayers}
                  requestableItems={requestableItems}
                  dealTargetId={dealTargetId}
                  askingPrice={askingPrice}
                  setAskingPrice={setAskingPrice}
                  actionTargetId={actionTargetId}
                  setActionTargetId={setActionTargetId}
                  pendingDealActive={Boolean(pendingDeal)}
                  currentPlayerName={currentPlayer?.name ?? ""}
                  onDraw={() => submitAction({ type: "drawActionCard" })}
                  onRequestTrade={requestSelectedItem}
                  onTerror={() =>
                    submitAction({
                      type: "terrorReview",
                      targetPlayerId: actionTargetId,
                    })
                  }
                  onRecycle={(itemInstanceId) =>
                    submitAction({
                      type: "recycleBrick",
                      itemInstanceId,
                    })
                  }
                  onSwap={() =>
                    submitAction({
                      type: "swapRandomItem",
                      targetPlayerId: actionTargetId,
                    })
                  }
                  onSkip={() => submitAction({ type: "endTurn" })}
                  compact
                />
              )}
              <DeckRail
                mode={snapshot.mode}
                status={snapshot.status}
                isHost={Boolean(me?.isHost)}
                loading={loading}
                canStart={
                  snapshot.players.length >= MIN_PLAYERS &&
                  snapshot.players.length <= MAX_PLAYERS
                }
                onStart={() => submitAction({ type: "startGame" })}
                onEndTurn={() => submitAction({ type: "endTurn" })}
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function ErrorNotice({ message }: { message: string }) {
  return (
    <div className="mt-3 flex items-start gap-2 border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
      <AlertTriangle size={16} />
      {message}
    </div>
  );
}

function FrameStat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="frame-stat">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-100/55">
        {label}
      </div>
      <div
        className={`mt-1 truncate text-2xl font-black ${
          accent ? "text-green-400" : "text-amber-50"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function FrameIconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="motion-button frame-icon-button"
      title={label}
    >
      <span>{children}</span>
      <span className="text-[10px] font-black">{label}</span>
    </button>
  );
}

function DeckRail({
  mode,
  status,
  isHost,
  loading,
  canStart,
  onStart,
  onEndTurn,
}: {
  mode: RoomMode;
  status: RoomSnapshot["status"];
  isHost: boolean;
  loading: boolean;
  canStart: boolean;
  onStart: () => void;
  onEndTurn: () => void;
}) {
  const statusCopy = {
    waiting: ["대기", `${MIN_PLAYERS}-${MAX_PLAYERS}명 모이면 시작`],
    preparing: ["준비", "매물 사전 등록 단계"],
    playing: ["진행", "턴 종료만 남김"],
    finished: ["종료", "결과 확인"],
  }[status as Exclude<RoomSnapshot["status"], "reporting">] ?? [
    "신고",
    "분쟁 심사 단계",
  ];

  return (
    <aside className={`game-deck-rail game-deck-rail-${status}`}>
      <div className="deck-rail-title">진행</div>
      <div className="rounded border border-white/10 bg-white/5 px-3 py-2 text-center text-[11px] font-black text-amber-100/80">
        {mode === "botTest" ? "봇 테스트" : "실제 플레이"}
      </div>
      <div className="market-card-lane p-3 text-center">
        <div className="text-lg font-black text-stone-950">{statusCopy[0]}</div>
        <div className="mt-1 text-[11px] font-bold leading-4 text-stone-600">
          {statusCopy[1]}
        </div>
      </div>

      {status === "waiting" && isHost ? (
        <button
          type="button"
          onClick={onStart}
          disabled={loading || !canStart}
          className="motion-button mt-auto flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-4 text-base font-black text-white shadow-[0_7px_0_rgba(124,45,18,0.55)] hover:bg-orange-500 disabled:bg-stone-600 disabled:text-stone-300 disabled:shadow-none"
        >
          <Play size={18} />
          게임 시작
        </button>
      ) : status === "waiting" ? (
        <div className="mt-auto rounded border border-white/10 bg-white/5 px-3 py-3 text-center text-xs font-black text-amber-100/70">
          호스트 시작 대기
        </div>
      ) : status === "playing" ? (
        <button
          type="button"
          onClick={onEndTurn}
          className="motion-button mt-auto flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-4 text-base font-black text-white shadow-[0_7px_0_rgba(124,45,18,0.55)] hover:bg-orange-500"
        >
          <RefreshCw size={18} />
          턴 종료
        </button>
      ) : status === "reporting" ? (
        <button
          type="button"
          disabled
          className="motion-button mt-auto flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-4 text-base font-black text-white shadow-[0_7px_0_rgba(124,45,18,0.55)] hover:bg-orange-500"
        >
          <AlertTriangle size={18} />
          최종 신고 접수 중
        </button>
      ) : null}
    </aside>
  );
}

function TableHandCard({
  item,
  selected,
  onSelect,
}: {
  item: ItemCardSnapshot;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`motion-button table-card hand-item-card deal-card-lift px-3 pb-3 pt-4 text-left ${
        selected ? "table-card-accent-orange" : ""
      }`}
    >
      <div className="relative z-10 text-center">
        <div
          className={`hand-product-art mx-auto ${
            item.isBrick ? "hand-product-art-brick" : ""
          }`}
          aria-hidden="true"
        >
          {productIcon(item)}
        </div>
        <div className="mt-2 min-h-10 text-sm font-black leading-5 text-stone-950">
          {item.name}
        </div>
        {item.originalPrice > 0 && (
          <div className="mt-2 text-xs font-bold text-stone-500 line-through decoration-stone-400">
            정가 {moneyLabel(item.originalPrice)}
          </div>
        )}
        <div className="mt-1 text-xs font-black text-orange-700">
          {item.marketPrice > 0 ? moneyLabel(item.marketPrice) : "시세 미공개"}
        </div>
        {item.category && (
          <div className="mt-2 text-[10px] font-black text-stone-500">
            {categoryLabel(item.category)} · {conditionLabel(item.condition)}
          </div>
        )}
        {item.isBrick && (
          <div className="mt-2 inline-flex rounded bg-red-700 px-2 py-0.5 text-[10px] font-black text-white">
            벽돌
          </div>
        )}
      </div>
    </button>
  );
}

function TableActionCard({
  title,
  body,
  accent,
}: {
  title: string;
  body: string;
  accent: "orange" | "green";
}) {
  return (
    <div
      className={`table-card min-h-36 px-3 py-4 ${
        accent === "green" ? "table-card-accent-green" : "table-card-accent-orange"
      }`}
    >
      <div className="relative z-10 flex h-full flex-col justify-between">
        <div className="text-sm font-black text-stone-950">{title}</div>
        <p className="mt-3 text-xs font-bold leading-5 text-stone-600">{body}</p>
      </div>
    </div>
  );
}

function TableChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="table-chip gap-2 px-3 py-1 text-xs font-black text-stone-700">
      <span className="text-stone-500">{label}</span>
      <span>{value}</span>
    </div>
  );
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

function roleLabel(role: PlayerRole | undefined) {
  if (role === "villain") return "빌런";
  if (role === "citizen") return "시민";
  return "미정";
}

function roleDescription(role: PlayerRole | undefined) {
  if (role === "villain") {
    return "당신은 빌런입니다. 이 정보는 본인 화면에만 보입니다.";
  }
  if (role === "citizen") {
    return "당신은 시민입니다. 거래 기록과 평판을 보고 빌런을 찾아내세요.";
  }
  return "게임이 시작되면 내 역할이 여기에 공개됩니다.";
}

function MarketView({
  otherPlayers,
  dealTargetId,
  selectedItemId,
  onSelectTarget,
}: {
  otherPlayers: PublicPlayer[];
  dealTargetId: string;
  selectedItemId: string;
  onSelectTarget: (ownerId: string, itemId: string) => void;
}) {
  const allItems = useMemo(() => {
    return otherPlayers.flatMap((p) =>
      p.publicItems.map((item) => ({ owner: p, item }))
    );
  }, [otherPlayers]);

  return (
    <div className="flex-1 overflow-y-auto bg-orange-50/50 p-4 lg:p-6 rounded-xl border border-orange-200 shadow-inner">
      <h2 className="mb-4 text-xl font-black text-orange-950 flex items-center gap-2">
        <Store size={24} className="text-orange-600" />
        시장 매물 (원하는 물건을 클릭하세요)
      </h2>
      {allItems.length === 0 ? (
        <div className="p-8 text-center text-stone-500 font-bold">시장에 등록된 매물이 없습니다.</div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {allItems.map(({ owner, item }) => {
            const isSelected = dealTargetId === owner.id && selectedItemId === item.instanceId;
            return (
              <div
                key={item.instanceId}
                onClick={() => onSelectTarget(owner.id, item.instanceId)}
                className={`motion-card relative cursor-pointer overflow-hidden border-2 bg-white transition-all ${
                  isSelected ? "border-orange-600 ring-2 ring-orange-200 shadow-md transform scale-105" : "border-stone-200 hover:border-orange-400"
                }`}
              >
                <div className="aspect-square bg-stone-100 p-2 relative">
                   <CardImage src={item.imagePath} alt={item.name} />
                   <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full font-bold">
                     {owner.name}
                   </div>
                </div>
                <div className="p-3 text-center">
                  <div className="text-sm font-black text-stone-900 truncate">{item.name || "미공개"}</div>
                  <div className="mt-1 text-xs font-bold text-stone-500 truncate">
                    {categoryLabel(item.category)} · {conditionLabel(item.condition)}
                  </div>
                  {item.originalPrice > 0 && (
                    <div className="mt-2 text-xs font-bold text-stone-500 line-through decoration-stone-400">
                      정가 {moneyLabel(item.originalPrice)}
                    </div>
                  )}
                  <div className="mt-1 text-sm font-black text-orange-600">
                    {item.marketPrice > 0 ? moneyLabel(item.marketPrice) : "시세 미공개"}
                  </div>
                </div>
                {isSelected && (
                   <div className="absolute inset-0 bg-orange-600/10 pointer-events-none flex items-center justify-center">
                     <div className="bg-orange-600 text-white rounded-full p-2 shadow-lg scale-110 motion-safe:animate-bounce">
                       <Check size={24} />
                     </div>
                   </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MyDashboard({
  me,
  myHand,
  isMyTurn,
  selectedItemId,
  setSelectedItemId,
}: {
  me: RoomSnapshot["me"];
  myHand: ItemCardSnapshot[];
  isMyTurn: boolean;
  selectedItemId: string;
  setSelectedItemId: (value: string) => void;
}) {
  if (!me) return null;
  const isVillain = me.role === "villain";

  return (
    <section
      className={`motion-panel-strong market-card-table p-4 ${
        isMyTurn ? "ring-2 ring-orange-500/75" : ""
      }`}
    >
      <div className="relative z-10 space-y-3">
        <div className="my-status-strip">
          <div
            className={`inline-flex items-center justify-center rounded px-3 py-2 text-xs font-black text-white ${
              isMyTurn ? "bg-orange-600" : "bg-stone-700"
            }`}
          >
            {isMyTurn ? "내 턴" : "대기"}
          </div>
          <StatusBox label="내 자금" value={moneyLabel(me.money ?? 0)} />
          <StatusBox label="평판" value={`${me.reputationTokens ?? 0}/5`} />
          <div
            className={`my-role-chip ${
              isVillain ? "my-role-chip-villain" : "my-role-chip-citizen"
            }`}
            title={roleDescription(me.role)}
          >
            <span>내 역할</span>
            <strong>{roleLabel(me.role)}</strong>
          </div>
          {me.job && (
            <div className="my-role-chip my-role-chip-job flex-row items-center gap-3">
              <div>
                <span>직업</span>
                <strong>{me.job.title}</strong>
              </div>
              <div className="flex gap-2 border-l border-orange-200 pl-3">
                {me.job.id === "inspector" && (
                  <div className="flex items-center gap-1 text-orange-800" title="감정 토큰 (검수 완료)">
                    <Search size={16} />
                    <span className="text-sm font-black">{me.inspectTokens ?? 0}</span>
                  </div>
                )}
                {me.job.id === "negotiator" && (
                  <div className="flex items-center gap-1 text-orange-800" title="네고 토큰 (흥정 완료)">
                    <Handshake size={16} />
                    <span className="text-sm font-black">{me.negoTokens ?? 0}</span>
                  </div>
                )}
                {me.job.id === "reporter" && (
                  <div className="flex items-center gap-1 text-orange-800" title="증거 토큰 (신고/리뷰 완료)">
                    <FileText size={16} />
                    <span className="text-sm font-black">{me.evidenceTokens ?? 0}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {isVillain && (
          <div className="rounded border-2 border-red-300 bg-red-50/95 px-4 py-3">
            <div className="text-[11px] font-black uppercase text-red-700">
              빌런 행동 미션
            </div>
            <div className="mt-1 text-sm font-black leading-6 text-red-900">
              {me.mission ?? "게임이 시작되면 빌런 미션이 표시됩니다."}
            </div>
          </div>
        )}

        <div className="market-card-lane p-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-xl font-black text-stone-950">내 손패</h2>
              <p className="mt-1 text-xs font-bold text-stone-500">
                사진과 시세를 보고 거래할 물건을 바로 선택하세요.
              </p>
            </div>
            <span className="table-chip px-3 py-1 text-xs font-black">
              {myHand.length}장
            </span>
          </div>

          {myHand.length === 0 ? (
            <div className="mt-4 rounded border border-dashed border-stone-300 bg-white/70 px-4 py-6 text-center text-sm font-bold text-stone-500">
              게임이 시작되면 내 물건 카드가 여기에 표시됩니다.
            </div>
          ) : (
            <div className="player-hand-grid mt-4">
              {myHand.map((item) => (
                <TableHandCard
                  key={item.instanceId}
                  item={item}
                  selected={selectedItemId === item.instanceId}
                  onSelect={() => setSelectedItemId(item.instanceId)}
                />
               ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function PlayerList({
  players,
  myPlayerId,
  currentTurnPlayerId,
}: {
  players: PublicPlayer[];
  myPlayerId: string;
  currentTurnPlayerId: string | null;
}) {
  return (
    <section className="space-y-2">
      <div className="market-card-lane p-3">
        <div className="relative z-10">
          <div className="text-3xl font-black tracking-normal text-orange-600 drop-shadow-[0_3px_0_rgba(80,34,12,0.22)]">
            믿거래
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {players.map((player) => (
          <div
            key={player.id}
            className={`table-player-mat player-lane px-2 py-2 ${
              player.id === currentTurnPlayerId ? "ring-2 ring-green-600/70" : ""
            } ${
              player.id === myPlayerId ? "ring-2 ring-orange-600/65" : ""
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-stone-700/20 bg-[radial-gradient(circle_at_35%_25%,#f8d9a4,#b87332)] text-base font-black text-stone-950">
                {player.name.slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  {player.isHost && <Crown size={13} className="shrink-0 text-orange-700" />}
                  <span className="truncate text-sm font-black text-stone-950">
                    {player.name}
                  </span>
                  {player.id === myPlayerId && (
                    <span className="rounded bg-green-700 px-2 py-0.5 text-[10px] font-black text-white">
                      나
                    </span>
                  )}
                  {player.isBot && (
                    <span className="rounded bg-stone-800 px-2 py-0.5 text-[10px] font-black text-white">
                      BOT
                    </span>
                  )}
                  {player.id === currentTurnPlayerId && (
                    <span className="rounded bg-orange-600 px-2 py-0.5 text-[10px] font-black text-white">
                      차례
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-1 text-[11px] font-black text-stone-600">
                  <span>평판 {player.reputationTokens}/5</span>
                  <span>물건 {player.itemCount}</span>
                </div>
              </div>
            </div>
            <div className="mt-2 flex gap-2 border-t border-stone-700/10 pt-1 text-[11px] font-semibold text-stone-500">
              <span>좋아요 {player.likes}</span>
              <span>악평 {player.dislikes}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function WaitingRoom({
  mode,
  isHost,
  playerCount,
  loading,
  onAddBot,
}: {
  mode: RoomMode;
  isHost: boolean;
  playerCount: number;
  loading: boolean;
  onAddBot: () => void;
}) {
  return (
    <section className="market-card-table p-5">
        <div className="relative space-y-4">
          <div className="table-center-board p-5">
            <div className="relative z-10">
            <div className="mb-4 flex justify-center">
              <span className="table-chip px-4 py-1 text-xs font-black">
                {mode === "botTest" ? "봇 테스트 버전" : "실제 플레이 버전"}
              </span>
            </div>
            <div className="turn-command-bar mx-auto max-w-3xl px-5 py-4 text-center text-white">
              <div className="text-xl font-black">테이블 세팅 중</div>
              <div className="mt-1 text-xs font-bold text-white/80">
                {mode === "botTest"
                  ? "봇을 추가해서 혼자 흐름을 테스트할 수 있습니다."
                  : "친구 3명 이상이 모이면 각자의 손패와 거래 카드가 배정됩니다."}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center gap-3">
              <div className="h-px w-24 bg-amber-900/25" />
              <div className="text-xl font-black text-stone-800">내 손패 자리</div>
              <div className="h-px w-24 bg-amber-900/25" />
            </div>
            <div className="public-market-row mt-4">
              {Array.from({ length: 5 }, (_, index) => (
                <div key={index} className="table-card px-3 pb-3 pt-4">
                  <div className="relative z-10 text-center">
                    <Image
                      src={CARD_BACK}
                      alt="시작 전 손패"
                      width={240}
                      height={160}
                      unoptimized
                      className="table-card-image mx-auto"
                    />
                    <div className="mt-2 text-sm font-black text-stone-900">
                      게임 시작 후 공개
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-7 flex items-center justify-center gap-3">
              <div className="h-px w-24 bg-amber-900/25" />
              <div className="text-xl font-black text-stone-800">행동 카드 미리보기</div>
              <div className="h-px w-24 bg-amber-900/25" />
            </div>
            <div className="hand-card-grid mt-4">
              {ACTION_PREVIEW_CARDS.map((card) => (
                <TableActionCard key={card.title} {...card} />
              ))}
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <TableChip label="인원" value={`${playerCount}/${MAX_PLAYERS}`} />
              <TableChip label="손패" value="5장" />
              <TableChip label="거래 카드" value="2장" />
              {isHost && (
                <span className="text-xs font-black text-stone-600">
                  {loading ? "준비 중" : "오른쪽 버튼으로 시작"}
                </span>
              )}
            </div>
            {isHost && mode === "botTest" && (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={onAddBot}
                  disabled={loading || playerCount >= MAX_PLAYERS}
                  className="motion-button inline-flex items-center justify-center gap-2 rounded-lg border border-stone-900 bg-white/70 px-4 py-3 text-sm font-black text-stone-950 hover:bg-stone-950 hover:text-white disabled:border-stone-300 disabled:text-stone-400"
                >
                  <Users size={16} />
                  자동 봇 추가
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function PendingDealPanel({
  snapshot,
  item,
  isDealParty,
  myChoice,
  onChoose,
  onNego,
  me,
}: {
  snapshot: RoomSnapshot;
  item: ItemCardSnapshot | null;
  isDealParty: boolean;
  myChoice: DealCardChoice | undefined;
  onChoose: (choice: DealCardChoice) => void;
  onNego: (price: number) => void;
  me: PlayerSnapshot | null;
}) {
  const deal = snapshot.pendingDeal;
  const currentPrice = deal ? (deal.currentOffer !== undefined ? deal.currentOffer : deal.askingPrice) : 0;
  const [negoPrice, setNegoPrice] = useState(currentPrice);

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

          {isDealParty ? (
            myChoice ? (
              <div className="mt-5 inline-flex items-center gap-2 border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-black text-stone-700">
                <Check size={16} />
                내 거래 카드 선택 완료
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {deal.lastOfferPlayerId !== me?.id ? (
                  <div className="bg-orange-50/50 border border-orange-100 p-3 rounded-lg">
                    <div className="text-xs font-black text-orange-800 uppercase mb-2">원하는 가격으로 흥정(역제안)</div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={negoPrice <= 0}
                          onClick={() => setNegoPrice(Math.max(0, negoPrice - 10000))}
                          className="flex h-9 w-9 items-center justify-center border border-stone-300 bg-white hover:bg-stone-100 disabled:opacity-50 text-stone-700 font-black text-lg transition-colors"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={negoPrice}
                          onChange={(event) => setNegoPrice(Math.max(0, Number(event.target.value)))}
                          min={0}
                          step={10000}
                          className="w-32 text-center border border-stone-300 bg-white px-2 py-1.5 text-sm font-bold focus:outline-none focus:border-orange-500"
                        />
                        <button
                          type="button"
                          onClick={() => setNegoPrice(negoPrice + 10000)}
                          className="flex h-9 w-9 items-center justify-center border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 font-black text-lg transition-colors"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => onNego(negoPrice)}
                        className="motion-button inline-flex items-center justify-center gap-1.5 bg-orange-600 px-4 py-2 text-sm font-black text-white hover:bg-orange-700 transition-colors"
                      >
                        <Handshake size={15} />
                        역제안 보내기
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs font-bold text-stone-500 bg-stone-50 border border-stone-150 p-2.5 rounded">
                    ⏱️ 내가 가격을 제안했습니다. 상대방의 결정을 기다리는 중입니다.
                  </div>
                )}

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

function ReviewPanel({
  snapshot,
  onReview,
}: {
  snapshot: RoomSnapshot;
  onReview: (targetPlayerId: string, satisfied: boolean) => void;
}) {
  return (
    <section className="motion-panel-strong border border-sky-300 bg-sky-50/90 p-5">
      <h2 className="text-xl font-black text-sky-950">거래 후기</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {snapshot.pendingReviews.map((review) => (
          <div key={`${review.tradeId}-${review.targetPlayerId}`} className="deal-card-lift border border-sky-200 bg-white p-4">
            <div className="text-sm font-bold text-sky-700">상대</div>
            <div className="mt-1 text-xl font-black">
              {playerName(snapshot, review.targetPlayerId)}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => onReview(review.targetPlayerId, true)}
                className="motion-button inline-flex items-center justify-center gap-2 bg-sky-600 px-3 py-2 text-sm font-black text-white hover:bg-sky-700"
              >
                <ThumbsUp size={16} />
                만족
              </button>
              <button
                onClick={() => onReview(review.targetPlayerId, false)}
                className="motion-button inline-flex items-center justify-center gap-2 border border-red-300 bg-red-50 px-3 py-2 text-sm font-black text-red-700 hover:bg-red-100"
              >
                <ThumbsDown size={16} />
                불만족
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ActionPanel({
  action,
  isMyTurn,
  loading,
  myHand,
  selectedItemId,
  setSelectedItemId,
  otherPlayers,
  requestableItems,
  dealTargetId,
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
}: {
  action: ActionCardSnapshot | null;
  isMyTurn: boolean;
  loading: boolean;
  myHand: ItemCardSnapshot[];
  selectedItemId: string;
  setSelectedItemId: (value: string) => void;
  otherPlayers: PublicPlayer[];
  requestableItems: ItemCardSnapshot[];
  dealTargetId: string;
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
}) {
  const tradeActionActive = isTradeRequestAction(action);
  const selectedItem = (
    tradeActionActive ? requestableItems : myHand
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
            <div className="mb-2 p-3 bg-stone-100 rounded text-sm font-bold text-stone-700">
              {selectedItem ? (
                <>
                  <div className="text-orange-700 mb-1">
                    [선택됨] {otherPlayers.find(p => p.id === dealTargetId)?.name}님의 물건
                  </div>
                  <div>
                    {selectedItem.name || "미공개"} · {categoryLabel(selectedItem.category)}
                  </div>
                </>
              ) : (
                <div className="text-stone-400">좌측 시장 매물판에서 거래할 물건을 선택해주세요.</div>
              )}
            </div>
            <SelectLabel label="제시 가격">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={action.type === "freeGive" || askingPrice <= 0}
                  onClick={() => setAskingPrice(Math.max(0, askingPrice - 10000))}
                  className="flex h-9 w-9 items-center justify-center border border-stone-300 bg-stone-100 hover:bg-stone-200 disabled:opacity-50 text-stone-700 font-black text-lg transition-colors"
                >
                  -
                </button>
                <input
                  type="number"
                  value={action.type === "freeGive" ? 0 : askingPrice}
                  onChange={(event) => setAskingPrice(Math.max(0, Number(event.target.value)))}
                  disabled={action.type === "freeGive"}
                  min={0}
                  step={10000}
                  className="w-full text-center border border-stone-300 bg-white px-3 py-2 text-sm font-bold disabled:bg-stone-100 focus:outline-none focus:border-orange-500"
                />
                <button
                  type="button"
                  disabled={action.type === "freeGive"}
                  onClick={() => setAskingPrice(askingPrice + 10000)}
                  className="flex h-9 w-9 items-center justify-center border border-stone-300 bg-stone-100 hover:bg-stone-200 disabled:opacity-50 text-stone-700 font-black text-lg transition-colors"
                >
                  +
                </button>
              </div>
            </SelectLabel>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onRequestTrade}
                disabled={!selectedItemId || !dealTargetId || requestableItems.length === 0}
                className="motion-button inline-flex items-center justify-center gap-2 bg-stone-950 px-4 py-3 text-sm font-black text-white hover:bg-orange-700 disabled:bg-stone-300"
              >
                <Handshake size={17} />
                거래 신청
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

function ReportPanel({
  snapshot,
  otherPlayers,
  onReport,
}: {
  snapshot: RoomSnapshot;
  otherPlayers: PublicPlayer[];
  onReport: (targetPlayerId: string) => void;
}) {
  return (
    <section className="motion-panel border-2 border-red-500 bg-red-50 p-5 shadow-[0_8px_0_rgba(153,27,27,0.2)] rounded-xl">
      <div className="relative">
      <div className="flex items-center justify-between gap-3 border-b border-red-200 pb-3">
        <div>
          <h2 className="text-xl font-black text-red-900">최종 신고 (상소문)</h2>
          <p className="mt-1 text-sm font-bold text-red-700">
            빌런으로 의심되는 플레이어를 신고하세요. ({snapshot.reportsCast}/{snapshot.players.length}명 신고 접수)
          </p>
        </div>
        <div className="animate-pulse rounded-full bg-red-200 p-2 text-red-600">
          <MessageCircleWarning size={28} />
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {otherPlayers.map((player) => (
          <button
            key={player.id}
            onClick={() => onReport(player.id)}
            className="motion-button flex items-center justify-between border border-stone-300 px-3 py-3 text-left font-black hover:bg-stone-100"
          >
            {player.name}
            <AlertTriangle size={16} />
          </button>
        ))}
      </div>
      </div>
    </section>
  );
}

function ResultPanel({ snapshot }: { snapshot: RoomSnapshot }) {
  const result = snapshot.result;
  if (!result) return null;
  const villainName = result.villainId ? playerName(snapshot, result.villainId) : "-";
  const winnerName = playerName(snapshot, result.winnerId);
  const eliminatedName = result.eliminatedPlayerId
    ? playerName(snapshot, result.eliminatedPlayerId)
    : "-";

  return (
    <section className="motion-panel-strong market-card-table p-5">
      <div className="relative">
      <div className="flex items-center gap-3">
        <Star className="text-orange-600" size={28} />
        <div>
          <h2 className="text-2xl font-black">결과 공개</h2>
          <p className="mt-1 text-sm font-bold text-stone-500">
            {result.winningSide === "citizens" ? "시민 승리" : "빌런 승리"}
          </p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        <StatusBox label="빌런" value={villainName} />
        <StatusBox label="탈락" value={eliminatedName} />
        <StatusBox label="최종 우승" value={winnerName} />
        <StatusBox
          label="색출"
          value={result.villainCaught ? "성공" : "실패"}
        />
      </div>

      <div className="mt-8 border-t border-stone-200 pt-6">
        <h3 className="text-lg font-black text-stone-800 mb-4">최종 순위 및 평판</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-100 text-stone-600 font-bold uppercase text-xs">
              <tr>
                <th className="px-4 py-2">순위</th>
                <th className="px-4 py-2">플레이어</th>
                <th className="px-4 py-2 text-right">최종 자산</th>
                <th className="px-4 py-2 text-center">평판</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.players
                .slice()
                .sort((a, b) => {
                  const moneyA = snapshot.result?.finalScores?.[a.id]?.totalMoney ?? 0;
                  const moneyB = snapshot.result?.finalScores?.[b.id]?.totalMoney ?? 0;
                  return moneyB - moneyA;
                })
                .map((player, index) => {
                  const money = snapshot.result?.finalScores?.[player.id]?.totalMoney;
                  return (
                    <tr key={player.id} className={`border-b border-stone-100 ${player.id === result.winnerId ? "bg-orange-50 font-black text-orange-900" : ""}`}>
                      <td className="px-4 py-3">{index + 1}위</td>
                      <td className="px-4 py-3">
                        {player.name}
                        {player.id === result.villainId && <span className="ml-2 rounded bg-red-100 px-2 py-0.5 text-[10px] font-black text-red-600">빌런</span>}
                      </td>
                      <td className="px-4 py-3 text-right">{money !== undefined ? moneyLabel(money) : "-"}</td>
                      <td className="px-4 py-3 text-center">{player.reputationTokens}/5</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </section>
  );
}

function LogPanel({ logs }: { logs: string[] }) {
  return (
    <section className="game-log-drawer p-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-black text-amber-100">게임 로그</h2>
        <span className="text-xs font-black text-amber-100/40">⌃</span>
      </div>
      <div className="mt-3 max-h-36 space-y-1 overflow-y-auto">
        {logs.length === 0 ? (
          <p className="text-sm text-amber-100/50">아직 로그가 없습니다.</p>
        ) : (
          logs
            .slice()
            .reverse()
            .map((log, index) => (
              <div
                key={`${log}-${index}`}
                className="log-item border-b border-amber-100/10 px-2 py-1 text-xs font-semibold text-amber-100/70"
              >
                {log}
              </div>
            ))
        )}
      </div>
    </section>
  );
}

function StatusBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="status-tile border border-stone-200 bg-white/78 p-3">
      <div className="text-xs font-black uppercase text-stone-500">{label}</div>
      <div className="mt-1 text-lg font-black text-stone-950">{value}</div>
    </div>
  );
}

function SelectLabel({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase text-stone-500">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function CardImage({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      width={420}
      height={600}
      unoptimized
      className={className}
    />
  );
}

function PreparationPanel({
  me,
  myHand,
  loading,
  onSubmit,
}: {
  me: RoomSnapshot["me"];
  myHand: ItemCardSnapshot[];
  loading: boolean;
  onSubmit: (
    configs: {
      instanceId: string;
      customCondition: ItemCondition;
      askingPrice: number;
      fakeItemId?: string;
    }[],
  ) => void;
}) {
  const [configs, setConfigs] = useState<
    Record<
      string,
      {
        customCondition: ItemCondition;
        askingPrice: number;
        fakeItemId?: string;
      }
    >
  >(() => {
    const initial: Record<
      string,
      {
        customCondition: ItemCondition;
        askingPrice: number;
        fakeItemId?: string;
      }
    > = {};
    myHand.forEach((item) => {
      initial[item.instanceId] = {
        customCondition: item.customCondition ?? item.condition ?? "used",
        askingPrice: item.askingPrice || item.originalPrice || 500000,
        fakeItemId: undefined,
      };
    });
    return initial;
  });

  if (!me) return null;

  if (me.isPrepared) {
    return (
      <div className="motion-panel-strong p-8 text-center text-stone-700 bg-orange-50/50 border border-orange-200 rounded-xl space-y-4">
        <div className="mx-auto w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
        <h2 className="text-xl font-black text-orange-950">내 매물 사전 등록 완료!</h2>
        <p className="text-sm font-bold text-stone-500">
          다른 플레이어들이 매물 설정을 마치고 게임 준비를 완료할 때까지 기다리고 있습니다...
        </p>
      </div>
    );
  }

  const isVillain = me.role === "villain";

  const handleConditionChange = (instanceId: string, value: ItemCondition) => {
    setConfigs((prev) => ({
      ...prev,
      [instanceId]: { ...prev[instanceId]!, customCondition: value },
    }));
  };

  const handlePriceChange = (instanceId: string, amount: number) => {
    setConfigs((prev) => {
      const current = prev[instanceId]!;
      const nextPrice = Math.max(0, current.askingPrice + amount);
      return {
        ...prev,
        [instanceId]: { ...prev[instanceId]!, askingPrice: nextPrice },
      };
    });
  };

  const handleFakeItemChange = (instanceId: string, fakeId: string) => {
    setConfigs((prev) => ({
      ...prev,
      [instanceId]: { ...prev[instanceId]!, fakeItemId: fakeId },
    }));
  };

  const handleConfirm = () => {
    if (isVillain) {
      const brickItem = myHand.find((i) => i.isBrick);
      if (brickItem) {
        const config = configs[brickItem.instanceId];
        if (!config?.fakeItemId) {
          alert("벽돌 카드를 위장할 제품을 선택해 주세요!");
          return;
        }
      }
    }

    const payload = Object.entries(configs).map(([instanceId, config]) => ({
      instanceId,
      customCondition: config.customCondition,
      askingPrice: config.askingPrice,
      fakeItemId: config.fakeItemId,
    }));
    onSubmit(payload);
  };

  return (
    <div className="motion-panel-strong bg-white p-6 rounded-xl border border-stone-200 shadow-md space-y-6">
      <div>
        <h2 className="text-2xl font-black text-stone-950">📦 사전 매물 등록 단계</h2>
        <p className="text-sm font-bold text-stone-500 mt-1">
          내 물건 5장에 기입할 상태와 희망가를 셋팅해 주세요. 다른 유저들은 기입된 상태만 볼 수 있습니다.
        </p>
        {isVillain && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-red-900 font-bold text-sm">
            😈 당신은 **빌런**입니다! 소지하고 있는 벽돌 카드를 위장할 제품을 반드시 둔갑시켜야 합니다.
          </div>
        )}
      </div>

      <div className="bg-stone-50 border border-stone-150 p-4 rounded-2xl space-y-3">
        <h3 className="text-lg font-black text-stone-800">내 비밀 프로필</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          <StatusBox label="내 자금" value={moneyLabel(me.money ?? 0)} />
          <div
            className={`status-tile border p-3 flex flex-col justify-center ${
              isVillain
                ? "border-red-200 bg-red-50/50 text-red-950"
                : "border-green-200 bg-green-50/50 text-green-950"
            }`}
          >
            <div className="text-xs font-black uppercase opacity-60">내 역할</div>
            <div className="mt-1 text-lg font-black">{roleLabel(me.role)}</div>
          </div>
        </div>
        {isVillain && (
          <div className="p-3 bg-red-100/70 border border-red-200 rounded text-red-900 font-bold text-sm">
            🎯 **빌런 행동 미션:** {me.mission}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {myHand.map((item) => {
          const config = configs[item.instanceId]!;
          return (
            <div
              key={item.instanceId}
              className="p-4 border border-stone-200 rounded-xl bg-stone-50/50 flex flex-col md:flex-row gap-4"
            >
              <div className="w-24 shrink-0 mx-auto">
                <CardImage src={item.imagePath} alt={item.name} />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <span className="font-bold text-stone-900">{item.name}</span>
                  {item.isBrick && (
                    <span className="ml-2 rounded bg-red-700 px-2 py-0.5 text-[10px] font-black text-white">
                      벽돌
                    </span>
                  )}
                </div>
                <div className="text-xs text-stone-500">
                  실제 정가: {moneyLabel(item.originalPrice)} · 실제 시세: {moneyLabel(item.marketPrice)}
                </div>
                <div className="text-xs font-bold text-red-600">
                  실제 상태: {conditionLabel(item.condition)}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <SelectLabel label="표기 상태 설정">
                    <select
                      value={config.customCondition}
                      onChange={(event) =>
                        handleConditionChange(item.instanceId, event.target.value as ItemCondition)
                      }
                      className="w-full border border-stone-300 bg-white px-3 py-2 text-sm font-bold"
                    >
                      <option value="mint">민트급 (새 상품 수준)</option>
                      <option value="used">사용감 있음 (일반 중고)</option>
                      <option value="defective">하자 있음 (결함 존재)</option>
                      <option value="broken">파손 (동작 불가)</option>
                    </select>
                  </SelectLabel>

                  <SelectLabel label="판매 희망가 설정">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handlePriceChange(item.instanceId, -50000)}
                        className="flex h-9 w-9 items-center justify-center border border-stone-300 bg-white hover:bg-stone-100 disabled:opacity-50 text-stone-700 font-black text-sm"
                      >
                        -5만
                      </button>
                      <span className="flex-1 text-center font-bold text-stone-900 border border-stone-300 py-1.5 bg-white text-sm">
                        {moneyLabel(config.askingPrice)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handlePriceChange(item.instanceId, 50000)}
                        className="flex h-9 w-9 items-center justify-center border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 font-black text-sm"
                      >
                        +5만
                      </button>
                    </div>
                  </SelectLabel>
                </div>

                {item.isBrick && isVillain && (
                  <div className="mt-3 p-3 bg-red-50/50 border border-red-200 rounded">
                    <SelectLabel label="벽돌 위장 타겟 설정 (필수)">
                      <select
                        value={config.fakeItemId ?? ""}
                        onChange={(event) => handleFakeItemChange(item.instanceId, event.target.value)}
                        className="w-full border border-stone-300 bg-white px-3 py-2 text-sm font-bold text-red-950"
                      >
                        <option value="">-- 위장할 제품 선택 --</option>
                        {ALL_ITEMS.map((ai) => (
                          <option key={ai.id} value={ai.id}>
                            {ai.name} (시세: {moneyLabel(ai.marketPrice)})
                          </option>
                        ))}
                      </select>
                    </SelectLabel>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-3">
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="motion-button inline-flex items-center justify-center bg-orange-600 px-6 py-3 text-base font-black text-white hover:bg-orange-700 disabled:bg-stone-300"
        >
          등록 및 준비 완료
        </button>
      </div>
    </div>
  );
}
