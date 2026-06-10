"use client";

import React from "react";
import {
  AlertTriangle,
  Bike,
  BookOpen,
  Box,
  BrickWall,
  Briefcase,
  Camera,
  Eye,
  Gift,
  Gamepad2,
  Guitar,
  Headphones,
  Heart,
  Keyboard,
  Laptop,
  MessageCircleWarning,
  Package,
  Recycle,
  Repeat2,
  Shirt,
  ShoppingBag,
  Smartphone,
  Speaker,
  Tablet,
  Watch,
  Glasses,
  Wallet,
  Dices,
  Tent,
  Coffee,
  Wind,
  Armchair,
  Lightbulb,
  Disc,
  Flame,
  Gem,
  Footprints,
} from "lucide-react";
import type {
  ItemCardSnapshot,
  ActionCardSnapshot,
  ActionCardType,
  RoomSnapshot,
} from "@/features/game/server/types";
import { CONDITION_MULTIPLIERS } from "../../rules/game-rules";

// --- 디자인 시스템 기반 공용 컴포넌트 ---

/**
 * 에러 공지 컴포넌트
 * 디자인 시스템의 Destructive 컬러 변수 및 Alert 레이아웃 준수
 */
export function ErrorNotice({ message }: { message: string }) {
  return (
    <div className="mt-3 flex items-start gap-2 border border-red-500/20 bg-red-950/20 px-3.5 py-2 text-sm font-semibold text-red-400 rounded-lg backdrop-blur-sm select-text">
      <AlertTriangle className="shrink-0 mt-0.5 text-red-400" size={16} />
      <span>{message}</span>
    </div>
  );
}

/**
 * 상태 타일 컴포넌트 (대조 결과 화면 등에서 사용)
 * globals.css의 .status-tile 디자인 클래스 사용
 */
export function StatusBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="status-tile border border-[var(--stone-container-border)] bg-[var(--stone-container-bg)] p-3 rounded-lg shadow-sm text-center">
      <div className="text-[10px] font-black uppercase tracking-wider text-stone-400">{label}</div>
      <div className="mt-1 text-lg font-black text-orange-400">{value}</div>
    </div>
  );
}

// --- 공통 데이터 가공 헬퍼 ---

export function moneyLabel(value: number) {
  if (value === 0) return "0원";
  const manVal = value / 10000;
  if (Number.isInteger(manVal)) {
    return `${manVal}만`;
  }
  return `${manVal.toFixed(1)}만`;
}

export function getScamThreshold(item: ItemCardSnapshot | null): number {
  if (!item) return 0;
  if (item.isBrick) return 1;
  const cond = item.condition;
  const multiplier = cond && cond in CONDITION_MULTIPLIERS
    ? CONDITION_MULTIPLIERS[cond as keyof typeof CONDITION_MULTIPLIERS]
    : 1.0;
  return Math.floor((item.marketPrice ?? 0) * multiplier) + 1;
}

export function playerName(snapshot: RoomSnapshot, playerId: string) {
  return (
    snapshot.players.find((player) => player.id === playerId)?.name ?? "플레이어"
  );
}

const CATEGORY_LABELS = {
  electronics: "전자기기",
  fashion: "패션",
  hobby: "취미",
  living: "생활",
} as const;

const CONDITION_LABELS = {
  unopened: "미개봉 새상품",
  mint: "민트급",
  used: "사용감 있음",
  defective: "하자 있음",
  broken: "하자 있음",
} as const;

export function categoryLabel(category: ItemCardSnapshot["category"]) {
  return category ? CATEGORY_LABELS[category] : "미공개";
}

export function conditionLabel(condition: ItemCardSnapshot["condition"]) {
  return condition ? CONDITION_LABELS[condition] : "알수 없음";
}

export function marketProgressLabel(snapshot: RoomSnapshot) {
  if (snapshot.marketActionLimit <= 0) return "-";
  return `${snapshot.usedActionCount}/${snapshot.marketActionLimit}`;
}

export function actionIcon(type: ActionCardType) {
  switch (type) {
    case "freeGive":
      return <Gift size={18} />;
    case "directTrade":
      return <Eye size={18} />;
    case "badReview":
      return <MessageCircleWarning size={18} />;
    case "donation":
      return <Heart size={18} className="text-red-400" />;
    case "swap":
      return <Repeat2 size={18} />;
    case "tradeRequest":
    default:
      return <ShoppingBag size={18} />;
  }
}

