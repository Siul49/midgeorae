import { randomUUID } from "node:crypto";
import {
  JOB_CARDS,
  MAX_PLAYERS,
  getMarketActionLimit,
  MIN_PLAYERS,
  STARTING_REPUTATION,
  VILLAIN_MISSIONS,
  VILLAIN_MISSION_DESCRIPTIONS,
} from "../rules/game-rules";
import {
  calculateReportResult,
  calculateReputationEliminationResult,
} from "../domain/results";
import { calculateTradeReviewOutcome } from "../domain/reputation";
import { settleAcceptedDeal } from "../domain/trade";
import { evaluateCitizenMission, evaluateVillainMission } from "../domain/jobs";
import { dealItemHands, makeActionDeck, ITEM_IMAGE_BY_ID } from "./cards";
import { ALL_ITEMS } from "../data/items";
import type { ItemCondition } from "../types";
import { evolveNewGeneration } from "./bot-evolution";
import type {
  ActionCardSnapshot,
  DealCardChoice,
  ItemCardSnapshot,
  JobCardSnapshot,
  PendingDeal,
  PublicPlayer,
  Room,
  RoomSnapshot,
  ServerItemCard,
  ServerPlayer,
} from "./types";

export function now() {
  return Date.now();
}

export function formatWon(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

export function findPlayerById(room: Room, playerId: string): ServerPlayer {
  const player = room.players.find((candidate) => candidate.id === playerId);
  if (!player) throw new Error("플레이어를 찾을 수 없습니다.");
  return player;
}

export function touch(room: Room) {
  room.version += 1;
  room.updatedAt = now();
}

export function hiddenItemSnapshot(item: ServerItemCard): ItemCardSnapshot {
  return {
    instanceId: item.instanceId,
    id: item.id,
    name: item.name,
    category: item.category,
    condition: item.customCondition ?? null,
    customCondition: item.customCondition ?? null,
    askingPrice: item.askingPrice ?? item.originalPrice,
    isBrickDisguised: item.isBrickDisguised ?? false,
    fakeItemId: item.fakeItemId,
    originalPrice: item.originalPrice,
    marketPrice: item.marketPrice,
    acquiredPrice: null,
    isBrick: false,
    imagePath: item.imagePath,
    revealed: false,
  };
}

export function publicItemSnapshot(item: ServerItemCard): ItemCardSnapshot {
  return hiddenItemSnapshot(item);
}

export function toItemSnapshot(
  item: ServerItemCard,
  viewer: ServerPlayer,
  room: Room,
  {
    allowTimedReveal = false,
  }: { allowTimedReveal?: boolean } = {},
): ItemCardSnapshot {
  const isOwner = item.revealedToPlayerIds.includes(viewer.id);
  
  const isDelivering =
    item.hiddenInfoRevealTurn !== undefined &&
    room.turnCount < item.hiddenInfoRevealTurn;

  const revealed =
    isOwner ||
    (!isDelivering &&
      (item.revealed ||
        (allowTimedReveal &&
          item.hiddenInfoRevealTurn !== undefined &&
          room.turnCount >= item.hiddenInfoRevealTurn)));

  if (!revealed) {
    return hiddenItemSnapshot(item);
  }

  return {
    instanceId: item.instanceId,
    id: item.id,
    name: item.name,
    category: item.category,
    condition: item.condition,
    customCondition: item.customCondition ?? item.condition,
    askingPrice: item.askingPrice ?? item.originalPrice,
    isBrickDisguised: item.isBrickDisguised ?? false,
    fakeItemId: item.fakeItemId,
    originalPrice: item.originalPrice,
    marketPrice: item.marketPrice,
    acquiredPrice: item.acquiredPrice,
    isBrick: item.isBrick,
    imagePath: item.imagePath,
    revealed,
  };
}

export function toPublicPlayer(
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
      ? player.hand.map((item) =>
          toItemSnapshot(item, viewer, room, {
            allowTimedReveal: true,
          }),
        )
      : [],
  };
}

