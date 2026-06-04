import type { PendingDeal, PendingReview, ServerItemCard, ServerPlayer } from "../server/types/game-server-types";

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

  // 빌런의 사기 거래(반값)인 경우 실제 이전 가격(50%) 계산
  const payingPrice = deal.isUnderpay
    ? Math.floor(deal.askingPrice / 2)
    : deal.askingPrice;

  if (requester.money < payingPrice) {
    throw new Error("신청자의 금액이 부족합니다.");
  }

  const transferredItem: ServerItemCard = {
    ...item,
    // 상대방 인벤토리 영수증 상에는 정가로 표기하여 감춤
    acquiredPrice: deal.askingPrice,
    hiddenInfoRevealTurn: deal.hiddenInfoRevealTurn,
    revealed: false,
    revealedToPlayerIds: Array.from(
      new Set([
        ...item.revealedToPlayerIds,
        owner.id,
        ...(deal.revealedBeforeDeal ? [requester.id] : []),
      ]),
    ),
  };

  return {
    ownerMoney: owner.money + payingPrice,
    requesterMoney: requester.money - payingPrice,
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
