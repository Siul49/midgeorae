import type { JobCardSnapshot } from "../server/types/game-server-types";

// ===== Game Size & Lobby Constants =====
export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 5;
export const LOBBY_MONEY = 0;
export const STARTING_REPUTATION = 5;
export const MARKET_ACTIONS_PER_PLAYER = 5;

export function getMarketActionLimit(playerCount: number) {
  return playerCount * MARKET_ACTIONS_PER_PLAYER;
}

// ===== Game Play Constants (Merged from types.ts) =====
export const PLAYER_COLORS = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#A78BFA"];
export const STARTING_MONEY = 500000; // 500,000원
export const STARTING_MANNER_TEMP = 36.5; // 원래의 STARTING_MANNER와 통합
export const MAX_ROUNDS = 10;
export const MANNER_LIKE_BONUS = 0.5;
export const MANNER_DISLIKE_PENALTY = 1.0;
export const MANNER_SELL_THRESHOLD = 35.0;
export const MANNER_BAN_THRESHOLD = 33.0;
export const MANNER_BONUS_THRESHOLD = 38.0;
export const DISLIKE_SCORE_PENALTY = 50000; // 50,000원 per dislike
export const MANNER_BONUS_HIGH = 200000; // 200,000원
export const MANNER_BONUS_MID = 100000; // 100,000원

// ===== Job & Mission Configurations =====
export interface CitizenMissionTemplate {
  id: string;
  title: string;
  description: string;
  target: number;
  rewardType: "inspectToken" | "negoToken" | "money";
  rewardAmount: number;
}

export const CITIZEN_MISSION_TEMPLATES: Record<string, CitizenMissionTemplate> = {
  inspector_trade: {
    id: "inspector_trade",
    title: "현장 검수",
    description: "거래(구매 또는 판매)에 2회 참여하여 상태를 점검하세요.",
    target: 2,
    rewardType: "inspectToken",
    rewardAmount: 1,
  },
  negotiator_nego: {
    id: "negotiator_nego",
    title: "가격 협상",
    description: "상대방의 가격 제안에 대해 흥정(역제안) 2회를 전송하세요.",
    target: 2,
    rewardType: "negoToken",
    rewardAmount: 1,
  },
  reporter_review: {
    id: "reporter_review",
    title: "후기 등록",
    description: "거래가 성사된 후 거래 만족도 후기를 2회 작성하세요.",
    target: 2,
    rewardType: "money",
    rewardAmount: 200000,
  },
  cool_deal: {
    id: "cool_deal",
    title: "쿨거래",
    description: "취소 없이 쿨거래(수락 및 성사)를 2회 완료하세요.",
    target: 2,
    rewardType: "money",
    rewardAmount: 150000,
  },
  discount_register: {
    id: "discount_register",
    title: "알뜰 장터",
    description: "자신의 매물을 중고 시세보다 10% 이상 저렴하게 1회 이상 내놓으세요.",
    target: 1,
    rewardType: "money",
    rewardAmount: 150000,
  },
  receive_like: {
    id: "receive_like",
    title: "좋은 이웃",
    description: "상대방에게서 따뜻한 '좋아요' 후기 평가를 1회 받으세요.",
    target: 1,
    rewardType: "money",
    rewardAmount: 150000,
  },
};

export const JOB_CARDS: JobCardSnapshot[] = [
  {
    id: "inspector",
    title: "검수자",
    description: "물건 상태를 정밀 진단합니다. 미션: 다른 플레이어와 2회 거래 시도.",
    startingMoney: 900000,
  },
  {
    id: "negotiator",
    title: "흥정가",
    description: "가격 조정을 주도합니다. 미션: 시세와 다른 가격의 구매 신청 2회 전송.",
    startingMoney: 1000000,
  },
  {
    id: "reporter",
    title: "신고자",
    description: "상대방의 행동을 분석합니다. 미션: 거래 후기(좋아요/싫어요) 2회 이상 작성.",
    startingMoney: 1100000,
  },
];

export const VILLAIN_MISSIONS = [
  "VILLAIN_MISSION_BRICK",
  "VILLAIN_MISSION_DEFECT",
  "VILLAIN_MISSION_OVERPRICE",
];

export const VILLAIN_MISSION_DESCRIPTIONS: Record<string, string> = {
  VILLAIN_MISSION_BRICK: "벽돌 카드가 포함된 거래를 판매자로서 1회 이상 성공시키세요.",
  VILLAIN_MISSION_DEFECT: "하자 있는 물품(결함/파손)을 시세 이상의 가격으로 판매 완료하세요.",
  VILLAIN_MISSION_OVERPRICE: "물품 시세 대비 110% 이상의 가격으로 판매 완료 2회 이상 달성하세요.",
};

// ===== Business Logic Rules =====
/**
 * 흥정 칸(Nego)에서의 가격을 계산합니다.
 * @param itemMarketPrice 물품의 원래 중고 시세
 * @param itemId 물품 고유 ID (난수 시드 생성을 위해 사용)
 * @param hasDiscount 50% 할인 쿠폰 보유 여부
 */
/**
 * 물품 ID를 기준으로 흥정 계수(Multiplier)를 구합니다.
 */
export function getNegoMultiplier(itemId: string): number {
  const seed = Array.from(itemId).reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0
  );
  return 0.7 + (seed % 61) / 100; // 0.7 ~ 1.3 범위
}

/**
 * 흥정 칸(Nego)에서의 가격을 계산합니다.
 * @param itemMarketPrice 물품의 원래 중고 시세
 * @param itemId 물품 고유 ID (난수 시드 생성을 위해 사용)
 * @param hasDiscount 50% 할인 쿠폰 보유 여부
 */
export function calculateNegoPrice(
  itemMarketPrice: number,
  itemId: string,
  hasDiscount: boolean
): number {
  const negoMultiplier = getNegoMultiplier(itemId);
  let price = Math.round(itemMarketPrice * negoMultiplier);
  
  if (hasDiscount) {
    price = Math.round(price * 0.5);
  }
  
  return price;
}
