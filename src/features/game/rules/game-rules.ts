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
    id: "inspector",
    title: "검수자",
    description: "물건 상태를 정밀 진단합니다. 미션: 다른 플레이어와 2회 거래 시도.",
    startingMoney: 900000,
  },
  {
    id: "negotiator",
    title: "흥정가",
    description: "가격 조정을 주도합니다. 미션: 시세와 다른 가격의 거래 신청 2회 전송.",
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
