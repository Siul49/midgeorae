import { randomUUID } from "node:crypto";
import {
  JOB_CARDS,
  MIN_PLAYERS,
  MAX_PLAYERS,
  getMarketActionLimit,
  VILLAIN_MISSIONS,
  DEFAULT_STARTING_MONEY,
  VILLAIN_SCAM_VICTORY_LIMIT,
  STARTING_REPUTATION,
  STARTING_MANNER,
} from "../../rules/game-rules";
import {
  calculateReportResult,
  calculateReputationEliminationResult,
  getItemAssetValue,
} from "../../domain/results";
import { calculateTradeReviewOutcome } from "../../domain/reputation";
import { settleAcceptedDeal } from "../../domain/trade";
import { dealItemHands, makeActionDeck, ACTION_CARDS } from "../cards";
import type {
  ActionCardSnapshot,
  DealCardChoice,
  JobCardSnapshot,
  PendingDeal,
  Room,
  ServerPlayer,
} from "../types";
import {
  createPlayer,
  findPlayerById,
  touch,
  formatWon,
  now,
  normalizeName,
} from "./room-db";
import { getFakeItemForBrick } from "./room-snapshot";

export function getDisguisedItemName(item: { isBrick?: boolean; name: string; instanceId: string }): string {
  if (item.isBrick) {
    return getFakeItemForBrick(item.instanceId).name;
  }
  return item.name;
}


