export type ItemCategory = "electronics" | "fashion" | "hobby" | "living";
export type ItemCondition = "unopened" | "mint" | "used" | "defective" | "broken";

export interface Item {
  id: string;
  name: string;
  emoji: string;
  marketPrice: number; // in 원
  category: ItemCategory;
  condition: ItemCondition;
}


export type RoomStatus = "waiting" | "playing" | "reporting" | "finished";
export type RoomMode = "real" | "botTest";
export type PlayerRole = "citizen" | "villain";
export type ActionCardType =
  | "tradeRequest"
  | "freeGive"
  | "directTrade"
  | "badReview"
  | "donation"
  | "swap"
  | "saleRequest"
  | "repair";
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
  marketPrice: number;
  acquiredPrice: number | null;
  isBrick: boolean;
  imagePath: string;
  revealed: boolean;
  disguiseId?: string;
  disguiseName?: string;
  disguiseCategory?: ItemCategory;
  disguiseCondition?: ItemCondition;
  disguiseMarketPrice?: number;
  disguiseImagePath?: string;
}

export interface ServerItemCard extends ItemCardSnapshot {
  revealedToPlayerIds: string[];
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
  actionType: "tradeRequest" | "freeGive" | "directTrade" | "saleRequest";
  requesterId: string;
  ownerId: string;
  itemInstanceId: string;
  askingPrice: number;
  revealedBeforeDeal: boolean;
  choices: Partial<Record<string, DealCardChoice>>;
  resolved: boolean;
}

export interface PendingReview {
  tradeId: string;
  reviewerId: string;
  targetPlayerId: string;
  itemPrice?: number;
  itemMarketPrice?: number;
  sellerId?: string;
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
  likes: number;
  dislikes: number;
  position: number;
  hand: ServerItemCard[];
  dealCards: DealCards;
  connectedAt: number;
}

export interface PublicPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isBot: boolean;
  reputationTokens: number;
  likes: number;
  dislikes: number;
  position: number;
  itemCount: number;
  publicItems: ItemCardSnapshot[];
  assetRank?: number;

  role?: PlayerRole;
  job?: JobCardSnapshot;
  money?: number;
  totalAssets?: number;
  isMissionComplete?: boolean;
}

export interface RoomResult {
  villainId?: string;
  villainCaught?: boolean;
  winnerId: string;
  winningSide?: "citizens" | "villain";
  eliminatedPlayerId?: string;
  reports: Record<string, number>;
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
  currentActionAcks: string[];
  version: number;
  hostDrawCount?: number;
  botDrawCount?: number;
  createdAt: number;
  updatedAt: number;
  revealAllItems?: boolean;
  villainScamCount?: number;
  roundScamCount?: number;
  showBrickDisguise?: boolean;
  startingPlayerId?: string | null;
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
  assetRank?: number;
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
  reports?: Record<string, string>;
  currentActionAcks: string[];
  result: RoomResult | null;
  version: number;
  revealAllItems?: boolean;
  villainScamCount?: number;
  roundScamCount?: number;
  showBrickDisguise?: boolean;
  startingPlayerId?: string | null;
}

export type RoomAction =
  | { type: "addBot" }
  | { type: "startGame" }
  | { type: "restartGame" }
  | { type: "drawActionCard" }
  | {
      type: "requestTrade";
      ownerId: string;
      itemInstanceId: string;
      offerPrice: number;
    }
  | { type: "chooseDealCard"; choice: DealCardChoice }
  | { type: "proposePrice"; price: number }
  | {
      type: "reviewTrade";
      targetPlayerId: string;
      satisfied: boolean;
    }
  | { type: "terrorReview"; targetPlayerId: string }
  | { type: "requestDonation"; targetPlayerId: string }
  | { type: "swapRandomItem"; targetPlayerId: string }
  | { type: "repairItem"; itemInstanceId: string }
  | { type: "rollDice" }
  | { type: "buyItem"; itemName: string; price: number }
  | { type: "sellItem"; itemName: string; targetPlayerId: string; price: number }
  | { type: "ratePlayer"; targetPlayerId: string; rating: "like" | "dislike" }
  | { type: "endTurn" }
  | { type: "startReporting" }
  | { type: "reportSuspiciousPlayer"; targetPlayerId: string }
  | { type: "ackActionCard" }
  | { type: "leaveRoom" }
  | { type: "toggleRevealAllItems" }
  | { type: "toggleShowBrickDisguise" }
  | { type: "renamePlayer"; name: string };

export interface RoomSessionResult {
  room: RoomSnapshot;
  playerId: string;
  playerToken: string;
}
