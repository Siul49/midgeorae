import type {
  ItemCardSnapshot,
  PendingDeal,
  PublicPlayer,
  Room,
  RoomSnapshot,
  ServerItemCard,
  ServerPlayer,
} from "../types/game-server-types";

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

  const base: PendingDeal = {
    ...deal,
    choices: visibleChoices,
  };

  // 구매자 본인만 감정 결과를 조회할 수 있게 함
  if (viewer && deal.requesterId === viewer.id) {
    base.inspectedResult = deal.inspectedResult;
  } else {
    delete base.inspectedResult;
  }

  if (
    !viewer ||
    deal.ownerId === viewer.id ||
    deal.requesterId === viewer.id
  ) {
    return base;
  }

  return {
    ...base,
    choices: {},
    itemInstanceId: "",
    inspectedResult: undefined,
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

  // 구매자 본인이 감정 토큰을 써서 조회를 마쳤다면 실제 벽돌 여부와 공개 연출을 적용함
  if (viewer.id === deal.requesterId && deal.inspectedResult) {
    return {
      ...toItemSnapshot(item, viewer, room),
      isBrick: item.isBrick,
      revealed: true,
    };
  }

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
          manner: viewer.manner,
          hand: viewer.hand.map((item) =>
            toItemSnapshot(item, viewer, room, {
              allowTimedReveal: true,
            }),
          ),
          dealCards: viewer.dealCards,
          inspectTokens: viewer.inspectTokens,
          negoTokens: viewer.negoTokens,
          evidenceTokens: viewer.evidenceTokens,
          citizenMissions: viewer.citizenMissions,
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
