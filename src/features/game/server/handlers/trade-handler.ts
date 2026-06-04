import { randomUUID } from "node:crypto";
import { updateCitizenMissionProgress } from "../../domain/jobs";
import { settleAcceptedDeal } from "../../domain/trade";
import { calculateTradeReviewOutcome } from "../../domain/reputation";
import {
  assertPlaying,
  assertCurrentTurn,
  findPlayerById,
  formatWon,
  nextTurn,
  finishByReputation,
} from "./common-utils";
import { assertTradeAction } from "./action-card-handler";
import type { DealCardChoice, PendingDeal, Room, ServerPlayer } from "../types/game-server-types";

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

  const isForcedGiftOrSale = ["forceBuy", "freeShare"].includes(actionCard.type);
  const actualItemOwner = isForcedGiftOrSale ? actor : owner;
  const actualItemReceiver = isForcedGiftOrSale ? owner : actor;

  const item = actualItemOwner.hand.find((owned) => owned.instanceId === itemInstanceId);
  if (!item) throw new Error("구매 신청할 물건을 찾을 수 없습니다.");
  if (item.acquiredPrice !== null) {
    throw new Error("다른 플레이어에게서 구매하거나 획득한 물품은 다시 거래할 수 없습니다.");
  }

  const price = ["freeGive", "freeShare"].includes(actionCard.type) ? 0 : offerPrice;
  if (price < 0) throw new Error("가격이 올바르지 않습니다.");

  const payingPlayer = isForcedGiftOrSale ? owner : actor;
  if (payingPlayer.money < price) throw new Error("금액이 부족합니다.");

  if (actionCard.type === "tradeRequest" || actionCard.type === "directTrade") {
    if (price !== item.marketPrice) {
      actor.negoOffersSent += 1;
      updateCitizenMissionProgress(room, actor, "negotiator_nego");
    }
  }

  const revealedBeforeDeal = actionCard.type === "directTrade";
  if (revealedBeforeDeal) {
    item.revealedToPlayerIds = Array.from(
      new Set([...item.revealedToPlayerIds, owner.id, actor.id]),
    );
  }

  if (["freeGive", "forceBuy", "freeShare"].includes(actionCard.type)) {
    const tempDeal: PendingDeal = {
      id: randomUUID(),
      actionType: actionCard.type,
      requesterId: actualItemReceiver.id,
      ownerId: actualItemOwner.id,
      itemInstanceId,
      askingPrice: price,
      revealedBeforeDeal: false,
      hiddenInfoRevealTurn: room.turnCount + 2,
      choices: {
        [actualItemOwner.id]: "cool",
        [actualItemReceiver.id]: "cool",
      },
      resolved: true,
      currentOffer: price,
      lastOfferPlayerId: actor.id,
      negoCount: 0,
    };

    const settlement = settleAcceptedDeal({
      deal: tempDeal,
      owner: actualItemOwner,
      requester: actualItemReceiver,
    });

    actualItemOwner.money = settlement.ownerMoney;
    actualItemReceiver.money = settlement.requesterMoney;
    actualItemOwner.hand = settlement.ownerHand;
    actualItemReceiver.hand = settlement.requesterHand;
    room.pendingReviews.push(...settlement.pendingReviews);

    actualItemOwner.tradeParticipations += 1;
    actualItemReceiver.tradeParticipations += 1;

    if (actualItemOwner.role === "villain" && item) {
      if (item.isBrick) {
        actualItemOwner.brickSalesCount += 1;
      }
      if (
        (item.condition === "defective" || item.condition === "broken") &&
        price >= item.marketPrice
      ) {
        actualItemOwner.defectSalesCount += 1;
      }
      if (price >= item.marketPrice * 1.1) {
        actualItemOwner.overpriceSalesCount += 1;
      }
    }

    if (actionCard.type === "freeGive") {
      room.logs.push(
        `${actor.name}님이 ${owner.name}님의 물건을 공짜로 강제 수거해갔습니다.`,
      );
    } else if (actionCard.type === "forceBuy") {
      room.logs.push(
        `${actor.name}님이 ${owner.name}님에게 자신의 물건을 ${formatWon(price)}에 강제 판매했습니다.`,
      );
    } else if (actionCard.type === "freeShare") {
      room.logs.push(
        `${actor.name}님이 ${owner.name}님에게 자신의 물건을 공짜로 강제 선물했습니다.`,
      );
    }

    updateCitizenMissionProgress(room, actualItemOwner, "inspector_trade");
    updateCitizenMissionProgress(room, actualItemReceiver, "inspector_trade");
    updateCitizenMissionProgress(room, actualItemOwner, "cool_deal");
    updateCitizenMissionProgress(room, actualItemReceiver, "cool_deal");

    if (room.currentActionCard) room.discardPile.push(room.currentActionCard);
    room.pendingDeal = null;
    room.currentActionCard = null;
    nextTurn(room);
  } else {
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

    updateCitizenMissionProgress(room, owner, "inspector_trade");
    updateCitizenMissionProgress(room, requester, "inspector_trade");
    updateCitizenMissionProgress(room, owner, "cool_deal");
    updateCitizenMissionProgress(room, requester, "cool_deal");

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
  scam?: boolean,
) {
  assertPlaying(room);
  const deal = room.pendingDeal;
  if (!deal) throw new Error("진행 중인 거래가 없습니다.");
  if (actor.id !== deal.ownerId && actor.id !== deal.requesterId) {
    throw new Error("거래 당사자만 선택할 수 있습니다.");
  }
  deal.choices[actor.id] = choice;

  // 빌런이 구매자로서 scam(사기 거래)을 시도한 경우에만 반값 편취 설정
  if (
    choice === "cool" &&
    scam &&
    actor.role === "villain" &&
    actor.id === deal.requesterId
  ) {
    deal.isUnderpay = true;
  }

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
  updateCitizenMissionProgress(room, actor, "negotiator_nego");
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
  updateCitizenMissionProgress(room, actor, "reporter_review");
  if (satisfied) {
    updateCitizenMissionProgress(room, target, "receive_like");
  }

  room.pendingReviews = room.pendingReviews.filter(
    (candidate) => candidate !== review,
  );
}

