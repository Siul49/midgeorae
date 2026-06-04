export const CARD_BACK = "/game-cards/backs/item-back.png";

export const ACTION_PREVIEW_CARDS = [
  {
    title: "구매 신청",
    body: "상대 물건에 구매 신청을 보냅니다.",
    imagePath: "/game-cards/actions/trade-request.png",
    accent: "orange",
  },
  {
    title: "직거래 협상",
    body: "거래할 물건 카드를 먼저 공개하고 협상합니다.",
    imagePath: "/game-cards/actions/direct-trade.png",
    accent: "orange",
  },
  {
    title: "기부천사",
    body: "지목한 상대의 물건을 강제로 0원에 가져옵니다. (즉시 성사)",
    imagePath: "/game-cards/actions/free-give.png",
    accent: "orange",
  },
  {
    title: "무료나눔",
    body: "자신의 물건 카드를 지목한 상대에게 강제로 무료나눔합니다. (즉시 성사)",
    imagePath: "/game-cards/actions/free-give.png",
    accent: "orange",
  },
  {
    title: "호갱모집",
    body: "자신의 물건 카드를 지목한 상대에게 강제 판매합니다. (즉시 성사)",
    imagePath: "/game-cards/cards/event-15-e15.png",
    accent: "orange",
  },
  {
    title: "재활용 수거",
    body: "가지고 있는 사기 벽돌 카드 1장을 제거합니다.",
    imagePath: "/game-cards/actions/recycle.png",
    accent: "green",
  },
  {
    title: "사기 벽돌",
    body: "가치가 0원인 꽝 카드로, 다른 사람에게 속여서 팔아야 합니다.",
    imagePath: "/game-cards/actions/brick.png",
    accent: "green",
  },
] as const;

export const CATEGORY_LABELS = {
  electronics: "전자기기",
  fashion: "패션",
  hobby: "취미",
  living: "생활",
} as const;

export const CONDITION_LABELS = {
  mint: "민트급",
  used: "사용감 있음",
  defective: "하자 있음",
  broken: "파손",
} as const;

export function moneyLabel(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

export function categoryLabel(category: string | null) {
  if (category && category in CATEGORY_LABELS) {
    return CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS];
  }
  return "미공개";
}

export function conditionLabel(condition: string | null) {
  if (condition && condition in CONDITION_LABELS) {
    return CONDITION_LABELS[condition as keyof typeof CONDITION_LABELS];
  }
  return "상태 미확인";
}
