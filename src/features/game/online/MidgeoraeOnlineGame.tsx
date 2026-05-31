"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
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
  Keyboard,
  Laptop,
  LogOut,
  MessageCircleWarning,
  Package,
  Play,
  Recycle,
  RefreshCw,
  Repeat2,
  Shirt,
  ShoppingBag,
  Smartphone,
  Speaker,
  Star,
  Tablet,
  ThumbsDown,
  ThumbsUp,
  Users,
  Vote,
  Watch,
} from "lucide-react";
import Image from "next/image";
import { MAX_PLAYERS, MIN_PLAYERS } from "../rules/game-rules";
import type {
  ActionCardSnapshot,
  ActionCardType,
  DealCardChoice,
  ItemCardSnapshot,
  PlayerRole,
  PublicPlayer,
  RoomAction,
  RoomMode,
  RoomSessionResult,
  RoomSnapshot,
} from "@/features/game/server/types";

interface Session {
  code: string;
  playerId: string;
  playerToken: string;
}

interface NetworkInviteResponse {
  inviteUrls: string[];
}

const SESSION_KEY = "midgeorae-online-session";
const CARD_BACK = "/game-cards/backs/item-back.svg";

const ACTION_PREVIEW_CARDS = [
  { title: "거래 제안", body: "상대에게 가격을 제안합니다.", accent: "orange" },
  { title: "가격 협상", body: "가격을 조정합니다.", accent: "orange" },
  { title: "아이템 보호", body: "내 아이템을 1회 보호.", accent: "green" },
  { title: "즉시 구매", body: "시장 아이템을 즉시 구매.", accent: "orange" },
  { title: "리뷰 작성", body: "거래 후 리뷰 작성.", accent: "green" },
] as const;

async function readJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T | { error?: string };
  if (!response.ok) {
    const errorData = data as { error?: string };
    throw new Error(errorData.error ?? "요청에 실패했습니다.");
  }
  return data as T;
}

async function requestSnapshot(activeSession: Session) {
  const response = await fetch(
    `/api/game/rooms/${activeSession.code}?token=${activeSession.playerToken}`,
    { cache: "no-store" },
  );
  return readJson<RoomSnapshot>(response);
}