export function dealJobs(playerIds: string[]): Record<string, JobCardSnapshot> {
  const shuffled = [...JOB_CARDS].sort(() => Math.random() - 0.5);
  return Object.fromEntries(
    playerIds.map((playerId, index) => [playerId, shuffled[index % shuffled.length]]),
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

  if (room.turnCount > 0 && room.turnCount % room.players.length === 0) {
    const roundScams = room.roundScamCount || 0;
    if (roundScams > 0) {
      room.logs.push(
        `[라운드 종료] 이번 라운드에 사기 거래가 ${roundScams}건 발생했습니다!`
      );
    } else {
      room.logs.push(
        `[라운드 종료] 이번 라운드에 사기 거래가 발생하지 않았습니다.`
      );
    }
    room.roundScamCount = 0;
  }

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
  room.result = calculateReputationEliminationResult(
    room.players,
    eliminatedPlayer,
  );
  room.logs.push(
    `${eliminatedPlayer.name}님의 좋아요 토큰이 0개가 되어 게임이 종료되었습니다.`,
  );
}

export function adjustReputation(room: Room, target: ServerPlayer, amount: number) {
  target.reputationTokens = Math.max(0, target.reputationTokens + amount);
  if (target.reputationTokens === 0) finishByReputation(room, target);
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
  const mission =
    VILLAIN_MISSIONS[Math.floor(Math.random() * VILLAIN_MISSIONS.length)];
  const villainPlayer = room.players[villainIndex];
  const hands = dealItemHands(
    room.players.map((player) => player.id),
    villainPlayer?.id
  );
  
  const citizenPlayerIds = room.players
    .filter((_, index) => index !== villainIndex)
    .map((player) => player.id);
  const citizenJobs = dealJobs(citizenPlayerIds);

  room.players.forEach((player, index) => {
    const isVillain = index === villainIndex;
    player.role = isVillain ? "villain" : "citizen";
    player.mission = isVillain ? mission : undefined;
    player.job = isVillain
      ? {
          id: "villain",
          title: "빌런",
          description: "벽돌 2개를 다른 플레이어에게 사기 판매(벽돌 거래 성사)하는 데 성공해야 합니다.",
          startingMoney: DEFAULT_STARTING_MONEY,
        }
      : citizenJobs[player.id];
    player.hand = hands[player.id] ?? [];
    const handAssetValue = player.hand.reduce(
      (sum, item) => sum + getItemAssetValue(item, "playing"),
      0
    );
    const initialTargetAsset = player.job?.startingMoney ?? DEFAULT_STARTING_MONEY;
    player.money = Math.max(300000, initialTargetAsset - handAssetValue);
    player.reputationTokens = STARTING_REPUTATION;
    player.dealCards = { cool: true, cancel: true };
  });
  room.status = "playing";
  const startingIndex = process.env.NODE_ENV === "test"
    ? 0
    : Math.floor(Math.random() * room.players.length);
  room.currentTurnPlayerId = room.players[startingIndex]?.id ?? null;
  room.startingPlayerId = room.currentTurnPlayerId;
  room.villainScamCount = 0;
  room.roundScamCount = 0;
  room.revealAllItems = room.revealAllItems ?? true;
  room.usedActionCount = 0;
  room.marketActionLimit = getMarketActionLimit(room.players.length);
  room.actionDeck = makeActionDeck();
  room.discardPile = [];
  room.currentActionCard = null;
  room.logs.push(
    `게임이 시작되었습니다. 역할 카드와 물건 카드 5장을 확인하세요. 시장 행동 예산은 ${room.marketActionLimit}회입니다.`,
  );
}

const ACTION_CARD_WEIGHTS = [
  { type: "tradeRequest", weight: 3 },
  { type: "saleRequest", weight: 3 },
  { type: "freeGive", weight: 2 },
  { type: "directTrade", weight: 2 },
  { type: "badReview", weight: 2 },
  { type: "recycle", weight: 1 },
  { type: "swap", weight: 1 },
];

function getRandomActionCardByProbability(): ActionCardSnapshot {
  const totalWeight = ACTION_CARD_WEIGHTS.reduce((sum, item) => sum + item.weight, 0);
  let randomValue = Math.random() * totalWeight;
  
  for (const item of ACTION_CARD_WEIGHTS) {
    if (randomValue < item.weight) {
      const card = ACTION_CARDS.find((c) => c.type === item.type);
      if (card) return { ...card };
    }
    randomValue -= item.weight;
  }
  return { ...ACTION_CARDS[0] };
}

export function drawActionCard(room: Room, actor: ServerPlayer) {
  assertPlaying(room);
  assertCurrentTurn(room, actor);
  if (room.currentActionCard) throw new Error("이미 행동카드를 뽑았습니다.");
  
  let card;
  if (process.env.NODE_ENV === "test") {
    if (room.actionDeck.length === 0) {
      room.actionDeck = makeActionDeck();
      room.discardPile = [];
    }
    card = room.actionDeck.shift();
  } else {
    card = getRandomActionCardByProbability();
  }

  if (room.mode === "botTest" && card) {
    if (actor.isHost) {
      room.hostDrawCount = (room.hostDrawCount || 0) + 1;
      const hostSequence = [
        "tradeRequest",
        "saleRequest",
        "directTrade",
        "freeGive",
        "badReview",
        "recycle",
        "swap",
      ];
      const targetType = hostSequence[(room.hostDrawCount - 1) % hostSequence.length];
      const found = ACTION_CARDS.find((c) => c.type === targetType);
      if (found) {
        card = { ...found };
      }
    } else {
      room.botDrawCount = (room.botDrawCount || 0) + 1;
      const botSequence = [
        "tradeRequest",
        "saleRequest",
        "directTrade",
      ];
      const targetType = botSequence[(room.botDrawCount - 1) % botSequence.length] || "tradeRequest";
      const found = ACTION_CARDS.find((c) => c.type === targetType);
      if (found) {
        card = { ...found };
      }
    }
  }

  if (!card) throw new Error("행동카드가 없습니다.");
  room.currentActionCard = card;
  room.currentActionAcks = room.players.filter((p) => p.isBot).map((p) => p.id);
  room.logs.push(`${actor.name}님이 기분 좋게 행동 카드 '${card.title}'을(를) 뽑았습니다! 🛒`);
}

export function assertTradeAction(
  card: ActionCardSnapshot | null,
): asserts card is ActionCardSnapshot & { type: PendingDeal["actionType"] } {
  if (!isTradeAction(card)) {
    throw new Error("거래 행동카드에서만 거래를 신청할 수 있습니다.");
  }
}

export function isTradeAction(
  card: ActionCardSnapshot | null,
): card is ActionCardSnapshot & { type: PendingDeal["actionType"] } {
  return Boolean(
    card && ["tradeRequest", "freeGive", "directTrade", "saleRequest"].includes(card.type),
  );
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

  const target = findPlayerById(room, ownerId);
  if (target.id === actor.id) {
    throw new Error("자기 자신에게 거래를 신청할 수 없습니다.");
  }

  const isSale = actionCard.type === "saleRequest" || actionCard.type === "freeGive";
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
  const infoSuffix = item.isBrick
    ? ` __BRICK_DEAL_INFO__:${item.instanceId}:${price}:${getDisguisedItemName(item)}`
    : "";
  if (actionCard.type === "freeGive") {
    room.logs.push(
      `${actor.name}님이 ${target.name}님에게 자신의 물품 [${getDisguisedItemName(item)}]을 무료나눔(0원) 신청했어요! 🎁${infoSuffix}`,
    );
  } else if (isSale) {
    room.logs.push(
      `${actor.name}님이 ${target.name}님에게 자신의 물품 [${getDisguisedItemName(item)}]을 ${formatWon(price)}에 팔아요 신청을 보냈습니다! 📢${infoSuffix}`,
    );
  } else {
    room.logs.push(
      `${actor.name}님이 ${target.name}님의 물품에 살게요 제안을 보냈어요! (희망가 제시 대기 중) 🙋${infoSuffix}`,
    );
  }
}

export function resolveDeal(room: Room, deal: PendingDeal) {
  const owner = findPlayerById(room, deal.ownerId);
  const requester = findPlayerById(room, deal.requesterId);
  const ownerChoice = deal.choices[owner.id];
  const requesterChoice = deal.choices[requester.id];

  if (ownerChoice === "cancel" || requesterChoice === "cancel") {
    room.logs.push(`${requester.name}님과 ${owner.name}님의 거래가 아쉽게 불발되었습니다. 😢`);
    if (room.currentActionCard) room.discardPile.push(room.currentActionCard);
    room.pendingDeal = null;
    room.currentActionCard = null;
    nextTurn(room);
    return;
  }

  if (!ownerChoice || !requesterChoice) return;

  if (ownerChoice === "cool" && requesterChoice === "cool") {
    const item = owner.hand.find((h) => h.instanceId === deal.itemInstanceId);
    if (item && item.isBrick) {
      room.roundScamCount = (room.roundScamCount || 0) + 1;
      if (owner.role === "villain") {
        room.villainScamCount = (room.villainScamCount || 0) + 1;
        room.logs.push(
          `[사기 성공] 빌런이 벽돌 카드를 판매했습니다! 😈 (현재 빌런 사기 성공 횟수: ${room.villainScamCount}/${VILLAIN_SCAM_VICTORY_LIMIT}회)`
        );
      }
    }

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
      `${requester.name}님과 ${owner.name}님의 쿨거래가 완료되었습니다! 🤝 서로 따뜻한 거래 후기를 남겨주세요.`,
    );
  } else {
    room.logs.push(`${requester.name}님과 ${owner.name}님의 거래가 아쉽게 불발되었습니다. 😢`);
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
  if (deal.actionType === "freeGive" && choice === "cancel") {
    throw new Error("무료나눔은 거절할 수 없습니다.");
  }
  deal.choices[actor.id] = choice;
  resolveDeal(room, deal);
}

export function proposePrice(room: Room, actor: ServerPlayer, price: number) {
  assertPlaying(room);
  const deal = room.pendingDeal;
  if (!deal) throw new Error("진행 중인 거래가 없습니다.");
  if (actor.id !== deal.ownerId && actor.id !== deal.requesterId) {
    throw new Error("거래 당사자만 가격을 제시할 수 있습니다.");
  }
  if (price <= 0) {
    throw new Error("가격이 올바르지 않습니다.");
  }

  const buyer = findPlayerById(room, deal.requesterId);
  if (buyer.money < price) {
    throw new Error("구매자의 금액이 부족합니다.");
  }

  const isCounterProposal = deal.askingPrice > 0;

  if (isCounterProposal) {
    deal.askingPrice = price;
    deal.choices = { [actor.id]: "cool" };

    const itemOwner = findPlayerById(room, deal.ownerId);
    const item = itemOwner.hand.find((owned) => owned.instanceId === deal.itemInstanceId);
    const itemName = item ? getDisguisedItemName(item) : "물건";
    const infoSuffix = item && item.isBrick
      ? ` __BRICK_DEAL_INFO__:${item.instanceId}:${price}:${itemName}`
      : "";
    room.logs.push(
      `${actor.name}님이 희망가격을 ${formatWon(price)}으로 조정해서 다시 제안했어요! 💬${infoSuffix}`,
    );
  } else {
    if (actor.id !== deal.ownerId) {
      throw new Error("판매자만 가격을 제시할 수 있습니다.");
    }
    deal.askingPrice = price;
    deal.choices[actor.id] = "cool";

    const item = actor.hand.find((owned) => owned.instanceId === deal.itemInstanceId);
    const itemName = item ? getDisguisedItemName(item) : "물건";
    const infoSuffix = item && item.isBrick
      ? ` __BRICK_DEAL_INFO__:${item.instanceId}:${price}:${itemName}`
      : "";
    room.logs.push(
      `${actor.name}님이 판매할 물품 [${itemName}]의 가격을 ${formatWon(price)}으로 제시하고 수락했습니다! 📢${infoSuffix}`,
    );
  }

  resolveDeal(room, deal);
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
    targetManner: 36.5,
    targetLikes: target.likes,
    targetDislikes: target.dislikes,
    satisfied,
  });

  actor.reputationTokens = outcome.reviewerReputationTokens;
  target.reputationTokens = outcome.targetReputationTokens;
  target.likes = outcome.targetLikes;
  target.dislikes = outcome.targetDislikes;

  if (satisfied) {
    room.logs.push(`${actor.name}님이 ${target.name}님에게 따뜻한 후기를 남겼어요! (평판 +1) 👍`);
    if (outcome.eliminatedPlayer === "reviewer") finishByReputation(room, actor);
  } else {
    if (outcome.eliminatedPlayer === "target") finishByReputation(room, target);
    room.logs.push(`${actor.name}님이 ${target.name}님에게 아쉬운 후기를 남겼어요. (평판 -1) 👎`);
  }

  room.pendingReviews = room.pendingReviews.filter(
    (candidate) =>
      candidate.tradeId !== review.tradeId ||
      candidate.reviewerId !== review.reviewerId,
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
  room.logs.push(`${actor.name}님이 ${target.name}님에게 비매너 후기 테러를 날렸습니다! 👎`);
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
  if (!item) throw new Error("분리수거할 물건 카드가 없습니다.");
  actor.hand = actor.hand.filter((owned) => owned.instanceId !== itemInstanceId);
  room.logs.push(`${actor.name}님이 물품 카드 [${getDisguisedItemName(item)}]을(를) 분리수거함에 버렸습니다. ♻️`);
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
  
  room.logs.push(`${actor.name}님과 ${target.name}님이 설레는 물물교환으로 카드를 1장씩 맞교환했습니다! 🔄`);
  room.currentActionCard = null;
  nextTurn(room);
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
  room.logs.push(`${actor.name}님이 사기 의심 회원을 고객센터에 신고했습니다! 🚨`);

  if (Object.keys(room.reports).length === room.players.length) {
    const villain = room.players.find((player) => player.role === "villain");
    if (!villain) throw new Error("빌런 정보가 없습니다.");
    room.result = calculateReportResult(room.players, room.reports, villain.id, room.villainScamCount || 0);
    room.status = "finished";
    room.logs.push("최종 신고가 접수되었습니다. 분쟁 조정 위원회의 심사 결과를 공개합니다! ⚖️");
  }
}

