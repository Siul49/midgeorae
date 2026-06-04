import { describe, expect, it } from "vitest";
import { dealItemHands, makeItemDeck } from "../cards";

describe("server item cards", () => {
  it("builds a first deal deck with enough unique normal items for five players", () => {
    const deck = makeItemDeck();
    const normalCards = deck.filter((card) => !card.isBrick);
    const brickCards = deck.filter((card) => card.isBrick);

    expect(normalCards).toHaveLength(24);
    expect(brickCards).toHaveLength(4);
    expect(new Set(normalCards.map((card) => card.id)).size).toBe(24);
  });

  it("deals players without repeating normal item ids in the first deal", () => {
    const hands = dealItemHands(["p1", "p2", "p3", "p4"], null); // 4명에게 20장 지급 (전체 24장 중 소요되어 덱 리필 없음)
    const cards = Object.values(hands).flat();
    const normalCards = cards.filter((card) => !card.isBrick);

    expect(cards).toHaveLength(20);
    expect(new Set(cards.map((card) => card.instanceId)).size).toBe(20);
    expect(new Set(normalCards.map((card) => card.id)).size).toBe(
      normalCards.length,
    );
  });
});
