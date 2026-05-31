// ===== Core Game Types =====

export type Role = "citizen" | "villain";

export type SpaceType =
  | "start"
  | "buy"
  | "sell"
  | "freebie"
  | "event"
  | "manner"
  | "nego"
  | "golden"
  | "rest";

export interface BoardSpace {
  id: number;
  type: SpaceType;
  name: string;
  description: string;
  emoji: string;
}

export interface Item {
  id: string;
  name: string;
  emoji: string;
  basePrice: number; // in 원
  category: "electronics" | "fashion" | "hobby" | "living";
}

export interface OwnedItem {
  item: Item;
  purchasePrice: number;
}

export interface EventCard {
  id: string;
  title: string;
  description: string;
  emoji: string;
  effect: EventEffect;
}

export type EventEffect =
  | { type: "money"; amount: number }
  | { type: "manner"; amount: number }
  | { type: "loseItem" }
  | { type: "gainLike"; count: number }
  | { type: "gainDislike"; count: number }
  | { type: "discount"; percent: number }
  | { type: "revealAssets" }
  | { type: "forceTrade" }
  | { type: "stealItem" }
  | { type: "skipTurn" }
  | { type: "extraTurn" }
  | { type: "swapItems" };

export interface Mission {
  id: string;
  title: string;
  description: string;
  emoji: string;
  checkComplete: (player: Player, gameLog: GameLog[]) => boolean;
}

export interface Player {
  id: number;
  name: string;
  role: Role;
  mission: Mission | null; // only villain has mission
  money: number; // in 원
  items: OwnedItem[];
  mannerTemp: number; // starts at 36.5
  likes: number;
  dislikes: number;
  position: number; // board space index
  color: string;
  hasDiscount: boolean; // from event card
  skipNextTurn: boolean;
  extraTurn: boolean;
}

export type GamePhase =
  | "setup"
  | "turnStart" // show turn transition screen
  | "rolling" // dice animation
  | "moving" // moving token
  | "action" // executing space action
  | "trading" // trade dialog
  | "freeGrab" // speed grab mini-game
  | "eventDraw" // drawing event card
  | "mannerVote" // rating after interaction
  | "turnEnd"
  | "voting" // end-game villain voting
  | "gameOver";

export type TradeRole = "buyer" | "seller";

export interface TradeState {
  sellerId: number;
  buyerId: number | null;
  item: OwnedItem;
  askingPrice: number;
  currentOffer: number;
  phase: "listing" | "negotiating" | "confirming" | "completed" | "cancelled";
  negoCount: number; // how many times negotiated
}

export interface GameLog {
  turn: number;
  playerId: number;
  action: string;
  details: string;
  timestamp: number;
}

export interface GameState {
  phase: GamePhase;
  players: Player[];
  currentPlayerIndex: number;
  round: number;
  maxRounds: number;
  diceValue: number | null;
  currentTrade: TradeState | null;
  currentEvent: EventCard | null;
  freeGrabItem: Item | null;
  freeGrabWinnerId: number | null;
  marketItems: Item[]; // items available in the market
  logs: GameLog[];
  votingResults: Record<number, number>; // playerId -> voted as villain count
  revealedVillain: number | null;
  winner: number | null;
  // manner vote state
  mannerVoteFrom: number | null;
  mannerVoteTo: number | null;
}

export type GameAction =
  | { type: "START_GAME"; players: { name: string }[] }
  | { type: "CONFIRM_TURN" } // player confirmed they're ready
  | { type: "ROLL_DICE" }
  | { type: "MOVE_COMPLETE" }
  | { type: "BUY_ITEM"; itemId: string }
  | { type: "SKIP_BUY" }
  | { type: "START_SELL"; itemIndex: number }
  | { type: "JOIN_TRADE"; buyerId: number }
  | { type: "MAKE_OFFER"; price: number }
  | { type: "ACCEPT_OFFER" }
  | { type: "REJECT_OFFER" }
  | { type: "CANCEL_TRADE" }
  | { type: "FREE_GRAB"; playerId: number }
  | { type: "RESOLVE_EVENT" }
  | { type: "VOTE_MANNER"; targetId: number; isLike: boolean }
  | { type: "SKIP_MANNER_VOTE" }
  | { type: "END_TURN" }
  | { type: "VOTE_VILLAIN"; targetId: number }
  | { type: "FINISH_VOTING" }
  | { type: "RESTART" };

export const PLAYER_COLORS = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#A78BFA"];
export const STARTING_MONEY = 500000; // 500,000원
export const STARTING_MANNER_TEMP = 36.5;
export const MAX_ROUNDS = 10;
export const MANNER_LIKE_BONUS = 0.5;
export const MANNER_DISLIKE_PENALTY = 1.0;
export const MANNER_SELL_THRESHOLD = 35.0;
export const MANNER_BAN_THRESHOLD = 33.0;
export const MANNER_BONUS_THRESHOLD = 38.0;
export const DISLIKE_SCORE_PENALTY = 50000; // 50,000원 per dislike
export const MANNER_BONUS_HIGH = 200000; // 200,000원
export const MANNER_BONUS_MID = 100000; // 100,000원
