import type { ItemCategory, ItemCondition } from "../types";

export type RoomStatus = "waiting" | "playing" | "voting" | "finished";
export type RoomMode = "real" | "botTest";
export type PlayerRole = "citizen" | "villain";
export type ActionCardType =
  | "sell"
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
  marketPrice: number;
  acquiredPrice: number | null;
  isBrick: boolean;
  imagePath: string;
  revealed: boolean;
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
  actionType: "sell" | "freeGive" | "directTrade";
  sellerId: string;
  buyerId: string;
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
  money?: never;
  job?: never;
  hand?: never;
  role?: never;
  mission?: never;
}

export interface RoomResult {
  villainId?: string;
  villainCaught?: boolean;
  winnerId: string;
  winningSide?: "citizens" | "villain";
  eliminatedPlayerId?: string;
  votes: Record<string, number>;
}

export interface Room {
  code: string;
  mode: RoomMode;
  status: RoomStatus;
  hostPlayerId: string;
  players: ServerPlayer[];
  currentTurnPlayerId: string | null;
  round: number;
  maxRounds: number;
  logs: string[];
  actionDeck: ActionCardSnapshot[];
  discardPile: ActionCardSnapshot[];
  currentActionCard: ActionCardSnapshot | null;
  pendingDeal: PendingDeal | null;
  pendingReviews: PendingReview[];
  votes: Record<string, string>;
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
  round: number;
  maxRounds: number;
  logs: string[];
  votesCast: number;
  result: RoomResult | null;
  version: number;
}

export type RoomAction =
  | { type: "addBot" }
  | { type: "startGame" }
  | { type: "drawActionCard" }
  | {
      type: "listItemForSale";
      itemInstanceId: string;
      askingPrice: number;
      targetPlayerId: string;
    }
  | { type: "chooseDealCard"; choice: DealCardChoice }
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
  | { type: "startVoting" }
  | { type: "voteVillain"; targetPlayerId: string };

export interface RoomSessionResult {
  room: RoomSnapshot;
  playerId: string;
  playerToken: string;
}
