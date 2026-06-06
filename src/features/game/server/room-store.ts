import { randomUUID } from "node:crypto";
import {
  JOB_CARDS,
  LOBBY_MONEY,
  MAX_PLAYERS,
  getMarketActionLimit,
  MIN_PLAYERS,
  STARTING_MANNER,
  STARTING_REPUTATION,
  VILLAIN_MISSIONS,
} from "../rules/game-rules";
import {
  calculateReportResult,
  calculateReputationEliminationResult,
} from "../domain/results";
import { calculateTradeReviewOutcome } from "../domain/reputation";
import { settleAcceptedDeal } from "../domain/trade";
import { dealItemHands, makeActionDeck } from "./cards";
import { makeRoomCode } from "./room-code";
import type {
  ActionCardSnapshot,
  DealCardChoice,
  ItemCardSnapshot,
  JobCardSnapshot,
  PendingDeal,
  PublicPlayer,
  Room,
  RoomAction,
  RoomMode,
  RoomSessionResult,
  RoomSnapshot,
  RoomStatus,
  ServerItemCard,
  ServerPlayer,
} from "./types";

const roomStoreKey = "__midgeoraeRooms" as const;
const globalRoomStore = globalThis as typeof globalThis &
  Record<typeof roomStoreKey, Map<string, Room> | undefined>;
const rooms =
  globalRoomStore[roomStoreKey] ??
  (globalRoomStore[roomStoreKey] = new Map<string, Room>());

function now() {
  return Date.now();
}

function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

function normalizeName(name: string, fallbackName: string) {
  const trimmed = name.trim();
  return (trimmed || fallbackName).slice(0, 16);
}

function formatWon(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

function createPlayer(
  name: string,
  isHost: boolean,
  fallbackName: string,
  isBot = false,
): ServerPlayer {
  return {
    id: randomUUID(),
    name: normalizeName(name, fallbackName),
    token: randomUUID(),
    isHost,
    isBot,
    money: LOBBY_MONEY,
    reputationTokens: STARTING_REPUTATION,
    manner: STARTING_MANNER,
    likes: 0,
    dislikes: 0,
    position: 0,
    hand: [],
    dealCards: { cool: true, cancel: true },
    connectedAt: now(),
  };
}

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Simple Supabase client for Serverless function usage, fallback to local Map if missing config
const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

async function findRoom(code: string): Promise<Room> {
  const normalized = normalizeCode(code);
  if (!supabase) {
    const room = rooms.get(normalized);
    if (!room) throw new Error("방을 찾을 수 없습니다.");
    return room;
  }
  const { data, error } = await supabase
    .from("game_rooms")
    .select("room_data")
    .eq("code", normalized)
    .single();

  if (error || !data) {
    throw new Error("방을 찾을 수 없습니다.");
  }
  return data.room_data as Room;
}

async function saveRoom(room: Room) {
  if (!supabase) {
    rooms.set(room.code, room);
    return;
  }
  const { error } = await supabase
    .from("game_rooms")
    .upsert({
      code: room.code,
      room_data: room,
      updated_at: new Date().toISOString(),
    });
  if (error) {
    console.error("Failed to save room to Supabase:", error);
    throw new Error("방 정보를 저장하는 중 오류가 발생했습니다.");
  }
}

async function mutateRoomWithRetry<T>(
  code: string,
  mutateFn: (room: Room) => T | Promise<T>
): Promise<{ room: Room; result: T }> {
  if (!supabase) {
    const room = rooms.get(normalizeCode(code));
    if (!room) throw new Error("방을 찾을 수 없습니다.");
    const beforeStr = JSON.stringify(room);
    const result = await mutateFn(room);
    const afterStr = JSON.stringify(room);
    if (beforeStr !== afterStr) {
      room.version += 1;
      room.updatedAt = now();
      rooms.set(room.code, room);
    }
    return { room, result };
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const normalized = normalizeCode(code);
    const { data, error } = await supabase
      .from("game_rooms")
      .select("room_data")
      .eq("code", normalized)
      .single();

    if (error || !data) {
      throw new Error("방을 찾을 수 없습니다.");
    }
    const room = data.room_data as Room;
    const currentVersion = room.version;

    const beforeStr = JSON.stringify(room);
    const result = await mutateFn(room);
    const afterStr = JSON.stringify(room);

    if (beforeStr === afterStr) {
      return { room, result };
    }

    room.version = currentVersion + 1;
    room.updatedAt = now();

    const { data: updatedData, error: updateError } = await supabase
      .from("game_rooms")
      .update({
        room_data: room,
        updated_at: new Date().toISOString(),
      })
      .eq("code", room.code)
      .eq("room_data->>version", currentVersion.toString())
      .select();

    if (!updateError && updatedData && updatedData.length > 0) {
      return { room, result };
    }

    await new Promise((resolve) => setTimeout(resolve, 50 + Math.random() * 100));
  }

  throw new Error("서버 혼잡으로 인해 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.");
}

async function generateUniqueRoomCode(): Promise<string> {
  const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 100; attempt += 1) {
    let code = "";
    for (let index = 0; index < 4; index += 1) {
      code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }
    if (!supabase) {
      if (!rooms.has(code)) return code;
      continue;
    }
    const { data } = await supabase
      .from("game_rooms")
      .select("code")
      .eq("code", code)
      .maybeSingle();
    if (!data) {
      return code;
    }
  }
  throw new Error("사용 가능한 방 코드를 만들 수 없습니다.");
}

function findPlayer(room: Room, token: string): ServerPlayer {
  const player = room.players.find((candidate) => candidate.token === token);
  if (!player) throw new Error("플레이어 인증에 실패했습니다.");
  return player;
}

