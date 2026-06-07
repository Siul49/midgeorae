import type { JobCardSnapshot } from "../server/types";

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 4;
export const LOBBY_MONEY = 0;
export const STARTING_REPUTATION = 3;
export const STARTING_MANNER = 36.5;
export const MARKET_ACTIONS_PER_PLAYER = 5;

export function getMarketActionLimit(playerCount: number) {
  return playerCount * MARKET_ACTIONS_PER_PLAYER;
}

export const JOB_CARDS: JobCardSnapshot[] = [
  {
    id: "developer",
    title: "개발자",
    description: "보유한 모든 물건의 카테고리가 '전자제품'이어야 합니다. (최소 1개 이상 보유)",
    startingMoney: 1000000,
  },
  {
    id: "model",
    title: "모델",
    description: "보유한 모든 물건의 카테고리가 '패션잡화'이어야 합니다. (최소 1개 이상 보유)",
    startingMoney: 1000000,
  },
  {
    id: "housewife",
    title: "주부",
    description: "보유한 모든 물건의 카테고리가 '생활용품'이어야 합니다. (최소 1개 이상 보유)",
    startingMoney: 1000000,
  },
  {
    id: "brick-collector",
    title: "벽돌 수집가",
    description: "벽돌 카드를 4개 이상 보유해야 합니다.",
    startingMoney: 1000000,
  },
  {
    id: "collector",
    title: "수집가",
    description: "물건(벽돌 포함)을 8개 이상 보유해야 합니다.",
    startingMoney: 1000000,
  },
  {
    id: "citizen",
    title: "일반 시민",
    description: "게임 종료 시 총 자산이 250만 원 이상이어야 합니다.",
    startingMoney: 1000000,
  },
];

export const VILLAIN_MISSIONS = [
  "좋아요 토큰을 선물하며 다른 시민을 빌런처럼 보이게 만드세요.",
  "시민 한 명의 좋아요 토큰을 0개로 만들도록 여론을 유도하세요.",
  "거래 취소와 악평을 이용해 본인의 정체를 숨기세요.",
];
