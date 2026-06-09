"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Settings, RefreshCw, Copy, HelpCircle, LogOut, ShoppingBag } from "lucide-react";
import type {
  RoomSnapshot,
  RoomAction,
  RoomMode,
  PublicPlayer,
} from "@/features/game/server/types";

// Import split components
import { OnlineLobby } from "./components/OnlineLobby";
import { OnlineWaitingRoom } from "./components/OnlineWaitingRoom";
import { OnlineGameBoard, type FlightAnimation } from "./components/OnlineGameBoard";
import { OnlinePlayerHand } from "./components/OnlinePlayerHand";
import {
  PendingDealPanel,
  ReviewPanel,
  ActionPanel,
} from "./components/OnlineTradeDialog";
import { ThemedBoardModal } from "./components/ThemedBoardModal";
import { OnlineVotePhase } from "./components/OnlineVotePhase";
import { OnlineGameOver } from "./components/OnlineGameOver";
import { OnlineModals } from "./components/OnlineModals";
import {
  moneyLabel,
  playerName,
  isTradeRequestAction,
} from "./components/OnlineHelpers";

interface Session {
  code: string;
  playerId: string;
  playerToken: string;
}

interface NetworkInviteResponse {
  inviteUrls: string[];
}

interface RoomSessionResult {
  room: RoomSnapshot;
  playerId: string;
  playerToken: string;
}

const SESSION_KEY = "midgeorae-online-session";

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

