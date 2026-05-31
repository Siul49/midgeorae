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
    if (input.reviewerReputationTokens <= 0) {
      throw new Error("선물할 좋아요 토큰이 없습니다.");
    }

    const reviewerReputationTokens = input.reviewerReputationTokens - 1;
    return {
      reviewerReputationTokens,
      targetReputationTokens: input.targetReputationTokens + 1,
      targetLikes: input.targetLikes + 1,
      targetDislikes: input.targetDislikes,
      targetManner: Math.min(42, Number((input.targetManner + 0.5).toFixed(1))),
      eliminatedPlayer: reviewerReputationTokens === 0 ? "reviewer" : null,
    };
  }

  const targetReputationTokens = Math.max(0, input.targetReputationTokens - 1);
  return {
    reviewerReputationTokens: input.reviewerReputationTokens,
    targetReputationTokens,
    targetLikes: input.targetLikes,
    targetDislikes: input.targetDislikes + 1,
    targetManner: Math.max(30, Number((input.targetManner - 1).toFixed(1))),
    eliminatedPlayer: targetReputationTokens === 0 ? "target" : null,
  };
}
