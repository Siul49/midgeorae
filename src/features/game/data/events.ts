import type { EventCard } from "../types";

export const EVENT_CARDS: EventCard[] = [
  {
    id: "e1",
    title: "택배 사고!",
    description: "배송 중 물건이 파손되었습니다. 보유 물건 중 하나를 잃습니다.",
    emoji: "📦💥",
    effect: { type: "loseItem" },
  },
  {
    id: "e2",
    title: "현금 발견",
    description: "길에서 현금을 주웠습니다! 100,000원을 획득합니다.",
    emoji: "💵",
    effect: { type: "money", amount: 100000 },
  },
  {
    id: "e3",
    title: "매너왕 등극!",
    description: "당신의 친절한 거래가 화제! 매너 온도 +2°C",
    emoji: "👑",
    effect: { type: "manner", amount: 2 },
  },
  {
    id: "e4",
    title: "비매너 신고!",
    description: "익명 신고가 접수되었습니다. 매너 온도 -3°C",
    emoji: "🚨",
    effect: { type: "manner", amount: -3 },
  },
  {
    id: "e5",
    title: "깜짝 할인!",
    description: "다음 구매 시 50% 할인 쿠폰 획득!",
    emoji: "🏷️",
    effect: { type: "discount", percent: 50 },
  },
  {
    id: "e6",
    title: "거래 후기 폭발!",
    description: "좋은 후기가 쏟아집니다. 좋아요 2개 획득!",
    emoji: "⭐⭐",
    effect: { type: "gainLike", count: 2 },
  },
  {
    id: "e7",
    title: "시스템 오류!",
    description: "서버 오류로 모든 플레이어의 보유 자산이 공개됩니다!",
    emoji: "🖥️💀",
    effect: { type: "revealAssets" },
  },
  {
    id: "e8",
    title: "번개 거래!",
    description: "긴급! 옆 사람과 즉석 거래를 진행합니다.",
    emoji: "⚡",
    effect: { type: "forceTrade" },
  },
  {
    id: "e9",
    title: "도둑이야!",
    description: "소매치기 당했습니다! 150,000원을 잃습니다.",
    emoji: "🦹",
    effect: { type: "money", amount: -150000 },
  },
  {
    id: "e10",
    title: "당근 포인트!",
    description: "당근마켓 이벤트 당첨! 200,000원 획득!",
    emoji: "🥕",
    effect: { type: "money", amount: 200000 },
  },
  {
    id: "e11",
    title: "악플 테러",
    description: "누군가 악의적 후기를 남겼습니다. 싫어요 1개 추가.",
    emoji: "👎",
    effect: { type: "gainDislike", count: 1 },
  },
  {
    id: "e12",
    title: "물건 도난!",
    description: "다른 플레이어의 물건을 하나 가져옵니다!",
    emoji: "🤫",
    effect: { type: "stealItem" },
  },
  {
    id: "e13",
    title: "교통 체증",
    description: "약속 장소에 못 갑니다. 다음 턴 건너뜁니다.",
    emoji: "🚗💨",
    effect: { type: "skipTurn" },
  },
  {
    id: "e14",
    title: "거래의 신!",
    description: "연속 거래 기회! 추가 턴을 얻습니다.",
    emoji: "🔥",
    effect: { type: "extraTurn" },
  },
  {
    id: "e15",
    title: "물물교환",
    description: "다른 플레이어와 물건을 하나씩 교환합니다!",
    emoji: "🔄",
    effect: { type: "swapItems" },
  },
];

export function drawEventCard(): EventCard {
  return EVENT_CARDS[Math.floor(Math.random() * EVENT_CARDS.length)];
}
