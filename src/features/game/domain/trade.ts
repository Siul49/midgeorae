import type { PendingDeal, PendingReview, ServerItemCard, ServerPlayer } from "../server/types";

export interface AcceptedDealSettlement {
  sellerMoney: number;
  buyerMoney: number;
  sellerHand: ServerItemCard[];
  buyerHand: ServerItemCard[];
  pendingReviews: PendingReview[];
}

export function settleAcceptedDeal({
  deal,
  seller,
  buyer,
}: {
  deal: PendingDeal;
  seller: ServerPlayer;
  buyer: ServerPlayer;
}): AcceptedDealSettlement {
  const item = seller.hand.find(
    (owned) => owned.instanceId === deal.itemInstanceId,
  );
  if (!item) throw new Error("거래 물건을 찾을 수 없습니다.");
  if (buyer.money < deal.askingPrice) {
    throw new Error("구매자의 금액이 부족합니다.");
  }

  const transferredItem: ServerItemCard = {
    ...item,
    revealed: true,
    revealedToPlayerIds: Array.from(
      new Set([...item.revealedToPlayerIds, seller.id, buyer.id]),
    ),
  };

  return {
    sellerMoney: seller.money + deal.askingPrice,
    buyerMoney: buyer.money - deal.askingPrice,
    sellerHand: seller.hand.filter(
      (owned) => owned.instanceId !== deal.itemInstanceId,
    ),
    buyerHand: [...buyer.hand, transferredItem],
    pendingReviews: [
      {
        tradeId: deal.id,
        reviewerId: seller.id,
        targetPlayerId: buyer.id,
      },
      {
        tradeId: deal.id,
        reviewerId: buyer.id,
        targetPlayerId: seller.id,
      },
    ],
  };
}
