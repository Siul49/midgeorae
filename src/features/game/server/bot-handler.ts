import { VILLAIN_MISSION_DESCRIPTIONS } from "../rules/game-rules";
import { ALL_ITEMS } from "../data/items";
import type {
  DealCardChoice,
  Room,
  RoomStatus,
  ServerItemCard,
  ServerPlayer,
} from "./types";
import {
  applyPreparationConfig,
  isTradeAction,
  requestTrade,
  terrorReview,
  recycleBrick,
  swapRandomItem,
  nextTurn,
  resolveDeal,
  reviewTrade,
  reportSuspiciousPlayer,
  drawActionCard,
  formatWon,
} from "./room-action-handlers";

export function autoPrepareBot(room: Room, bot: ServerPlayer) {
  const isVillain = bot.role === "villain";
  const genes = bot.genes;
  const deceit = genes?.deceitRatio ?? 0.5;
  const markup = genes?.priceMarkupRatio ?? 1.1;

  const configs = bot.hand.map((item) => {
    let fakeItemId: string | undefined = undefined;
    let customCondition = item.condition ?? ("used" as const);
    let askingPrice = item.originalPrice > 0 ? item.originalPrice : 300000;

    if (item.isBrick) {
      if (isVillain && Math.random() < deceit) {
        const sortedItems = [...ALL_ITEMS].sort((a, b) => b.marketPrice - a.marketPrice);
        fakeItemId = sortedItems[0]?.id;
        customCondition = "mint";
      } else {
        const randomIndex = Math.floor(Math.random() * ALL_ITEMS.length);
        fakeItemId = ALL_ITEMS[randomIndex]?.id;
      }
    } else if (isVillain) {
      if ((item.condition === "defective" || item.condition === "broken") && Math.random() < deceit) {
        customCondition = "mint";
      }
    }

    let priceMultiplier = markup;
    if (isVillain) {
      if (bot.mission === VILLAIN_MISSION_DESCRIPTIONS.VILLAIN_MISSION_OVERPRICE) {
        priceMultiplier = Math.max(1.15, markup);
      } else if (item.isBrick) {
        priceMultiplier = Math.max(1.0, markup);
      }
    }

    const basePrice = fakeItemId
      ? (ALL_ITEMS.find((ai) => ai.id === fakeItemId)?.marketPrice ?? askingPrice)
      : item.marketPrice;

    askingPrice = Math.round((basePrice * priceMultiplier) / 10000) * 10000;

    return {
      instanceId: item.instanceId,
      customCondition,
      askingPrice,
      fakeItemId,
    };
  });

  applyPreparationConfig(bot, configs);
  bot.isPrepared = true;
}

export function botEndTurn(room: Room, actor: ServerPlayer) {
  if (room.currentActionCard) room.discardPile.push(room.currentActionCard);
  room.currentActionCard = null;
  room.pendingDeal = null;
  room.logs.push(`${actor.name}님이 자동으로 턴을 넘겼습니다.`);
  nextTurn(room);
}

