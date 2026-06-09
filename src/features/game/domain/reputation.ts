import {
  MAX_MANNER,
  MIN_MANNER,
  MANNER_SATISFIED_INCREMENT,
  MANNER_UNSATISFIED_DECREMENT,
  MAX_REPUTATION,
} from "../rules/game-rules";

export interface TradeReviewOutcomeInput {
  reviewerReputationTokens: number;
  targetReputationTokens: number;
  targetManner: number;
  targetLikes: number;
  targetDislikes: number;
  satisfied: boolean;
}

export interface TradeReviewOutcome {
  reviewerReputationTokens: number;
  targetReputationTokens: number;
  targetManner: number;
  targetLikes: number;
  targetDislikes: number;
  eliminatedPlayer: "reviewer" | "target" | null;
}

export function calculateTradeReviewOutcome(
  input: TradeReviewOutcomeInput,
): TradeReviewOutcome {
  if (input.satisfied) {
    const reviewerReputationTokens = input.reviewerReputationTokens;
    const targetReputationTokens = Math.min(MAX_REPUTATION, input.targetReputationTokens + 1);
    return {
      reviewerReputationTokens,
      targetReputationTokens,
      targetLikes: input.targetLikes + 1,
      targetDislikes: input.targetDislikes,
      targetManner: input.targetManner,
      eliminatedPlayer: null,
    };
  }

  const targetReputationTokens = Math.max(0, input.targetReputationTokens - 1);
  return {
    reviewerReputationTokens: input.reviewerReputationTokens,
    targetReputationTokens,
    targetLikes: input.targetLikes,
    targetDislikes: input.targetDislikes + 1,
    targetManner: input.targetManner,
    eliminatedPlayer: targetReputationTokens === 0 ? "target" : null,
  };
}
