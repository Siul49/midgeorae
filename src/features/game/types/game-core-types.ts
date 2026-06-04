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

export type ItemCategory = "electronics" | "fashion" | "hobby" | "living";
export type ItemCondition = "mint" | "used" | "defective" | "broken";

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

export interface Item {
  id: string;
  name: string;
  emoji: string;
  originalPrice: number; // in 원 (정가)
  marketPrice: number; // in 원 (중고 시세)
  category: ItemCategory;
  condition: ItemCondition;
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