export function autoResolveBotDeal(room: Room): boolean {
  const deal = room.pendingDeal;
  if (!deal) return false;

  let changed = false;
  for (const playerId of [deal.ownerId, deal.requesterId]) {
    const player = room.players.find((candidate) => candidate.id === playerId);
    if (!player?.isBot || deal.choices[player.id]) continue;

    const isOwner = player.id === deal.ownerId;
    const opponent = room.players.find((candidate) => candidate.id === (isOwner ? deal.requesterId : deal.ownerId))!;
    
    const owner = isOwner ? player : opponent;
    const item = owner.hand.find((i) => i.instanceId === deal.itemInstanceId);
    if (!item) continue;

    const currentOffer = deal.currentOffer ?? deal.askingPrice;
    const genes = player.genes;
    const acceptThreshold = genes?.negoAcceptThreshold ?? 1.0;
    const negoPropensity = genes?.negoPropensity ?? 0.5;

    let decision: DealCardChoice | "nego" = "cancel";

    if (!isOwner) {
      let maxBudget = item.marketPrice * acceptThreshold;
      if (player.role === "villain") {
        maxBudget = item.marketPrice * 1.3;
      }

      if (currentOffer <= maxBudget) {
        decision = "cool";
      } else if ((deal.negoCount ?? 0) < 2 && Math.random() < negoPropensity) {
        decision = "nego";
      } else {
        decision = "cancel";
      }
    } else {
      let minPrice = item.marketPrice * 0.9;
      
      if (player.role === "villain") {
        if (item.isBrick || item.condition === "defective" || item.condition === "broken") {
          minPrice = item.marketPrice * 0.7;
        }
      }

      if (currentOffer >= minPrice) {
        decision = "cool";
      } else if ((deal.negoCount ?? 0) < 2 && Math.random() < negoPropensity) {
        decision = "nego";
      } else {
        decision = "cancel";
      }
    }

    if (decision === "cool") {
      deal.choices[player.id] = "cool";
      room.logs.push(`${player.name}님이 쿨거래를 선택했습니다.`);
      changed = true;
    } else if (decision === "cancel") {
      deal.choices[player.id] = "cancel";
      room.logs.push(`${player.name}님이 거래를 거절(취소)했습니다.`);
      changed = true;
    } else if (decision === "nego") {
      let negoPrice = currentOffer;
      if (!isOwner) {
        const targetPrice = item.marketPrice * acceptThreshold;
        negoPrice = Math.round(((currentOffer + targetPrice) / 2) / 10000) * 10000;
        if (negoPrice >= currentOffer) {
          negoPrice = Math.round((currentOffer * 0.9) / 10000) * 10000;
        }
      } else {
        const targetPrice = item.marketPrice * 1.1;
        negoPrice = Math.round(((currentOffer + targetPrice) / 2) / 10000) * 10000;
        if (negoPrice <= currentOffer) {
          negoPrice = Math.round((currentOffer * 1.1) / 10000) * 10000;
        }
      }
      
      negoPrice = Math.max(0, negoPrice);
      deal.currentOffer = negoPrice;
      deal.lastOfferPlayerId = player.id;
      deal.negoCount = (deal.negoCount ?? 0) + 1;
      deal.choices = {
        [player.id]: "cool",
      };
      room.logs.push(`${player.name}님이 가격을 ${formatWon(negoPrice)}으로 역제안(흥정)했습니다.`);
      changed = true;
      break;
    }
  }

  if (changed) {
    const ownerChoice = deal.choices[deal.ownerId];
    const requesterChoice = deal.choices[deal.requesterId];
    if (ownerChoice && requesterChoice) {
      resolveDeal(room, deal);
    }
  }
  return changed;
}

export function autoReviewBotTrades(room: Room): boolean {
  if (room.status !== "playing") return false;

  let changed = false;
  for (const review of [...room.pendingReviews]) {
    const reviewer = room.players.find((player) => player.id === review.reviewerId);
    if (!reviewer?.isBot) continue;

    const target = room.players.find((player) => player.id === review.targetPlayerId)!;
    let satisfied = true;
    
    const brickInHand = reviewer.hand.find((item) => item.isBrick);
    const fakeConditionInHand = reviewer.hand.find((item) => {
      if (!item.customCondition || !item.condition) return false;
      const levels: Record<string, number> = { new: 5, good: 4, used: 3, defective: 2, broken: 1 };
      return levels[item.customCondition]! > levels[item.condition]!;
    });

    if (brickInHand || fakeConditionInHand) {
      satisfied = false;
      if (!reviewer.suspectScores) reviewer.suspectScores = {};
      reviewer.suspectScores[target.id] = (reviewer.suspectScores[target.id] ?? 0) + 3;
    }

    if (reviewer.role === "villain" && satisfied) {
      const genes = reviewer.genes;
      const suspicion = genes?.suspicionRatio ?? 0.5;
      const maliceRate = reviewer.job?.id === "reporter" ? 0.7 : 0.4;
      if (Math.random() < maliceRate * suspicion) {
        satisfied = false;
      }
    }

    reviewTrade(room, reviewer, review.targetPlayerId, satisfied);
    changed = true;
    if ((room.status as RoomStatus) === "finished") break;
  }
  return changed;
}

