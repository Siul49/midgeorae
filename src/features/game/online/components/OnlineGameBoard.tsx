"use client";

import React, { useState, useEffect } from "react";
import { Crown, BrickWall, HelpCircle } from "lucide-react";
import type {
  PublicPlayer,
  ItemCardSnapshot,
  RoomSnapshot,
} from "@/features/game/server/types";
import { categoryLabel, productIcon, RankBadgeCircle } from "./OnlineHelpers";

// --- TradingCardFlightOverlay ---
export interface FlightAnimation {
  type: "freeGive" | "swap";
  fromPlayerId: string;
  toPlayerId: string;
}

interface TradingCardFlightOverlayProps {
  animation: FlightAnimation;
  snapshot: RoomSnapshot;
  myId: string;
  leftPlayerId?: string;
  topPlayerId?: string;
  rightPlayerId?: string;
  onComplete: () => void;
}

export function TradingCardFlightOverlay({
  animation,
  snapshot,
  myId,
  leftPlayerId,
  topPlayerId,
  rightPlayerId,
  onComplete,
}: TradingCardFlightOverlayProps) {
  const [isAnimated, setIsAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsAnimated(true), 50);
    const endTimer = setTimeout(onComplete, 950);
    return () => {
      clearTimeout(timer);
      clearTimeout(endTimer);
    };
  }, [onComplete]);

  const getPlayerCoords = (playerId: string) => {
    if (playerId === myId) return { x: 50, y: 82 };
    if (playerId === leftPlayerId) return { x: 15, y: 50 };
    if (playerId === topPlayerId) return { x: 50, y: 15 };
    if (playerId === rightPlayerId) return { x: 85, y: 50 };
    return { x: 50, y: 50 };
  };

  const fromCoords = getPlayerCoords(animation.fromPlayerId);
  const toCoords = getPlayerCoords(animation.toPlayerId);

  if (animation.type === "freeGive") {
    const currentX = isAnimated ? toCoords.x : fromCoords.x;
    const currentY = isAnimated ? toCoords.y : fromCoords.y;
    const scale = isAnimated ? 0.8 : 1.2;
    const rotation = isAnimated ? 360 : 0;
    const opacity = isAnimated ? 0.2 : 1;

    return (
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        <div
          className="absolute w-[70px] h-[95px] rounded-lg shadow-[0_0_25px_rgba(249,115,22,0.9)] border-2 border-orange-500 bg-stone-900 flex items-center justify-center transition-all duration-800 ease-in-out"
          style={{
            left: `${currentX}%`,
            top: `${currentY}%`,
            transform: `translate(-50%, -50%) scale(${scale}) rotate(${rotation}deg)`,
            opacity: opacity,
            backgroundImage: "url('/game-cards/backs/item-back.svg')",
            backgroundSize: "cover",
          }}
        >
          <div className="absolute inset-0 bg-orange-500/10 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  } else {
    const cardAX = isAnimated ? toCoords.x : fromCoords.x;
    const cardAY = isAnimated ? toCoords.y : fromCoords.y;
    const cardBX = isAnimated ? fromCoords.x : toCoords.x;
    const cardBY = isAnimated ? fromCoords.y : toCoords.y;
    const scale = isAnimated ? 0.8 : 1.2;
    const rotationA = isAnimated ? 360 : 0;
    const rotationB = isAnimated ? -360 : 0;
    const opacity = isAnimated ? 0.2 : 1;

    return (
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        <div
          className="absolute w-[70px] h-[95px] rounded-lg shadow-[0_0_25px_rgba(147,51,234,0.9)] border-2 border-purple-500 bg-stone-900 flex items-center justify-center transition-all duration-800 ease-in-out"
          style={{
            left: `${cardAX}%`,
            top: `${cardAY}%`,
            transform: `translate(-50%, -50%) scale(${scale}) rotate(${rotationA}deg)`,
            opacity: opacity,
            backgroundImage: "url('/game-cards/backs/item-back.svg')",
            backgroundSize: "cover",
          }}
        >
          <div className="absolute inset-0 bg-purple-500/10 rounded-lg animate-pulse" />
        </div>
        <div
          className="absolute w-[70px] h-[95px] rounded-lg shadow-[0_0_25px_rgba(59,130,246,0.9)] border-2 border-blue-500 bg-stone-900 flex items-center justify-center transition-all duration-800 ease-in-out"
          style={{
            left: `${cardBX}%`,
            top: `${cardBY}%`,
            transform: `translate(-50%, -50%) scale(${scale}) rotate(${rotationB}deg)`,
            opacity: opacity,
            backgroundImage: "url('/game-cards/backs/item-back.svg')",
            backgroundSize: "cover",
          }}
        >
          <div className="absolute inset-0 bg-blue-500/10 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }
}

// --- SidePlayerSeat ---
interface SidePlayerSeatProps {
  player: PublicPlayer;
  isTurn: boolean;
  isInteractive: boolean;
  isCardInteractive?: boolean;
  onSelectPlayer?: (id: string) => void;
  onSelectCard?: (playerId: string, itemId: string) => void;
  selectedItemId?: string;
  dealTargetId?: string;
  activeActionType?: string;
  isHorizontal?: boolean;
  helpPlacement?: "bottom" | "left" | "right" | "top";
}

export function SidePlayerSeat({
  player,
  isTurn,
  isInteractive,
  isCardInteractive = false,
  onSelectPlayer,
  onSelectCard,
  selectedItemId,
  dealTargetId,
  activeActionType,
  isHorizontal = false,
  helpPlacement = "top",
}: SidePlayerSeatProps) {
  const [showRepHelp, setShowRepHelp] = useState(false);
  const isPlayerSelected = dealTargetId === player.id;
  const isAnyPlayerSelected = Boolean(dealTargetId);
  const shouldPulse = isInteractive && !isAnyPlayerSelected;

  const publicItemsCount = player.publicItems?.length ?? 0;
  const useSmallCard = isHorizontal 
    ? (publicItemsCount > 5)
    : (publicItemsCount >= 4);

  // Top player (horizontal): 0.8x card size (w-[67px] h-[90px])
  // Left/Right players (vertical): 0.9x card size (w-[76px] h-[101px])
  const cardWidthClass = useSmallCard 
    ? (isHorizontal ? "w-[67px]" : "w-[76px]") 
    : "w-[84px]";
  const cardHeightClass = useSmallCard 
    ? (isHorizontal ? "h-[90px]" : "h-[101px]") 
    : "h-[112px]";
  const cardPaddingClass = useSmallCard ? "p-1" : "p-1.5";
  const iconSize = useSmallCard 
    ? (isHorizontal ? 22 : 25) 
    : 28;
  const nameTextClass = useSmallCard 
    ? (isHorizontal ? "text-[8px] leading-[1]" : "text-[9px] leading-[1.05]") 
    : "text-[10px] leading-[1.1]";
  const priceTextClass = useSmallCard 
    ? (isHorizontal ? "text-[8px]" : "text-[8.5px]") 
    : "text-[9px]";
  const questionTextClass = useSmallCard 
    ? (isHorizontal ? "text-sm" : "text-lg") 
    : "text-xl";
  const categoryTextClass = useSmallCard 
    ? (isHorizontal ? "text-[8px]" : "text-[8.5px]") 
    : "text-[9px]";

  const containerClass = isHorizontal 
    ? (useSmallCard 
        ? "grid grid-rows-2 grid-flow-col gap-2 justify-start overflow-x-auto no-scrollbar max-w-[580px] px-5 py-5 -mx-5 -my-5" 
        : "flex flex-row gap-4 justify-start overflow-x-auto no-scrollbar max-w-[580px] px-5 py-5 -mx-5 -my-5")
    : (useSmallCard 
        ? "grid grid-cols-4 gap-2 justify-items-center mt-2 w-full max-w-[328px]"
        : "grid grid-cols-3 gap-x-4 gap-y-3 justify-items-center mt-2 w-full max-w-[290px]");

  return (
    <div className={`flex ${isHorizontal ? "flex-row items-center gap-4" : "flex-col items-center gap-2"} relative`}>
      <div
        onClick={() => isInteractive && onSelectPlayer && onSelectPlayer(player.id)}
        className={`side-player-card transition-all w-[180px] p-3 text-center ${
          isTurn ? "active-turn" : ""
        } ${
          shouldPulse
            ? "profile-glowing-interactive pulse-active cursor-pointer hover:scale-105 shadow-lg border-amber-400/50 hover:shadow-[0_0_15px_rgba(251,191,36,0.6)]"
            : (isInteractive
                ? "cursor-pointer hover:scale-105 border-white/10 hover:border-[#ff7e36]/50"
                : "")
        } ${
          isPlayerSelected
            ? "border-[#ff7e36] bg-amber-950/60 ring-2 ring-[#ff7e36] shadow-[0_0_20px_rgba(255,126,54,0.8)] scale-112 z-10"
            : ""
        }`}
      >
        <div className="flex items-center gap-2 justify-center">
          <RankBadgeCircle rank={player.assetRank} name={player.name} size="sm" />
          <div className="truncate text-lg font-black max-w-[110px] text-white">{player.name}</div>
        </div>
        <div className="mt-2 flex justify-around text-sm font-black text-stone-300 relative">
          <span className="flex items-center gap-0.5">
            평판 {player.reputationTokens}/5
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowRepHelp(!showRepHelp);
              }}
              className="text-stone-400 hover:text-white cursor-pointer transition-colors"
              title="평판 도움말"
            >
              <HelpCircle size={12} />
            </button>
          </span>
          <span>물건 {player.itemCount}</span>

          {showRepHelp && (
            <div 
              onClick={(e) => e.stopPropagation()}
              className={`absolute z-50 w-[240px] p-2.5 bg-stone-950/95 backdrop-blur-sm border border-orange-500/35 rounded-lg text-left shadow-2xl text-[11px] font-medium space-y-1 text-stone-300 pointer-events-auto ${
                helpPlacement === "bottom"
                  ? "top-full mt-2 left-1/2 -translate-x-1/2"
                  : helpPlacement === "right"
                  ? "top-0 left-[calc(100%+12px)]"
                  : helpPlacement === "left"
                  ? "top-0 right-[calc(100%+12px)]"
                  : "bottom-full mb-2 left-1/2 -translate-x-1/2"
              }`}
            >
              <div className="font-bold text-orange-400 text-[12px] border-b border-white/5 pb-1 flex justify-between items-center">
                <span>💡 평판 토큰 규칙</span>
                <button
                  type="button"
                  onClick={() => setShowRepHelp(false)}
                  className="text-stone-400 hover:text-white cursor-pointer font-black text-[10px]"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-1 pt-1 leading-relaxed text-stone-300">
                <p>• <span className="text-orange-300 font-bold">평판 획득:</span> 거래 완료 후 상대방이 나에게 '만족' 후기를 남기면 1 증가</p>
                <p>• <span className="text-orange-300 font-bold">평판 감소:</span> 상대방이 나에게 '불만족' 후기를 남기면 내 평판이 1 감소 (불만족 후기를 남긴 상대방의 평판은 소모되지 않음)</p>
                <p>• <span className="text-orange-300 font-bold">평판 무소모:</span> 내가 상대방에게 '만족' 후기를 남겨도 내 평판은 차감되지 않습니다.</p>
                <p>• <span className="text-orange-300 font-bold">탈락 조건:</span> 평판이 0이 되면 즉시 탈락 및 패배합니다. (초기값: 3)</p>
              </div>
            </div>
          )}
        </div>
        <div className="mt-2 flex justify-center gap-3 border-t border-white/10 pt-2 text-xs text-stone-400">
          <span>👍 {player.likes}</span>
          <span>👎 {player.dislikes}</span>
        </div>
        {player.isBot && (
          <span className="absolute -top-1.5 -right-1.5 rounded themed-panel px-2 py-0.5 text-xs font-black border">
            BOT
          </span>
        )}
      </div>

      <div className={containerClass}>
        {player.publicItems && player.publicItems.map((item: ItemCardSnapshot) => {
          const isSelected = selectedItemId === item.instanceId && dealTargetId === player.id;
          const showFaceUp = item.revealed || item.id !== "";
          
          const showCategory = showFaceUp || (activeActionType === "directTrade");
          const cardTooltip = showFaceUp
            ? item.name
            : isSelected && showCategory && item.category
            ? `${categoryLabel(item.category)} 물건`
            : "알수 없음";

          const categoryColors = {
            electronics: "border-amber-500/40 bg-amber-950/20 shadow-[0_0_8px_rgba(245,158,11,0.15)]",
            fashion: "border-purple-500/40 bg-purple-950/20 shadow-[0_0_8px_rgba(168,85,247,0.15)]",
            hobby: "border-emerald-500/40 bg-emerald-950/20 shadow-[0_0_8px_rgba(16,185,129,0.15)]",
            living: "border-blue-500/40 bg-blue-950/20 shadow-[0_0_8px_rgba(59,130,246,0.15)]",
          };

          const brickTheme = "border-red-600/60 bg-red-950/30 shadow-[0_0_10px_rgba(220,38,38,0.25)]";

          const cardThemeClass = item.isBrick 
            ? brickTheme
            : (item.category ? categoryColors[item.category as keyof typeof categoryColors] : "border-stone-700 bg-stone-900/40");

          const priceText = item.marketPrice > 0 
            ? `${(item.marketPrice / 10000).toLocaleString("ko-KR")}만` 
            : (item.isBrick ? "0원" : "정가 미공개");

          return (
            <button
              key={item.instanceId}
              type="button"
              disabled={!isCardInteractive}
              onClick={() => onSelectCard && onSelectCard(player.id, item.instanceId)}
              className={`${cardWidthClass} ${cardHeightClass} border rounded-lg transition-all flex flex-col items-center justify-between ${cardPaddingClass} select-none relative ${
                isCardInteractive ? "card-glowing-interactive pulse-active cursor-pointer" : ""
              } ${
                isSelected
                  ? "selected-card-glow z-10"
                  : `${cardThemeClass} hover:scale-105 hover:border-white/40`
              }`}
              title={cardTooltip}
            >
              {showFaceUp ? (
                <>
                  <div className="flex-1 flex items-center justify-center text-stone-200">
                    {productIcon(item, iconSize)}
                  </div>
                  <div className="w-full text-center mt-1">
                    <div className={`${nameTextClass} font-black text-white whitespace-normal break-all w-full text-center`} title={item.name}>
                      {item.name}
                    </div>
                    <div className={`${priceTextClass} font-black text-amber-400 mt-0.5 leading-none`}>
                      {priceText}
                    </div>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <span className={`${questionTextClass} font-black text-stone-600`}>?</span>
                  {isSelected && showCategory && item.category && (
                    <span className={`${categoryTextClass} font-black text-amber-400 truncate w-full mt-1 animate-pulse`}>
                      {categoryLabel(item.category)}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface OnlineGameBoardProps {
  snapshot: RoomSnapshot;
  leftPlayer: PublicPlayer | null;
  topPlayer: PublicPlayer | null;
  rightPlayer: PublicPlayer | null;
  myId: string;
  isPlayerInteractive: boolean;
  isCardInteractive: boolean;
  dealTargetId: string;
  selectedItemId: string;
  onSelectPlayer: (id: string) => void;
  handleSelectOpponentCard: (playerId: string, itemId: string) => void;
  activeAnimation: FlightAnimation | null;
  setActiveAnimation: (anim: FlightAnimation | null) => void;
  myDashboard?: React.ReactNode;
  logsBox?: React.ReactNode;
  children: React.ReactNode;
}

export function OnlineGameBoard({
  snapshot,
  leftPlayer,
  topPlayer,
  rightPlayer,
  myId,
  isPlayerInteractive,
  isCardInteractive,
  dealTargetId,
  selectedItemId,
  onSelectPlayer,
  handleSelectOpponentCard,
  activeAnimation,
  setActiveAnimation,
  myDashboard,
  logsBox,
  children,
}: OnlineGameBoardProps) {
  return (
    <div className="table-wood-frame">
      <div className="seat-top">
        {topPlayer && (
          <SidePlayerSeat
            player={topPlayer}
            isTurn={topPlayer.id === snapshot.currentTurnPlayerId}
            isInteractive={isPlayerInteractive}
            isCardInteractive={isCardInteractive}
            onSelectPlayer={onSelectPlayer}
            onSelectCard={handleSelectOpponentCard}
            selectedItemId={selectedItemId}
            dealTargetId={dealTargetId}
            activeActionType={snapshot.currentActionCard?.type}
            isHorizontal
            helpPlacement="bottom"
          />
        )}
      </div>
      
      <div className="seat-left seat-left-rotated">
        {leftPlayer && (
          <SidePlayerSeat
            player={leftPlayer}
            isTurn={leftPlayer.id === snapshot.currentTurnPlayerId}
            isInteractive={isPlayerInteractive}
            isCardInteractive={isCardInteractive}
            onSelectPlayer={onSelectPlayer}
            onSelectCard={handleSelectOpponentCard}
            selectedItemId={selectedItemId}
            dealTargetId={dealTargetId}
            activeActionType={snapshot.currentActionCard?.type}
            helpPlacement="right"
          />
        )}
      </div>

      <div className="center-play-area">
        <div className="w-full max-w-2xl mx-auto h-full relative flex items-center justify-center">
          {children}
        </div>
      </div>

      <div className="seat-right seat-right-rotated">
        {rightPlayer && (
          <SidePlayerSeat
            player={rightPlayer}
            isTurn={rightPlayer.id === snapshot.currentTurnPlayerId}
            isInteractive={isPlayerInteractive}
            isCardInteractive={isCardInteractive}
            onSelectPlayer={onSelectPlayer}
            onSelectCard={handleSelectOpponentCard}
            selectedItemId={selectedItemId}
            dealTargetId={dealTargetId}
            activeActionType={snapshot.currentActionCard?.type}
            helpPlacement="left"
          />
        )}
      </div>

      {logsBox}

      {myDashboard}

      {activeAnimation && (
        <TradingCardFlightOverlay
          animation={activeAnimation}
          snapshot={snapshot}
          myId={myId}
          leftPlayerId={leftPlayer?.id}
          topPlayerId={topPlayer?.id}
          rightPlayerId={rightPlayer?.id}
          onComplete={() => setActiveAnimation(null)}
        />
      )}
    </div>
  );
}
