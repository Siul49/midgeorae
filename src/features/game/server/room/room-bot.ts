import { MAX_PLAYERS } from "../../rules/game-rules";
import type {
  Room,
  RoomStatus,
  ServerItemCard,
  ServerPlayer,
} from "../types";
import { createPlayer, formatWon } from "./room-db";
import {
  nextTurn,
  drawActionCard,
  isTradeAction,
  requestTrade,
  resolveDeal,
  reviewTrade,
  reportSuspiciousPlayer,
  terrorReview,
  requestDonation,
  repairItem,
  swapRandomItem,
  getDisguisedItemName,
} from "./room-actions";

export function addBot(room: Room, actor: ServerPlayer) {
  if (!actor.isHost) throw new Error("호스트만 봇을 추가할 수 있습니다.");
  if (room.mode !== "botTest") throw new Error("봇 테스트 방에서만 봇을 추가할 수 있습니다.");
  if (room.status !== "waiting") throw new Error("대기 중인 방에서만 봇을 추가할 수 있습니다.");
  if (room.players.length >= MAX_PLAYERS) throw new Error("방이 가득 찼습니다.");

  const botNumber = room.players.filter((player) => player.isBot).length + 1;
  const bot = createPlayer(`자동봇 ${botNumber}`, false, `자동봇 ${botNumber}`, true);
  room.players.push(bot);
  room.logs.push(`${bot.name}님이 테스트 봇으로 중고장터에 입장했습니다. 👋`);
}

export function chooseBotTarget(
  room: Room,
  actor: ServerPlayer,
  predicate: (player: ServerPlayer) => boolean = () => true,
) {
  const candidates = room.players.filter(
    (player) => player.id !== actor.id && predicate(player),
  );
  return candidates.find((player) => player.isBot) ?? candidates[0];
}

export function botEndTurn(room: Room, actor: ServerPlayer) {
  if (room.currentActionCard) room.discardPile.push(room.currentActionCard);
  room.currentActionCard = null;
  room.pendingDeal = null;
  room.logs.push(`${actor.name}님이 자동으로 턴을 넘겼어요. ➡️`);
  nextTurn(room);
}

export function autoResolveBotDeal(room: Room) {
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
      const itemName = item ? getDisguisedItemName(item) : "물건";
      const infoSuffix = item && item.isBrick
        ? ` __BRICK_DEAL_INFO__:${item.instanceId}:${price}:${itemName}`
        : "";
      room.logs.push(
        `${owner.name}님이 판매할 물품 [${itemName}]의 가격을 ${formatWon(price)}으로 제시하고 수락했습니다.${infoSuffix}`,
      );
      changed = true;
    }
  }

  for (const playerId of [deal.ownerId, deal.requesterId]) {
    const player = room.players.find((candidate) => candidate.id === playerId);
    if (player?.isBot && !deal.choices[player.id]) {
      deal.choices[player.id] = "cool";
      room.logs.push(`${player.name}님이 자동으로 쿨거래를 선택했어요! ⚡`);
      changed = true;
    }
  }

  if (changed) resolveDeal(room, deal);
  return changed;
}

export function autoReviewBotTrades(room: Room) {
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

export function autoReportBots(room: Room) {
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

export function autoRunCurrentBotTurn(room: Room) {
  if (room.status !== "playing" || room.pendingDeal || room.pendingReviews.length > 0) return false;
  const actor = room.players.find((player) => player.id === room.currentTurnPlayerId);
  if (!actor?.isBot) return false;

  if (!room.currentActionCard) {
    drawActionCard(room, actor);
    return true;
  }

  const humanPlayers = room.players.filter((p) => !p.isBot);
  const allHumanAcks = humanPlayers.every((p) => (room.currentActionAcks || []).includes(p.id));
  if (!allHumanAcks) {
    return false;
  }

  const card = room.currentActionCard;
  if (isTradeAction(card)) {
    const isSale = card.type === "saleRequest" || card.type === "freeGive";
    const tradeOption = room.players
      .filter((player) => player.id !== actor.id && (isSale || player.hand.length > 0))
      .sort((a, b) => {
        if (room.mode === "botTest" && process.env.NODE_ENV !== "test") {
          return Number(a.isBot) - Number(b.isBot);
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

  if (card.type === "donation") {
    const target = chooseBotTarget(
      room,
      actor,
      (player) => player.hand.length > 0,
    );
    if (target) {
      requestDonation(room, actor, target.id);
    } else {
      botEndTurn(room, actor);
    }
    return true;
  }

  if (card.type === "repair") {
    const repairTarget = actor.hand.find((item) => {
      if (item.isBrick) {
        return item.disguiseCondition !== "mint";
      }
      return item.condition !== "mint";
    }) || actor.hand[0];

    if (repairTarget) {
      repairItem(room, actor, repairTarget.instanceId);
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

export function autoPlayBots(room: Room) {
  if (room.mode !== "botTest") return false;

  let changed = false;
  for (let loop = 0; loop < 10; loop += 1) {
    const step =
      autoResolveBotDeal(room) ||
      autoReviewBotTrades(room) ||
      autoReportBots(room) ||
      autoRunCurrentBotTurn(room);
    if (!step) break;
    changed = true;
  }
  return changed;
}
