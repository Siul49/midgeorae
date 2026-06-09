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
      reviewerReputationTokens: 5,
      targetReputationTokens: 5,
      targetManner: 36.5,
      targetLikes: 1,
      targetDislikes: 0,
      eliminatedPlayer: null,
    });
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
      targetManner: 36.5,
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
      targetManner: 30.2,
      targetDislikes: 3,
      eliminatedPlayer: "target",
    });
  });
});
