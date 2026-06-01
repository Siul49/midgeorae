import type { JobCardSnapshot } from "../server/types";

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 5;
export const LOBBY_MONEY = 0;
export const STARTING_REPUTATION = 5;
export const STARTING_MANNER = 36.5;
export const MARKET_ACTIONS_PER_PLAYER = 5;

export function getMarketActionLimit(playerCount: number) {
  return playerCount * MARKET_ACTIONS_PER_PLAYER;
}

export const JOB_CARDS: JobCardSnapshot[] = [
  {
    id: "student",
    title: "알뜰 학생",
    description: "현금은 적지만 거래 감각이 빠릅니다.",
    startingMoney: 700000,
  },
  {
    id: "collector",
    title: "수집가",
    description: "물건의 가치를 오래 보는 타입입니다.",
    startingMoney: 900000,
  },
  {
    id: "office-worker",
    title: "직장인",
    description: "평균보다 여유 있는 예산으로 시작합니다.",
    startingMoney: 1100000,
  },
  {
    id: "reseller",
    title: "되팔이 고수",
    description: "큰돈을 들고 시작하지만 견제도 받기 쉽습니다.",
    startingMoney: 1300000,
  },
  {
    id: "part-timer",
    title: "알바왕",
    description: "무난한 예산과 빠른 판단으로 판을 읽습니다.",
    startingMoney: 1000000,
  },
];

export const VILLAIN_MISSIONS = [
  "좋아요 토큰을 선물하며 다른 시민을 빌런처럼 보이게 만드세요.",
  "시민 한 명의 좋아요 토큰을 0개로 만들도록 여론을 유도하세요.",
  "거래 취소와 악평을 이용해 본인의 정체를 숨기세요.",
];