export function visiblePendingDeal(
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

export function visiblePendingDealItem(
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

export function toSnapshot(room: Room, viewer: ServerPlayer | null): RoomSnapshot {
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
              allowTimedReveal: true,
            }),
          ),
          dealCards: viewer.dealCards,
          inspectTokens: viewer.inspectTokens,
          negoTokens: viewer.negoTokens,
          evidenceTokens: viewer.evidenceTokens,
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

export function dealJobs(playerIds: string[]): Record<string, JobCardSnapshot> {
  const shuffled = [...JOB_CARDS].sort(() => Math.random() - 0.5);
  return Object.fromEntries(
    playerIds.map((playerId, index) => [playerId, shuffled[index % shuffled.length]!]),
  );
}

export function assertCurrentTurn(room: Room, player: ServerPlayer) {
  if (room.currentTurnPlayerId !== player.id) {
    throw new Error("현재 턴 플레이어만 할 수 있습니다.");
  }
}

export function assertPlaying(room: Room) {
  if (room.status !== "playing") {
    throw new Error("진행 중인 게임에서만 할 수 있습니다.");
  }
}

export function enterReporting(room: Room, message = "시장 마감입니다. 최종 신고를 시작합니다.") {
  room.status = "reporting";
  room.currentTurnPlayerId = null;
  room.currentActionCard = null;
  room.pendingDeal = null;
  room.logs.push(message);
}