export function MidgeoraeOnlineGame() {
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [activeAnimation, setActiveAnimation] = useState<FlightAnimation | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lanInviteUrls, setLanInviteUrls] = useState<string[]>([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [dealTargetId, setDealTargetId] = useState("");
  const [askingPrice, setAskingPrice] = useState(100000);
  const [actionTargetId, setActionTargetId] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLogExpanded, setIsLogExpanded] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isPriceListOpen, setIsPriceListOpen] = useState(false);
  const [isMissionListOpen, setIsMissionListOpen] = useState(false);
  const [roleAcknowledged, setRoleAcknowledged] = useState(false);
  
  const [logBoxSize, setLogBoxSize] = useState({ width: 240, height: 130 });
  const [isResizing, setIsResizing] = useState(false);
  const dragStartRef = useRef({ left: 0, bottom: 0 });

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { left, bottom } = dragStartRef.current;
      const newWidth = Math.max(180, Math.min(280, e.clientX - left));
      const newHeight = Math.max(80, Math.min(300, bottom - e.clientY));
      setLogBoxSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

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
    return (
      (me.money ?? 0) +
      myHand.reduce((sum, item) => {
        if (item.isBrick) return sum;
        let multiplier = 1.0;
        if (item.condition === "mint") {
          multiplier = 0.8;
        } else if (item.condition === "used") {
          multiplier = 0.6;
        } else if (item.condition === "broken" || item.condition === "defective") {
          multiplier = 0.4;
        }
        return sum + (item.marketPrice ?? 0) * multiplier;
      }, 0)
    );
  }, [me, myHand]);

  const isMyTurn = Boolean(me && me.id === snapshot?.currentTurnPlayerId);
  const otherPlayers = useMemo(
    () => snapshot?.players.filter((player) => player.id !== me?.id) ?? [],
    [me?.id, snapshot?.players],
  );

  const turnOrder = useMemo(() => {
    if (!snapshot) return [];
    const players = snapshot.players;
    const startingId = snapshot.startingPlayerId;
    if (!startingId) return players;

    const startIndex = players.findIndex((p) => p.id === startingId);
    if (startIndex === -1) return players;

    return [...players.slice(startIndex), ...players.slice(0, startIndex)];
  }, [snapshot]);

  const leftPlayer = useMemo(() => {
    if (!snapshot || !me) return null;
    const n = snapshot.players.length;
    const myIndex = snapshot.players.findIndex(p => p.id === me.id);
    if (myIndex === -1) return null;
    if (n === 3 || n === 4) {
      const targetIndex = (myIndex + 1) % n;
      return snapshot.players[targetIndex];
    }
    return null;
  }, [snapshot, me]);

  const topPlayer = useMemo(() => {
    if (!snapshot || !me) return null;
    const n = snapshot.players.length;
    const myIndex = snapshot.players.findIndex(p => p.id === me.id);
    if (myIndex === -1) return null;
    if (n === 2) {
      return snapshot.players[(myIndex + 1) % n];
    } else if (n === 4) {
      return snapshot.players[(myIndex + 2) % n];
    }
    return null;
  }, [snapshot, me]);

  const rightPlayer = useMemo(() => {
    if (!snapshot || !me) return null;
    const n = snapshot.players.length;
    const myIndex = snapshot.players.findIndex(p => p.id === me.id);
    if (myIndex === -1) return null;
    if (n === 3) {
      return snapshot.players[(myIndex + 2) % n];
    } else if (n === 4) {
      return snapshot.players[(myIndex + 3) % n];
    }
    return null;
  }, [snapshot, me]);

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

  useEffect(() => {
    if (snapshot?.status === "waiting") {
      setRoleAcknowledged(false);
      setSelectedItemId("");
      setDealTargetId("");
      setActionTargetId("");
      setAskingPrice(100000);
      setActiveAnimation(null);
    } else if (snapshot?.status !== "playing") {
      setRoleAcknowledged(false);
    }
  }, [snapshot?.status]);

  const myPendingReviews = useMemo(() => {
    return pendingReviews.filter((r) => r.reviewerId === session?.playerId);
  }, [pendingReviews, session?.playerId]);

  const isReviewParty = useMemo(() => {
    return Boolean(me && pendingReviews.some((r) => r.reviewerId === me.id || r.targetPlayerId === me.id));
  }, [pendingReviews, me]);

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
     activeActionType === "directTrade")
  );

  const handleSelectOpponentCard = (playerId: string, itemId: string) => {
    onSelectPlayer(playerId);
    if (
      activeActionType === "tradeRequest" ||
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

  const prevSnapshotRef = useRef<RoomSnapshot | null>(null);

  useEffect(() => {
    if (snapshot && prevSnapshotRef.current) {
      const prev = prevSnapshotRef.current;
      const current = snapshot;

      const newLogs = current.logs.filter(log => !prev.logs.includes(log));
      const lastLog = newLogs[newLogs.length - 1] || "";
      const swapMatch = lastLog.match(/(.+)님과 (.+)님이 물건 카드를 맞교환했습니다/);
      if (swapMatch) {
        const p1Name = swapMatch[1];
        const p2Name = swapMatch[2];
        const p1 = current.players.find((p) => p.name === p1Name);
        const p2 = current.players.find((p) => p.name === p2Name);
        if (p1 && p2) {
          setActiveAnimation({
            type: "swap",
            fromPlayerId: p1.id,
            toPlayerId: p2.id,
          });
        }
      }

      const isDealResolved = prev.pendingDeal && !current.pendingDeal;
      const isTradeCool = lastLog.includes("쿨거래가 성사되었습니다");
      if (isDealResolved && isTradeCool && prev.pendingDeal?.actionType === "freeGive") {
        setActiveAnimation({
          type: "freeGive",
          fromPlayerId: prev.pendingDeal.ownerId,
          toPlayerId: prev.pendingDeal.requesterId,
        });
      }
    }
    prevSnapshotRef.current = snapshot;
  }, [snapshot]);

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
    if (session) {
      void fetch(`/api/game/rooms/${session.code}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: session.playerToken, action: { type: "leaveRoom" } }),
      }).catch((err) => {
        console.error("Failed to notify server of leaving:", err);
      });
    }
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

  // --- 1. RENDER LOBBY ---
  if (!session || !snapshot) {
    return (
      <OnlineLobby
        name={name}
        setName={setName}
        joinCode={joinCode}
        setJoinCode={setJoinCode}
        createGameRoom={createGameRoom}
        joinGameRoom={joinGameRoom}
        loading={loading}
        error={error}
      />
    );
  }

  // --- 2. RENDER WAITING ROOM ---
  if (snapshot.status === "waiting") {
    return (
      <OnlineWaitingRoom
        snapshot={snapshot}
        session={session}
        copied={copied}
        copyInvite={copyInvite}
        submitAction={submitAction}
        leaveRoom={leaveRoom}
        loading={loading}
        error={error}
      />
    );
  }

  // --- 3. RENDER GAME BOARD & PHASE ---
  return (
    <main className="fullscreen-game-container text-stone-950">
      {/* Top Left Turn Order Info */}
      {snapshot.status === "playing" && (
        <div className="absolute top-7 left-7 z-50 flex flex-col gap-1.5 select-none">
          <div className="text-[10px] font-black text-amber-500/80 uppercase tracking-widest leading-none mb-0.5">
            🔄 진행 순서
          </div>
          <div className="themed-header-button flex items-center gap-1.5 px-3 py-2 rounded-full text-xs border bg-stone-900/60 backdrop-blur-sm shadow-md">
            {turnOrder.map((player, idx) => {
              const isCurrent = player.id === snapshot.currentTurnPlayerId;
              return (
                <div key={player.id} className="flex items-center gap-1.5">
                  {idx > 0 && <span className="text-stone-500 font-bold">➡️</span>}
                  <span
                    className={`px-2.5 py-1 rounded-full font-black transition-all ${
                      isCurrent
                        ? "bg-orange-500 text-stone-950 scale-105 shadow-[0_0_12px_rgba(249,115,22,0.5)]"
                        : "text-stone-300 bg-stone-900/30"
                    }`}
                  >
                    {player.name}
                    {player.id === me?.id && " (나)"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top Right Header Buttons */}
      <div className="absolute top-7 right-7 z-50 flex items-center gap-2 select-none">
        {snapshot.status === "playing" && (
          <div className="themed-header-button font-black px-3.5 h-10 rounded-full flex items-center justify-center text-xs shadow-md gap-1.5 border">
            <span className="themed-text-muted">남은 턴:</span>
            <span className="text-orange-400 font-extrabold">{snapshot.marketActionLimit - snapshot.usedActionCount}회</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsMissionListOpen(true)}
          className="motion-button themed-header-button font-black px-3.5 h-10 rounded-full flex items-center justify-center text-xs shadow-md gap-1.5 border cursor-pointer"
          title="모든 직업 미션표"
        >
          <span>🎭 미션표</span>
        </button>

        <button
          type="button"
          onClick={() => setIsPriceListOpen(true)}
          className="motion-button themed-header-button font-black px-3.5 h-10 rounded-full flex items-center justify-center text-xs shadow-md gap-1.5 border cursor-pointer"
          title="모든 물건 정가표"
        >
          <span>📋 정가표</span>
        </button>

        <button
          type="button"
          onClick={() => setIsMenuOpen(true)}
          className="motion-button themed-header-button rounded-full w-10 h-10 flex items-center justify-center cursor-pointer border"
          title="설정 메뉴"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* Main Game Board Layout */}
      <OnlineGameBoard
        snapshot={snapshot}
        leftPlayer={leftPlayer}
        topPlayer={topPlayer}
        rightPlayer={rightPlayer}
        myId={me?.id || ""}
        isPlayerInteractive={isPlayerInteractive}
        isCardInteractive={isCardInteractive}
        dealTargetId={dealTargetId}
        selectedItemId={selectedItemId}
        onSelectPlayer={onSelectPlayer}
        handleSelectOpponentCard={handleSelectOpponentCard}
        activeAnimation={activeAnimation}
        setActiveAnimation={setActiveAnimation}
        myDashboard={
          <OnlinePlayerHand
            snapshot={snapshot}
            me={me}
            myHand={myHand}
            totalAssets={totalAssets}
            isMyTurn={isMyTurn}
            selectedItemId={selectedItemId}
            setSelectedItemId={setSelectedItemId}
          />
        }
        logsBox={
          <div 
            className="logs-box-center relative border border-white/5 transition-all"
            style={{ width: logBoxSize.width, height: logBoxSize.height }}
            title="모서리를 드래그하여 크기 조절"
          >
            {/* Custom Top-Right Resize Handle */}
            <div
              className="absolute top-0 right-0 w-3.5 h-3.5 cursor-ne-resize z-20 flex items-center justify-center hover:bg-amber-500/20 active:bg-amber-500/40 select-none"
              onMouseDown={(e) => {
                e.preventDefault();
                const rect = e.currentTarget.parentElement?.getBoundingClientRect();
                if (rect) {
                  dragStartRef.current = {
                    left: rect.left,
                    bottom: rect.bottom,
                  };
                  setIsResizing(true);
                }
              }}
            >
              <div className="w-1.5 h-1.5 border-t-2 border-r-2 border-amber-500/50" />
            </div>

            <div className="text-[13px] font-black text-amber-200/50 mb-1 border-b border-white/5 pb-0.5 flex justify-between items-center select-none pr-3">
              <span>게임 로그</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsLogExpanded(true)}
                  className="text-[9px] themed-text-muted font-bold themed-header-button px-1.5 py-0.5 rounded border hover:text-white cursor-pointer"
                  title="전체 로그 보기"
                >
                  🔍 전체보기
                </button>
              </div>
            </div>
            <div className="space-y-0.5 flex-1 min-h-0 overflow-y-auto pr-1">
              {snapshot.logs.slice().reverse().slice(0, 7).map((log, index) => (
                <div key={index} className="truncate text-xs opacity-75">{log}</div>
              ))}
            </div>
          </div>
        }
      >
        {/* Phase-based 분기 렌더링 inside GameBoard Center Area */}
        {snapshot.status === "playing" && (
          <div className="w-full h-full relative flex items-center justify-center">
            {/* Role Reveal Overlay Modal */}
            {!roleAcknowledged && me && (
              <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-30 flex items-center justify-center p-4">
                <div className="w-[500px] h-[340px] bg-stone-950 border border-orange-500/30 rounded-2xl shadow-2xl flex flex-col items-center justify-center p-6 space-y-6 text-center animate-fade-in relative shrink-0 select-none">
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest leading-none">게임 시작</span>
                    <h2 className={`text-3xl font-black ${me.role === "villain" ? "text-red-500" : "text-sky-400"}`}>
                      당신은 {me.role === "villain" ? "빌런" : "시민"}입니다.
                    </h2>
                  </div>
                  <div className="w-full max-w-sm bg-stone-900/40 p-4 rounded-xl space-y-3 border border-white/5">
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
              </div>
            )}

            {/* Action card selection / Ack phase */}
            {!pendingDeal && currentAction && !isActionCardFullyAcked ? (
              <ThemedBoardModal
                headerText={`📢 ${playerName(snapshot, snapshot.currentTurnPlayerId ?? "")}님이 행동 카드를 뽑았습니다!`}
                title={currentAction.title}
                description={currentAction.description}
                actions={
                  !hasMyAck ? (
                    <button
                      type="button"
                      onClick={() => submitAction({ type: "ackActionCard" })}
                      disabled={loading}
                      className="btn-flat-orange cursor-pointer"
                    >
                      {loading ? "처리 중..." : "확인"}
                    </button>
                  ) : (
                    <div className="wait-status-panel">
                      다른 플레이어들의 확인을 기다리는 중... ({snapshot.currentActionAcks.length}/{snapshot.players.length})
                    </div>
                  )
                }
              />
            ) : (
              !pendingDeal && pendingReviews.length === 0 && isMyTurn && !currentAction ? (
                <ThemedBoardModal
                  headerText="📢 나의 턴이 시작되었습니다!"
                  description="카드를 뽑아 행동을 진행하세요."
                  actions={
                    <button
                      type="button"
                      onClick={() => submitAction({ type: "drawActionCard" })}
                      disabled={loading}
                      className="btn-flat-orange cursor-pointer"
                    >
                      <ShoppingBag size={12} className="inline mr-1" />
                      행동 카드 뽑기
                    </button>
                  }
                >
                  <div className="modal-details-panel center-align">
                    <button
                      type="button"
                      onClick={() => submitAction({ type: "drawActionCard" })}
                      disabled={loading}
                      className="motion-button action-deck-stack pulse-draw flex flex-col items-center justify-center gap-2 border-orange-500 shadow-2xl relative cursor-pointer mx-auto"
                      style={{ margin: "10px auto" }}
                    >
                      <ShoppingBag size={32} className="text-orange-400" />
                      <span className="text-[11px] font-black tracking-widest text-amber-200">ACTION DECK</span>
                      <div className="text-sm font-black text-white mt-2">행동 카드 뽑기</div>
                    </button>
                  </div>
                </ThemedBoardModal>
              ) : (
                !pendingDeal && pendingReviews.length === 0 && currentAction && isActionCardFullyAcked && (
                  currentAction.type === "freeGive" && isMyTurn ? (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-md rounded-xl p-2">
                      <div className="w-full max-w-[680px]">
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
                    </div>
                  ) : (
                    <div className="w-full max-w-[680px] pr-1">
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
              )
            )}

            {/* Overlays inside play area */}
            {pendingDeal && (
              <div className="absolute inset-0 z-20 flex items-center justify-center p-2 rounded-xl !border-none !border-0">
                <div className="w-full max-w-[680px] !border-none !border-0">
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
              <div className="absolute inset-0 z-20 flex items-center justify-center p-2 rounded-xl !border-none !border-0">
                <div className="w-full max-w-[680px] !border-none !border-0">
                  <ReviewPanel
                    snapshot={snapshot}
                    playerId={session?.playerId ?? ""}
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
              <div className="absolute inset-0 z-20 flex items-center justify-center p-2 rounded-xl !border-none !border-0">
                <ThemedBoardModal
                  headerText="🎉 거래가 성사되었습니다!"
                  headerType="success"
                  title="후기 작성 대기 중"
                >
                  <div className="modal-details-panel">
                    {isReviewParty ? (
                      <p className="details-desc text-center">상대방의 거래 후기 작성을 기다리는 중입니다...</p>
                    ) : (
                      <div className="space-y-2 text-left">
                        <p className="details-desc text-center mb-1">두 플레이어가 거래 후기를 작성 중입니다...</p>
                        <div className="bg-black/20 p-2 rounded border border-white/5 space-y-1">
                          {(() => {
                            const reviewer1Id = pendingReviews[0]?.reviewerId;
                            const reviewer2Id = pendingReviews[0]?.targetPlayerId;
                            return (
                              <>
                                {reviewer1Id && (
                                  <div className="flex justify-between items-center text-xs font-bold px-2 py-0.5">
                                    <span className="text-stone-300">{playerName(snapshot, reviewer1Id)}</span>
                                    <span className={pendingReviews.some(r => r.reviewerId === reviewer1Id) ? "text-orange-400 font-black animate-pulse" : "text-emerald-400 font-black"}>
                                      {pendingReviews.some(r => r.reviewerId === reviewer1Id) ? "작성 중... ✍️" : "완료 👍"}
                                    </span>
                                  </div>
                                )}
                                {reviewer2Id && (
                                  <div className="flex justify-between items-center text-xs font-bold px-2 py-0.5 border-t border-white/5">
                                    <span className="text-stone-300">{playerName(snapshot, reviewer2Id)}</span>
                                    <span className={pendingReviews.some(r => r.reviewerId === reviewer2Id) ? "text-orange-400 font-black animate-pulse" : "text-emerald-400 font-black"}>
                                      {pendingReviews.some(r => r.reviewerId === reviewer2Id) ? "작성 중... ✍️" : "완료 👍"}
                                    </span>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </ThemedBoardModal>
              </div>
            )}
          </div>
        )}

        {snapshot.status === "reporting" && (
          <OnlineVotePhase
            snapshot={snapshot}
            otherPlayers={otherPlayers}
            onReport={(targetPlayerId) =>
              submitAction({ type: "reportSuspiciousPlayer", targetPlayerId })
            }
          />
        )}

        {snapshot.status === "finished" && snapshot.result && (
          <OnlineGameOver
            snapshot={snapshot}
            submitAction={submitAction}
            leaveRoom={leaveRoom}
            loading={loading}
          />
        )}
      </OnlineGameBoard>

      {/* Floating Turn Indicator - bottom right */}
      {snapshot.status === "playing" && (
        <div className="absolute bottom-7 right-7 z-30 select-none">
          <div className={`px-4 py-2 rounded-xl text-sm font-black shadow-lg border ${
            isMyTurn 
              ? "bg-orange-600 border-orange-500 text-white animate-pulse shadow-orange-950/50" 
              : "themed-panel shadow-black/50"
          }`}>
            {isMyTurn ? "🟢 내 턴" : "⏳ 대기 중"}
          </div>
        </div>
      )}


      {/* Expanded Logs Modal overlay */}
      {isLogExpanded && (
        <div className="settings-menu-overlay" onClick={() => setIsLogExpanded(false)}>
          <div 
            className="themed-board-modal flex flex-col relative !p-6 max-w-[870px] w-full mx-4" 
            style={{ outline: "none" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-orange-500/20 flex-shrink-0">
              <h3 className="text-xl font-black text-orange-400 flex items-center gap-2 select-none">
                📜 전체 게임 로그
              </h3>
              <button
                onClick={() => setIsLogExpanded(false)}
                className="btn-flat-cancel !w-auto !max-w-none px-4 py-1.5 cursor-pointer font-black text-sm"
              >
                닫기
              </button>
            </div>
            <div className="themed-panel p-4 rounded-lg border border-orange-500/20 max-h-[450px] overflow-y-auto space-y-2 font-mono text-sm leading-relaxed select-text">
              {snapshot.logs.slice().reverse().map((log, index) => (
                <div key={index} className="border-b border-white/5 pb-1.5 opacity-90 text-stone-200 last:border-0">
                  <span className="text-orange-500/60 mr-2">[{snapshot.logs.length - index}]</span>
                  {log}
                </div>
              ))}
              {snapshot.logs.length === 0 && (
                <div className="text-center text-stone-500 py-12">기록된 로그가 없습니다.</div>
              )}
            </div>
          </div>
        </div>
      )}



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
                className="themed-text-muted hover:text-white font-black text-sm cursor-pointer"
              >
                닫기
              </button>
            </div>
            <div className="space-y-4">
              <div className="themed-panel p-3 rounded-lg border border-purple-500/20 text-center">
                <span className="text-xs themed-text-muted block mb-1">방 코드 (Room Code)</span>
                <strong className="text-2xl text-white tracking-[0.2em]">{snapshot.code}</strong>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    void fetchSnapshot();
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center justify-center gap-2 themed-header-button py-2.5 rounded-lg border font-bold text-xs cursor-pointer"
                >
                  <RefreshCw size={14} /> 새로고침
                </button>
                <button
                  onClick={() => {
                    void copyInvite();
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
                  📋 물건 정가표 보기
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

      {/* Common Information Modals */}
      <OnlineModals
        isHelpOpen={isHelpOpen}
        setIsHelpOpen={setIsHelpOpen}
        isPriceListOpen={isPriceListOpen}
        setIsPriceListOpen={setIsPriceListOpen}
        isMissionListOpen={isMissionListOpen}
        setIsMissionListOpen={setIsMissionListOpen}
      />
    </main>
  );
}
