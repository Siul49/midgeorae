import type { JobCardSnapshot } from "../server/types";

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 4;
export const LOBBY_MONEY = 0;
export const STARTING_REPUTATION = 3;
export const MAX_REPUTATION = 5;
export const STARTING_MANNER = 36.5;
export const MARKET_ACTIONS_PER_PLAYER = 5;

// 중앙 도메인 상수 정의
export const DEFAULT_STARTING_MONEY = 1500000;
export const MAX_MANNER = 42;
export const MIN_MANNER = 30;
export const MANNER_SATISFIED_INCREMENT = 0.5;
export const MANNER_UNSATISFIED_DECREMENT = 1.0;
export const CITIZEN_VICTORY_ASSET_GOAL = 2000000;
export const VILLAIN_SCAM_VICTORY_LIMIT = 2;

export const CONDITION_MULTIPLIERS = {
  mint: 0.8,
  used: 0.6,
  broken: 0.4,
  defective: 0.4,
} as const;

export function getMarketActionLimit(playerCount: number) {
  return playerCount * MARKET_ACTIONS_PER_PLAYER;
}

export const JOB_CARDS: JobCardSnapshot[] = [
  {
    id: "developer",
    title: "개발자",
    description: "보유한 모든 물건의 카테고리가 '전자제품'이어야 합니다. (최소 1개 이상 보유)",
    startingMoney: DEFAULT_STARTING_MONEY,
  },
  {
    id: "model",
    title: "모델",
    description: "보유한 모든 물건의 카테고리가 '패션잡화'이어야 합니다. (최소 1개 이상 보유)",
    startingMoney: DEFAULT_STARTING_MONEY,
  },
  {
    id: "housewife",
    title: "주부",
    description: "보유한 모든 물건의 카테고리가 '생활용품'이어야 합니다. (최소 1개 이상 보유)",
    startingMoney: DEFAULT_STARTING_MONEY,
  },
  {
    id: "brick-collector",
    title: "벽돌 수집가",
    description: "벽돌 카드를 2개 이상 보유해야 합니다. (벽돌 수집가는 벽돌 카드가 가짜로 위장되지 않고 실제 '벽돌'로 보입니다.)",
    startingMoney: DEFAULT_STARTING_MONEY,
  },
  {
    id: "collector",
    title: "수집가",
    description: "물건(벽돌 포함)을 8개 이상 보유해야 합니다.",
    startingMoney: DEFAULT_STARTING_MONEY,
  },
  {
    id: "citizen",
    title: "일반 시민",
    description: "게임 종료 시 총 자산이 200만 원 이상이어야 합니다.",
    startingMoney: DEFAULT_STARTING_MONEY,
  },
];

export const VILLAIN_MISSIONS = [
  "벽돌 2개를 다른 플레이어에게 사기 판매(벽돌 거래 성사)하는 데 성공하세요.",
];
