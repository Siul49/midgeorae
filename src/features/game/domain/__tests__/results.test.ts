import { describe, expect, it } from "vitest";
import {
  calculateAsset,
  calculateReputationEliminationResult,
  calculateVoteResult,
  countVotes,
} from "../results";
import type { ServerPlayer } from "../../server/types";

function makePlayer(
  id: string,
  money: number,
  itemPrices: number[],
  role: ServerPlayer["role"] = "citizen",
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

describe("game result domain", () => {
  it("counts votes by target player id", () => {
    expect(
      countVotes({
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

  it("returns citizen victory when the villain gets the most votes", () => {
    const players = [
      makePlayer("citizen-a", 100_000, [50_000]),
      makePlayer("citizen-b", 300_000, [10_000]),
      makePlayer("villain", 500_000, [100_000], "villain"),
    ];

    const result = calculateVoteResult(
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
      votes: {
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
      votes: {},
    });
  });
});
