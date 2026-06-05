import { describe, expect, it } from "vitest";
import { settleAcceptedDeal } from "../trade";
import type { PendingDeal, ServerPlayer } from "../../server/types";

function makePlayer(
  id: string,
  money: number,
  itemPrices: number[] = [],
): ServerPlayer {
  return {
    id,
    name: id,
    token: `${id}-token`,
    isHost: false,
    isBot: false,
    money,
    reputationTokens: 5,
    manner: 36.5,
    likes: 0,
    dislikes: 0,
    position: 0,
    hand: itemPrices.map((marketPrice, index) => ({
      instanceId: `${id}-item-${index}`,
      id: `${id}-item`,
      name: `${id} 물건`,
      category: "electronics",
      condition: "used",
      marketPrice,
      acquiredPrice: null,
      isBrick: false,
      imagePath: "/game-cards/backs/item-back.svg",
      revealed: false,
      revealedToPlayerIds: [id],
    })),
    dealCards: { cool: true, cancel: true },
    connectedAt: 0,
  };
}

function makeDeal(overrides: Partial<PendingDeal> = {}): PendingDeal {
  return {
    id: "deal-1",
    actionType: "tradeRequest",
    requesterId: "requester",
    ownerId: "owner",
    itemInstanceId: "owner-item-0",
    askingPrice: 120_000,
    revealedBeforeDeal: false,
    choices: {
      owner: "cool",
      requester: "cool",
    },
    resolved: false,
    ...overrides,
  };
}

describe("game trade domain", () => {
  it("settles an accepted deal without mutating input players", () => {
    const owner = makePlayer("owner", 300_000, [80_000]);
    const requester = makePlayer("requester", 500_000, []);
    const deal = makeDeal();

    const settlement = settleAcceptedDeal({ deal, owner, requester });

    expect(settlement.ownerMoney).toBe(420_000);
    expect(settlement.requesterMoney).toBe(380_000);
    expect(settlement.ownerHand).toHaveLength(0);
    expect(settlement.requesterHand).toHaveLength(1);
    expect(settlement.requesterHand[0]).toMatchObject({
      instanceId: "owner-item-0",
      acquiredPrice: 120_000,
      revealed: false,
      revealedToPlayerIds: [],
    });
    expect(settlement.pendingReviews).toEqual([
      {
        tradeId: "deal-1",
        reviewerId: "owner",
        targetPlayerId: "requester",
      },
      {
        tradeId: "deal-1",
        reviewerId: "requester",
        targetPlayerId: "owner",
      },
    ]);
    expect(owner.money).toBe(300_000);
    expect(owner.hand).toHaveLength(1);
    expect(requester.money).toBe(500_000);
    expect(requester.hand).toHaveLength(0);
  });

  it("keeps direct trade items revealed for both trading players", () => {
    const owner = makePlayer("owner", 300_000, [80_000]);
    const requester = makePlayer("requester", 500_000, []);
    const deal = makeDeal({ actionType: "directTrade", revealedBeforeDeal: true });

    const settlement = settleAcceptedDeal({ deal, owner, requester });

    expect(settlement.requesterHand[0]).toMatchObject({
      instanceId: "owner-item-0",
      acquiredPrice: 120_000,
      revealed: false,
      revealedToPlayerIds: ["requester"],
    });
  });

  it("rejects settlement when the owner no longer has the item", () => {
    expect(() =>
      settleAcceptedDeal({
        deal: makeDeal({ itemInstanceId: "missing-item" }),
        owner: makePlayer("owner", 300_000, [80_000]),
        requester: makePlayer("requester", 500_000, []),
      }),
    ).toThrow("거래 물건을 찾을 수 없습니다.");
  });

  it("rejects settlement when the requester cannot pay the asking price", () => {
    expect(() =>
      settleAcceptedDeal({
        deal: makeDeal({ askingPrice: 600_000 }),
        owner: makePlayer("owner", 300_000, [80_000]),
        requester: makePlayer("requester", 500_000, []),
      }),
    ).toThrow("신청자의 금액이 부족합니다.");
  });
});
