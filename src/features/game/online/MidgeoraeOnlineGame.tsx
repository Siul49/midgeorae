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
  Settings,
  HelpCircle,
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
} from "lucide-react";
import Image from "next/image";
import { MAX_PLAYERS, MIN_PLAYERS, JOB_CARDS } from "../rules/game-rules";
import { ALL_ITEMS, GOLDEN_ITEMS } from "../data/items";
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
  { title: "거래 신청", body: "상대 물건에 가격을 제시합니다.", accent: "orange" },
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

function productIcon(item: ItemCardSnapshot, size = 72) {
  const iconProps = { size, strokeWidth: 1.8 };
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isPriceListOpen, setIsPriceListOpen] = useState(false);
  const [isMissionListOpen, setIsMissionListOpen] = useState(false);
  const sessionRef = useRef<Session | null>(null);
  const sessionChangeRef = useRef(0);

  const selectCardFromTable = useCallback((playerId: string, itemInstanceId: string) => {
    setDealTargetId(playerId);
    setSelectedItemId(itemInstanceId);
  }, []);

  const shareUrl = useMemo(() => {
    if (!session || typeof window === "undefined") return "";
    return `${window.location.origin}/game?room=${session.code}`;
  }, [session]);
  const primaryInviteUrl = lanInviteUrls[0] ?? shareUrl;

  const me = snapshot?.me ?? null;
  const myHand = useMemo(() => me?.hand ?? [], [me?.hand]);
  const totalAssets = useMemo(() => {
    if (!me) return 0;
    return (me.money ?? 0) + myHand.reduce((sum, item) => sum + (item.marketPrice ?? 0), 0);
  }, [me, myHand]);
  const currentPlayer = snapshot?.players.find(
    (player) => player.id === snapshot.currentTurnPlayerId,
  );
  const isMyTurn = Boolean(me && me.id === snapshot?.currentTurnPlayerId);
  const otherPlayers = useMemo(
    () => snapshot?.players.filter((player) => player.id !== me?.id) ?? [],
    [me?.id, snapshot?.players],
  );
  const selectedOwner = useMemo(
    () => otherPlayers.find((player) => player.id === dealTargetId),
    [dealTargetId, otherPlayers],
  );
  const requestableItems = useMemo(
    () => selectedOwner?.publicItems ?? [],
    [selectedOwner?.publicItems],
  );
  const currentAction = snapshot?.currentActionCard ?? null;
  const pendingDeal = snapshot?.pendingDeal ?? null;
  const pendingDealItem = snapshot?.pendingDealItem ?? null;
  const pendingReviews = snapshot?.pendingReviews ?? [];

  const [roleAcknowledged, setRoleAcknowledged] = useState(false);

  useEffect(() => {
    if (snapshot?.status !== "playing") {
      setRoleAcknowledged(false);
    }
  }, [snapshot?.status]);

  const myPendingReviews = useMemo(() => {
    return pendingReviews.filter((r) => r.reviewerId === me?.id);
  }, [pendingReviews, me?.id]);

  const getPlayerReviewChoice = useCallback((playerId: string) => {
    if (!snapshot) return null;
    const reviewLog = [...(snapshot.logs || [])].reverse().find(
      (log) => log.includes(`${playerName(snapshot, playerId)}님이`) && log.includes("거래 후기")
    );
    if (!reviewLog) return null;
    if (reviewLog.includes("만족") && !reviewLog.includes("불만족")) return "만족 👍";
    if (reviewLog.includes("불만족")) return "불만족 👎";
    return null;
  }, [snapshot]);

  const isActionCardFullyAcked = useMemo(() => {
    if (!snapshot) return false;
    return snapshot.currentActionAcks.length === snapshot.players.length;
  }, [snapshot]);

  const hasMyAck = useMemo(() => {
    if (!me || !snapshot) return false;
    return snapshot.currentActionAcks.includes(me.id);
  }, [me, snapshot]);

  const activeActionType = currentAction?.type;
  
  const isPlayerInteractive = Boolean(
    isMyTurn &&
    (activeActionType === "badReview" ||
     activeActionType === "swap" ||
     activeActionType === "directTrade" ||
     activeActionType === "tradeRequest" ||
     activeActionType === "freeGive" ||
     activeActionType === "saleRequest")
  );

  const isCardInteractive = Boolean(
    isMyTurn &&
    (activeActionType === "tradeRequest" ||
     activeActionType === "freeGive" ||
     activeActionType === "directTrade" ||
     activeActionType === "saleRequest" ||
     activeActionType === "swap" ||
     activeActionType === "badReview")
  );

  const handleSelectOpponentCard = (playerId: string, itemId: string) => {
    onSelectPlayer(playerId);
    if (
      activeActionType === "tradeRequest" ||
      activeActionType === "freeGive" ||
      activeActionType === "directTrade"
    ) {
      setSelectedItemId(itemId);
    }
  };

  const onSelectPlayer = (id: string) => {
    if (
      activeActionType === "directTrade" ||
      activeActionType === "tradeRequest" ||
      activeActionType === "freeGive" ||
      activeActionType === "saleRequest"
    ) {
      setDealTargetId(id);
    } else {
      setActionTargetId(id);
    }
  };

  const isDealParty = Boolean(
    pendingDeal &&
      me &&
      (pendingDeal.ownerId === me.id || pendingDeal.requesterId === me.id),
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
    const selectableItems = isTradeRequestAction(currentAction)
      ? requestableItems
      : myHand;
    if (
      selectableItems.length > 0 &&
      !selectableItems.some((item) => item.instanceId === selectedItemId)
    ) {
      setSelectedItemId(selectableItems[0]?.instanceId ?? "");
    }
  }, [currentAction, myHand, requestableItems, selectedItemId]);

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

  function requestSelectedItem() {
    const price = currentAction?.type === "freeGive" ? 0 : askingPrice;
    void submitAction({
      type: "requestTrade",
      ownerId: dealTargetId,
      itemInstanceId: selectedItemId,
      offerPrice: price,
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
    <main className="fullscreen-game-container text-stone-950">
      {/* Settings Gear Icon - top right */}
      <button
        type="button"
        onClick={() => setIsMenuOpen(true)}
        className="absolute top-3 right-3 z-50 motion-button bg-stone-900/80 hover:bg-stone-800 border border-stone-700 text-white rounded-full w-10 h-10 flex items-center justify-center cursor-pointer"
        title="설정 메뉴"
      >
        <Settings size={18} />
      </button>

      <div className="table-wood-frame">
        <div className="seat-top">
          {otherPlayers[0] && (
            <SidePlayerSeat
              player={otherPlayers[0]}
              isTurn={otherPlayers[0].id === snapshot.currentTurnPlayerId}
              isInteractive={isPlayerInteractive}
              isCardInteractive={isCardInteractive}
              onSelectPlayer={onSelectPlayer}
              onSelectCard={handleSelectOpponentCard}
              selectedItemId={selectedItemId}
              dealTargetId={dealTargetId}
              activeActionType={snapshot.currentActionCard?.type}
            />
          )}
        </div>
        
        <div className="seat-left seat-left-rotated">
          {otherPlayers[1] && (
            <SidePlayerSeat
              player={otherPlayers[1]}
              isTurn={otherPlayers[1].id === snapshot.currentTurnPlayerId}
              isInteractive={isPlayerInteractive}
              isCardInteractive={isCardInteractive}
              onSelectPlayer={onSelectPlayer}
              onSelectCard={handleSelectOpponentCard}
              selectedItemId={selectedItemId}
              dealTargetId={dealTargetId}
              activeActionType={snapshot.currentActionCard?.type}
            />
          )}
        </div>

        <div className="center-play-area">
          <div className="w-full max-w-2xl mx-auto h-full relative flex items-center justify-center">
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
              <div className="w-full h-full relative flex items-center justify-center">
                {/* Role Reveal Overlay Modal */}
                {!roleAcknowledged && me && (
                  <div className="absolute inset-0 bg-stone-950/95 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 rounded-xl text-center space-y-6 animate-fade-in border border-orange-500/30">
                    <div className="space-y-2">
                      <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest leading-none">게임 시작</span>
                      <h2 className={`text-3xl font-black ${me.role === "villain" ? "text-red-500" : "text-sky-400"}`}>
                        당신은 {me.role === "villain" ? "빌런" : "시민"}입니다.
                      </h2>
                    </div>
                    <div className="w-full max-w-sm bg-stone-900/80 p-4 rounded-lg border border-stone-800 space-y-3">
                      <p className="text-xs font-bold text-stone-300 leading-relaxed">
                        {me.role === "villain"
                          ? "이 정보는 본인 화면에만 보입니다. 들키지 않고 빌런 미션을 완수하세요!"
                          : "거래 기록과 평판을 보고 빌런을 찾아내어 신고하세요."}
                      </p>
                      {me.role === "villain" && (
                        <div className="text-xs font-black text-red-400 bg-red-950/40 p-2.5 rounded border border-red-900/40">
                          🔥 빌런 미션: {me.mission}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setRoleAcknowledged(true)}
                      className="motion-button w-full max-w-xs bg-orange-600 hover:bg-orange-500 text-stone-950 text-sm font-black py-2.5 rounded-lg shadow-lg cursor-pointer"
                    >
                      역할 확인 완료
                    </button>
                  </div>
                )}

                {/* Underlay: Action panel or draw deck */}
                {!pendingDeal && currentAction && !isActionCardFullyAcked ? (
                  <div className="flex flex-col gap-3 text-white text-center justify-center w-full max-w-sm p-5 bg-stone-900/90 border-2 border-amber-500/40 rounded-xl shadow-2xl animate-fade-in relative z-25">
                    <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest leading-none">
                      📢 {playerName(snapshot, snapshot.currentTurnPlayerId ?? "")}님이 행동 카드를 뽑았습니다!
                    </span>
                    <div className="bg-stone-950/60 p-4 rounded-lg border border-white/5 space-y-2">
                      <h2 className="text-base font-black text-white">{currentAction.title}</h2>
                      <p className="text-xs font-bold text-stone-300 leading-relaxed">{currentAction.description}</p>
                    </div>
                    
                    {!hasMyAck ? (
                      <button
                        type="button"
                        onClick={() => submitAction({ type: "ackActionCard" })}
                        disabled={loading}
                        className="motion-button bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-stone-950 text-xs font-black py-2 rounded-lg shadow-md cursor-pointer"
                      >
                        {loading ? "처리 중..." : "확인"}
                      </button>
                    ) : (
                      <div className="text-xs font-black text-amber-300 bg-amber-950/30 py-2 rounded-lg border border-amber-900/30 animate-pulse">
                        다른 플레이어들의 확인을 기다리는 중... ({snapshot.currentActionAcks.length}/{snapshot.players.length})
                      </div>
                    )}
                  </div>
                ) : (
                  !pendingDeal && isMyTurn && !currentAction ? (
                    <div className="flex flex-col items-center justify-center p-6 bg-stone-900/40 border border-white/5 rounded-xl shadow-lg text-center w-full min-h-[220px]">
                      <button
                        onClick={() => submitAction({ type: "drawActionCard" })}
                        disabled={loading}
                        className="motion-button action-deck-stack pulse-draw flex flex-col items-center justify-center gap-2 border-orange-500 shadow-2xl relative cursor-pointer"
                      >
                        <ShoppingBag size={32} className="text-orange-400" />
                        <span className="text-[11px] font-black tracking-widest text-amber-200">ACTION DECK</span>
                        <div className="text-sm font-black text-white mt-2">행동 카드 뽑기</div>
                      </button>
                      <p className="mt-4 text-xs font-bold text-stone-400">내 턴이 되었습니다. 카드를 뽑아 행동을 진행하세요.</p>
                    </div>
                  ) : (
                    currentAction && isActionCardFullyAcked && (
                      <div className="w-full max-w-lg pr-1">
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
                          currentPlayerName={playerName(snapshot, snapshot.currentTurnPlayerId ?? "")}
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
                      </div>
                    )
                  )
                )}

                {/* Overlays inside play area */}
                {pendingDeal && (
                  <div className="absolute inset-0 bg-stone-950/85 backdrop-blur-sm z-20 flex items-center justify-center p-2 rounded-xl">
                    <div className="w-full max-w-lg">
                      <PendingDealPanel
                        snapshot={snapshot}
                        item={pendingDealItem}
                        isDealParty={isDealParty}
                        myChoice={myDealChoice}
                        onChoose={(choice) =>
                          submitAction({ type: "chooseDealCard", choice })
                        }
                        onPropose={(price) =>
                          submitAction({ type: "proposePrice", price })
                        }
                      />
                    </div>
                  </div>
                )}
                {myPendingReviews.length > 0 && (
                  <div className="absolute inset-0 bg-stone-950/85 backdrop-blur-sm z-20 flex items-center justify-center p-2 rounded-xl">
                    <div className="w-full max-w-lg">
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
                    </div>
                  </div>
                )}
                {myPendingReviews.length === 0 && pendingReviews.length > 0 && (
                  <div className="absolute inset-0 bg-stone-950/85 backdrop-blur-sm z-20 flex items-center justify-center p-2 rounded-xl">
                    <div className="w-full max-w-md bg-stone-900 border border-stone-800 p-5 rounded-xl shadow-2xl text-center space-y-4 mx-auto relative z-25 text-white">
                      <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest leading-none">거래 완료</span>
                      <div className="bg-stone-950/20 py-2 px-3 rounded-lg border border-emerald-800/40 text-emerald-400 text-sm font-black animate-pulse">
                        🎉 거래가 성사되었습니다!
                      </div>
                      <h3 className="text-xs font-bold text-stone-300">두 플레이어가 거래 후기를 작성 중입니다...</h3>
                      <div className="bg-stone-950/50 p-3 rounded-lg border border-white/5 space-y-2">
                        {pendingReviews[0] && (
                          <div className="flex justify-between items-center text-xs font-bold px-2 py-1">
                            <span className="text-stone-300">{playerName(snapshot, pendingReviews[0].reviewerId)}</span>
                            <span className="text-amber-400 font-black animate-pulse">작성 중... ✍️</span>
                          </div>
                        )}
                        {pendingReviews[0] && (
                          <div className="flex justify-between items-center text-xs font-bold px-2 py-1 border-t border-white/5">
                            <span className="text-stone-300">{playerName(snapshot, pendingReviews[0].targetPlayerId)}</span>
                            <span className={pendingReviews.some(r => r.reviewerId === pendingReviews[0].targetPlayerId) ? "text-amber-400 font-black animate-pulse" : "text-emerald-400 font-black"}>
                              {pendingReviews.some(r => r.reviewerId === pendingReviews[0].targetPlayerId) ? "작성 중... ✍️" : (getPlayerReviewChoice(pendingReviews[0].targetPlayerId) || "완료 👍")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
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
              <ResultPanel
                snapshot={snapshot}
                submitAction={submitAction}
                leaveRoom={leaveRoom}
                loading={loading}
              />
            )}
          </div>
        </div>

        <div className="seat-right seat-right-rotated">
          {otherPlayers[2] && (
            <SidePlayerSeat
              player={otherPlayers[2]}
              isTurn={otherPlayers[2].id === snapshot.currentTurnPlayerId}
              isInteractive={isPlayerInteractive}
              isCardInteractive={isCardInteractive}
              onSelectPlayer={onSelectPlayer}
              onSelectCard={handleSelectOpponentCard}
              selectedItemId={selectedItemId}
              dealTargetId={dealTargetId}
              activeActionType={snapshot.currentActionCard?.type}
            />
          )}
          {otherPlayers[3] && (
            <div className="mt-4">
              <SidePlayerSeat
                player={otherPlayers[3]}
                isTurn={otherPlayers[3].id === snapshot.currentTurnPlayerId}
                isInteractive={isPlayerInteractive}
                isCardInteractive={isCardInteractive}
                onSelectPlayer={onSelectPlayer}
                onSelectCard={handleSelectOpponentCard}
                selectedItemId={selectedItemId}
                dealTargetId={dealTargetId}
                activeActionType={snapshot.currentActionCard?.type}
              />
            </div>
          )}
        </div>

        {/* BOTTOM SEAT (Me) */}
        <div className="seat-bottom">
          {me && (
            <div className="asset-banner">
              <span>💰 총 자산: {moneyLabel(totalAssets)}</span>
              <span className="text-stone-500 font-normal mx-1">|</span>
              <span>💵 보유 현금: <strong className="text-amber-400 font-black">{moneyLabel(me.money ?? 0)}</strong></span>
            </div>
          )}
          <div className="w-full h-[140px] min-w-0">
            {me && (
              <MyDashboard
                me={me}
                myHand={myHand}
                isMyTurn={isMyTurn}
                selectedItemId={selectedItemId}
                setSelectedItemId={setSelectedItemId}
                likes={snapshot.players.find((p) => p.id === me.id)?.likes ?? 0}
                dislikes={snapshot.players.find((p) => p.id === me.id)?.dislikes ?? 0}
              />
            )}
          </div>
        </div>
      </div>

      {/* Floating Center Deck Controls */}
      {snapshot.status === "waiting" && !pendingDeal && (
        <div className="absolute bottom-3 right-3 z-30">
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
      )}

      {/* Logs overlay box inside table */}
      <div className="logs-box-center border border-white/5">
        <div className="text-[11px] font-black text-amber-200/50 mb-1 border-b border-white/5 pb-0.5">게임 로그</div>
        <div className="space-y-0.5 max-h-[75px] overflow-y-auto">
          {snapshot.logs.slice().reverse().slice(0, 5).map((log, index) => (
            <div key={index} className="truncate text-[10px] opacity-75">{log}</div>
          ))}
        </div>
      </div>

      {/* Settings menu Modal overlay */}
      {isMenuOpen && (
        <div className="settings-menu-overlay" onClick={() => setIsMenuOpen(false)}>
          <div className="settings-menu-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
              <h3 className="text-lg font-black text-purple-400 flex items-center gap-2">
                <Settings size={20} /> 설정 메뉴
              </h3>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="text-stone-400 hover:text-white font-black text-sm cursor-pointer"
              >
                닫기
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-stone-900 p-3 rounded-lg border border-purple-500/20 text-center">
                <span className="text-xs text-stone-400 block mb-1">방 코드 (Room Code)</span>
                <strong className="text-2xl text-white tracking-[0.2em]">{snapshot.code}</strong>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    fetchSnapshot();
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center justify-center gap-2 bg-stone-800 hover:bg-stone-750 text-white py-2.5 rounded-lg border border-stone-700 font-bold text-xs cursor-pointer"
                >
                  <RefreshCw size={14} /> 새로고침
                </button>
                <button
                  onClick={() => {
                    copyInvite();
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center justify-center gap-2 bg-stone-800 hover:bg-stone-750 text-white py-2.5 rounded-lg border border-stone-700 font-bold text-xs cursor-pointer"
                >
                  <Copy size={14} /> {copied ? "복사됨!" : "초대 복사"}
                </button>
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsHelpOpen(true);
                  }}
                  className="flex items-center justify-center gap-2 bg-stone-800 hover:bg-stone-750 text-white py-2.5 rounded-lg border border-stone-700 font-bold text-xs cursor-pointer"
                >
                  <HelpCircle size={14} /> 도움말
                </button>
                <button
                  onClick={() => {
                    leaveRoom();
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center justify-center gap-2 bg-red-900 hover:bg-red-800 text-white py-2.5 rounded-lg border border-red-700 font-bold text-xs cursor-pointer"
                >
                  <LogOut size={14} /> 나가기
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsPriceListOpen(true);
                  }}
                  className="flex items-center justify-center gap-2 bg-purple-950/70 hover:bg-purple-900/85 text-purple-300 py-2.5 rounded-lg border border-purple-800/40 font-bold text-xs cursor-pointer shadow-sm transition-all"
                >
                  📋 물건 시세표 보기
                </button>
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsMissionListOpen(true);
                  }}
                  className="flex items-center justify-center gap-2 bg-purple-950/70 hover:bg-purple-900/85 text-purple-300 py-2.5 rounded-lg border border-purple-800/40 font-bold text-xs cursor-pointer shadow-sm transition-all"
                >
                  🎭 직업 미션표 보기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help Modal Overlay */}
      {isHelpOpen && (
        <div className="settings-menu-overlay" onClick={() => setIsHelpOpen(false)}>
          <div className="settings-menu-content max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
              <h3 className="text-lg font-black text-purple-400 flex items-center gap-2">
                <HelpCircle size={20} /> 믿거래 도움말
              </h3>
              <button
                onClick={() => setIsHelpOpen(false)}
                className="text-stone-400 hover:text-white font-black text-sm cursor-pointer"
              >
                닫기
              </button>
            </div>
            <div className="space-y-3 text-xs text-stone-300 overflow-y-auto max-h-[300px] leading-relaxed pr-1 select-text">
              <p className="font-extrabold text-orange-400 text-sm">중고거래를 진행하며 숨어 있는 빌런을 찾는 3~4인용 추론 웹 보드게임입니다.</p>
              <div>
                <h4 className="font-black text-white text-xs mb-1">🎮 게임 진행 순서:</h4>
                <ol className="list-decimal list-inside space-y-1">
                  <li><strong>행동 카드 뽑기</strong>: 자기 턴에 행동 카드를 뽑습니다. (거래 신청, 보호 등)</li>
                  <li><strong>거래 제안/액션</strong>: 뽑은 카드에 따라 거래를 하거나 기타 액션을 실행합니다.</li>
                  <li><strong>거래 수락/취소</strong>: 거래 상대방과 서로 카드를 내어 쿨거래 시 거래 성공, 어느 한쪽이라도 취소 시 실패합니다. (벽돌 카드는 거래 후 1턴 뒤에 정체가 공개됩니다!)</li>
                  <li><strong>거래 후 평판 평가</strong>: 거래 완료 후 만족/불만족 리뷰를 남겨 평판 토큰을 뺏거나 깎습니다.</li>
                  <li><strong>시장 마감 &amp; 최종 신고</strong>: 액션 제한 횟수가 모두 소진되면 의심스러운 빌런을 지목해 최종 고발합니다.</li>
                </ol>
              </div>
              <div className="border-t border-white/10 pt-2">
                <h4 className="font-black text-white text-xs mb-1">🎭 역할 설명:</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>시민</strong>: 정상 거래를 하며 빌런을 찾습니다.</li>
                  <li><strong>빌런</strong>: 사기 거래(벽돌 판매 등)나 가짜 평판 테러 등을 통해 정체를 숨기고 시민들을 교란합니다.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Price List Modal Overlay */}
      {isPriceListOpen && (
        <div className="settings-menu-overlay" onClick={() => setIsPriceListOpen(false)}>
          <div className="settings-menu-content flex flex-col" style={{ maxWidth: "600px", width: "95%" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10 flex-shrink-0">
              <h3 className="text-lg font-black text-purple-400 flex items-center gap-2">
                📋 모든 물건 시세표
              </h3>
              <button
                onClick={() => setIsPriceListOpen(false)}
                className="text-stone-400 hover:text-white font-black text-sm cursor-pointer"
              >
                닫기
              </button>
            </div>
            
            <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs select-text" style={{ maxHeight: "65vh" }}>
              {(["electronics", "fashion", "hobby", "living", "golden"] as const).map((cat) => {
                const items = cat === "golden"
                  ? GOLDEN_ITEMS
                  : ALL_ITEMS.filter((item) => item.category === cat);
                
                const catName = {
                  electronics: "🔌 전자제품 (Electronics)",
                  fashion: "👜 패션잡화 (Fashion)",
                  hobby: "🎨 취미/레저 (Hobby)",
                  living: "🪑 생활용품 (Living)",
                  golden: "✨ 희귀/황금 아이템 (Golden)",
                }[cat];

                const cardBg = cat === "golden"
                  ? "bg-amber-950/25 border-amber-500/30 hover:bg-amber-950/45 text-amber-200"
                  : "bg-stone-900/50 border-white/5 hover:bg-stone-900/80 text-stone-200";

                return (
                  <div key={cat} className="space-y-1.5">
                    <h4 className="font-extrabold text-purple-300 text-xs px-1">
                      {catName}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 animate-fade-in">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between p-2.5 rounded-lg border ${cardBg} transition-colors`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-xl" role="img" aria-label={item.name}>
                              {item.emoji}
                            </span>
                            <div>
                              <div className="font-bold leading-tight">
                                {item.name}
                              </div>
                              <div className="text-[9px] text-stone-500 mt-0.5 uppercase tracking-wide">
                                {item.condition === "mint"
                                  ? "신품급"
                                  : item.condition === "used"
                                  ? "중고"
                                  : item.condition === "defective"
                                  ? "하자있음"
                                  : "고장"}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-black text-amber-500">
                              {item.marketPrice.toLocaleString("ko-KR")}원
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Job Mission List Modal Overlay */}
      {isMissionListOpen && (
        <div className="settings-menu-overlay" onClick={() => setIsMissionListOpen(false)}>
          <div className="settings-menu-content flex flex-col" style={{ maxWidth: "550px", width: "95%" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10 flex-shrink-0">
              <h3 className="text-lg font-black text-purple-400 flex items-center gap-2">
                🎭 모든 직업 미션표
              </h3>
              <button
                onClick={() => setIsMissionListOpen(false)}
                className="text-stone-400 hover:text-white font-black text-sm cursor-pointer"
              >
                닫기
              </button>
            </div>
            
            <div className="space-y-2 overflow-y-auto pr-1 flex-1 text-xs select-text animate-fade-in" style={{ maxHeight: "65vh" }}>
              <p className="text-stone-400 font-bold mb-3 px-1">
                시민 승리 시 아래 비밀 미션을 단독으로 달성한 플레이어가 최종 우승자가 됩니다. (동점/미달성 시 자산 순)
              </p>
              <div className="space-y-2">
                {JOB_CARDS.map((job) => {
                  const emoji = {
                    developer: "💻",
                    model: "👜",
                    housewife: "🪑",
                    "brick-collector": "🧱",
                    collector: "📦",
                    citizen: "👑",
                  }[job.id] || "🎭";

                  const borderGlow = job.id === "citizen"
                    ? "border-amber-500/20 bg-amber-950/10"
                    : "border-purple-500/10 bg-purple-950/5";

                  return (
                    <div
                      key={job.id}
                      className={`p-3 rounded-xl border ${borderGlow} flex items-start gap-3 hover:bg-white/5 transition-colors`}
                    >
                      <span className="text-2xl pt-0.5" role="img" aria-label={job.title}>
                        {emoji}
                      </span>
                      <div className="space-y-0.5">
                        <div className="font-extrabold text-white text-sm">
                          {job.title}
                        </div>
                        <div className="font-bold text-stone-300 leading-normal">
                          {job.description}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute bottom-16 left-3 z-30 max-w-sm">
          <ErrorNotice message={error} />
        </div>
      )}
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
        <div className="mt-auto rounded border border-white/10 bg-white/5 px-3 py-3 text-center text-xs font-black text-amber-100/70">
          게임 진행 중
        </div>
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
  if (action?.type === "saleRequest") {
    return {
      title: `내 턴: ${action.title}`,
      body: "내 물건을 골라 상대에게 판매를 신청하세요.",
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
  likes,
  dislikes,
}: {
  me: RoomSnapshot["me"];
  myHand: ItemCardSnapshot[];
  isMyTurn: boolean;
  selectedItemId: string;
  setSelectedItemId: (value: string) => void;
  likes: number;
  dislikes: number;
}) {
  if (!me) return null;
  const isVillain = me.role === "villain";

  return (
    <div className="w-full flex items-center gap-4 h-full min-w-0 px-4 text-stone-100">
      {/* Left: Profile Card (exactly like other players' seats) */}
      <div className="relative shrink-0 select-none">
        {me.assetRank !== undefined && (
          <div className="absolute -top-3 left-4 z-20 px-2 py-0.5 rounded bg-amber-500 text-stone-950 font-black text-[10px] shadow border border-amber-400">
            👑 {me.assetRank}위
          </div>
        )}
        <div
          className={`side-player-card transition-all w-[180px] p-3 text-center ${
            isMyTurn ? "active-turn shadow-[0_0_15px_rgba(249,115,22,0.4)] border-orange-500/50" : ""
          }`}
        >
          <div className="flex items-center gap-2 justify-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[radial-gradient(circle_at_35%_25%,#f8d9a4,#b87332)] text-base font-black text-stone-950">
              {me.name.slice(0, 1)}
            </div>
            <div className="truncate text-lg font-black max-w-[110px] text-white">
              {me.name} (나)
            </div>
          </div>
          <div className="mt-2 flex justify-around text-sm font-black text-stone-300">
            <span>평판 {me.reputationTokens ?? 0}/5</span>
            <span>물건 {myHand.length}</span>
          </div>
          <div className="mt-2 flex justify-center gap-3 border-t border-white/10 pt-2 text-xs text-stone-400">
            <span>👍 {likes}</span>
            <span>👎 {dislikes}</span>
          </div>
        </div>
      </div>

      {/* Right: Info, Mission & Cards */}
      <div className="flex-1 flex flex-col justify-between h-full min-w-0 py-1">
        {/* Top Info row (Role, Job, turn status) */}
        <div className="flex items-center justify-between text-xs font-bold border-b border-white/5 pb-1 select-none">
          <div className="flex items-center gap-3">
            <span className={`px-2 py-0.5 rounded text-[10px] font-black text-white ${isMyTurn ? "bg-orange-600 animate-pulse" : "bg-stone-850"}`}>
              {isMyTurn ? "내 턴" : "대기 중"}
            </span>
            {me.job && (
              <span className="text-stone-300">
                직업: <strong className="text-purple-400">{me.job.title}</strong>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${isVillain ? "bg-red-900/80 text-red-200" : "bg-blue-900/80 text-blue-200"}`} title={roleDescription(me.role)}>
              {roleLabel(me.role)}
            </div>
          </div>
        </div>

        {/* Mission Row */}
        {isVillain && (
          <div className="mt-1 text-[10px] font-black leading-tight text-red-400 bg-red-950/50 p-1 rounded border border-red-900/50 select-text">
            🔥 빌런 미션: {me.mission ?? "대기 중..."}
          </div>
        )}

        {!isVillain && me.job && (
          <div className="mt-1 text-[10px] font-black leading-tight text-purple-400 bg-purple-950/45 p-1 rounded border border-purple-900/40 select-text">
            ✨ 시민 미션 ({me.job.title}): {me.job.description}
          </div>
        )}

        {/* Cards Row */}
        <div className="flex-1 flex items-center gap-1.5 mt-1 overflow-x-auto min-h-0">
          {myHand.length === 0 ? (
            <div className="text-xs text-stone-500 font-bold select-none">게임 시작 대기 중...</div>
          ) : (
            myHand.map((item) => {
              const selected = selectedItemId === item.instanceId;
              return (
                <button
                  key={item.instanceId}
                  type="button"
                  onClick={() => setSelectedItemId(item.instanceId)}
                  className={`motion-button flex flex-col items-center justify-between bg-stone-900 hover:bg-stone-850 border rounded p-1 text-center cursor-pointer transition-all w-[76px] h-[76px] shrink-0 select-none ${
                    selected
                      ? "border-orange-500 ring-2 ring-orange-500/50 scale-105 shadow-[0_0_12px_rgba(249,115,22,0.4)]"
                      : "border-stone-700"
                  }`}
                >
                  <div className="text-[18px] leading-none text-stone-300 flex-1 flex items-center justify-center">
                    {productIcon(item, 22)}
                  </div>
                  <div className="text-[9px] font-black text-white truncate w-full leading-tight">
                    {item.name}
                  </div>
                  <div className="text-[8px] font-bold text-orange-400 truncate w-full">
                    {item.marketPrice > 0 ? moneyLabel(item.marketPrice) : "시세 미공개"}
                  </div>
                  {item.isBrick && (
                    <span className="bg-red-700 text-white font-black rounded px-1 py-0.2 text-[7px] transform scale-90">
                      벽돌
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}


function SidePlayerSeat({
  player,
  isTurn,
  isInteractive,
  isCardInteractive,
  onSelectPlayer,
  onSelectCard,
  selectedItemId,
  dealTargetId,
  activeActionType,
}: {
  player: PublicPlayer;
  isTurn: boolean;
  isInteractive: boolean;
  isCardInteractive?: boolean;
  onSelectPlayer?: (id: string) => void;
  onSelectCard?: (playerId: string, itemId: string) => void;
  selectedItemId?: string;
  dealTargetId?: string;
  activeActionType?: string;
}) {
  const isPlayerSelected = dealTargetId === player.id;

  return (
    <div className="flex flex-col items-center gap-2 relative">
      {player.assetRank !== undefined && (
        <div className="absolute -top-3 left-4 z-20 px-2 py-0.5 rounded bg-amber-500 text-stone-950 font-black text-[10px] shadow border border-amber-400">
          👑 {player.assetRank}위
        </div>
      )}
      <button
        type="button"
        disabled={!isInteractive}
        onClick={() => onSelectPlayer && onSelectPlayer(player.id)}
        className={`side-player-card transition-all w-[180px] p-3 text-center ${
          isTurn ? "active-turn" : ""
        } ${
          isInteractive
            ? "cursor-pointer hover:scale-105 shadow-lg border-amber-400/50 hover:shadow-[0_0_15px_rgba(251,191,36,0.6)]"
            : ""
        } ${
          isPlayerSelected
            ? "border-amber-400 bg-amber-950/60 ring-2 ring-amber-400 shadow-[0_0_20px_#fbbf24] scale-105 z-10"
            : ""
        }`}
      >
        <div className="flex items-center gap-2 justify-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[radial-gradient(circle_at_35%_25%,#f8d9a4,#b87332)] text-base font-black text-stone-950">
            {player.name.slice(0, 1)}
          </div>
          <div className="truncate text-lg font-black max-w-[110px] text-white">{player.name}</div>
        </div>
        <div className="mt-2 flex justify-around text-sm font-black text-stone-300">
          <span>평판 {player.reputationTokens}/5</span>
          <span>물건 {player.itemCount}</span>
        </div>
        <div className="mt-2 flex justify-center gap-3 border-t border-white/10 pt-2 text-xs text-stone-400">
          <span>👍 {player.likes}</span>
          <span>👎 {player.dislikes}</span>
        </div>
        {player.isBot && (
          <span className="absolute -top-1.5 -right-1.5 rounded bg-stone-850 border border-stone-600 px-2 py-0.5 text-xs font-black text-white">
            BOT
          </span>
        )}
      </button>

      <div className="flex flex-wrap gap-1.5 justify-center mt-1.5 max-w-[200px]">
        {player.publicItems && player.publicItems.map((item: ItemCardSnapshot) => {
          const isSelected = selectedItemId === item.instanceId && dealTargetId === player.id;
          const showFaceUp = item.revealed;
          
          const showCategory = showFaceUp || (activeActionType === "directTrade");
          const cardTooltip = showFaceUp
            ? item.name
            : isSelected && showCategory && item.category
            ? `${categoryLabel(item.category)} 물건`
            : "뒤집힌 물건";

          return (
            <button
              key={item.instanceId}
              type="button"
              disabled={!isCardInteractive}
              onClick={() => onSelectCard && onSelectCard(player.id, item.instanceId)}
              className={`w-[44px] h-[64px] border rounded transition-all flex flex-col items-center justify-between p-1 select-none relative ${
                isCardInteractive ? "card-glowing-interactive pulse-active" : ""
              } ${
                isSelected
                  ? "border-amber-400 bg-amber-900/60 ring-2 ring-amber-400 shadow-[0_0_15px_#fbbf24] scale-125 z-10"
                  : "border-stone-700 bg-stone-900 hover:scale-105"
              }`}
              title={cardTooltip}
            >
              {showFaceUp ? (
                <>
                  <div className="text-base text-stone-300 mt-0.5">
                    {productIcon(item, 16)}
                  </div>
                  <div className="text-[10px] font-black text-white truncate max-w-full leading-none">{item.name}</div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-0.5">
                  <span className="text-xl font-black text-stone-600">?</span>
                  {isSelected && showCategory && item.category && (
                    <span className="text-[9px] font-black text-amber-400 truncate w-full mt-1 animate-pulse">
                      {categoryLabel(item.category)}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
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
    <div className="w-full max-w-md bg-stone-900/90 backdrop-blur border-2 border-orange-700 p-8 rounded-2xl shadow-2xl text-center space-y-6 mx-auto animate-fade-in mt-20">
      <div className="flex justify-center">
        <span className="bg-orange-950 text-orange-400 border border-orange-700/50 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-inner">
          {mode === "botTest" ? "봇 테스트 모드" : "멀티플레이 모드"}
        </span>
      </div>
      
      <div className="space-y-2">
        <h2 className="text-3xl font-black text-white tracking-tight">테이블 세팅 중...</h2>
        <p className="text-sm font-bold text-stone-400">
          {mode === "botTest"
            ? "봇을 추가해서 혼자 흐름을 테스트할 수 있습니다."
            : "다른 플레이어들이 접속하기를 기다리고 있습니다."}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <div className="bg-stone-800/80 border border-stone-700 px-4 py-2 rounded-lg text-sm font-black text-stone-300">
          참가 인원 <span className="text-orange-400 ml-1">{playerCount}/4</span>
        </div>
        {isHost && (
          <div className="bg-stone-800/80 border border-stone-700 px-4 py-2 rounded-lg text-sm font-black text-stone-300">
            {loading ? "준비 중..." : "우측 하단 버튼으로 시작"}
          </div>
        )}
      </div>

      {isHost && mode === "botTest" && (
        <div className="pt-4 border-t border-stone-800">
          <button
            type="button"
            onClick={onAddBot}
            disabled={loading || playerCount >= 4}
            className="motion-button w-full flex items-center justify-center gap-2 bg-stone-800 border border-stone-600 px-5 py-3.5 rounded-xl text-base font-black text-white hover:bg-stone-700 hover:border-stone-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            <span className="text-stone-400">🤖</span>
            자동 봇 추가하기
          </button>
        </div>
      )}
    </div>
  );
}

function PendingDealPanel({
  snapshot,
  item,
  isDealParty,
  myChoice,
  onChoose,
  onPropose,
}: {
  snapshot: RoomSnapshot;
  item: ItemCardSnapshot | null;
  isDealParty: boolean;
  myChoice: DealCardChoice | undefined;
  onChoose: (choice: DealCardChoice) => void;
  onPropose: (price: number) => void;
}) {
  const deal = snapshot.pendingDeal;
  if (!deal) return null;

  const me = snapshot.me;
  const isSale = deal.actionType === "saleRequest";
  const buyerName = playerName(snapshot, deal.requesterId);
  const sellerName = playerName(snapshot, deal.ownerId);
  const itemName = item?.name ? `[${item.name}]` : "[물건]";

  const [proposalPrice, setProposalPrice] = useState<number>(
    item && item.marketPrice > 0 ? Math.round((item.marketPrice * 0.7) / 10000) * 10000 : 100000
  );

  const isOwner = me && deal.ownerId === me.id;
  const isPriceNeeded = deal.askingPrice === 0 && deal.actionType !== "freeGive";

  let dealMessage = "거래 진행 중";
  if (me) {
    if (deal.actionType === "freeGive") {
      dealMessage = `📢 ${sellerName}님이 무료나눔(0원) 거래를 제안했습니다.`;
    } else if (!isPriceNeeded) {
      dealMessage = `📢 ${sellerName}님이 ${moneyLabel(deal.askingPrice)}을 제시했습니다.`;
    } else if (!isSale) {
      if (deal.ownerId === me.id) {
        dealMessage = `📢 ${buyerName}님이 내 ${itemName}을(를) 원합니다.`;
      } else if (deal.requesterId === me.id) {
        dealMessage = `📢 ${sellerName}님에게 ${itemName} 구매 제안을 보냈습니다.`;
      }
    } else {
      if (deal.requesterId === me.id) {
        dealMessage = `📢 ${sellerName}님이 나에게 ${itemName}을(를) 판매하고 싶어합니다.`;
      } else if (deal.ownerId === me.id) {
        dealMessage = `📢 ${buyerName}님에게 ${itemName} 판매 제안을 보냈습니다.`;
      }
    }
  }

  return (
    <div className="flex flex-col gap-2.5 text-white text-center justify-center w-full p-2">
      {/* Deal Message */}
      <div className="text-sm font-black flex items-center justify-center gap-1.5 leading-tight">
        <Handshake size={16} className="text-amber-400 shrink-0" />
        <span className={!isPriceNeeded ? "text-emerald-400 animate-pulse" : ""}>{dealMessage}</span>
      </div>

      {/* Flat Text Info (No bulky card wrapper) */}
      <div className="text-xs font-bold text-stone-300 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        {item ? (
          <>
            <span>
              물건: <span className="text-amber-300 font-black">{item.name ?? "뒤집힌 물건"}</span>
            </span>
            <span>
              시세: <span className="text-stone-400 font-semibold">{item.marketPrice > 0 ? moneyLabel(item.marketPrice) : "시세 미공개"}</span>
            </span>
            {item.category && (
              <span>
                분류: <span className="text-stone-400 font-semibold">{categoryLabel(item.category)} ({conditionLabel(item.condition)})</span>
              </span>
            )}
          </>
        ) : (
          <span>물건 정보: 가려짐</span>
        )}
        {!isPriceNeeded && (
          <span>
            제시 가격: <span className="text-emerald-400 font-black">{moneyLabel(deal.askingPrice)}</span>
          </span>
        )}
      </div>

      {/* Button Actions */}
      <div className="flex justify-center mt-0.5">
        {isDealParty ? (
          isPriceNeeded ? (
            isOwner ? (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <div className="flex items-center gap-1 text-[11px] font-bold">
                  <span className="text-stone-400 shrink-0">제시할 가격:</span>
                  <input
                    type="number"
                    value={proposalPrice}
                    onChange={(e) => setProposalPrice(Number(e.target.value))}
                    min={10000}
                    step={10000}
                    className="w-24 border border-stone-750 bg-stone-950 text-white px-1.5 py-0.5 text-xs font-black rounded"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onPropose(proposalPrice)}
                    className="motion-button flex items-center gap-1 bg-amber-600 hover:bg-amber-500 text-xs font-black px-3.5 py-1.5 rounded text-stone-950 shadow-md cursor-pointer"
                  >
                    가격 제시 및 수락
                  </button>
                  <button
                    onClick={() => onChoose("cancel")}
                    className="motion-button flex items-center gap-1 border border-red-500/30 bg-red-950/20 text-red-400 hover:bg-red-950/50 text-xs font-black px-3.5 py-1.5 rounded shadow-md cursor-pointer"
                  >
                    거래취소
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 items-center">
                <div className="text-xs font-bold text-stone-400 animate-pulse">
                  판매자가 가격을 제시하길 기다리고 있습니다...
                </div>
                <button
                  onClick={() => onChoose("cancel")}
                  className="motion-button flex items-center gap-1 border border-red-500/30 bg-red-950/20 text-red-400 hover:bg-red-950/50 text-xs font-black px-3.5 py-1.5 rounded shadow-md cursor-pointer"
                >
                  거래취소
                </button>
              </div>
            )
          ) : myChoice ? (
            <div className="flex items-center gap-1 text-[11px] font-black text-stone-400 bg-stone-900/50 px-2.5 py-1 rounded border border-stone-800">
              <Check size={12} className="text-emerald-400" />
              내 결정 완료
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => onChoose("cool")}
                className="motion-button flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-xs font-black px-3.5 py-1.5 rounded text-white shadow-md cursor-pointer"
              >
                <ThumbsUp size={12} />
                쿨거래
              </button>
              <button
                onClick={() => onChoose("cancel")}
                className="motion-button flex items-center gap-1 border border-red-500/30 bg-red-950/20 text-red-400 hover:bg-red-950/50 text-xs font-black px-3.5 py-1.5 rounded shadow-md cursor-pointer"
              >
                <Ban size={12} />
                거래취소
              </button>
            </div>
          )
        ) : (
          <div className="text-xs font-bold text-stone-400 animate-pulse">
            상대방의 결정을 기다리는 중...
          </div>
        )}
      </div>
    </div>
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
    <div className="flex flex-col gap-2.5 text-white text-center justify-center w-full p-2">
      <div className="bg-stone-950/20 py-2 px-3 rounded-lg border border-emerald-800/40 text-emerald-400 text-sm font-black animate-pulse max-w-sm mx-auto w-full">
        🎉 거래가 성사되었습니다!
      </div>
      <div className="text-sm font-black flex items-center justify-center gap-1.5 mt-1">
        <ThumbsUp size={16} className="text-sky-400 shrink-0" />
        <span>거래 후기 작성</span>
      </div>
      <div className="flex flex-col gap-2">
        {snapshot.pendingReviews.map((review) => (
          <div
            key={`${review.tradeId}-${review.targetPlayerId}`}
            className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 border border-stone-850 bg-stone-900/40 p-2 rounded"
          >
            <div className="text-xs font-bold">
              상대방: <span className="text-amber-300 font-black">{playerName(snapshot, review.targetPlayerId)}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onReview(review.targetPlayerId, true)}
                className="motion-button flex items-center gap-1 bg-sky-600 hover:bg-sky-500 text-[11px] font-black px-3 py-1 rounded text-white shadow-sm cursor-pointer"
              >
                <ThumbsUp size={12} />
                만족
              </button>
              <button
                onClick={() => onReview(review.targetPlayerId, false)}
                className="motion-button flex items-center gap-1 border border-red-500/30 bg-red-950/20 text-red-400 hover:bg-red-950/50 text-[11px] font-black px-3 py-1 rounded shadow-sm cursor-pointer"
              >
                <ThumbsDown size={12} />
                불만족
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
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
}) {
  const isRequestingOthersItem = isTradeRequestAction(action);
  const isDealAction = Boolean(
    action &&
    ["tradeRequest", "freeGive", "directTrade", "saleRequest"].includes(action.type)
  );
  const isSale = action?.type === "saleRequest";

  const selectedItem = (
    isRequestingOthersItem ? requestableItems : myHand
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
      ? (action && isDealAction
        ? (isSale
          ? "내 손패에서 판매할 물건을 선택하고 가격을 책정해 판매 제안을 보내세요."
          : "상대의 물건을 고르고 거래를 신청하세요. (가격은 물건 보유자가 제시합니다)")
        : panelCopy.body)
      : "내 턴이면 여기서 행동카드를 뽑습니다.";

  return (
    <div
      className={`flex flex-col gap-2 w-full p-2.5 rounded-lg border text-white text-center justify-center ${
        isMyTurn
          ? "border-amber-500/40 bg-stone-900/80"
          : "border-stone-850 bg-stone-900/40"
      }`}
    >
      {/* Title & Body Info */}
      <div className="flex flex-wrap items-center justify-between gap-1 border-b border-white/5 pb-1 text-left">
        <div>
          <h3 className="text-xs font-black flex items-center gap-1">
            {action && <span className="text-amber-400">{actionIcon(action.type)}</span>}
            {panelTitle}
          </h3>
          <p className="text-[9px] font-bold text-stone-400 mt-0.5 leading-none">
            {panelBody}
          </p>
        </div>
      </div>

      {!isMyTurn ? (
        <p className="text-[11px] font-bold text-stone-400">
          지금은 {currentPlayerName || "다른 플레이어"}님의 턴입니다.
        </p>
      ) : pendingDealActive ? (
        <p className="text-[11px] font-bold text-stone-400">
          진행 중인 거래가 끝나면 다음 턴으로 넘어갑니다.
        </p>
      ) : !action ? (
        <div className="flex justify-center">
          <button
            onClick={onDraw}
            disabled={loading}
            className="motion-button flex items-center gap-1.5 bg-orange-600 hover:bg-orange-500 px-4 py-1.5 text-xs font-black text-white rounded shadow-md cursor-pointer"
          >
            <ShoppingBag size={13} />
            행동카드 뽑기
          </button>
        </div>
      ) : isDealAction ? (
        <div className="w-full space-y-1.5">
          {/* Target & Item Indicator */}
          <div>
            {(!dealTargetId || !selectedItemId) ? (
              <div className="p-1.5 bg-red-950/20 border border-red-900/40 rounded text-center">
                <span className="text-[9px] font-black text-red-400 block">⚠️ 대상 미선택</span>
                <span className="text-[9px] font-bold text-stone-400 mt-0.5 block">
                  테이블 상단/좌/우에서 상대방과 카드를 직접 클릭하세요!
                </span>
              </div>
            ) : (
              <div className="p-1.5 bg-stone-950/50 border border-stone-850 rounded flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-[11px] font-bold">
                <div>
                  상대: <span className="text-amber-400 font-black">{otherPlayers.find(p => p.id === dealTargetId)?.name ?? "알 수 없음"}</span>
                </div>
                <div>
                  {isSale ? "판매물건" : "요청물건"}: <span className="text-orange-400 font-black">{selectedItem ? `${selectedItem.name} (${categoryLabel(selectedItem.category)})` : "가려진 카드"}</span>
                </div>
                {selectedItem && selectedItem.marketPrice > 0 && (
                  <div>
                    시세: <span className="text-stone-300">{moneyLabel(selectedItem.marketPrice)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Price & Actions Row */}
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {isSale && (
              <div className="flex items-center gap-1 text-[11px] font-bold">
                <span className="text-stone-400 shrink-0">제시 가격:</span>
                <input
                  type="number"
                  value={action.type === "freeGive" ? 0 : askingPrice}
                  onChange={(event) => setAskingPrice(Number(event.target.value))}
                  disabled={action.type === "freeGive"}
                  min={0}
                  step={10000}
                  className="w-24 border border-stone-750 bg-stone-950 text-white px-1.5 py-0.5 text-xs font-black rounded disabled:bg-stone-800 disabled:text-stone-500"
                />
              </div>
            )}

            <div className="flex gap-1.5">
              <button
                onClick={onRequestTrade}
                disabled={!selectedItemId || !dealTargetId}
                className="motion-button flex items-center gap-1 bg-orange-600 hover:bg-orange-500 px-3 py-1 rounded text-xs font-black text-white disabled:bg-stone-800 disabled:text-stone-500 disabled:opacity-50 cursor-pointer"
              >
                <Handshake size={12} />
                거래 신청
              </button>
              <button
                onClick={onSkip}
                className="motion-button border border-stone-700 bg-stone-800 hover:bg-stone-755 px-3 py-1 rounded text-xs font-black text-stone-350 cursor-pointer"
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
          icon={<MessageCircleWarning size={12} />}
          onSubmit={onTerror}
          onSkip={onSkip}
        />
      ) : action.type === "swap" ? (
        <TargetAction
          players={otherPlayers}
          targetId={actionTargetId}
          setTargetId={setActionTargetId}
          buttonLabel="물물교환"
          icon={<Repeat2 size={12} />}
          onSubmit={onSwap}
          onSkip={onSkip}
        />
      ) : action.type === "recycle" ? (
        <div className="w-full space-y-1.5">
          {/* Recycle Brick Info */}
          <div>
            {!recycleItemId ? (
              <div className="p-1.5 bg-red-950/20 border border-red-900/40 rounded text-center">
                <span className="text-[9px] font-black text-red-400 block">⚠️ 벽돌 미선택</span>
                <span className="text-[9px] font-bold text-stone-400 mt-0.5 block">
                  하단 내 손패에서 분리수거할 벽돌 카드를 직접 클릭하세요!
                </span>
              </div>
            ) : (
              <div className="p-1.5 bg-stone-950/50 border border-stone-850 rounded flex justify-between items-center text-[11px] font-bold">
                <span className="text-stone-400">선택된 벽돌</span>
                <span className="text-teal-400 font-black">
                  {myHand.find(item => item.instanceId === recycleItemId)?.name ?? "벽돌"}
                </span>
              </div>
            )}
          </div>

          <div className="flex justify-center gap-1.5">
            <button
              onClick={() => onRecycle(recycleItemId)}
              disabled={!recycleItemId}
              className="motion-button flex items-center gap-1 bg-teal-600 hover:bg-teal-500 px-3 py-1 rounded text-xs font-black text-white disabled:bg-stone-800 disabled:text-stone-500 disabled:opacity-50 cursor-pointer"
            >
              <Recycle size={12} />
              분리수거
            </button>
            <button
              onClick={onSkip}
              className="motion-button border border-stone-700 bg-stone-800 hover:bg-stone-755 px-3 py-1 rounded text-xs font-black text-stone-350 cursor-pointer"
            >
              넘기기
            </button>
          </div>
        </div>
      ) : null}
    </div>
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
  const selectedPlayer = players.find(p => p.id === targetId);

  return (
    <div className="w-full space-y-1.5">
      <div>
        {!targetId ? (
          <div className="p-1.5 bg-red-950/20 border border-red-900/40 rounded text-center">
            <span className="text-[9px] font-black text-red-400 block">⚠️ 대상 미지목</span>
            <span className="text-[9px] font-bold text-stone-400 mt-0.5 block">
              테이블 상에서 액션을 적용할 대상 플레이어를 직접 클릭하세요!
            </span>
          </div>
        ) : (
          <div className="p-1.5 bg-stone-950/50 border border-stone-850 rounded flex justify-between items-center text-[11px] font-bold">
            <span className="text-stone-400">지목된 대상</span>
            <span className="text-amber-400 font-black">{selectedPlayer?.name ?? "알 수 없음"}</span>
          </div>
        )}
      </div>

      <div className="flex justify-center gap-1.5">
        <button
          onClick={onSubmit}
          disabled={!targetId}
          className="motion-button flex items-center gap-1 bg-orange-600 hover:bg-orange-500 px-3 py-1 rounded text-xs font-black text-white disabled:bg-stone-800 disabled:text-stone-500 disabled:opacity-50 cursor-pointer"
        >
          {icon}
          {buttonLabel}
        </button>
        <button
          onClick={onSkip}
          className="motion-button border border-stone-700 bg-stone-800 hover:bg-stone-755 px-3 py-1 rounded text-xs font-black text-stone-350 cursor-pointer"
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
    <section className="motion-panel market-card-table p-5">
      <div className="relative">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-[#ff7e36]">최종 신고</h2>
          <p className="mt-1.5 text-sm font-bold text-stone-700">
            {snapshot.reportsCast}/{snapshot.players.length}명 신고 접수
          </p>
        </div>
        <AlertTriangle className="text-[#ff7e36]" size={26} />
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {otherPlayers.map((player) => (
          <button
            key={player.id}
            onClick={() => onReport(player.id)}
            className="motion-button flex items-center justify-between border border-stone-300 bg-white hover:bg-orange-50 hover:border-[#ff7e36] px-3.5 py-3 rounded-lg text-left font-black text-stone-900 shadow-sm cursor-pointer"
          >
            {player.name}
            <AlertTriangle size={16} className="text-[#ff7e36]" />
          </button>
        ))}
      </div>
      </div>
    </section>
  );
}

function ResultPanel({
  snapshot,
  submitAction,
  leaveRoom,
  loading,
}: {
  snapshot: RoomSnapshot;
  submitAction: (action: RoomAction) => void;
  leaveRoom: () => void;
  loading: boolean;
}) {
  const result = snapshot.result;
  if (!result) return null;
  const villainName = result.villainId ? playerName(snapshot, result.villainId) : "-";
  const winnerName = playerName(snapshot, result.winnerId);
  const eliminatedName = result.eliminatedPlayerId
    ? playerName(snapshot, result.eliminatedPlayerId)
    : "-";

  return (
    <section className="motion-panel-strong market-card-table p-5 animate-fade-in relative z-25">
      <div className="relative">
      <div className="flex items-center gap-3">
        <Star className="text-[#ff7e36]" size={28} />
        <div>
          <h2 className="text-2xl font-black text-[#ff7e36]">결과 공개</h2>
          <p className="mt-1.5 text-base font-black text-stone-950">
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

      <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
        {snapshot.me?.isHost ? (
          <button
            onClick={() => submitAction({ type: "restartGame" })}
            disabled={loading}
            className="motion-button px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-stone-950 font-black text-sm rounded-xl shadow-lg cursor-pointer flex items-center justify-center gap-2 transition-all border border-orange-500/20"
          >
            {loading ? "처리 중..." : "다시하기 🔄"}
          </button>
        ) : (
          <button
            disabled
            className="px-5 py-2.5 bg-stone-900 text-stone-500 font-bold text-xs rounded-xl border border-stone-850 flex items-center justify-center gap-2"
          >
            호스트 재시작 대기 중... ⏳
          </button>
        )}
        <button
          onClick={leaveRoom}
          disabled={loading}
          className="motion-button px-5 py-2.5 bg-red-950/80 hover:bg-red-900 text-red-200 font-black text-sm rounded-xl border border-red-800 shadow-lg cursor-pointer flex items-center justify-center gap-2 transition-all"
        >
          나가기 🚪
        </button>
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
    <div className="status-tile border border-stone-300 bg-white p-3 rounded-lg shadow-sm">
      <div className="text-xs font-black uppercase text-stone-600">{label}</div>
      <div className="mt-1 text-lg font-black text-[#ff7e36]">{value}</div>
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
