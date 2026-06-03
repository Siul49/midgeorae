import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import type {
  ItemCardSnapshot,
  RoomAction,
  RoomMode,
  RoomSessionResult,
  RoomSnapshot,
} from "@/features/game/server/types";

export interface Session {
  code: string;
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
    {
      cache: "no-store",
      headers: {
        "ngrok-skip-browser-warning": "true",
      },
    },
  );
  return readJson<RoomSnapshot>(response);
}

function isTradeRequestAction(card: { type: string } | null) {
  return (
    card?.type === "tradeRequest" ||
    card?.type === "freeGive" ||
    card?.type === "directTrade"
  );
}

export function useOnlineGame() {
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [pendingDealItem, setPendingDealItem] = useState<ItemCardSnapshot | null>(null);

  const [activeTutorialStep, setActiveTutorialStep] = useState<string | undefined>(undefined);
  const [isFullManualOpen, setIsFullManualOpen] = useState(false);
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
  const lastShownStepRef = useRef<string | null>(null);

  const shareUrl = useMemo(() => {
    if (!session || typeof window === "undefined") return "";
    return `${window.location.origin}/game?room=${session.code}`;
  }, [session]);
  
  const primaryInviteUrl = lanInviteUrls[0] ?? shareUrl;
  const me = snapshot?.me ?? null;

  useEffect(() => {
    if (!snapshot || !snapshot.pendingDeal) {
      setPendingDealItem(null);
      return;
    }
    const targetId = snapshot.pendingDeal.itemInstanceId;
    let found = me?.hand?.find((item) => item.instanceId === targetId) || null;
    if (!found) {
      for (const player of snapshot.players) {
        const item = player.publicItems.find((item) => item.instanceId === targetId);
        if (item) {
          found = item as ItemCardSnapshot;
          break;
        }
      }
    }
    setPendingDealItem(found);
  }, [snapshot, me?.hand]);

  const myHand = useMemo(() => me?.hand ?? [], [me?.hand]);
  
  const currentPlayer = useMemo(() => {
    return snapshot?.players.find((player) => player.id === snapshot.currentTurnPlayerId);
  }, [snapshot?.players, snapshot?.currentTurnPlayerId]);

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
  const tradeActionActive = isTradeRequestAction(currentAction);
  const pendingReviews = snapshot?.pendingReviews ?? [];
  
  const isDealParty = Boolean(
    pendingDeal &&
      me &&
      (pendingDeal.ownerId === me.id || pendingDeal.requesterId === me.id),
  );

  const myDealChoice = pendingDeal && me ? pendingDeal.choices[me.id] : undefined;

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
            headers: {
              "ngrok-skip-browser-warning": "true",
            },
          },
        );
        const data = await readJson<{ inviteUrls: string[] }>(response);
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
    if (currentAction?.type === "freeGive") {
      setAskingPrice(0);
      return;
    }
    const selectableItems = isTradeRequestAction(currentAction)
      ? requestableItems
      : myHand;
    const selected = selectableItems.find((item) => item.instanceId === selectedItemId);
    if (selected) {
      setAskingPrice(selected.askingPrice ?? selected.originalPrice);
    }
  }, [selectedItemId, currentAction, requestableItems, myHand]);

  const handleDoNotShowAgain = useCallback((checked: boolean, stepId?: string) => {
    if (stepId) {
      const key = `midgeorae-tutorial-hide-${stepId}`;
      if (checked) {
        localStorage.setItem(key, "true");
      } else {
        localStorage.removeItem(key);
      }
    }
  }, []);

  useEffect(() => {
    if (!snapshot) return;

    if (snapshot.status === "waiting") {
      const stepId = "waiting";
      if (lastShownStepRef.current !== stepId) {
        lastShownStepRef.current = stepId;
        const hide = localStorage.getItem(`midgeorae-tutorial-hide-${stepId}`);
        if (!hide) {
          setActiveTutorialStep(stepId);
        }
      }
      return;
    }

    const status = snapshot.status;
    let currentStepId: string | undefined = undefined;

    if (status === "preparing") {
      currentStepId = "preparing";
    } else if (status === "playing") {
      if (isMyTurn) {
        if (pendingDeal && isDealParty && !myDealChoice) {
          currentStepId = "pending_deal";
        } else if (!currentAction) {
          currentStepId = "playing_draw";
        } else {
          currentStepId = "playing_action";
        }
      }
    } else if (status === "reporting") {
      currentStepId = "reporting";
    } else if (status === "finished") {
      currentStepId = "finished";
    }

    if (currentStepId) {
      if (lastShownStepRef.current !== currentStepId) {
        lastShownStepRef.current = currentStepId;
        const hide = localStorage.getItem(`midgeorae-tutorial-hide-${currentStepId}`);
        if (!hide) {
          setActiveTutorialStep(currentStepId);
        }
      }
    }
  }, [snapshot, isMyTurn, pendingDeal, isDealParty, myDealChoice, currentAction]);

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
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
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
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
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
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
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

  return {
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
    lanInviteUrls,
    selectedItemId,
    setSelectedItemId,
    dealTargetId,
    setDealTargetId,
    askingPrice,
    setAskingPrice,
    actionTargetId,
    setActionTargetId,
    primaryInviteUrl,
    me,
    myHand,
    currentPlayer,
    isMyTurn,
    otherPlayers,
    selectedOwner,
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
  };
}
