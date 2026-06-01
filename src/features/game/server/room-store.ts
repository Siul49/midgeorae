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

function findRoom(code: string): Room {
  const room = rooms.get(normalizeCode(code));
  if (!room) throw new Error("방을 찾을 수 없습니다.");
  return room;
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

function toPublicPlayer(
  player: ServerPlayer,
  viewer: ServerPlayer | null,
  room: Room,
): PublicPlayer {
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
  };
}

function hiddenItemSnapshot(item: ServerItemCard): ItemCardSnapshot {
  return {
    instanceId: item.instanceId,
    id: item.id,
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
    allowTimedReveal = false,
  }: { allowPublicInfo?: boolean; allowTimedReveal?: boolean } = {},
): ItemCardSnapshot {
  const revealed =
    item.revealed ||
    item.revealedToPlayerIds.includes(viewer.id) ||
    (allowTimedReveal &&
      item.hiddenInfoRevealTurn !== undefined &&
      room.turnCount >= item.hiddenInfoRevealTurn);

  if (!revealed) {
    return allowPublicInfo ? publicItemSnapshot(item) : hiddenItemSnapshot(item);
  }

  return {
    instanceId: item.instanceId,
    id: item.id,
    name: revealed ? item.name : "뒤집힌 물건",
    category: revealed ? item.category : null,
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
  if (!isDealParty) return hiddenItemSnapshot(item);
  if (!deal.revealedBeforeDeal) return publicItemSnapshot(item);

  return toItemSnapshot(item, viewer, room);
}

function toSnapshot(room: Room, viewer: ServerPlayer | null): RoomSnapshot {
  return {
    code: room.code,
    mode: room.mode,
    status: room.status,
    players: room.players.map((player) => toPublicPlayer(player, viewer, room)),
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
              allowTimedReveal: true,
            }),
          ),
          dealCards: viewer.dealCards,
        }
      : null,
    currentTurnPlayerId: room.currentTurnPlayerId,
    currentActionCard: room.currentActionCard,
    pendingDeal: visiblePendingDeal(room, viewer),
    pendingDealItem: visiblePendingDealItem(room, viewer),
    pendingReviews: viewer
      ? room.pendingReviews.filter((review) => review.reviewerId === viewer.id)
      : [],
    usedActionCount: room.usedActionCount,
    marketActionLimit: room.marketActionLimit,
    logs: room.logs.slice(-20),
    reportsCast: Object.keys(room.reports).length,
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

  const card = room.actionDeck.shift();
  if (!card) throw new Error("행동카드가 없습니다.");
  room.currentActionCard = card;
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
    card && ["tradeRequest", "freeGive", "directTrade"].includes(card.type),
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

  const owner = findPlayerById(room, ownerId);
  if (owner.id === actor.id) {
    throw new Error("자기 자신에게 거래를 신청할 수 없습니다.");
  }
  const item = owner.hand.find((owned) => owned.instanceId === itemInstanceId);
  if (!item) throw new Error("거래 신청할 물건을 찾을 수 없습니다.");
  const price = actionCard.type === "freeGive" ? 0 : offerPrice;
  if (price < 0) throw new Error("가격이 올바르지 않습니다.");
  if (actor.money < price) throw new Error("신청자의 금액이 부족합니다.");

  const revealedBeforeDeal = actionCard.type === "directTrade";
  if (revealedBeforeDeal) {
    item.revealedToPlayerIds = Array.from(
      new Set([...item.revealedToPlayerIds, owner.id, actor.id]),
    );
  }

  room.pendingDeal = {
    id: randomUUID(),
    actionType: actionCard.type,
    requesterId: actor.id,
    ownerId: owner.id,
    itemInstanceId,
    askingPrice: price,
    revealedBeforeDeal,
    choices: {},
    resolved: false,
  };
  room.logs.push(
    `${actor.name}님이 ${owner.name}님의 물건에 ${formatWon(price)} 거래를 신청했습니다.`,
  );
}

function resolveDeal(room: Room, deal: PendingDeal) {
  const owner = findPlayerById(room, deal.ownerId);
  const requester = findPlayerById(room, deal.requesterId);
  const ownerChoice = deal.choices[owner.id];
  const requesterChoice = deal.choices[requester.id];
  if (!ownerChoice || !requesterChoice) return;

  if (ownerChoice === "cool" && requesterChoice === "cool") {
    const settlement = settleAcceptedDeal({
      deal: {
        ...deal,
        hiddenInfoRevealTurn: deal.revealedBeforeDeal
          ? undefined
          : room.turnCount + 2,
      },
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
  nextTurn(room);
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
  actor.hand[actorItemIndex] = targetItem;
  target.hand[targetItemIndex] = actorItem;
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
    reviewTrade(room, reviewer, review.targetPlayerId, true);
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
  if (room.status !== "playing" || room.pendingDeal) return false;
  const actor = room.players.find((player) => player.id === room.currentTurnPlayerId);
  if (!actor?.isBot) return false;

  if (!room.currentActionCard) {
    drawActionCard(room, actor);
    return true;
  }

  const card = room.currentActionCard;
  if (isTradeAction(card)) {
    const tradeOption = room.players
      .filter((player) => player.id !== actor.id && player.hand.length > 0)
      .sort((a, b) => Number(b.isBot) - Number(a.isBot))
      .map((owner) => {
        const item = owner.hand.find((owned) => !owned.isBrick) ?? owner.hand[0];
        if (!item) return null;
        const offerPrice =
          card.type === "freeGive"
            ? 0
            : Math.max(0, Math.round((item.marketPrice * 0.8) / 10000) * 10000);
        return { owner, item, offerPrice };
      })
      .find(
        (
          option,
        ): option is {
          owner: ServerPlayer;
          item: ServerItemCard;
          offerPrice: number;
        } => Boolean(option && actor.money >= option.offerPrice),
      );
    if (!tradeOption) {
      botEndTurn(room, actor);
      return true;
    }

    requestTrade(
      room,
      actor,
      tradeOption.owner.id,
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

export function createRoom(name: string, mode: RoomMode = "real"): RoomSessionResult {
  const player = createPlayer(name, true, "호스트");
  const code = makeRoomCode(new Set(rooms.keys()));
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
    version: 1,
    createdAt: now(),
    updatedAt: now(),
  };

  rooms.set(code, room);

  return {
    room: toSnapshot(room, player),
    playerId: player.id,
    playerToken: player.token,
  };
}

export function joinRoom(code: string, name: string): RoomSessionResult {
  const room = findRoom(code);
  if (room.status !== "waiting") throw new Error("이미 시작된 방입니다.");
  if (room.players.length >= MAX_PLAYERS) throw new Error("방이 가득 찼습니다.");

  const player = createPlayer(name, false, `플레이어 ${room.players.length + 1}`);
  room.players.push(player);
  room.logs.push(`${player.name}님이 입장했습니다.`);
  touch(room);

  return {
    room: toSnapshot(room, player),
    playerId: player.id,
    playerToken: player.token,
  };
}

export function getRoomSnapshot(code: string, token: string): RoomSnapshot {
  const room = findRoom(code);
  const viewer = findPlayer(room, token);
  if (autoPlayBots(room)) touch(room);
  return toSnapshot(room, viewer);
}

export function submitRoomAction(
  code: string,
  token: string,
  action: RoomAction,
): RoomSnapshot {
  const room = findRoom(code);
  const actor = findPlayer(room, token);

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
  }

  touch(room);
  if (autoPlayBots(room)) touch(room);
  return toSnapshot(room, actor);
}

export function resetRoomsForTests() {
  rooms.clear();
}