export function restartGame(room: Room, actor: ServerPlayer) {
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
  delete room.villainScamCount;
  delete room.roundScamCount;
  delete room.startingPlayerId;

  room.players.forEach((p) => {
    p.role = undefined;
    p.mission = undefined;
    p.job = undefined;
    p.money = 0;
    p.reputationTokens = STARTING_REPUTATION;
    p.hand = [];
    p.dealCards = { cool: true, cancel: true };
    p.likes = 0;
    p.dislikes = 0;
    p.position = 0;
  });

  room.logs = [`방장이 게임을 새로 시작했습니다! 이웃분들과 기분 좋은 거래 되세요~ 🔄`];
}

export function ackActionCard(room: Room, actor: ServerPlayer) {
  assertPlaying(room);
  if (!room.currentActionCard) throw new Error("확인할 행동카드가 없습니다.");
  if (!room.currentActionAcks) {
    room.currentActionAcks = [];
  }
  if (!room.currentActionAcks.includes(actor.id)) {
    room.currentActionAcks.push(actor.id);
  }
}

export function leaveRoom(room: Room, actor: ServerPlayer) {
  if (room.hostPlayerId === actor.id || actor.isHost) {
    room.players = [];
    room.logs.push(`방장 ${actor.name}님이 동네를 떠나 방이 폭파되었습니다. 🚪`);
    return;
  }

  room.players = room.players.filter((p) => p.id !== actor.id);
  room.logs.push(`${actor.name}님이 동네를 떠났습니다(퇴장). 🚪`);

  if (room.pendingDeal && (room.pendingDeal.ownerId === actor.id || room.pendingDeal.requesterId === actor.id)) {
    room.logs.push(`거래 당사자인 ${actor.name}님이 나가버려서 진행 중이던 거래가 불발되었습니다. 😢`);
    if (room.currentActionCard) room.discardPile.push(room.currentActionCard);
    room.pendingDeal = null;
    room.currentActionCard = null;
  }

  room.pendingReviews = room.pendingReviews.filter((r) => r.reviewerId !== actor.id && r.targetPlayerId !== actor.id);
  room.currentActionAcks = room.currentActionAcks.filter((id) => id !== actor.id);

  if (room.status === "playing" && room.currentTurnPlayerId === actor.id) {
    room.currentActionCard = null;
    room.pendingDeal = null;
    if (room.players.length > 0) {
      room.currentTurnPlayerId = null;
      nextTurn(room);
    } else {
      room.currentTurnPlayerId = null;
    }
  }

  if ((room.status === "playing" || room.status === "reporting") && room.players.length < 3) {
    room.status = "waiting";
    room.currentTurnPlayerId = null;
    room.currentActionCard = null;
    room.pendingDeal = null;
    room.pendingReviews = [];
    room.logs.push(`인원이 부족하여 게임이 대기실 상태로 초기화되었습니다.`);
  }
}

export function renamePlayer(room: Room, actor: ServerPlayer, newName: string) {
  if (room.status !== "waiting") {
    throw new Error("게임 시작 전에만 이름을 변경할 수 있습니다.");
  }
  const oldName = actor.name;
  const sanitized = normalizeName(newName, "플레이어");
  if (room.players.some((p) => p.id !== actor.id && p.name === sanitized)) {
    throw new Error("이미 사용 중인 이름입니다.");
  }
  actor.name = sanitized;
  room.logs.push(`${oldName}님이 이름을 ${sanitized}(으)로 변경했습니다.`);
}