function findPlayerById(room: Room, playerId: string): ServerPlayer {
  const player = room.players.find((candidate) => candidate.id === playerId);
  if (!player) throw new Error("플레이어를 찾을 수 없습니다.");
  return player;
}

function touch(room: Room) {
  room.version += 1;
  room.updatedAt = now();
}

function getPlayerRanks(room: Room): Record<string, number> {
  const assets = room.players.map((p) => {
    const totalVal = p.money + p.hand.reduce((sum, item) => sum + item.marketPrice, 0);
    return { id: p.id, totalVal };
  });
  assets.sort((a, b) => b.totalVal - a.totalVal);
  const ranks: Record<string, number> = {};
  let currentRank = 1;
  for (let i = 0; i < assets.length; i++) {
    if (i > 0 && assets[i].totalVal < assets[i - 1].totalVal) {
      currentRank = i + 1;
    }
    ranks[assets[i].id] = currentRank;
  }
  return ranks;
}

function toPublicPlayer(
  player: ServerPlayer,
  viewer: ServerPlayer | null,
  room: Room,
  ranks?: Record<string, number>,
): PublicPlayer {
  const playerRanks = ranks || getPlayerRanks(room);
  return {
    id: player.id,
    name: player.name,
    isHost: player.isHost,
    isBot: player.isBot,
    reputationTokens: player.reputationTokens,
    manner: player.manner,
    likes: player.likes,
    dislikes: player.dislikes,
    position: player.position,
    itemCount: player.hand.length,
    publicItems: viewer
      ? player.hand.map((item) => toItemSnapshot(item, viewer, room))
      : [],
    assetRank: playerRanks[player.id],
  };
}

