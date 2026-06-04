import { describe, expect, it } from "vitest";
import type { Room, ServerPlayer } from "../../types/game-server-types";
import { fixPreparation, applyPreparationConfig } from "../preparation-handler";

function mockRoom(players: ServerPlayer[]): Room {
  return {
    code: "TEST",
    mode: "real",
    status: "preparing",
    hostPlayerId: players[0]?.id ?? "",
    players,
    currentTurnPlayerId: null,
    turnCount: 0,
    usedActionCount: 0,
    marketActionLimit: 5,
    logs: [],
    actionDeck: [],
    discardPile: [],
    currentActionCard: null,
    pendingDeal: null,
    pendingReviews: [],
    reports: {},
    result: null,
    version: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function mockPlayer(id: string, role: "citizen" | "villain", items: { isBrick: boolean; instanceId: string }[]): ServerPlayer {
  return {
    id,
    name: id,
    token: `${id}-token`,
    isHost: false,
    isBot: false,
    role,
    money: 1000000,
    reputationTokens: 5,
    manner: 36.5,
    likes: 0,
    dislikes: 0,
    position: 0,
    hand: items.map((item) => ({
      instanceId: item.instanceId,
      id: item.isBrick ? "brick" : "item",
      name: item.isBrick ? "벽돌" : "일반 물건",
      category: "electronics",
      condition: "mint",
      originalPrice: 100000,
      marketPrice: 50000,
      acquiredPrice: null,
      isBrick: item.isBrick,
      imagePath: "",
      revealed: false,
      revealedToPlayerIds: [id],
    })),
    dealCards: { cool: true, cancel: true },
    connectedAt: 0,
    tradeParticipations: 0,
    negoOffersSent: 0,
    reviewsSubmitted: 0,
    inspectTokens: 0,
    negoTokens: 0,
    evidenceTokens: 0,
    brickSalesCount: 0,
    defectSalesCount: 0,
    overpriceSalesCount: 0,
  };
}

describe("preparation-handler", () => {
  it("applies custom condition and asking price correctly", () => {
    const player = mockPlayer("p1", "citizen", [{ isBrick: false, instanceId: "item-1" }]);
    const configs = [
      {
        instanceId: "item-1",
        customCondition: "used" as const,
        askingPrice: 80000,
      },
    ];

    applyPreparationConfig(player, configs);

    expect(player.hand[0]?.customCondition).toBe("used");
    expect(player.hand[0]?.askingPrice).toBe(80000);
  });

  it("forces villain to disguise brick cards", () => {
    const villain = mockPlayer("v1", "villain", [
      { isBrick: true, instanceId: "brick-1" },
    ]);
    const room = mockRoom([villain]);

    // 위장용 fakeItemId 정보가 빠진 경우
    const badConfig = [
      {
        instanceId: "brick-1",
        customCondition: "mint" as const,
        askingPrice: 120000,
      },
    ];

    expect(() => fixPreparation(room, villain, badConfig)).toThrow(
      "소지하고 있는 벽돌 카드를 반드시 다른 제품으로 위장해야 합니다."
    );
  });

  it("allows villain to successfully disguise brick and prepare", () => {
    const villain = mockPlayer("v1", "villain", [
      { isBrick: true, instanceId: "brick-1" },
    ]);
    const room = mockRoom([villain]);
    const goodConfig = [
      {
        instanceId: "brick-1",
        customCondition: "mint" as const,
        askingPrice: 120000,
        fakeItemId: "iphone",
      },
    ];

    fixPreparation(room, villain, goodConfig);

    expect(villain.isPrepared).toBe(true);
    expect(villain.hand[0]?.isBrickDisguised).toBe(true);
    expect(villain.hand[0]?.fakeItemId).toBe("iphone");
  });

  it("transitions room to playing status when all players are prepared", () => {
    const p1 = mockPlayer("p1", "citizen", []);
    const p2 = mockPlayer("p2", "citizen", []);
    const room = mockRoom([p1, p2]);

    fixPreparation(room, p1, []);
    expect(room.status).toBe("preparing");

    fixPreparation(room, p2, []);
    expect(room.status).toBe("playing");
    expect(room.currentTurnPlayerId).toBe("p1");
  });
});
