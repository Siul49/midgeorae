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
      marketPrice,
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
    actionType: "sell",
    sellerId: "seller",
    buyerId: "buyer",
    itemInstanceId: "seller-item-0",
    askingPrice: 120_000,
    revealedBeforeDeal: false,
    choices: {
      seller: "cool",
      buyer: "cool",
    },
    resolved: false,
    ...overrides,
  };
}

describe("game trade domain", () => {
  it("settles an accepted deal without mutating input players", () => {
    const seller = makePlayer("seller", 300_000, [80_000]);
    const buyer = makePlayer("buyer", 500_000, []);
    const deal = makeDeal();

    const settlement = settleAcceptedDeal({ deal, seller, buyer });

    expect(settlement.sellerMoney).toBe(420_000);
    expect(settlement.buyerMoney).toBe(380_000);
    expect(settlement.sellerHand).toHaveLength(0);
    expect(settlement.buyerHand).toHaveLength(1);
    expect(settlement.buyerHand[0]).toMatchObject({
      instanceId: "seller-item-0",
      revealed: true,
      revealedToPlayerIds: ["seller", "buyer"],
    });
    expect(settlement.pendingReviews).toEqual([
      {
        tradeId: "deal-1",
        reviewerId: "seller",
        targetPlayerId: "buyer",
      },
      {
        tradeId: "deal-1",
        reviewerId: "buyer",
        targetPlayerId: "seller",
      },
    ]);
    expect(seller.money).toBe(300_000);
    expect(seller.hand).toHaveLength(1);
    expect(buyer.money).toBe(500_000);
    expect(buyer.hand).toHaveLength(0);
  });

  it("rejects settlement when the seller no longer has the item", () => {
    expect(() =>
      settleAcceptedDeal({
        deal: makeDeal({ itemInstanceId: "missing-item" }),
        seller: makePlayer("seller", 300_000, [80_000]),
        buyer: makePlayer("buyer", 500_000, []),
      }),
    ).toThrow("거래 물건을 찾을 수 없습니다.");
  });

  it("rejects settlement when the buyer cannot pay the asking price", () => {
    expect(() =>
      settleAcceptedDeal({
        deal: makeDeal({ askingPrice: 600_000 }),
        seller: makePlayer("seller", 300_000, [80_000]),
        buyer: makePlayer("buyer", 500_000, []),
      }),
    ).toThrow("구매자의 금액이 부족합니다.");
  });
});
