import type { ItemCategory, ItemCondition } from "../types";

export type RoomStatus = "waiting" | "preparing" | "playing" | "reporting" | "finished";
export type RoomMode = "real" | "botTest";
export type PlayerRole = "citizen" | "villain";
export type ActionCardType =
  | "tradeRequest"
  | "freeGive"
  | "directTrade"
  | "badReview"
  | "recycle"
  | "swap";
export type DealCardChoice = "cool" | "cancel";

export interface JobCardSnapshot {
  id: string;
  title: string;
  description: string;
  startingMoney: number;
}

export interface ItemCardSnapshot {
  instanceId: string;
  id: string;
  name: string;
  category: ItemCategory | null;
  condition: ItemCondition | null;
  customCondition?: ItemCondition | null;
  askingPrice?: number;
  isBrickDisguised?: boolean;
  fakeItemId?: string;
  originalPrice: number; // in 원 (정가)
  marketPrice: number; // in 원 (중고 시세)
  acquiredPrice: number | null;
  isBrick: boolean;
  imagePath: string;
  revealed: boolean;
}

export interface ServerItemCard extends ItemCardSnapshot {
  revealedToPlayerIds: string[];
  hiddenInfoRevealTurn?: number;
}

export interface ActionCardSnapshot {
  type: ActionCardType;
  title: string;
  description: string;
  imagePath: string;
}

export interface DealCards {
  cool: boolean;
  cancel: boolean;
}

export interface PendingDeal {
  id: string;
  actionType: "tradeRequest" | "freeGive" | "directTrade";
  requesterId: string;
  ownerId: string;
  itemInstanceId: string;
  askingPrice: number;
  revealedBeforeDeal: boolean;
  hiddenInfoRevealTurn?: number;
  choices: Partial<Record<string, DealCardChoice>>;
  resolved: boolean;
  currentOffer?: number;
  lastOfferPlayerId?: string;
  negoCount?: number;
}

export interface PendingReview {
  tradeId: string;
  reviewerId: string;
  targetPlayerId: string;
}

export interface ServerPlayer {
  id: string;
  name: string;
  token: string;
  isHost: boolean;
  isBot: boolean;
  role?: PlayerRole;
  mission?: string;
  job?: JobCardSnapshot;
  money: number;
  reputationTokens: number;
  manner: number;
  likes: number;
  dislikes: number;
  position: number;
  hand: ServerItemCard[];
  dealCards: DealCards;
  connectedAt: number;
  isPrepared?: boolean;
  tradeParticipations: number;
  negoOffersSent: number;
  reviewsSubmitted: number;
  inspectTokens: number;
  negoTokens: number;
  evidenceTokens: number;
  // 빌런 사기 미션 카운터 추가
  brickSalesCount: number;
  defectSalesCount: number;
  overpriceSalesCount: number;
  // 봇 인공지능 진화용 속성
  genes?: BotGenes;
  suspectScores?: Record<string, number>; // 타인에 대한 사기 의심 점수 누적용 (신고자 악용 등)
}

export interface PublicPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isBot: boolean;
  reputationTokens: number;
  manner: number;
  likes: number;
  dislikes: number;
  position: number;
  itemCount: number;
  publicItems: ItemCardSnapshot[];
  money?: never;
  job?: never;
  hand?: never;
  role?: never;
  mission?: never;
}

export interface RoomResult {
  villainId?: string;
  villainCaught?: boolean;
  villainMissionComplete?: boolean;
  winnerId: string;
  winningSide?: "citizens" | "villain";
  eliminatedPlayerId?: string;
  reports: Record<string, number>;
  finalScores?: Record<string, { totalMoney: number }>;
}

export interface Room {
  code: string;
  mode: RoomMode;
  status: RoomStatus;
  hostPlayerId: string;
  players: ServerPlayer[];
  currentTurnPlayerId: string | null;
  turnCount: number;
  usedActionCount: number;
  marketActionLimit: number;
  logs: string[];
  actionDeck: ActionCardSnapshot[];
  discardPile: ActionCardSnapshot[];
  currentActionCard: ActionCardSnapshot | null;
  pendingDeal: PendingDeal | null;
  pendingReviews: PendingReview[];
  reports: Record<string, string>;
  result: RoomResult | null;
  version: number;
  createdAt: number;
  updatedAt: number;
}