export function nextTurn(room: Room) {
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

export function finishByReputation(room: Room, eliminatedPlayer: ServerPlayer) {
  room.status = "finished";
  room.currentTurnPlayerId = null;
  const result = calculateReputationEliminationResult(
    room.players,
    eliminatedPlayer,
  );
  room.result = {
    ...result,
    villainMissionComplete: false,
  };
  room.logs.push(
    `${eliminatedPlayer.name}님의 좋아요 토큰이 0개가 되어 게임이 종료되었습니다.`,
  );
  evolveNewGeneration(room.players, room.result.winningSide);
}

export function adjustReputation(room: Room, target: ServerPlayer, amount: number) {
  target.reputationTokens = Math.max(0, target.reputationTokens + amount);
  if (target.reputationTokens === 0) {
    if (target.role === "villain") {
      finishByReputation(room, target);
    } else {
      enterReporting(
        room,
        `${target.name}님의 평판이 0이 되어 즉시 시장이 폐쇄되고 최종 투표에 돌입합니다.`,
      );
    }
  }
}

export function startGame(room: Room, actor: ServerPlayer) {
  if (!actor.isHost) throw new Error("호스트만 게임을 시작할 수 있습니다.");
  if (room.status !== "waiting") throw new Error("이미 시작된 방입니다.");
  if (room.players.length < MIN_PLAYERS) {
    throw new Error("3명 이상 모여야 시작할 수 있습니다.");
  }
  if (room.players.length > MAX_PLAYERS) {
    throw new Error("5명 이하로만 시작할 수 있습니다.");
  }

  const villainIndex = Math.floor(Math.random() * room.players.length);
  const villainId = room.players[villainIndex]?.id ?? null;
  const missionId =
    VILLAIN_MISSIONS[Math.floor(Math.random() * VILLAIN_MISSIONS.length)]!;
  const missionText = VILLAIN_MISSION_DESCRIPTIONS[missionId]!;
  const hands = dealItemHands(room.players.map((player) => player.id), villainId);
  const jobs = dealJobs(room.players.map((player) => player.id));

  room.players.forEach((player, index) => {
    player.role = index === villainIndex ? "villain" : "citizen";
    player.mission = index === villainIndex ? missionText : undefined;
    player.job = jobs[player.id];
    player.money = player.job?.startingMoney ?? 1000000;
    player.reputationTokens = STARTING_REPUTATION;
    player.hand = hands[player.id] ?? [];
    player.dealCards = { cool: true, cancel: true };
    player.isPrepared = false;
  });
  room.status = "preparing";
  room.currentTurnPlayerId = null;
  room.usedActionCount = 0;
  room.marketActionLimit = getMarketActionLimit(room.players.length);
  room.actionDeck = makeActionDeck();
  room.discardPile = [];
  room.currentActionCard = null;
  room.logs.push(
    `게임이 시작되었습니다. 사전 매물 등록 단계입니다. 손패 카드들의 상태와 제안가를 결정해 주세요.`,
  );
}

export function applyPreparationConfig(
  player: ServerPlayer,
  configs: {
    instanceId: string;
    customCondition: ItemCondition;
    askingPrice: number;
    fakeItemId?: string;
  }[],
) {
  configs.forEach((config) => {
    const item = player.hand.find((i) => i.instanceId === config.instanceId);
    if (!item) return;

    item.customCondition = config.customCondition;
    item.askingPrice = config.askingPrice;

    if (item.isBrick && config.fakeItemId) {
      const fakeTarget = ALL_ITEMS.find((ai) => ai.id === config.fakeItemId);
      if (fakeTarget) {
        item.id = fakeTarget.id;
        item.name = fakeTarget.name;
        item.category = fakeTarget.category;
        item.originalPrice = fakeTarget.originalPrice;
        item.marketPrice = fakeTarget.marketPrice;
        item.imagePath = ITEM_IMAGE_BY_ID[fakeTarget.id] ?? "/game-cards/backs/item-back.png";
        item.isBrickDisguised = true;
        item.fakeItemId = fakeTarget.id;
      }
    }
  });
}

export function drawActionCard(room: Room, actor: ServerPlayer) {
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

export function isTradeAction(
  card: ActionCardSnapshot | null,
): card is ActionCardSnapshot & { type: PendingDeal["actionType"] } {
  return Boolean(
    card && ["tradeRequest", "freeGive", "directTrade"].includes(card.type),
  );
}

export function assertTradeAction(
  card: ActionCardSnapshot | null,
): asserts card is ActionCardSnapshot & { type: PendingDeal["actionType"] } {
  if (!isTradeAction(card)) {
    throw new Error("거래 행동카드에서만 거래를 신청할 수 있습니다.");
  }
}

export function requestTrade(
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

  if (price !== item.marketPrice) {
    actor.negoOffersSent += 1;
    const msg = evaluateCitizenMission(actor);
    if (msg) room.logs.push(msg);
  }

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
    currentOffer: price,
    lastOfferPlayerId: actor.id,
    negoCount: 0,
  };
  room.logs.push(
    `${actor.name}님이 ${owner.name}님의 물건에 ${formatWon(price)} 거래를 신청했습니다.`,
  );
}

export function resolveDeal(room: Room, deal: PendingDeal) {
  const owner = findPlayerById(room, deal.ownerId);
  const requester = findPlayerById(room, deal.requesterId);
  const ownerChoice = deal.choices[owner.id];
  const requesterChoice = deal.choices[requester.id];
  if (!ownerChoice || !requesterChoice) return;

  if (ownerChoice === "cool" && requesterChoice === "cool") {
    const tradedItem = owner.hand.find((item) => item.instanceId === deal.itemInstanceId);
    const finalPrice = deal.currentOffer !== undefined ? deal.currentOffer : deal.askingPrice;

    const settlement = settleAcceptedDeal({
      deal: {
        ...deal,
        askingPrice: finalPrice,
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

    owner.tradeParticipations += 1;
    requester.tradeParticipations += 1;

    if (owner.role === "villain" && tradedItem) {
      if (tradedItem.isBrick) {
        owner.brickSalesCount += 1;
      }
      if (
        (tradedItem.condition === "defective" || tradedItem.condition === "broken") &&
        finalPrice >= tradedItem.marketPrice
      ) {
        owner.defectSalesCount += 1;
      }
      if (finalPrice >= tradedItem.marketPrice * 1.1) {
        owner.overpriceSalesCount += 1;
      }
    }

    room.logs.push(
      `${requester.name}님과 ${owner.name}님의 쿨거래가 성사되었습니다. (${formatWon(finalPrice)})`,
    );

    const ownerMsg = evaluateCitizenMission(owner);
    if (ownerMsg) room.logs.push(ownerMsg);
    const requesterMsg = evaluateCitizenMission(requester);
    if (requesterMsg) room.logs.push(requesterMsg);
  } else {
    room.logs.push(`${requester.name}님과 ${owner.name}님의 거래가 취소되었습니다.`);
  }

  if (room.currentActionCard) room.discardPile.push(room.currentActionCard);
  room.pendingDeal = null;
  room.currentActionCard = null;
  nextTurn(room);
}

export function chooseDealCard(
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

export function negoDeal(
  room: Room,
  actor: ServerPlayer,
  price: number,
) {
  assertPlaying(room);
  const deal = room.pendingDeal;
  if (!deal) throw new Error("진행 중인 거래가 없습니다.");
  if (actor.id !== deal.ownerId && actor.id !== deal.requesterId) {
    throw new Error("거래 당사자만 흥정할 수 있습니다.");
  }
  if (deal.lastOfferPlayerId === actor.id) {
    throw new Error("상대방의 제안에 대해서만 흥정할 수 있습니다.");
  }
  if (price < 0) {
    throw new Error("가격은 0원 이상이어야 합니다.");
  }
  if (actor.id === deal.requesterId && actor.money < price) {
    throw new Error("소지금보다 높은 가격으로 제안할 수 없습니다.");
  }

  deal.currentOffer = price;
  deal.lastOfferPlayerId = actor.id;
  deal.negoCount = (deal.negoCount ?? 0) + 1;
  deal.choices = {
    [actor.id]: "cool",
  };

  room.logs.push(
    `${actor.name}님이 가격을 ${formatWon(price)}으로 흥정(역제안)했습니다.`,
  );
}

export function reviewTrade(
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

  actor.reviewsSubmitted += 1;
  const msg = evaluateCitizenMission(actor);
  if (msg) room.logs.push(msg);

  room.pendingReviews = room.pendingReviews.filter(
    (candidate) => candidate !== review,
  );
}

export function terrorReview(room: Room, actor: ServerPlayer, targetPlayerId: string) {
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

export function recycleBrick(room: Room, actor: ServerPlayer, itemInstanceId: string) {
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

export function swapRandomItem(room: Room, actor: ServerPlayer, targetPlayerId: string) {
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

export function checkVillainMissionComplete(room: Room, villain: ServerPlayer): boolean {
  return evaluateVillainMission(villain);
}

export function reportSuspiciousPlayer(
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
    const missionComplete = checkVillainMissionComplete(room, villain);
    room.result = calculateReportResult(
      room.players,
      room.reports,
      villain.id,
      missionComplete,
    );
    room.result.villainMissionComplete = missionComplete;
    room.status = "finished";
    room.logs.push("최종 신고가 접수되었습니다. 분쟁 심사 결과를 공개합니다.");
    evolveNewGeneration(room.players, room.result.winningSide);
  }
}

export function fixPreparation(
  room: Room,
  player: ServerPlayer,
  itemsConfig: {
    instanceId: string;
    customCondition: ItemCondition;
    askingPrice: number;
    fakeItemId?: string;
  }[],
) {
  if (room.status !== "preparing") {
    throw new Error("준비 단계가 아닙니다.");
  }

  applyPreparationConfig(player, itemsConfig);
  player.isPrepared = true;

  const allPrepared = room.players.every((p) => p.isPrepared);
  if (allPrepared) {
    room.status = "playing";
    room.currentTurnPlayerId = room.players[0]?.id ?? null;
    room.logs.push("모든 플레이어가 사전 등록을 마쳤습니다! 게임을 시작합니다.");
  }
}

export function updateCustomCondition(
  room: Room,
  player: ServerPlayer,
  itemInstanceId: string,
  customCondition: ItemCondition,
) {
  const item = player.hand.find((i) => i.instanceId === itemInstanceId);
  if (!item) throw new Error("해당 아이템을 보유하고 있지 않습니다.");
  item.customCondition = customCondition;
}