export function autoReportBots(room: Room): boolean {
  if (room.status !== "reporting") return false;

  let changed = false;
  for (const bot of room.players.filter((player) => player.isBot)) {
    if (room.reports[bot.id]) continue;
    
    let targetId = "";
    
    if (bot.role === "villain") {
      const candidates = room.players.filter((p) => p.id !== bot.id);
      candidates.sort((a, b) => a.reputationTokens - b.reputationTokens);
      targetId = candidates[0]?.id ?? "";
    } else {
      if (!bot.suspectScores) bot.suspectScores = {};
      
      const suspectList = Object.entries(bot.suspectScores)
        .filter(([id]) => id !== bot.id)
        .sort((a, b) => b[1] - a[1]);
        
      if (suspectList.length > 0 && suspectList[0]![1] > 0) {
        targetId = suspectList[0]![0];
      } else {
        const suspicion = bot.genes?.suspicionRatio ?? 0.5;
        if (Math.random() < suspicion) {
          const candidates = room.players.filter((p) => p.id !== bot.id);
          candidates.sort((a, b) => a.reputationTokens - b.reputationTokens);
          targetId = candidates[0]?.id ?? "";
        }
      }
    }
    
    if (!targetId) {
      const candidates = room.players.filter((p) => p.id !== bot.id);
      targetId = candidates[Math.floor(Math.random() * candidates.length)]?.id ?? "";
    }

    if (targetId) {
      reportSuspiciousPlayer(room, bot, targetId);
      changed = true;
      if ((room.status as RoomStatus) === "finished") break;
    }
  }
  return changed;
}

export function autoRunCurrentBotTurn(room: Room): boolean {
  if (room.status !== "playing" || room.pendingDeal) return false;
  const actor = room.players.find((player) => player.id === room.currentTurnPlayerId);
  if (!actor?.isBot) return false;

  if (!room.currentActionCard) {
    drawActionCard(room, actor);
    return true;
  }

  const card = room.currentActionCard;
  const genes = actor.genes;
  const job = actor.job;
  const isVillain = actor.role === "villain";
  const jobPriority = genes?.jobPriority ?? 0.6;

  if (isTradeAction(card)) {
    const tradeOptions: { owner: ServerPlayer; item: ServerItemCard; offerPrice: number }[] = [];

    for (const owner of room.players.filter((p) => p.id !== actor.id)) {
      for (const item of owner.hand) {
        let offerPrice = item.marketPrice;
        
        if (job?.id === "negotiator" && !isVillain) {
          if (Math.random() < jobPriority) {
            const markup = genes?.priceMarkupRatio ?? 1.1;
            offerPrice = Math.round((item.marketPrice * (Math.random() > 0.5 ? markup : 0.9)) / 10000) * 10000;
          }
        }
        
        if (isVillain) {
          if (actor.mission === VILLAIN_MISSION_DESCRIPTIONS.VILLAIN_MISSION_OVERPRICE) {
            offerPrice = Math.round((item.marketPrice * 1.15) / 10000) * 10000;
          }
        }

        if (card.type === "freeGive") {
          offerPrice = 0;
        }

        if (actor.money >= offerPrice) {
          tradeOptions.push({ owner, item, offerPrice });
        }
      }
    }

    if (tradeOptions.length === 0) {
      botEndTurn(room, actor);
      return true;
    }

    tradeOptions.sort((a, b) => {
      if (isVillain) {
        return b.owner.money - a.owner.money;
      } else {
        return b.owner.reputationTokens - a.owner.reputationTokens;
      }
    });

    const chosen = tradeOptions[0]!;
    requestTrade(
      room,
      actor,
      chosen.owner.id,
      chosen.item.instanceId,
      chosen.offerPrice,
    );
    return true;
  }

  if (card.type === "badReview") {
    let target: ServerPlayer | undefined;
    
    if (isVillain) {
      target = room.players
        .filter((p) => p.id !== actor.id)
        .sort((a, b) => b.reputationTokens - a.reputationTokens)[0];
    } else {
      if (actor.suspectScores) {
        const suspectList = Object.entries(actor.suspectScores)
          .filter(([id]) => id !== actor.id)
          .sort((a, b) => b[1] - a[1]);
        if (suspectList.length > 0 && suspectList[0]![1] > 0) {
          target = room.players.find((p) => p.id === suspectList[0]![0]);
        }
      }
      if (!target) {
        target = room.players
          .filter((p) => p.id !== actor.id)
          .sort((a, b) => a.reputationTokens - b.reputationTokens)[0];
      }
    }

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
    let target: ServerPlayer | undefined;
    const hasBadItem = actor.hand.some((item) => item.isBrick || item.condition === "defective" || item.condition === "broken");

    if (isVillain && hasBadItem) {
      target = room.players
        .filter((p) => p.id !== actor.id && p.hand.length > 0)
        .sort((a, b) => b.reputationTokens - a.reputationTokens)[0];
    } else {
      target = room.players
        .filter((p) => p.id !== actor.id && p.hand.length > 0)
        .sort((a, b) => a.reputationTokens - b.reputationTokens)[0];
    }

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
