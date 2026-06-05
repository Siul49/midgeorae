import { describe, expect, it } from "vitest";
import {
  calculateAsset,
  calculateReportResult,
  calculateReputationEliminationResult,
  countReports,
} from "../results";
import type { ServerPlayer } from "../../server/types";

function makePlayer(
  id: string,
  money: number,
  itemPrices: number[],
  role: ServerPlayer["role"] = "citizen",
  jobId?: string,
  itemCategories?: string[],
  isBrickFlags?: boolean[],
): ServerPlayer {
  return {
    id,
    name: id,
    token: `${id}-token`,
    isHost: false,
    isBot: false,
    role,
    money,
    reputationTokens: 5,
    manner: 36.5,
    likes: 0,
    dislikes: 0,
    position: 0,
    job: jobId ? { id: jobId, title: jobId, description: jobId, startingMoney: 1000000 } : undefined,
    hand: itemPrices.map((marketPrice, index) => ({
      instanceId: `${id}-item-${index}`,
      id: `${id}-item`,
      name: `${id} 물건`,
      category: (itemCategories?.[index] ?? "electronics") as any,
      condition: "used",
      marketPrice,
      acquiredPrice: null,
      isBrick: isBrickFlags?.[index] ?? false,
      imagePath: "/game-cards/backs/item-back.svg",
      revealed: false,
      revealedToPlayerIds: [id],
    })),
    dealCards: { cool: true, cancel: true },
    connectedAt: 0,
  };
}

describe("game result domain", () => {
  it("counts final reports by target player id", () => {
    expect(
      countReports({
        alice: "villain",
        bob: "villain",
        chris: "alice",
      }),
    ).toEqual({
      villain: 2,
      alice: 1,
    });
  });

  it("calculates player assets from money and item market prices", () => {
    const player = makePlayer("alice", 100_000, [20_000, 30_000]);

    expect(calculateAsset(player)).toBe(150_000);
  });

  it("returns citizen victory when the villain gets the most final reports", () => {
    const players = [
      makePlayer("citizen-a", 100_000, [50_000]),
      makePlayer("citizen-b", 300_000, [10_000]),
      makePlayer("villain", 500_000, [100_000], "villain"),
    ];

    const result = calculateReportResult(
      players,
      {
        "citizen-a": "villain",
        "citizen-b": "villain",
        villain: "citizen-a",
      },
      "villain",
    );

    expect(result).toEqual({
      villainId: "villain",
      villainCaught: true,
      winnerId: "citizen-b",
      winningSide: "citizens",
      reports: {
        villain: 2,
        "citizen-a": 1,
      },
    });
  });

  it("returns villain victory when a citizen loses all reputation", () => {
    const villain = makePlayer("villain", 100_000, [], "villain");
    const eliminatedCitizen = makePlayer("citizen-a", 200_000, [], "citizen");
    const result = calculateReputationEliminationResult(
      [villain, eliminatedCitizen],
      eliminatedCitizen,
    );

    expect(result).toEqual({
      villainId: "villain",
      villainCaught: false,
      winnerId: "villain",
      winningSide: "villain",
      eliminatedPlayerId: "citizen-a",
      reports: {},
    });
  });

  it("returns villain victory when the villain does not get the most final reports", () => {
    const players = [
      makePlayer("citizen-a", 100_000, [50_000]),
      makePlayer("citizen-b", 300_000, [10_000]),
      makePlayer("villain", 500_000, [100_000], "villain"),
    ];

    const result = calculateReportResult(
      players,
      {
        "citizen-a": "citizen-b",
        "citizen-b": "citizen-a",
        villain: "citizen-a",
      },
      "villain",
    );

    expect(result).toEqual({
      villainId: "villain",
      villainCaught: false,
      winnerId: "villain",
      winningSide: "villain",
      reports: {
        "citizen-a": 2,
        "citizen-b": 1,
      },
    });
  });

  describe("citizen victory with job missions", () => {
    it("returns the single citizen who completed their mission as winner", () => {
      // citizen-a is "developer" and has only electronics, succeeds
      const citizenA = makePlayer("citizen-a", 100_000, [50_000], "citizen", "developer", ["electronics"]);
      // citizen-b is "model" but has electronics, fails
      const citizenB = makePlayer("citizen-b", 300_000, [10_000], "citizen", "model", ["electronics"]);
      const villain = makePlayer("villain", 500_000, [100_000], "villain");

      const result = calculateReportResult(
        [citizenA, citizenB, villain],
        {
          "citizen-a": "villain",
          "citizen-b": "villain",
          villain: "citizen-a",
        },
        "villain",
      );

      expect(result.winnerId).toBe("citizen-a");
      expect(result.villainCaught).toBe(true);
    });

    it("returns the citizen with more assets when multiple citizens complete their mission", () => {
      // both completed developer mission
      const citizenA = makePlayer("citizen-a", 100_000, [50_000], "citizen", "developer", ["electronics"]); // total 150k
      const citizenB = makePlayer("citizen-b", 300_000, [50_000], "citizen", "developer", ["electronics"]); // total 350k
      const villain = makePlayer("villain", 500_000, [100_000], "villain");

      const result = calculateReportResult(
        [citizenA, citizenB, villain],
        {
          "citizen-a": "villain",
          "citizen-b": "villain",
          villain: "citizen-a",
        },
        "villain",
      );

      expect(result.winnerId).toBe("citizen-b");
    });

    it("returns the citizen with more assets when no citizens complete their mission", () => {
      // both failed developer mission because they have fashion items
      const citizenA = makePlayer("citizen-a", 100_000, [50_000], "citizen", "developer", ["fashion"]); // total 150k
      const citizenB = makePlayer("citizen-b", 300_000, [10_000], "citizen", "developer", ["fashion"]); // total 310k
      const villain = makePlayer("villain", 500_000, [100_000], "villain");

      const result = calculateReportResult(
        [citizenA, citizenB, villain],
        {
          "citizen-a": "villain",
          "citizen-b": "villain",
          villain: "citizen-a",
        },
        "villain",
      );

      expect(result.winnerId).toBe("citizen-b");
    });
  });
});