export function useInspectToken(room: Room, actor: ServerPlayer) {
  assertPlaying(room);
  const deal = room.pendingDeal;
  if (!deal) throw new Error("진행 중인 거래가 없습니다.");
  if (actor.id !== deal.requesterId) {
    throw new Error("구매자만 감정 토큰을 사용할 수 있습니다.");
  }
  if (actor.inspectTokens < 1) {
    throw new Error("보유한 감정 토큰이 부족합니다.");
  }
  if (deal.inspectedResult) {
    throw new Error("이미 감정이 완료된 거래입니다.");
  }

  const owner = findPlayerById(room, deal.ownerId);
  const item = owner.hand.find((i) => i.instanceId === deal.itemInstanceId);
  if (!item) throw new Error("거래 대상 물품을 찾을 수 없습니다.");

  actor.inspectTokens -= 1;
  deal.inspectedResult = item.isBrick ? "scam" : "genuine";

  room.logs.push(
    `${actor.name}님이 [감정 토큰]을 사용하여 제안받은 물품을 정밀 감정했습니다.`,
  );
}

export function useNegoToken(room: Room, actor: ServerPlayer) {
  assertPlaying(room);
  const deal = room.pendingDeal;
  if (!deal) throw new Error("진행 중인 거래가 없습니다.");
  if (actor.id !== deal.requesterId && actor.id !== deal.ownerId) {
    throw new Error("거래 당사자만 네고 토큰을 사용할 수 있습니다.");
  }
  if (actor.negoTokens < 1) {
    throw new Error("보유한 네고 토큰이 부족합니다.");
  }

  const originalPrice = deal.currentOffer !== undefined ? deal.currentOffer : deal.askingPrice;
  const finalPrice = Math.round(originalPrice * 0.5);

  actor.negoTokens -= 1;
  deal.currentOffer = finalPrice;

  deal.choices[deal.ownerId] = "cool";
  deal.choices[deal.requesterId] = "cool";

  room.logs.push(
    `[참교육] ${actor.name}님이 [네고 토큰]을 사용해 가격을 50% 강제 할인한 ${formatWon(finalPrice)}에 거래를 즉시 타결시켰습니다!`,
  );

  resolveDeal(room, deal);
}