export function productIcon(item: ItemCardSnapshot, size = 72) {
  const iconProps = { size, strokeWidth: 1.8 };
  if (item.isBrick) return <BrickWall {...iconProps} />;

  switch (item.id) {
    case "iphone":
      return <Smartphone {...iconProps} />;
    case "airpods":
      return <Headphones {...iconProps} />;
    case "switch":
    case "gold_ps5":
      return <Gamepad2 {...iconProps} />;
    case "bicycle":
      return <Bike {...iconProps} />;
    case "books":
      return <BookOpen {...iconProps} />;
    case "sneakers":
      return <Footprints {...iconProps} />;
    case "laptop":
    case "gold_macbook":
      return <Laptop {...iconProps} />;
    case "camera":
      return <Camera {...iconProps} />;
    case "tablet":
      return <Tablet {...iconProps} />;
    case "keyboard":
      return <Keyboard {...iconProps} />;
    case "guitar":
      return <Guitar {...iconProps} />;
    case "bag":
      return <Briefcase {...iconProps} />;
    case "watch":
      return <Watch {...iconProps} />;
    case "figure":
      return <Box {...iconProps} />;
    case "jacket":
      return <Shirt {...iconProps} />;
    case "speaker":
      return <Speaker {...iconProps} />;
    case "sunglasses":
      return <Glasses {...iconProps} />;
    case "wallet":
      return <Wallet {...iconProps} />;
    case "boardgame_set":
      return <Dices {...iconProps} />;
    case "camping_gear":
      return <Tent {...iconProps} />;
    case "coffee_machine":
      return <Coffee {...iconProps} />;
    case "air_purifier":
      return <Wind {...iconProps} />;
    case "chair":
      return <Armchair {...iconProps} />;
    case "desk_lamp":
      return <Lightbulb {...iconProps} />;
    case "robot_vacuum":
      return <Disc {...iconProps} />;
    case "toaster":
      return <Flame {...iconProps} />;
    case "gold_rolex":
      return <Gem {...iconProps} />;
    default:
      return <Package {...iconProps} />;
  }
}

export function isTradeRequestAction(card: ActionCardSnapshot | null) {
  return (
    card?.type === "tradeRequest" ||
    card?.type === "directTrade"
  );
}

interface RankBadgeCircleProps {
  rank?: number;
  name: string;
  size?: "sm" | "lg";
}

export function RankBadgeCircle({ rank, name, size = "sm" }: RankBadgeCircleProps) {
  const isLg = size === "lg";
  const sizeClasses = isLg ? "h-10 w-10 text-[13px]" : "h-8 w-8 text-[11px]";

  if (rank === 1) {
    return (
      <div 
        className={`flex ${sizeClasses} shrink-0 items-center justify-center rounded-full border border-amber-400/80 bg-[radial-gradient(circle_at_35%_25%,#fffbeb,#f59e0b,#b45309)] font-black text-stone-950 shadow-[0_0_8px_rgba(245,158,11,0.5)] select-none`}
        title="1위 (선두)"
      >
        1위
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div 
        className={`flex ${sizeClasses} shrink-0 items-center justify-center rounded-full border border-stone-300 bg-[radial-gradient(circle_at_35%_25%,#f9fafb,#9ca3af,#4b5563)] font-black text-stone-950 shadow-[0_0_6px_rgba(156,163,175,0.3)] select-none`}
        title="2위"
      >
        2위
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div 
        className={`flex ${sizeClasses} shrink-0 items-center justify-center rounded-full border border-orange-600/70 bg-[radial-gradient(circle_at_35%_25%,#ffedd5,#ca8a04,#78350f)] font-black text-stone-950 shadow-[0_0_6px_rgba(194,65,12,0.3)] select-none`}
        title="3위"
      >
        3위
      </div>
    );
  }
  if (rank === 4) {
    return (
      <div 
        className={`flex ${sizeClasses} shrink-0 items-center justify-center rounded-full border border-stone-600 bg-[radial-gradient(circle_at_35%_25%,#78716c,#44403c,#1c1917)] font-black text-stone-300 select-none`}
        title="4위"
      >
        4위
      </div>
    );
  }

  // Fallback / before game starts (lobby/waiting)
  return (
    <div className={`flex ${isLg ? "h-10 w-10 text-lg" : "h-8 w-8 text-base"} shrink-0 items-center justify-center rounded-full bg-[radial-gradient(circle_at_35%_25%,#f8d9a4,#b87332)] font-black text-stone-950 select-none`}>
      {name.slice(0, 1)}
    </div>
  );
}
