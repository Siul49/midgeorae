import { makeActionDeck } from "../cards";
import {
  assertCurrentTurn,
  assertPlaying,
  findPlayerById,
  adjustReputation,
  nextTurn,
} from "./common-utils";
import type { ActionCardSnapshot, PendingDeal, Room, ServerPlayer } from "../types/game-server-types";

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
    card &&
      [
        "tradeRequest",
        "freeGive",
        "directTrade",
        "forceBuy",
        "freeShare",
      ].includes(card.type),
  );
}

export function assertTradeAction(
  card: ActionCardSnapshot | null,
): asserts card is ActionCardSnapshot & { type: PendingDeal["actionType"] } {
  if (!isTradeAction(card)) {
    throw new Error("거래 행동카드에서만 거래를 신청할 수 있습니다.");
  }
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
  const actorItem = { ...actor.hand[actorItemIndex]!, acquiredPrice: 0 };
  const targetItem = { ...target.hand[targetItemIndex]!, acquiredPrice: 0 };
  actor.hand[actorItemIndex] = targetItem;
  target.hand[targetItemIndex] = actorItem;
  room.logs.push(`${actor.name}님과 ${target.name}님이 물건 카드를 맞교환했습니다.`);
  room.currentActionCard = null;
  nextTurn(room);
}