function getBrickFakeCategory(instanceId: string): "electronics" | "fashion" | "hobby" | "living" {
  let hash = 0;
  for (let i = 0; i < instanceId.length; i++) {
    hash = instanceId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const categories = ["electronics", "fashion", "hobby", "living"] as const;
  const index = Math.abs(hash) % categories.length;
  return categories[index];
}

function hiddenItemSnapshot(item: ServerItemCard): ItemCardSnapshot {
  return {
    instanceId: item.instanceId,
    id: "",
    name: "뒤집힌 물건",
    category: null,
    condition: null,
    marketPrice: 0,
    acquiredPrice: null,
    isBrick: false,
    imagePath: "/game-cards/backs/item-back.svg",
    revealed: false,
  };
}

function publicItemSnapshot(item: ServerItemCard): ItemCardSnapshot {
  if (item.isBrick) return hiddenItemSnapshot(item);

  return {
    instanceId: item.instanceId,
    id: item.id,
    name: item.name,
    category: item.category,
    condition: null,
    marketPrice: item.marketPrice,
    acquiredPrice: item.acquiredPrice,
    isBrick: false,
    imagePath: item.imagePath,
    revealed: false,
  };
}

function toItemSnapshot(
  item: ServerItemCard,
  viewer: ServerPlayer,
  room: Room,
  {
    allowPublicInfo = false,
    forceReveal = false,
  }: { allowPublicInfo?: boolean; forceReveal?: boolean } = {},
): ItemCardSnapshot {
  const revealed =
    forceReveal ||
    item.revealed ||
    item.revealedToPlayerIds.includes(viewer.id) ||
    viewer.hand.some((c) => c.instanceId === item.instanceId);

  if (!revealed) {
    const snapshot = allowPublicInfo ? publicItemSnapshot(item) : hiddenItemSnapshot(item);
    const showCategory =
      allowPublicInfo ||
      forceReveal ||
      Boolean(
        viewer &&
          viewer.id === room.currentTurnPlayerId &&
          room.currentActionCard &&
          ["directTrade", "tradeRequest", "freeGive", "saleRequest"].includes(room.currentActionCard.type)
      );
    const category = item.isBrick
      ? getBrickFakeCategory(item.instanceId)
      : item.category;

    return {
      ...snapshot,
      category: showCategory ? category : null,
    };
  }

  return {
    instanceId: item.instanceId,
    id: revealed ? item.id : "",
    name: revealed ? item.name : "뒤집힌 물건",
    category: item.isBrick ? null : item.category,
    condition: revealed ? item.condition : null,
    marketPrice: revealed ? item.marketPrice : 0,
    acquiredPrice: revealed ? item.acquiredPrice : null,
    isBrick: revealed ? item.isBrick : false,
    imagePath: revealed ? item.imagePath : "/game-cards/backs/item-back.svg",
    revealed,
  };
}

function visiblePendingDeal(
  room: Room,
  viewer: ServerPlayer | null,
): PendingDeal | null {
  if (!room.pendingDeal) return null;
  const deal = room.pendingDeal;
  const visibleChoices: PendingDeal["choices"] = {};
  if (viewer && deal.choices[viewer.id]) {
    visibleChoices[viewer.id] = deal.choices[viewer.id];
  }

  if (
    !viewer ||
    deal.ownerId === viewer.id ||
    deal.requesterId === viewer.id
  ) {
    return {
      ...deal,
      choices: visibleChoices,
    };
  }

  return {
    ...deal,
    choices: {},
    itemInstanceId: "",
  };
}

function visiblePendingDealItem(
  room: Room,
  viewer: ServerPlayer | null,
): ItemCardSnapshot | null {
  if (!room.pendingDeal || !viewer) return null;
  const deal = room.pendingDeal;
  const owner = room.players.find((player) => player.id === deal.ownerId);
  const item = owner?.hand.find(
    (candidate) => candidate.instanceId === deal.itemInstanceId,
  );
  if (!item) return null;

  const isDealParty =
    deal.ownerId === viewer.id || deal.requesterId === viewer.id;
  if (!isDealParty) {
    return hiddenItemSnapshot(item);
  }

  // If the owner (seller) is viewing it, return their own fully revealed item
  if (viewer.id === deal.ownerId) {
    return toItemSnapshot(item, viewer, room, { forceReveal: true });
  }

  if (item.isBrick && !deal.revealedBeforeDeal) {
    return { ...hiddenItemSnapshot(item), category: getBrickFakeCategory(item.instanceId) };
  }

  // If the requester (buyer) is viewing a normal trade request, hide exact info but show category before purchase
  if (viewer.id === deal.requesterId && !deal.revealedBeforeDeal) {
    return { ...hiddenItemSnapshot(item), category: item.category };
  }

  return toItemSnapshot(item, viewer, room);
}

function toSnapshot(room: Room, viewer: ServerPlayer | null): RoomSnapshot {
  const ranks = getPlayerRanks(room);
  return {
    code: room.code,
    mode: room.mode,
    status: room.status,
    players: room.players.map((player) => toPublicPlayer(player, viewer, room, ranks)),
    me: viewer
      ? {
          id: viewer.id,
          name: viewer.name,
          isHost: viewer.isHost,
          isBot: viewer.isBot,
          role: viewer.role,
          mission: viewer.mission,
          job: viewer.job,
          money: viewer.money,
          reputationTokens: viewer.reputationTokens,
          hand: viewer.hand.map((item) =>
            toItemSnapshot(item, viewer, room, {
              allowPublicInfo: true,
              forceReveal: true,
            }),
          ),
          dealCards: viewer.dealCards,
          assetRank: ranks[viewer.id],
        }
      : null,
    currentTurnPlayerId: room.currentTurnPlayerId,
    currentActionCard: room.currentActionCard,
    pendingDeal: visiblePendingDeal(room, viewer),
    pendingDealItem: visiblePendingDealItem(room, viewer),
    pendingReviews: room.pendingReviews || [],
    usedActionCount: room.usedActionCount,
    marketActionLimit: room.marketActionLimit,
    logs: room.logs.slice(-20),
    reportsCast: Object.keys(room.reports).length,
    reports: room.reports || {},
    currentActionAcks: room.currentActionAcks || [],
    result: room.result,
    version: room.version,
  };
}

function dealJobs(playerIds: string[]): Record<string, JobCardSnapshot> {
  const shuffled = [...JOB_CARDS].sort(() => Math.random() - 0.5);
  return Object.fromEntries(
    playerIds.map((playerId, index) => [playerId, shuffled[index % shuffled.length]]),
  );
}

function assertCurrentTurn(room: Room, player: ServerPlayer) {
  if (room.currentTurnPlayerId !== player.id) {
    throw new Error("현재 턴 플레이어만 할 수 있습니다.");
  }
}

function assertPlaying(room: Room) {
  if (room.status !== "playing") {
    throw new Error("진행 중인 게임에서만 할 수 있습니다.");
  }
}

function enterReporting(room: Room, message = "시장 마감입니다. 최종 신고를 시작합니다.") {
  room.status = "reporting";
  room.currentTurnPlayerId = null;
  room.currentActionCard = null;
  room.pendingDeal = null;
  room.logs.push(message);
}

function nextTurn(room: Room) {
  room.turnCount += 1;
  room.usedActionCount = Math.min(
    room.marketActionLimit,
    room.usedActionCount + 1,
  );

  if (
    room.marketActionLimit > 0 &&
    room.usedActionCount >= room.marketActionLimit
  ) {
    enterReporting(room);
    return;
  }

  if (!room.currentTurnPlayerId) {
    room.currentTurnPlayerId = room.players[0]?.id ?? null;
    return;
  }

  const currentIndex = room.players.findIndex(
    (player) => player.id === room.currentTurnPlayerId,
  );
  const nextIndex = (currentIndex + 1) % room.players.length;

  room.currentTurnPlayerId = room.players[nextIndex]?.id ?? null;
  room.currentActionCard = null;
}

function finishByReputation(room: Room, eliminatedPlayer: ServerPlayer) {
  room.status = "finished";
  room.currentTurnPlayerId = null;
  room.result = calculateReputationEliminationResult(
    room.players,
    eliminatedPlayer,
  );
  room.logs.push(
    `${eliminatedPlayer.name}님의 좋아요 토큰이 0개가 되어 게임이 종료되었습니다.`,
  );
}

function adjustReputation(room: Room, target: ServerPlayer, amount: number) {
  target.reputationTokens = Math.max(0, target.reputationTokens + amount);
  if (target.reputationTokens === 0) finishByReputation(room, target);
}

function startGame(room: Room, actor: ServerPlayer) {
  if (!actor.isHost) throw new Error("호스트만 게임을 시작할 수 있습니다.");
  if (room.status !== "waiting") throw new Error("이미 시작된 방입니다.");
  if (room.players.length < MIN_PLAYERS) {
    throw new Error("3명 이상 모여야 시작할 수 있습니다.");
  }
  if (room.players.length > MAX_PLAYERS) {
    throw new Error("5명 이하로만 시작할 수 있습니다.");
  }

  const villainIndex = Math.floor(Math.random() * room.players.length);
  const mission =
    VILLAIN_MISSIONS[Math.floor(Math.random() * VILLAIN_MISSIONS.length)];
  const hands = dealItemHands(room.players.map((player) => player.id));
  const jobs = dealJobs(room.players.map((player) => player.id));

  room.players.forEach((player, index) => {
    player.role = index === villainIndex ? "villain" : "citizen";
    player.mission = index === villainIndex ? mission : undefined;
    player.job = jobs[player.id];
    player.money = player.job?.startingMoney ?? 1000000;
    player.reputationTokens = STARTING_REPUTATION;
    player.hand = hands[player.id] ?? [];
    player.dealCards = { cool: true, cancel: true };
  });
  room.status = "playing";
  room.currentTurnPlayerId = room.players[0]?.id ?? null;
  room.usedActionCount = 0;
  room.marketActionLimit = getMarketActionLimit(room.players.length);
  room.actionDeck = makeActionDeck();
  room.discardPile = [];
  room.currentActionCard = null;
  room.logs.push(
    `게임이 시작되었습니다. 역할 카드와 물건 카드 5장을 확인하세요. 시장 행동 예산은 ${room.marketActionLimit}회입니다.`,
  );
}

function drawActionCard(room: Room, actor: ServerPlayer) {
  assertPlaying(room);
  assertCurrentTurn(room, actor);
  if (room.currentActionCard) throw new Error("이미 행동카드를 뽑았습니다.");
  if (room.actionDeck.length === 0) {
    room.actionDeck = makeActionDeck();
    room.discardPile = [];
  }

  let card = room.actionDeck.shift();

  if (room.mode === "botTest" && card) {
    if (actor.isHost) {
      room.hostDrawCount = (room.hostDrawCount || 0) + 1;
      const hostSequence = [
        "tradeRequest",  // 1st: 구매 신청
        "saleRequest",   // 2nd: 판매 신청
        "directTrade",   // 3rd: 직거래
        "freeGive",      // 4th: 무료나눔
        "badReview",     // 5th: 악플테러
        "recycle",       // 6th: 분리수거
        "swap",          // 7th: 물물교환
      ];
      const targetType = hostSequence[(room.hostDrawCount - 1) % hostSequence.length];
      const found = makeActionDeck().find((c) => c.type === targetType);
      if (found) {
        card = { ...found };
      }
    } else {
      room.botDrawCount = (room.botDrawCount || 0) + 1;
      const botSequence = [
        "tradeRequest",  // 1st: 구매 신청
        "saleRequest",
        "directTrade",
      ];
      const targetType = botSequence[(room.botDrawCount - 1) % botSequence.length] || "tradeRequest";
      const found = makeActionDeck().find((c) => c.type === targetType);
      if (found) {
        card = { ...found };
      }
    }
  }

  if (!card) throw new Error("행동카드가 없습니다.");
  room.currentActionCard = card;
  room.currentActionAcks = room.players.filter((p) => p.isBot).map((p) => p.id);
  room.logs.push(`${actor.name}님이 행동카드 '${card.title}'을(를) 뽑았습니다.`);
}

function assertTradeAction(
  card: ActionCardSnapshot | null,
): asserts card is ActionCardSnapshot & { type: PendingDeal["actionType"] } {
  if (!isTradeAction(card)) {
    throw new Error("거래 행동카드에서만 거래를 신청할 수 있습니다.");
  }
}

function isTradeAction(
  card: ActionCardSnapshot | null,
): card is ActionCardSnapshot & { type: PendingDeal["actionType"] } {
  return Boolean(
    card && ["tradeRequest", "freeGive", "directTrade", "saleRequest"].includes(card.type),
  );
}

function requestTrade(
  room: Room,
  actor: ServerPlayer,
  ownerId: string,
  itemInstanceId: string,
  offerPrice: number,
) {
  assertPlaying(room);
  assertCurrentTurn(room, actor);
  const actionCard = room.currentActionCard;
  assertTradeAction(actionCard);
  if (room.pendingDeal) throw new Error("이미 진행 중인 거래가 있습니다.");

  const target = findPlayerById(room, ownerId);
  if (target.id === actor.id) {
    throw new Error("자기 자신에게 거래를 신청할 수 없습니다.");
  }

  const isSale = actionCard.type === "saleRequest";
  const seller = isSale ? actor : target;
  const buyer = isSale ? target : actor;

  const item = seller.hand.find((owned) => owned.instanceId === itemInstanceId);
  if (!item) throw new Error("거래 신청할 물건을 찾을 수 없습니다.");
  const price = actionCard.type === "freeGive" ? 0 : (isSale ? offerPrice : 0);
  if (price < 0) throw new Error("가격이 올바르지 않습니다.");
  if (buyer.money < price) throw new Error("구매자의 금액이 부족합니다.");

  const revealedBeforeDeal = actionCard.type === "directTrade";
  if (revealedBeforeDeal) {
    item.revealedToPlayerIds = Array.from(
      new Set([...item.revealedToPlayerIds, seller.id, buyer.id]),
    );
  }

  room.pendingDeal = {
    id: randomUUID(),
    actionType: actionCard.type,
    requesterId: buyer.id,
    ownerId: seller.id,
    itemInstanceId,
    askingPrice: price,
    revealedBeforeDeal,
    choices: isSale ? { [seller.id]: "cool" } : {},
    resolved: false,
  };
  if (isSale) {
    room.logs.push(
      `${actor.name}님이 ${target.name}님에게 자신의 물건 [${item.name}]을 ${formatWon(price)}에 판매 신청했습니다.`,
    );
  } else if (actionCard.type === "freeGive") {
    room.logs.push(
      `${actor.name}님이 ${target.name}님의 물건에 무료나눔 거래를 신청했습니다.`,
    );
  } else {
    room.logs.push(
      `${actor.name}님이 ${target.name}님의 물건에 거래를 신청했습니다. (판매자 가격 제시 대기)`,
    );
  }
}

function resolveDeal(room: Room, deal: PendingDeal) {
  const owner = findPlayerById(room, deal.ownerId);
  const requester = findPlayerById(room, deal.requesterId);
  const ownerChoice = deal.choices[owner.id];
  const requesterChoice = deal.choices[requester.id];

  if (ownerChoice === "cancel" || requesterChoice === "cancel") {
    room.logs.push(`${requester.name}님과 ${owner.name}님의 거래가 취소되었습니다.`);
    if (room.currentActionCard) room.discardPile.push(room.currentActionCard);
    room.pendingDeal = null;
    room.currentActionCard = null;
    nextTurn(room);
    return;
  }

  if (!ownerChoice || !requesterChoice) return;

  if (ownerChoice === "cool" && requesterChoice === "cool") {
    const settlement = settleAcceptedDeal({
      deal,
      owner,
      requester,
    });
    owner.money = settlement.ownerMoney;
    requester.money = settlement.requesterMoney;
    owner.hand = settlement.ownerHand;
    requester.hand = settlement.requesterHand;
    room.pendingReviews.push(...settlement.pendingReviews);
    room.logs.push(
      `${requester.name}님과 ${owner.name}님의 쿨거래가 성사되었습니다.`,
    );
  } else {
    room.logs.push(`${requester.name}님과 ${owner.name}님의 거래가 취소되었습니다.`);
  }

  if (room.currentActionCard) room.discardPile.push(room.currentActionCard);
  room.pendingDeal = null;
  room.currentActionCard = null;

  if (room.pendingReviews.length === 0) {
    nextTurn(room);
  }
}

function chooseDealCard(
  room: Room,
  actor: ServerPlayer,
  choice: DealCardChoice,
) {
  assertPlaying(room);
  const deal = room.pendingDeal;
  if (!deal) throw new Error("진행 중인 거래가 없습니다.");
  if (actor.id !== deal.ownerId && actor.id !== deal.requesterId) {
    throw new Error("거래 당사자만 선택할 수 있습니다.");
  }
  deal.choices[actor.id] = choice;
  resolveDeal(room, deal);
}

function proposePrice(room: Room, actor: ServerPlayer, price: number) {
  assertPlaying(room);
  const deal = room.pendingDeal;
  if (!deal) throw new Error("진행 중인 거래가 없습니다.");
  if (actor.id !== deal.ownerId) {
    throw new Error("판매자만 가격을 제시할 수 있습니다.");
  }
  if (deal.askingPrice > 0) {
    throw new Error("이미 가격이 제시되었습니다.");
  }
  if (price <= 0) {
    throw new Error("가격이 올바르지 않습니다.");
  }

  const buyer = findPlayerById(room, deal.requesterId);
  if (buyer.money < price) {
    throw new Error("구매자의 금액이 부족합니다.");
  }

  deal.askingPrice = price;
  deal.choices[actor.id] = "cool"; // Automatically accept trade upon proposing price

  const item = actor.hand.find((owned) => owned.instanceId === deal.itemInstanceId);
  room.logs.push(
    `${actor.name}님이 판매할 물건 [${item?.name ?? "물건"}]의 가격을 ${formatWon(price)}으로 제시하고 수락했습니다.`,
  );

  resolveDeal(room, deal);
}

function reviewTrade(
  room: Room,
  actor: ServerPlayer,
  targetPlayerId: string,
  satisfied: boolean,
) {
  assertPlaying(room);
  const review = room.pendingReviews.find(
    (candidate) =>
      candidate.reviewerId === actor.id &&
      candidate.targetPlayerId === targetPlayerId,
  );
  if (!review) throw new Error("평가할 거래가 없습니다.");

  const target = findPlayerById(room, targetPlayerId);
  const outcome = calculateTradeReviewOutcome({
    reviewerReputationTokens: actor.reputationTokens,
    targetReputationTokens: target.reputationTokens,
    targetManner: target.manner,
    targetLikes: target.likes,
    targetDislikes: target.dislikes,
    satisfied,
  });

  actor.reputationTokens = outcome.reviewerReputationTokens;
  target.reputationTokens = outcome.targetReputationTokens;
  target.likes = outcome.targetLikes;
  target.dislikes = outcome.targetDislikes;
  target.manner = outcome.targetManner;

  if (satisfied) {
    room.logs.push(`${actor.name}님이 ${target.name}님에게 좋아요 토큰을 선물했습니다.`);
    if (outcome.eliminatedPlayer === "reviewer") finishByReputation(room, actor);
  } else {
    if (outcome.eliminatedPlayer === "target") finishByReputation(room, target);
    room.logs.push(`${actor.name}님이 ${target.name}님의 좋아요 토큰을 소멸시켰습니다.`);
  }

  room.pendingReviews = room.pendingReviews.filter(
    (candidate) => candidate !== review,
  );

  if (room.status === "playing" && room.pendingReviews.length === 0) {
    nextTurn(room);
  }
}

function terrorReview(room: Room, actor: ServerPlayer, targetPlayerId: string) {
  assertPlaying(room);
  assertCurrentTurn(room, actor);
  if (room.currentActionCard?.type !== "badReview") {
    throw new Error("악플테러 행동카드에서만 사용할 수 있습니다.");
  }
  const target = findPlayerById(room, targetPlayerId);
  if (target.id === actor.id) throw new Error("자기 자신을 지목할 수 없습니다.");
  adjustReputation(room, target, -1);
  room.logs.push(`${actor.name}님이 ${target.name}님에게 악플테러를 사용했습니다.`);
  room.currentActionCard = null;
  nextTurn(room);
}

function recycleBrick(room: Room, actor: ServerPlayer, itemInstanceId: string) {
  assertPlaying(room);
  assertCurrentTurn(room, actor);
  if (room.currentActionCard?.type !== "recycle") {
    throw new Error("분리수거 행동카드에서만 사용할 수 있습니다.");
  }
  const item = actor.hand.find((owned) => owned.instanceId === itemInstanceId);
  if (!item || !item.isBrick) throw new Error("분리수거할 벽돌 카드가 없습니다.");
  actor.hand = actor.hand.filter((owned) => owned.instanceId !== itemInstanceId);
  room.logs.push(`${actor.name}님이 벽돌 카드를 분리수거했습니다.`);
  room.currentActionCard = null;
  nextTurn(room);
}

function swapRandomItem(room: Room, actor: ServerPlayer, targetPlayerId: string) {
  assertPlaying(room);
  assertCurrentTurn(room, actor);
  if (room.currentActionCard?.type !== "swap") {
    throw new Error("물물교환 행동카드에서만 사용할 수 있습니다.");
  }
  const target = findPlayerById(room, targetPlayerId);
  if (target.id === actor.id) throw new Error("자기 자신과 교환할 수 없습니다.");
  if (actor.hand.length === 0 || target.hand.length === 0) {
    throw new Error("교환할 물건 카드가 없습니다.");
  }

  const actorItemIndex = Math.floor(Math.random() * actor.hand.length);
  const targetItemIndex = Math.floor(Math.random() * target.hand.length);
  const actorItem = actor.hand[actorItemIndex]!;
  const targetItem = target.hand[targetItemIndex]!;
  
  actor.hand[actorItemIndex] = {
    ...targetItem,
    revealed: false,
    revealedToPlayerIds: [actor.id],
  };
  target.hand[targetItemIndex] = {
    ...actorItem,
    revealed: false,
    revealedToPlayerIds: [target.id],
  };
  
  room.logs.push(`${actor.name}님과 ${target.name}님이 물건 카드를 맞교환했습니다.`);
  room.currentActionCard = null;
  nextTurn(room);
}

function reportSuspiciousPlayer(
  room: Room,
  actor: ServerPlayer,
  targetPlayerId: string,
) {
  if (room.status !== "reporting") {
    throw new Error("신고할 수 없는 상태입니다.");
  }
  if (!room.players.some((player) => player.id === targetPlayerId)) {
    throw new Error("신고 대상이 존재하지 않습니다.");
  }
  if (room.reports[actor.id]) throw new Error("이미 신고했습니다.");

  room.status = "reporting";
  room.currentTurnPlayerId = null;
  room.reports[actor.id] = targetPlayerId;
  room.logs.push(`${actor.name}님이 사기 의심 계정을 신고했습니다.`);

  if (Object.keys(room.reports).length === room.players.length) {
    const villain = room.players.find((player) => player.role === "villain");
    if (!villain) throw new Error("빌런 정보가 없습니다.");
    room.result = calculateReportResult(room.players, room.reports, villain.id);
    room.status = "finished";
    room.logs.push("최종 신고가 접수되었습니다. 분쟁 심사 결과를 공개합니다.");
  }
}

function addBot(room: Room, actor: ServerPlayer) {
  if (!actor.isHost) throw new Error("호스트만 봇을 추가할 수 있습니다.");
  if (room.mode !== "botTest") throw new Error("봇 테스트 방에서만 봇을 추가할 수 있습니다.");
  if (room.status !== "waiting") throw new Error("대기 중인 방에서만 봇을 추가할 수 있습니다.");
  if (room.players.length >= MAX_PLAYERS) throw new Error("방이 가득 찼습니다.");

  const botNumber = room.players.filter((player) => player.isBot).length + 1;
  const bot = createPlayer(`자동봇 ${botNumber}`, false, `자동봇 ${botNumber}`, true);
  room.players.push(bot);
  room.logs.push(`${bot.name}님이 테스트 봇으로 추가되었습니다.`);
}

function chooseBotTarget(
  room: Room,
  actor: ServerPlayer,
  predicate: (player: ServerPlayer) => boolean = () => true,
) {
  const candidates = room.players.filter(
    (player) => player.id !== actor.id && predicate(player),
  );
  return candidates.find((player) => player.isBot) ?? candidates[0];
}

function botEndTurn(room: Room, actor: ServerPlayer) {
  if (room.currentActionCard) room.discardPile.push(room.currentActionCard);
  room.currentActionCard = null;
  room.pendingDeal = null;
  room.logs.push(`${actor.name}님이 자동으로 턴을 넘겼습니다.`);
  nextTurn(room);
}

function autoResolveBotDeal(room: Room) {
  const deal = room.pendingDeal;
  if (!deal) return false;

  let changed = false;

  if (deal.askingPrice === 0 && deal.actionType !== "freeGive" && deal.ownerId) {
    const owner = room.players.find((p) => p.id === deal.ownerId);
    if (owner?.isBot) {
      const item = owner.hand.find((owned) => owned.instanceId === deal.itemInstanceId);
      const price = Math.max(10000, Math.round(((item?.marketPrice ?? 100000) * 0.7) / 10000) * 10000);
      deal.askingPrice = price;
      deal.choices[owner.id] = "cool";
      room.logs.push(
        `${owner.name}님이 판매할 물건 [${item?.name ?? "물건"}]의 가격을 ${formatWon(price)}으로 제시하고 수락했습니다.`,
      );
      changed = true;
    }
  }

  for (const playerId of [deal.ownerId, deal.requesterId]) {
    const player = room.players.find((candidate) => candidate.id === playerId);
    if (player?.isBot && !deal.choices[player.id]) {
      deal.choices[player.id] = "cool";
      room.logs.push(`${player.name}님이 자동으로 쿨거래를 선택했습니다.`);
      changed = true;
    }
  }

  if (changed) resolveDeal(room, deal);
  return changed;
}

function autoReviewBotTrades(room: Room) {
  if (room.status !== "playing") return false;

  let changed = false;
  for (const review of [...room.pendingReviews]) {
    const reviewer = room.players.find((player) => player.id === review.reviewerId);
    if (!reviewer?.isBot) continue;

    let satisfied = true;
    if (
      review.sellerId === review.targetPlayerId &&
      review.itemPrice !== undefined &&
      review.itemMarketPrice !== undefined &&
      review.itemPrice >= review.itemMarketPrice * 0.8
    ) {
      satisfied = false;
    }

    reviewTrade(room, reviewer, review.targetPlayerId, satisfied);
    changed = true;
    if ((room.status as RoomStatus) === "finished") break;
  }
  return changed;
}

function autoReportBots(room: Room) {
  if (room.status !== "reporting") return false;

  let changed = false;
  for (const bot of room.players.filter((player) => player.isBot)) {
    if (room.reports[bot.id]) continue;
    const target = chooseBotTarget(room, bot);
    if (!target) continue;
    reportSuspiciousPlayer(room, bot, target.id);
    changed = true;
    if ((room.status as RoomStatus) === "finished") break;
  }
  return changed;
}

function autoRunCurrentBotTurn(room: Room) {
  if (room.status !== "playing" || room.pendingDeal || room.pendingReviews.length > 0) return false;
  const actor = room.players.find((player) => player.id === room.currentTurnPlayerId);
  if (!actor?.isBot) return false;

  if (!room.currentActionCard) {
    drawActionCard(room, actor);
    return true;
  }

  // Check if all human players have acknowledged the action card before bot executes it!
  const humanPlayers = room.players.filter((p) => !p.isBot);
  const allHumanAcks = humanPlayers.every((p) => (room.currentActionAcks || []).includes(p.id));
  if (!allHumanAcks) {
    return false; // Wait for human players to click "확인"
  }

  const card = room.currentActionCard;
  if (isTradeAction(card)) {
    const isSale = card.type === "saleRequest";
    const tradeOption = room.players
      .filter((player) => player.id !== actor.id && (isSale || player.hand.length > 0))
      .sort((a, b) => {
        if (room.mode === "botTest" && process.env.NODE_ENV !== "test") {
          return Number(a.isBot) - Number(b.isBot); // Prioritize human player in real game test mode
        }
        return Number(b.isBot) - Number(a.isBot);
      })
      .map((targetPlayer) => {
        const sourcePlayer = isSale ? actor : targetPlayer;
        const item = sourcePlayer.hand.find((owned) => !owned.isBrick) ?? sourcePlayer.hand[0];
        if (!item) return null;
        const offerPrice =
          card.type === "freeGive"
            ? 0
            : Math.max(10000, Math.round((item.marketPrice * 0.7) / 10000) * 10000);
        return { targetPlayer, item, offerPrice };
      })
      .find(
        (
          option,
        ): option is {
          targetPlayer: ServerPlayer;
          item: ServerItemCard;
          offerPrice: number;
        } => Boolean(option && (isSale ? option.targetPlayer.money >= option.offerPrice : actor.money >= option.offerPrice)),
      );
    if (!tradeOption) {
      botEndTurn(room, actor);
      return true;
    }

    requestTrade(
      room,
      actor,
      tradeOption.targetPlayer.id,
      tradeOption.item.instanceId,
      tradeOption.offerPrice,
    );
    return true;
  }

  if (card.type === "badReview") {
    const target = room.players
      .filter((player) => player.id !== actor.id)
      .sort((a, b) => b.reputationTokens - a.reputationTokens)[0];
    if (target) {
      terrorReview(room, actor, target.id);
    } else {
      botEndTurn(room, actor);
    }
    return true;
  }

  if (card.type === "recycle") {
    const brick = actor.hand.find((item) => item.isBrick);
    if (brick) {
      recycleBrick(room, actor, brick.instanceId);
    } else {
      botEndTurn(room, actor);
    }
    return true;
  }

  if (card.type === "swap") {
    const target = chooseBotTarget(
      room,
      actor,
      (player) => player.hand.length > 0,
    );
    if (target) {
      swapRandomItem(room, actor, target.id);
    } else {
      botEndTurn(room, actor);
    }
    return true;
  }

  botEndTurn(room, actor);
  return true;
}

function restartGame(room: Room, actor: ServerPlayer) {
  if (!actor.isHost) throw new Error("호스트만 게임을 재시작할 수 있습니다.");
  if (room.status !== "finished") throw new Error("게임이 종료된 후에만 재시작할 수 있습니다.");

  room.status = "waiting";
  room.result = null;
  room.currentTurnPlayerId = null;
  room.turnCount = 0;
  room.usedActionCount = 0;
  room.currentActionCard = null;
  room.pendingDeal = null;
  room.pendingReviews = [];
  room.reports = {};
  room.currentActionAcks = [];
  delete room.hostDrawCount;
  delete room.botDrawCount;

  room.players.forEach((p) => {
    p.role = undefined;
    p.mission = undefined;
    p.job = undefined;
    p.money = 0;
    p.reputationTokens = STARTING_REPUTATION;
    p.hand = [];
    p.dealCards = { cool: true, cancel: true };
  });

  room.logs = [`방장이 게임을 재시작했습니다.`];
}

function ackActionCard(room: Room, actor: ServerPlayer) {
  assertPlaying(room);
  if (!room.currentActionCard) throw new Error("확인할 행동카드가 없습니다.");
  if (!room.currentActionAcks) {
    room.currentActionAcks = [];
  }
  if (!room.currentActionAcks.includes(actor.id)) {
    room.currentActionAcks.push(actor.id);
  }
}

function autoPlayBots(room: Room) {
  if (room.mode !== "botTest") return false;

  let changed = false;

  for (let guard = 0; guard < 30; guard += 1) {
    if (room.status === "finished") break;
    const stepped =
      autoResolveBotDeal(room) ||
      autoReviewBotTrades(room) ||
      autoReportBots(room) ||
      autoRunCurrentBotTurn(room);
    if (!stepped) break;
    changed = true;
  }

  return changed;
}

export async function createRoom(name: string, mode: RoomMode = "real"): Promise<RoomSessionResult> {
  const player = createPlayer(name, true, "호스트");
  const code = await generateUniqueRoomCode();
  const room: Room = {
    code,
    mode,
    status: "waiting",
    hostPlayerId: player.id,
    players: [player],
    currentTurnPlayerId: null,
    turnCount: 0,
    usedActionCount: 0,
    marketActionLimit: 0,
    logs: [
      `${player.name}님이 ${
        mode === "botTest" ? "봇 테스트 방" : "실제 플레이 방"
      }을 만들었습니다.`,
    ],
    actionDeck: makeActionDeck(),
    discardPile: [],
    currentActionCard: null,
    pendingDeal: null,
    pendingReviews: [],
    reports: {},
    result: null,
    currentActionAcks: [],
    version: 1,
    createdAt: now(),
    updatedAt: now(),
  };

  await saveRoom(room);

  return {
    room: toSnapshot(room, player),
    playerId: player.id,
    playerToken: player.token,
  };
}

export async function joinRoom(code: string, name: string): Promise<RoomSessionResult> {
  let playerInfo: { id: string; token: string } | null = null;
  const { room } = await mutateRoomWithRetry(code, (room) => {
    if (room.status !== "waiting") throw new Error("이미 시작된 방입니다.");
    if (room.players.length >= MAX_PLAYERS) throw new Error("방이 가득 찼습니다.");

    const player = createPlayer(name, false, `플레이어 ${room.players.length + 1}`);
    room.players.push(player);
    room.logs.push(`${player.name}님이 입장했습니다.`);
    touch(room);
    playerInfo = { id: player.id, token: player.token };
  });

  const player = room.players.find((p) => p.id === playerInfo!.id)!;
  return {
    room: toSnapshot(room, player),
    playerId: player.id,
    playerToken: player.token,
  };
}

export async function getRoomSnapshot(code: string, token: string): Promise<RoomSnapshot> {
  let viewerId: string = "";
  const { room } = await mutateRoomWithRetry(code, (room) => {
    const viewer = findPlayer(room, token);
    viewerId = viewer.id;
    if (autoPlayBots(room)) {
      touch(room);
    }
  });
  const viewer = room.players.find((p) => p.id === viewerId) || null;
  return toSnapshot(room, viewer);
}

export async function submitRoomAction(
  code: string,
  token: string,
  action: RoomAction,
): Promise<RoomSnapshot> {
  let viewerId: string = "";
  const { room } = await mutateRoomWithRetry(code, (room) => {
    const actor = findPlayer(room, token);
    viewerId = actor.id;

    switch (action.type) {
      case "addBot":
        addBot(room, actor);
        break;
      case "startGame":
        startGame(room, actor);
        break;
      case "drawActionCard":
        drawActionCard(room, actor);
        break;
      case "requestTrade":
        requestTrade(
          room,
          actor,
          action.ownerId,
          action.itemInstanceId,
          action.offerPrice,
        );
        break;
      case "chooseDealCard":
        chooseDealCard(room, actor, action.choice);
        break;
      case "proposePrice":
        proposePrice(room, actor, action.price);
        break;
      case "reviewTrade":
        reviewTrade(room, actor, action.targetPlayerId, action.satisfied);
        break;
      case "terrorReview":
        terrorReview(room, actor, action.targetPlayerId);
        break;
      case "recycleBrick":
        recycleBrick(room, actor, action.itemInstanceId);
        break;
      case "swapRandomItem":
        swapRandomItem(room, actor, action.targetPlayerId);
        break;
      case "rollDice":
        assertPlaying(room);
        assertCurrentTurn(room, actor);
        throw new Error("이 버전에서는 주사위 대신 행동카드를 뽑습니다.");
      case "buyItem":
        throw new Error("이 버전에서는 시장 구매 대신 물건 카드 거래를 사용합니다.");
      case "sellItem":
        throw new Error("이 버전에서는 행동카드 거래를 사용합니다.");
      case "ratePlayer":
        throw new Error("거래 후 후기에서만 평판 토큰을 조정할 수 있습니다.");
      case "endTurn":
        assertPlaying(room);
        assertCurrentTurn(room, actor);
        room.currentActionCard = null;
        room.pendingDeal = null;
        nextTurn(room);
        break;
      case "startReporting":
        if (!actor.isHost) throw new Error("호스트만 최종 신고를 시작할 수 있습니다.");
        if (room.status !== "playing") throw new Error("최종 신고를 시작할 수 없는 상태입니다.");
        enterReporting(room, "호스트가 최종 신고를 시작했습니다.");
        break;
      case "reportSuspiciousPlayer":
        reportSuspiciousPlayer(room, actor, action.targetPlayerId);
        break;
      case "restartGame":
        restartGame(room, actor);
        break;
      case "ackActionCard":
        ackActionCard(room, actor);
        break;
    }

    touch(room);
    if (autoPlayBots(room)) touch(room);
  });

  const viewer = room.players.find((p) => p.id === viewerId) || null;
  return toSnapshot(room, viewer);
}

export async function resetRoomsForTests() {
  if (supabase) {
    await supabase.from("game_rooms").delete().neq("code", "");
  } else {
    rooms.clear();
  }
}
