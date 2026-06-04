"use client";

import { useMemo, useState } from "react";
import {
  Lightbulb,
  Ban,
  Check,
  Copy,
  HelpCircle,
  LogOut,
  Play,
  RefreshCw,
  ShoppingBag,
  Users,
  AlertTriangle,
} from "lucide-react";
import { GameTutorialModal } from "./components/GameTutorialModal";
import { StepGuidePopover } from "./components/FoldableHelperCard";
import { MIN_PLAYERS, MAX_PLAYERS } from "../rules/game-rules";
import type { RoomMode, RoomSnapshot } from "@/features/game/server/types/game-server-types";
import { useOnlineGame } from "./hooks/useOnlineGame";
import { moneyLabel, CARD_BACK } from "./constants/ui-constants";

// 분리된 서브 컴포넌트들 임포트
import { WaitingRoom } from "./components/WaitingRoom";
import { PreparationPanel } from "./components/PreparationPanel";
import { PendingDealPanel } from "./components/PendingDealPanel";
import { ReviewPanel } from "./components/ReviewPanel";
import { ReportPanel } from "./components/ReportPanel";
import { ResultPanel } from "./components/ResultPanel";
import { PlayerList } from "./components/PlayerList";
import { LogPanel } from "./components/LogPanel";
import { MyDashboard } from "./components/MyDashboard";
import { MarketView } from "./components/MarketView";
import { ActionPanel } from "./components/ActionPanel";
import { ErrorNotice } from "./components/StatusComponents";

function marketProgressLabel(snapshot: RoomSnapshot) {
  if (snapshot.marketActionLimit <= 0) return "-";
  return `${snapshot.usedActionCount}/${snapshot.marketActionLimit}`;
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

  const [isStepGuideOpen, setIsStepGuideOpen] = useState(false);

  const currentStepId = useMemo(() => {
    if (!snapshot) return null;
    if (snapshot.status === "waiting") return "waiting";
    if (snapshot.status === "preparing") return "preparing";
    if (snapshot.status === "playing") {
      if (pendingDeal && isDealParty && !myDealChoice) return "pending_deal";
      if (currentAction) return "playing_action";
      return "playing_draw";
    }
    if (snapshot.status === "reporting") return "reporting";
    if (snapshot.status === "finished") return "finished";
    return null;
  }, [snapshot, pendingDeal, isDealParty, myDealChoice, currentAction]);

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

                {error && (
                  <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-950 font-bold text-xs animate-pulse">
                    ⚠️ {error}
                  </div>
                )}

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
                  type="button"
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
          <header className="game-top-strip px-4 py-2.5 mb-3">
            <div className="flex flex-wrap items-center justify-between gap-4 relative">
              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
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
              <div className="flex flex-wrap items-center gap-2">
                <FrameIconButton label="단계 도움말" onClick={() => setIsStepGuideOpen(!isStepGuideOpen)}>
                  <Lightbulb size={18} className={isStepGuideOpen ? "text-orange-500" : ""} />
                </FrameIconButton>
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

                {isStepGuideOpen && currentStepId && (
                  <div className="absolute right-0 top-12 z-50 animate-slide-down">
                    <StepGuidePopover stepId={currentStepId} onClose={() => setIsStepGuideOpen(false)} />
                  </div>
                )}
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
                <WaitingRoom
                  mode={snapshot.mode}
                  isHost={Boolean(me?.isHost)}
                  playerCount={snapshot.players.length}
                  loading={loading}
                  onAddBot={() => submitAction({ type: "addBot" })}
                />
              )}

              {snapshot.status === "preparing" && (
                <PreparationPanel
                  me={me}
                  myHand={myHand}
                  loading={loading}
                  onSubmit={(configs) =>
                    submitAction({ type: "fixPreparation", itemsConfig: configs })
                  }
                />
              )}

              {snapshot.status === "playing" && (
                <div className="min-w-0 space-y-3">
                  {pendingDeal && (
                    <PendingDealPanel
                      snapshot={snapshot}
                      item={pendingDealItem}
                      isDealParty={isDealParty}
                      myChoice={myDealChoice}
                      onChoose={(choice, scam) =>
                        submitAction({ type: "chooseDealCard", choice, scam })
                      }
                      onNego={(price) =>
                        submitAction({ type: "negoDeal", price })
                      }
                      me={me}
                      onUseInspectToken={() =>
                        submitAction({ type: "useInspectToken" })
                      }
                      onUseNegoToken={() =>
                        submitAction({ type: "useNegoToken" })
                      }
                    />
                  )}

                  {currentAction?.type === "tradeRequest" || currentAction?.type === "directTrade" ? (
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
                  
                </div>
              )}

              {snapshot.status === "reporting" && (
                <ReportPanel
                  snapshot={snapshot}
                  otherPlayers={otherPlayers}
                  onReport={(targetPlayerId) =>
                    submitAction({ type: "reportSuspiciousPlayer", targetPlayerId })
                  }
                />
              )}

              {snapshot.status === "finished" && snapshot.result && (
                <ResultPanel snapshot={snapshot} />
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
                  setDealTargetId={setDealTargetId}
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
                isMyTurn={isMyTurn}
              />
            </div>
          </div>
        </section>
      </div>
    </main>
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
  children: React.ReactNode;
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
  isMyTurn,
}: {
  mode: RoomMode;
  status: RoomSnapshot["status"];
  isHost: boolean;
  loading: boolean;
  canStart: boolean;
  onStart: () => void;
  onEndTurn: () => void;
  isMyTurn: boolean;
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
          disabled={!isMyTurn}
          className="motion-button mt-auto flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-4 text-base font-black text-white shadow-[0_7px_0_rgba(124,45,18,0.55)] hover:bg-orange-500 disabled:bg-stone-600 disabled:text-stone-300 disabled:shadow-none disabled:cursor-not-allowed"
        >
          <RefreshCw size={18} />
          {isMyTurn ? "턴 종료" : "상대 턴 대기"}
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
