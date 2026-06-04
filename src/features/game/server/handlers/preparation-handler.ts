import { ALL_ITEMS } from "../../data/items";
import { ITEM_IMAGE_BY_ID } from "../cards";
import type { ItemCondition } from "../../types/game-core-types";
import type { Room, ServerPlayer } from "../types/game-server-types";
import { updateCitizenMissionProgress } from "../../domain/jobs";

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

  if (player.role === "villain") {
    const bricks = player.hand.filter((item) => item.isBrick);
    for (const brick of bricks) {
      const config = itemsConfig.find((c) => c.instanceId === brick.instanceId);
      if (!config || !config.fakeItemId) {
        throw new Error("소지하고 있는 벽돌 카드를 반드시 다른 제품으로 위장해야 합니다.");
      }
    }
  }

  applyPreparationConfig(player, itemsConfig);
  player.isPrepared = true;

  if (player.role === "citizen") {
    const hasDiscounted = itemsConfig.some((config) => {
      const item = player.hand.find((i) => i.instanceId === config.instanceId);
      if (!item) return false;
      return config.askingPrice <= item.marketPrice * 0.9;
    });
    if (hasDiscounted) {
      updateCitizenMissionProgress(room, player, "discount_register");
    }
  }

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