export interface PlayerSnapshot {
  id: string;
  name: string;
  isHost: boolean;
  isBot: boolean;
  role?: PlayerRole;
  mission?: string;
  job?: JobCardSnapshot;
  money?: number;
  reputationTokens?: number;
  hand?: ItemCardSnapshot[];
  dealCards?: DealCards;
  inspectTokens?: number;
  negoTokens?: number;
  evidenceTokens?: number;
  isPrepared?: boolean;
}

export interface RoomSnapshot {
  code: string;
  mode: RoomMode;
  status: RoomStatus;
  players: PublicPlayer[];
  me: PlayerSnapshot | null;
  currentTurnPlayerId: string | null;
  currentActionCard: ActionCardSnapshot | null;
  pendingDeal: PendingDeal | null;
  pendingDealItem: ItemCardSnapshot | null;
  pendingReviews: PendingReview[];
  usedActionCount: number;
  marketActionLimit: number;
  logs: string[];
  reportsCast: number;
  result: RoomResult | null;
  version: number;
}

export type RoomAction =
  | { type: "addBot" }
  | { type: "startGame" }
  | { type: "drawActionCard" }
  | {
      type: "requestTrade";
      ownerId: string;
      itemInstanceId: string;
      offerPrice: number;
    }
  | { type: "chooseDealCard"; choice: DealCardChoice }
  | { type: "negoDeal"; price: number }
  | {
      type: "reviewTrade";
      targetPlayerId: string;
      satisfied: boolean;
    }
  | { type: "terrorReview"; targetPlayerId: string }
  | { type: "recycleBrick"; itemInstanceId: string }
  | { type: "swapRandomItem"; targetPlayerId: string }
  | { type: "rollDice" }
  | { type: "buyItem"; itemName: string; price: number }
  | { type: "sellItem"; itemName: string; targetPlayerId: string; price: number }
  | { type: "ratePlayer"; targetPlayerId: string; rating: "like" | "dislike" }
  | { type: "endTurn" }
  | { type: "startReporting" }
  | { type: "reportSuspiciousPlayer"; targetPlayerId: string }
  | {
      type: "fixPreparation";
      itemsConfig: {
        instanceId: string;
        customCondition: ItemCondition;
        askingPrice: number;
        fakeItemId?: string;
      }[];
    }
  | {
      type: "updateCustomCondition";
      itemInstanceId: string;
      customCondition: ItemCondition;
    };

export interface RoomSessionResult {
  room: RoomSnapshot;
  playerId: string;
  playerToken: string;
}

export interface BotGenes {
  id: string;             // 유전자 식별자
  generation: number;     // 세대 번호
  fitness: number;        // 적합도 (게임 결과 성적)
  
  // 1. 거래 및 흥정 유전자 (0.0 ~ 1.0)
  negoAcceptThreshold: number;  // 자신이 구매자일 때, (시장가 대비 제안가) 수용 상한선
  priceMarkupRatio: number;     // 자신이 판매자일 때, (시장가 대비 사전 등록/제안 가격) 배율
  negoPropensity: number;       // 거래 조건이 맞지 않을 때 흥정(Nego)을 시도할 확률 (낮으면 즉시 Cancel)
  
  // 2. 심리 및 사기 유전자 (0.0 ~ 1.0)
  deceitRatio: number;          // 빌런일 때 벽돌 위장 및 하자를 고가 최상급으로 속여 팔 확률
  suspicionRatio: number;       // 타인을 의심하여 satisfied: false(싫어요)를 날리거나 평판 낮은 사람과의 거래를 피할 확률
  
  // 3. 직업/역할 우선순위 가중치 (0.0 ~ 1.0)
  jobPriority: number;          // 직업 미션을 달성하기 위해 행동할 가중치
}

