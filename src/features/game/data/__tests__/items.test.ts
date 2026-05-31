import { describe, expect, it } from "vitest";
import { ALL_ITEMS } from "../items";

describe("ALL_ITEMS", () => {
  it("contains 24 balanced trade items with the agreed condition spread", () => {
    expect(ALL_ITEMS).toHaveLength(24);
    expect(new Set(ALL_ITEMS.map((item) => item.id)).size).toBe(24);

    const categoryCounts = countBy(ALL_ITEMS.map((item) => item.category));
    expect(categoryCounts).toEqual({
      electronics: 6,
      fashion: 6,
      hobby: 6,
      living: 6,
    });

    const conditionCounts = countBy(ALL_ITEMS.map((item) => item.condition));
    expect(conditionCounts).toEqual({
      mint: 6,
      used: 12,
      defective: 4,
      broken: 2,
    });

    for (const item of ALL_ITEMS) {
      expect(item.marketPrice).toBeGreaterThan(0);
    }
  });
});

function countBy(values: string[]) {
  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}
