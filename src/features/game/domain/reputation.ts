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
    return {
      reviewerReputationTokens: input.reviewerReputationTokens,
      targetReputationTokens: input.targetReputationTokens + 1,
      targetLikes: input.targetLikes + 1,
      targetDislikes: input.targetDislikes,
      targetManner: Math.min(42, Number((input.targetManner + 0.5).toFixed(1))),
      eliminatedPlayer: null,
    };
  }

  const targetReputationTokens = Math.max(0, input.targetReputationTokens - 1);
  return {
    reviewerReputationTokens: input.reviewerReputationTokens,
    targetReputationTokens,
    targetLikes: input.targetLikes,
    targetDislikes: input.targetDislikes + 1,
    targetManner: Math.max(30, Number((input.targetManner - 0.5).toFixed(1))),
    eliminatedPlayer: null,
  };
}
