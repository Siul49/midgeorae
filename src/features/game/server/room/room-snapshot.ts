import { ALL_ITEMS } from "../../data/items";
import { calculateAsset, checkJobMission } from "../../domain/results";
import { formatWon } from "./room-db";
import type {
  ItemCardSnapshot,
  PendingDeal,
  PublicPlayer,
  Room,
  RoomSnapshot,
  ServerItemCard,
  ServerPlayer,
} from "../types";

export function getPlayerRanks(room: Room): Record<string, number> {
  const assets = room.players.map((p) => {
    const totalVal = calculateAsset(p, room.status);
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

export function getBrickFakeCategory(instanceId: string): "electronics" | "fashion" | "hobby" | "living" {
  let hash = 0;
  for (let i = 0; i < instanceId.length; i++) {
    hash = instanceId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const categories = ["electronics", "fashion", "hobby", "living"] as const;
  const index = Math.abs(hash) % categories.length;
  return categories[index];
}

export function getFakeItemForBrick(instanceId: string) {
  let hash = 0;
  for (let i = 0; i < instanceId.length; i++) {
    hash = instanceId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % ALL_ITEMS.length;
  const item = ALL_ITEMS[index];

  const ITEM_IMAGE_BY_ID: Record<string, string> = {
    iphone: "/game-cards/cards/item-01-iphone.svg",
    airpods: "/game-cards/cards/item-02-airpods.svg",
    switch: "/game-cards/cards/item-03-switch.svg",
    bicycle: "/game-cards/cards/item-04-bicycle.svg",
    books: "/game-cards/cards/item-05-books.svg",
    sneakers: "/game-cards/cards/item-06-sneakers.svg",
    laptop: "/game-cards/cards/item-07-laptop.svg",
    camera: "/game-cards/cards/item-08-camera.svg",
    tablet: "/game-cards/cards/item-09-tablet.svg",
    keyboard: "/game-cards/cards/item-10-keyboard.svg",
    guitar: "/game-cards/cards/item-11-guitar.svg",
    bag: "/game-cards/cards/item-12-bag.svg",
    watch: "/game-cards/cards/item-13-watch.svg",
    figure: "/game-cards/cards/item-14-figure.svg",
    jacket: "/game-cards/cards/item-15-jacket.svg",
    speaker: "/game-cards/cards/item-16-speaker.svg",
    // Fallback mappings for the remaining 10 items to prevent card back leaks
    sunglasses: "/game-cards/cards/item-13-watch.svg",
    wallet: "/game-cards/cards/item-12-bag.svg",
    boardgame_set: "/game-cards/cards/item-05-books.svg",
    camping_gear: "/game-cards/cards/item-04-bicycle.svg",
    coffee_machine: "/game-cards/cards/item-16-speaker.svg",
    air_purifier: "/game-cards/cards/item-16-speaker.svg",
    chair: "/game-cards/cards/item-14-figure.svg",
    desk_lamp: "/game-cards/cards/item-10-keyboard.svg",
    robot_vacuum: "/game-cards/cards/item-16-speaker.svg",
    toaster: "/game-cards/cards/item-16-speaker.svg",
  };

  return {
    id: item.id,
    name: item.name,
    category: item.category,
    marketPrice: item.marketPrice,
    imagePath: ITEM_IMAGE_BY_ID[item.id] ?? "/game-cards/backs/item-back.svg",
  };
}

export function hiddenItemSnapshot(item: ServerItemCard): ItemCardSnapshot {
  return {
    instanceId: item.instanceId,
    id: "",
    name: "알수 없음",
    category: null,
    condition: null,
    marketPrice: 0,
    acquiredPrice: null,
    isBrick: false,
    imagePath: "/game-cards/backs/item-back.svg",
    revealed: false,
  };
}

export function publicItemSnapshot(item: ServerItemCard): ItemCardSnapshot {
  if (item.isBrick) {
    const fake = getFakeItemForBrick(item.instanceId);
    return {
      instanceId: item.instanceId,
      id: fake.id,
      name: fake.name,
      category: fake.category,
      condition: null,
      marketPrice: fake.marketPrice,
      acquiredPrice: null,
      isBrick: false,
      imagePath: fake.imagePath,
      revealed: false,
    };
  }

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

export function getBrickFakeCondition(instanceId: string): "mint" | "used" | "broken" {
  let hash = 0;
  for (let i = 0; i < instanceId.length; i++) {
    hash = instanceId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const conditions = ["mint", "used", "broken"] as const;
  const index = Math.abs(hash) % conditions.length;
  return conditions[index];
}

export function toItemSnapshot(
  item: ServerItemCard,
  viewer: ServerPlayer,
  room: Room,
  {
    allowPublicInfo = false,
    forceReveal = false,
  }: { allowPublicInfo?: boolean; forceReveal?: boolean } = {},
): ItemCardSnapshot {
  let res: ItemCardSnapshot;

  // 1. If it's a brick and we are in reporting/finished phase: reveal the brick card with value 0 to everyone
  if (item.isBrick && (room.status === "reporting" || room.status === "finished")) {
    const fakeName = item.disguiseName ?? getFakeItemForBrick(item.instanceId).name;
    const fakeCategory = item.disguiseCategory ?? getFakeItemForBrick(item.instanceId).category;
    res = {
      instanceId: item.instanceId,
      id: item.id,
      name: `[벽돌] ${fakeName}`,
      category: fakeCategory,
      condition: "mint",
      marketPrice: 0,
      acquiredPrice: item.acquiredPrice,
      isBrick: true,
      imagePath: "/game-cards/actions/brick.svg",
      revealed: true,
    };
  }
  // 2. During active gameplay, handle brick disguise rules
  else if (item.isBrick && room.status !== "reporting" && room.status !== "finished") {
    const fakeId = item.disguiseId ?? getFakeItemForBrick(item.instanceId).id;
    const fakeName = item.disguiseName ?? getFakeItemForBrick(item.instanceId).name;
    const fakeCategory = item.disguiseCategory ?? getFakeItemForBrick(item.instanceId).category;
    const fakeMarketPrice = item.disguiseMarketPrice ?? getFakeItemForBrick(item.instanceId).marketPrice;
    const fakeImagePath = item.disguiseImagePath ?? getFakeItemForBrick(item.instanceId).imagePath;
    const fakeCond = item.disguiseCondition ?? getBrickFakeCondition(item.instanceId);

    if (viewer.role === "villain" || viewer.job?.id === "brick-collector") {
      // Villain or Brick Collector sees it as "벽돌" (no fake name, no category, no market price)
      res = {
        instanceId: item.instanceId,
        id: item.id,
        name: `벽돌`,
        category: null,
        condition: null,
        marketPrice: 0,
        acquiredPrice: item.acquiredPrice,
        isBrick: true,
        imagePath: "/game-cards/actions/brick.svg",
        revealed: true,
        disguiseId: fakeId,
        disguiseName: fakeName,
        disguiseCategory: fakeCategory,
        disguiseCondition: fakeCond,
        disguiseMarketPrice: fakeMarketPrice,
        disguiseImagePath: fakeImagePath,
      };
    } else {
      // Citizen (owner or buyer or public) sees it as the disguised fake item
      res = {
        instanceId: item.instanceId,
        id: fakeId,
        name: fakeName,
        category: fakeCategory,
        condition: fakeCond,
        marketPrice: fakeMarketPrice,
        acquiredPrice: item.acquiredPrice,
        isBrick: false,
        imagePath: fakeImagePath,
        revealed: true,
      };
    }
  }
  // 3. Normal items (non-brick) follow normal reveal / info rules
  else {
    const actualAllowPublicInfo = allowPublicInfo || Boolean(room.revealAllItems);

    const revealed =
      forceReveal ||
      item.revealed ||
      item.revealedToPlayerIds.includes(viewer.id) ||
      viewer.hand.some((c) => c.instanceId === item.instanceId) ||
      room.status === "reporting" ||
      room.status === "finished" ||
      Boolean(room.revealAllItems);

    if (!revealed) {
      const snapshot = actualAllowPublicInfo ? publicItemSnapshot(item) : hiddenItemSnapshot(item);
      const showCategory =
        actualAllowPublicInfo ||
        forceReveal ||
        Boolean(
          viewer &&
            viewer.id === room.currentTurnPlayerId &&
            room.currentActionCard &&
            ["directTrade", "tradeRequest", "freeGive", "saleRequest"].includes(room.currentActionCard.type)
        );
      const category = item.category;

      res = {
        ...snapshot,
        category: showCategory ? category : null,
      };
    } else {
      res = {
        instanceId: item.instanceId,
        id: item.id,
        name: item.name,
        category: item.category,
        condition: item.condition,
        marketPrice: item.marketPrice,
        acquiredPrice: item.acquiredPrice,
        isBrick: false,
        imagePath: item.imagePath,
        revealed,
      };
    }
  }

  // 직거래할 때만 거래 당사자가 물건 상태를 볼 수 있게 하고, 제3자나 그냥 거래일 때는 물건 상태를 못보게 하자
  const isOwner = viewer.hand.some((c) => c.instanceId === item.instanceId);
  const isFinished = room.status === "reporting" || room.status === "finished";
  const isDirectTradeParty = 
    Boolean(room.pendingDeal && 
    room.pendingDeal.itemInstanceId === item.instanceId && 
    room.pendingDeal.actionType === "directTrade" &&
    (viewer.id === room.pendingDeal.ownerId || viewer.id === room.pendingDeal.requesterId));

  const canSeeCondition = isOwner || isFinished || isDirectTradeParty;

  if (!canSeeCondition) {
    res.condition = null;
  }

  return res;
}

export function toPublicPlayer(
  player: ServerPlayer,
  viewer: ServerPlayer | null,
  room: Room,
  ranks?: Record<string, number>,
): PublicPlayer {
  const playerRanks = ranks || getPlayerRanks(room);
  const publicPlayer: PublicPlayer = {
    id: player.id,
    name: player.name,
    isHost: player.isHost,
    isBot: player.isBot,
    reputationTokens: player.reputationTokens,
    likes: player.likes,
    dislikes: player.dislikes,
    position: player.position,
    itemCount: player.hand.length,
    publicItems: viewer
      ? player.hand.map((item) => toItemSnapshot(item, viewer, room))
      : [],
    assetRank: playerRanks[player.id],
  };

  if (room.status === "finished" || room.status === "reporting") {
    publicPlayer.role = player.role;
    publicPlayer.job = player.job;
    publicPlayer.money = player.money;
    publicPlayer.totalAssets = calculateAsset(player, room.status);
    publicPlayer.isMissionComplete = player.role === "villain"
      ? (room.villainScamCount ?? 0) >= 2
      : checkJobMission(player, room.status);
  }

  return publicPlayer;
}

export function visiblePendingDeal(
  room: Room,
  viewer: ServerPlayer | null,
): PendingDeal | null {
  if (!room.pendingDeal) return null;
  const deal = room.pendingDeal;
  
  const owner = room.players.find((p) => p.id === deal.ownerId);
  const isBrickDeal = owner?.hand.some((item) => item.instanceId === deal.itemInstanceId && item.isBrick);

  let askingPrice = deal.askingPrice;
  if (viewer?.role === "villain" && isBrickDeal) {
    askingPrice = 0; // Hide price from villain
  }

  // 이제 제3자에게도 choices와 askingPrice, itemInstanceId를 숨기지 않고 그대로 반환합니다.
  return {
    ...deal,
    askingPrice,
    choices: { ...deal.choices },
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

  // 제3자도 가리지 않고 toItemSnapshot을 통해 보이게 합니다. (벽돌은 시민에게 fake item으로 보임)
  return toItemSnapshot(item, viewer, room);
}

export function formatLogForViewer(log: string, viewerRole: string | undefined): string {
  const marker = "__BRICK_DEAL_INFO__:";
  const index = log.indexOf(marker);
  if (index === -1) return log;

  const baseLog = log.substring(0, index).trim();
  const metaPart = log.substring(index + marker.length);
  const parts = metaPart.split(":");
  const instanceId = parts[0] || "";
  const price = Number(parts[1]) || 0;
  const fakeItemName = parts[2] || "";

  const isBrick = instanceId.includes("brick");

  if (!isBrick) {
    return baseLog;
  }

  if (viewerRole === "villain") {
    let formatted = baseLog;
    if (fakeItemName) {
      formatted = formatted.replaceAll(`[${fakeItemName}]`, `[벽돌]`);
      formatted = formatted.replaceAll(fakeItemName, `벽돌`);
    }

    const priceStr = formatWon(price);
    formatted = formatted.replaceAll(`무료나눔(0원) 신청했습니다.`, `판매 신청했습니다. (가격 미공개)`);
    formatted = formatted.replaceAll(`무료나눔(0원)`, `가격 미공개`);
    formatted = formatted.replaceAll(`을 ${priceStr}에`, "을 가격 미공개로");
    formatted = formatted.replaceAll(`${priceStr}에`, "가격 미공개로");
    formatted = formatted.replaceAll(`가격을 ${priceStr}으로 제시하고`, "가격을 제시하고");
    formatted = formatted.replaceAll(priceStr, "미공개");

    return formatted;
  } else {
    return baseLog;
  }
}

export function toSnapshot(room: Room, viewer: ServerPlayer | null): RoomSnapshot {
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
    logs: room.logs
      .filter((log) => {
        if (room.status !== "finished" && (log.includes("[사기 성공]") || log.includes("빌런이") || log.includes("빌런의"))) {
          return viewer?.role === "villain";
        }
        return true;
      })
      .slice(-20)
      .map((log) => formatLogForViewer(log, viewer?.role)),
    reportsCast: Object.keys(room.reports).length,
    reports: room.reports || {},
    currentActionAcks: room.currentActionAcks || [],
    result: room.result,
    version: room.version,
    revealAllItems: room.revealAllItems,
    villainScamCount: room.villainScamCount,
    showBrickDisguise: room.showBrickDisguise,
    startingPlayerId: room.startingPlayerId,
  };
}
