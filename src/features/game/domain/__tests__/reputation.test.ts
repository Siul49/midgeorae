import { describe, expect, it } from "vitest";
import { calculateTradeReviewOutcome } from "../reputation";

describe("game reputation domain", () => {
  it("moves one reputation token from reviewer to target on a satisfied review", () => {
    expect(
      calculateTradeReviewOutcome({
        reviewerReputationTokens: 5,
        targetReputationTokens: 5,
        targetManner: 36.5,
        targetLikes: 0,
        targetDislikes: 0,
        satisfied: true,
      }),
    ).toEqual({
      reviewerReputationTokens: 4,
      targetReputationTokens: 6,
      targetManner: 37,
      targetLikes: 1,
      targetDislikes: 0,
      eliminatedPlayer: null,
    });
  });

  it("eliminates the reviewer when they spend their last reputation token", () => {
    expect(
      calculateTradeReviewOutcome({
        reviewerReputationTokens: 1,
        targetReputationTokens: 5,
        targetManner: 41.8,
        targetLikes: 0,
        targetDislikes: 0,
        satisfied: true,
      }).eliminatedPlayer,
    ).toBe("reviewer");
  });

  it("destroys one target reputation token on an unsatisfied review", () => {
    expect(
      calculateTradeReviewOutcome({
        reviewerReputationTokens: 5,
        targetReputationTokens: 5,
        targetManner: 36.5,
        targetLikes: 0,
        targetDislikes: 0,
        satisfied: false,
      }),
    ).toEqual({
      reviewerReputationTokens: 5,
      targetReputationTokens: 4,
      targetManner: 35.5,
      targetLikes: 0,
      targetDislikes: 1,
      eliminatedPlayer: null,
    });
  });

  it("eliminates the target when an unsatisfied review removes their last token", () => {
    expect(
      calculateTradeReviewOutcome({
        reviewerReputationTokens: 5,
        targetReputationTokens: 1,
        targetManner: 30.2,
        targetLikes: 0,
        targetDislikes: 2,
        satisfied: false,
      }),
    ).toMatchObject({
      targetReputationTokens: 0,
      targetManner: 30,
      targetDislikes: 3,
      eliminatedPlayer: "target",
    });
  });
});
