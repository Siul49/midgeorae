import type { BoardSpace } from "../types/game-core-types";

export const BOARD_SPACES: BoardSpace[] = [
  { id: 0, type: "start", name: "출발", description: "게임 시작! 지나갈 때마다 월급 100,000원", emoji: "🏠" },
  { id: 1, type: "buy", name: "중고마켓", description: "시장에서 물건을 구매할 수 있습니다", emoji: "🛒" },
  { id: 2, type: "event", name: "이벤트", description: "이벤트 카드를 뽑습니다", emoji: "🎲" },
  { id: 3, type: "sell", name: "판매존", description: "보유한 물건을 다른 플레이어에게 판매합니다", emoji: "💰" },
  { id: 4, type: "freebie", name: "무료나눔", description: "광클! 가장 빠른 사람이 가져갑니다", emoji: "🎁" },
  { id: 5, type: "buy", name: "중고마켓", description: "시장에서 물건을 구매할 수 있습니다", emoji: "🛒" },
  { id: 6, type: "manner", name: "매너평가", description: "다른 플레이어의 매너를 평가합니다", emoji: "⭐" },
  { id: 7, type: "nego", name: "네고마켓", description: "흥정이 가능한 특별 거래존! 가격 변동 ±30%", emoji: "🤝" },
  { id: 8, type: "event", name: "이벤트", description: "이벤트 카드를 뽑습니다", emoji: "🎲" },
  { id: 9, type: "sell", name: "판매존", description: "보유한 물건을 다른 플레이어에게 판매합니다", emoji: "💰" },
  { id: 10, type: "rest", name: "카페", description: "쉬어가는 칸. 매너 온도 +0.3°C 회복", emoji: "☕" },
  { id: 11, type: "buy", name: "중고마켓", description: "시장에서 물건을 구매할 수 있습니다", emoji: "🛒" },
  { id: 12, type: "event", name: "이벤트", description: "이벤트 카드를 뽑습니다", emoji: "🎲" },
  { id: 13, type: "sell", name: "판매존", description: "보유한 물건을 다른 플레이어에게 판매합니다", emoji: "💰" },
  { id: 14, type: "freebie", name: "무료나눔", description: "광클! 가장 빠른 사람이 가져갑니다", emoji: "🎁" },
  { id: 15, type: "nego", name: "네고마켓", description: "흥정이 가능한 특별 거래존! 가격 변동 ±30%", emoji: "🤝" },
  { id: 16, type: "buy", name: "중고마켓", description: "시장에서 물건을 구매할 수 있습니다", emoji: "🛒" },
  { id: 17, type: "event", name: "이벤트", description: "이벤트 카드를 뽑습니다", emoji: "🎲" },
  { id: 18, type: "manner", name: "매너평가", description: "다른 플레이어의 매너를 평가합니다", emoji: "⭐" },
  { id: 19, type: "golden", name: "황금거래", description: "프리미엄 물건 등장! 고가 아이템 거래 기회", emoji: "👑" },
];

export const BOARD_SIZE = BOARD_SPACES.length;
