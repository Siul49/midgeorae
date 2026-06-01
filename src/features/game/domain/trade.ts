import type { PendingDeal, PendingReview, ServerItemCard, ServerPlayer } from "../server/types";

export interface AcceptedDealSettlement {
  ownerMoney: number;
  requesterMoney: number;
  ownerHand: ServerItemCard[];
  requesterHand: ServerItemCard[];
  pendingReviews: PendingReview[];
}

export function settleAcceptedDeal({
  deal,
  owner,
  requester,
}: {
  deal: PendingDeal;
  owner: ServerPlayer;
  requester: ServerPlayer;
}): AcceptedDealSettlement {
  const item = owner.hand.find(
    (owned) => owned.instanceId === deal.itemInstanceId,
  );
  if (!item) throw new Error("거래 물건을 찾을 수 없습니다.");
  if (requester.money < deal.askingPrice) {
    throw new Error("신청자의 금액이 부족합니다.");
  }

  const transferredItem: ServerItemCard = {
    ...item,
    acquiredPrice: deal.askingPrice,
    revealed: true,
    revealedToPlayerIds: Array.from(
      new Set([...item.revealedToPlayerIds, owner.id, requester.id]),
    ),
  };

  return {
    ownerMoney: owner.money + deal.askingPrice,
    requesterMoney: requester.money - deal.askingPrice,
    ownerHand: owner.hand.filter(
      (owned) => owned.instanceId !== deal.itemInstanceId,
    ),
    requesterHand: [...requester.hand, transferredItem],
    pendingReviews: [
      {
        tradeId: deal.id,
        reviewerId: owner.id,
        targetPlayerId: requester.id,
      },
      {
        tradeId: deal.id,
        reviewerId: requester.id,
        targetPlayerId: owner.id,
      },
    ],
  };
}