function moneyLabel(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

function playerName(snapshot: RoomSnapshot, playerId: string) {
  return (
    snapshot.players.find((player) => player.id === playerId)?.name ?? "플레이어"
  );
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
    case "sell":
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

function isSaleAction(card: ActionCardSnapshot | null) {
  return card?.type === "sell" || card?.type === "freeGive" || card?.type === "directTrade";
}

export function MidgeoraeOnlineGame() {
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lanInviteUrls, setLanInviteUrls] = useState<string[]>([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [dealTargetId, setDealTargetId] = useState("");
  const [askingPrice, setAskingPrice] = useState(100000);
  const [actionTargetId, setActionTargetId] = useState("");
  const sessionRef = useRef<Session | null>(null);
  const sessionChangeRef = useRef(0);

  const shareUrl = useMemo(() => {
    if (!session || typeof window === "undefined") return "";
    return `${window.location.origin}/game?room=${session.code}`;
  }, [session]);
  const primaryInviteUrl = lanInviteUrls[0] ?? shareUrl;

  const me = snapshot?.me ?? null;
  const myHand = useMemo(() => me?.hand ?? [], [me?.hand]);
  const currentPlayer = snapshot?.players.find(
    (player) => player.id === snapshot.currentTurnPlayerId,
  );
  const isMyTurn = Boolean(me && me.id === snapshot?.currentTurnPlayerId);
  const otherPlayers = useMemo(
    () => snapshot?.players.filter((player) => player.id !== me?.id) ?? [],
    [me?.id, snapshot?.players],
  );
  const currentAction = snapshot?.currentActionCard ?? null;
  const pendingDeal = snapshot?.pendingDeal ?? null;
  const pendingDealItem = snapshot?.pendingDealItem ?? null;
  const pendingReviews = snapshot?.pendingReviews ?? [];
  const isDealParty = Boolean(
    pendingDeal &&
      me &&
      (pendingDeal.sellerId === me.id || pendingDeal.buyerId === me.id),
  );
  const myDealChoice =
    pendingDeal && me ? pendingDeal.choices[me.id] : undefined;

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const fetchSnapshot = useCallback(async (activeSession = sessionRef.current) => {
    if (!activeSession) return;
    const nextSnapshot = await requestSnapshot(activeSession);
    if (sessionRef.current?.playerToken === activeSession.playerToken) {
      setSnapshot(nextSnapshot);
      setError("");
    }
  }, []);

  useEffect(() => {
    const restoreId = ++sessionChangeRef.current;
    const saved = localStorage.getItem(SESSION_KEY);
    const params = new URLSearchParams(window.location.search);
    const roomFromUrl = params.get("room");
    if (roomFromUrl) setJoinCode(roomFromUrl.toUpperCase());
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Session;
        void requestSnapshot(parsed)
          .then((restoredSnapshot) => {
            if (sessionChangeRef.current !== restoreId) return;
            setSession(parsed);
            setSnapshot(restoredSnapshot);
          })
          .catch(() => {
            if (sessionChangeRef.current !== restoreId) return;
            localStorage.removeItem(SESSION_KEY);
            setSession(null);
            setSnapshot(null);
          });
      } catch {
        localStorage.removeItem(SESSION_KEY);
      }
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    const activeSession = session;
    const timer = window.setInterval(() => {
      void fetchSnapshot(activeSession).catch((fetchError: unknown) => {
        if (sessionRef.current?.playerToken !== activeSession.playerToken) return;
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "방 상태를 불러오지 못했습니다.",
        );
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [fetchSnapshot, session]);

  useEffect(() => {
    if (!session) {
      setLanInviteUrls([]);
      return;
    }

    const activeSession = session;
    const controller = new AbortController();

    async function refreshInviteUrls() {
      try {
        const response = await fetch(
          `/api/game/network?room=${encodeURIComponent(activeSession.code)}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );
        const data = await readJson<NetworkInviteResponse>(response);
        setLanInviteUrls(data.inviteUrls);
      } catch {
        if (!controller.signal.aborted) setLanInviteUrls([]);
      }
    }

    void refreshInviteUrls();
    const timer = window.setInterval(refreshInviteUrls, 5000);

    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [session]);

  useEffect(() => {
    if (myHand.length > 0 && !myHand.some((item) => item.instanceId === selectedItemId)) {
      setSelectedItemId(myHand[0]?.instanceId ?? "");
    }
  }, [myHand, selectedItemId]);

  useEffect(() => {
    if (otherPlayers.length > 0 && !otherPlayers.some((player) => player.id === dealTargetId)) {
      setDealTargetId(otherPlayers[0]?.id ?? "");
    }
    if (otherPlayers.length > 0 && !otherPlayers.some((player) => player.id === actionTargetId)) {
      setActionTargetId(otherPlayers[0]?.id ?? "");
    }
  }, [actionTargetId, dealTargetId, otherPlayers]);

  async function createGameRoom(mode: RoomMode) {
    sessionChangeRef.current += 1;
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/game/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, mode }),
      });
      const data = await readJson<RoomSessionResult>(response);
      const nextSession = {
        code: data.room.code,
        playerId: data.playerId,
        playerToken: data.playerToken,
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
      setSession(nextSession);
      setSnapshot(data.room);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "방을 만들지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function joinGameRoom() {
    sessionChangeRef.current += 1;
    setError("");
    setLoading(true);
    try {
      const code = joinCode.trim().toUpperCase();
      const response = await fetch(`/api/game/rooms/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await readJson<RoomSessionResult>(response);
      const nextSession = {
        code: data.room.code,
        playerId: data.playerId,
        playerToken: data.playerToken,
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
      setSession(nextSession);
      setSnapshot(data.room);
    } catch (joinError) {
      setError(
        joinError instanceof Error ? joinError.message : "방에 입장하지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function submitAction(action: RoomAction) {
    if (!session) return;
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`/api/game/rooms/${session.code}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: session.playerToken, action }),
      });
      const data = await readJson<RoomSnapshot>(response);
      setSnapshot(data);
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "액션을 처리하지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }

  function leaveRoom() {
    sessionChangeRef.current += 1;
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setSnapshot(null);
    setError("");
  }

  async function copyInvite() {
    if (!primaryInviteUrl) return;
    const inviteText = `${primaryInviteUrl}\n방 코드: ${session?.code ?? ""}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(inviteText);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = inviteText;
        textArea.setAttribute("readonly", "");
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setError(`초대 주소: ${primaryInviteUrl} / 방 코드: ${session?.code ?? ""}`);
    }
  }

  function listSelectedItem() {
    const price = currentAction?.type === "freeGive" ? 0 : askingPrice;
    void submitAction({
      type: "listItemForSale",
      itemInstanceId: selectedItemId,
      askingPrice: price,
      targetPlayerId: dealTargetId,
    });
  }

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
                <FrameStat label="Round" value={`${snapshot.round}/${snapshot.maxRounds}`} />
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
            <WaitingRoom
              mode={snapshot.mode}
              isHost={Boolean(me?.isHost)}
              playerCount={snapshot.players.length}
              loading={loading}
              onAddBot={() => submitAction({ type: "addBot" })}
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
                  onChoose={(choice) =>
                    submitAction({ type: "chooseDealCard", choice })
                  }
                />
              )}

              <MyDashboard
                me={me}
                myHand={myHand}
                isMyTurn={isMyTurn}
                selectedItemId={selectedItemId}
                setSelectedItemId={setSelectedItemId}
              />

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

          {snapshot.status === "voting" && (
            <VotePanel
              snapshot={snapshot}
              otherPlayers={otherPlayers}
              onVote={(targetPlayerId) =>
                submitAction({ type: "voteVillain", targetPlayerId })
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
                  dealTargetId={dealTargetId}
                  setDealTargetId={setDealTargetId}
                  askingPrice={askingPrice}
                  setAskingPrice={setAskingPrice}
                  actionTargetId={actionTargetId}
                  setActionTargetId={setActionTargetId}
                  pendingDealActive={Boolean(pendingDeal)}
                  currentPlayerName={currentPlayer?.name ?? ""}
                  onDraw={() => submitAction({ type: "drawActionCard" })}
                  onListItem={listSelectedItem}
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
                onStartVoting={() => submitAction({ type: "startVoting" })}
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
  onStartVoting,
  onEndTurn,
}: {
  mode: RoomMode;
  status: RoomSnapshot["status"];
  isHost: boolean;
  loading: boolean;
  canStart: boolean;
  onStart: () => void;
  onStartVoting: () => void;
  onEndTurn: () => void;
}) {
  const statusCopy = {
    waiting: ["대기", `${MIN_PLAYERS}-${MAX_PLAYERS}명 모이면 시작`],
    playing: ["진행", "턴 종료만 남김"],
    voting: ["투표", "빌런 지목 단계"],
    finished: ["종료", "결과 확인"],
  }[status];

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
      ) : status === "voting" && isHost ? (
        <button
          type="button"
          onClick={onStartVoting}
          className="motion-button mt-auto flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-4 text-base font-black text-white shadow-[0_7px_0_rgba(124,45,18,0.55)] hover:bg-orange-500"
        >
          <Vote size={18} />
          투표 진행
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
        <div className="mt-1 text-xs font-black text-orange-700">
          {item.revealed ? moneyLabel(item.marketPrice) : "비공개"}
        </div>
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
  if (isSaleAction(action)) {
    return {
      title: `내 턴: ${action.title}`,
      body: "내 손패에서 물건을 고르고 상대와 가격을 정해 거래를 제안하세요.",
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
            <div className="my-role-chip my-role-chip-job">
              <span>직업</span>
              <strong>{me.job.title}</strong>
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
}: {
  snapshot: RoomSnapshot;
  item: ItemCardSnapshot | null;
  isDealParty: boolean;
  myChoice: DealCardChoice | undefined;
  onChoose: (choice: DealCardChoice) => void;
}) {
  const deal = snapshot.pendingDeal;
  if (!deal) return null;

  return (
    <section className="motion-panel-strong market-card-table p-5">
      <div className="relative">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-orange-950">거래 진행 중</h2>
          <p className="mt-1 text-sm font-bold text-orange-800">
            {playerName(snapshot, deal.sellerId)} → {playerName(snapshot, deal.buyerId)} ·{" "}
            {moneyLabel(deal.askingPrice)}
          </p>
        </div>
        <Handshake className="text-orange-700" size={28} />
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
          <div className="mt-2 text-sm font-bold text-stone-500">
            시장가 {item?.revealed ? moneyLabel(item.marketPrice) : "비공개"}
          </div>

          {isDealParty ? (
            myChoice ? (
              <div className="mt-5 inline-flex items-center gap-2 border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-black text-stone-700">
                <Check size={16} />
                내 거래 카드 선택 완료
              </div>
            ) : (
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
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
  dealTargetId,
  setDealTargetId,
  askingPrice,
  setAskingPrice,
  actionTargetId,
  setActionTargetId,
  pendingDealActive,
  currentPlayerName,
  onDraw,
  onListItem,
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
  dealTargetId: string;
  setDealTargetId: (value: string) => void;
  askingPrice: number;
  setAskingPrice: (value: number) => void;
  actionTargetId: string;
  setActionTargetId: (value: string) => void;
  pendingDealActive: boolean;
  currentPlayerName: string;
  onDraw: () => void;
  onListItem: () => void;
  onTerror: () => void;
  onRecycle: (itemInstanceId: string) => void;
  onSwap: () => void;
  onSkip: () => void;
  compact?: boolean;
}) {
  const selectedItem = myHand.find((item) => item.instanceId === selectedItemId);
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
      ) : isSaleAction(action) ? (
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
            <SelectLabel label="판매 물건">
              <select
                value={selectedItemId}
                onChange={(event) => setSelectedItemId(event.target.value)}
                className="w-full border border-stone-300 bg-white px-3 py-2 text-sm font-bold"
              >
                {myHand.map((item) => (
                  <option key={item.instanceId} value={item.instanceId}>
                    {item.name} · 시장가 {moneyLabel(item.marketPrice)}
                  </option>
                ))}
              </select>
            </SelectLabel>
            <SelectLabel label="구매자">
              <select
                value={dealTargetId}
                onChange={(event) => setDealTargetId(event.target.value)}
                className="w-full border border-stone-300 bg-white px-3 py-2 text-sm font-bold"
              >
                {otherPlayers.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                  </option>
                ))}
              </select>
            </SelectLabel>
            <SelectLabel label="제시 가격">
              <input
                type="number"
                value={action.type === "freeGive" ? 0 : askingPrice}
                onChange={(event) => setAskingPrice(Number(event.target.value))}
                disabled={action.type === "freeGive"}
                min={0}
                step={10000}
                className="w-full border border-stone-300 bg-white px-3 py-2 text-sm font-bold disabled:bg-stone-100"
              />
            </SelectLabel>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onListItem}
                disabled={!selectedItemId || !dealTargetId}
                className="motion-button inline-flex items-center justify-center gap-2 bg-stone-950 px-4 py-3 text-sm font-black text-white hover:bg-orange-700 disabled:bg-stone-300"
              >
                <Handshake size={17} />
                거래 제안
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

function VotePanel({
  snapshot,
  otherPlayers,
  onVote,
}: {
  snapshot: RoomSnapshot;
  otherPlayers: PublicPlayer[];
  onVote: (targetPlayerId: string) => void;
}) {
  return (
    <section className="motion-panel market-card-table p-5">
      <div className="relative">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">빌런 투표</h2>
          <p className="mt-1 text-sm font-bold text-stone-500">
            {snapshot.votesCast}/{snapshot.players.length}명 투표 완료
          </p>
        </div>
        <Vote className="text-orange-600" size={26} />
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {otherPlayers.map((player) => (
          <button
            key={player.id}
            onClick={() => onVote(player.id)}
            className="motion-button flex items-center justify-between border border-stone-300 px-3 py-3 text-left font-black hover:bg-stone-100"
          >
            {player.name}
            <Vote size={16} />
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
      className={`aspect-[7/10] w-full border border-stone-200 bg-white object-contain shadow-[0_6px_0_rgba(28,25,23,0.08)] ${className}`}
    />
  );
}
