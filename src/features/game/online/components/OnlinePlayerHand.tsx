"use client";

import React, { useState } from "react";
import { HelpCircle } from "lucide-react";
import type {
  PublicPlayer,
  ItemCardSnapshot,
  RoomSnapshot,
  PlayerRole,
  ActionCardSnapshot,
} from "@/features/game/server/types";
import { moneyLabel, conditionLabel, productIcon, isTradeRequestAction, RankBadgeCircle } from "./OnlineHelpers";
import { getFakeItemForBrick, getBrickFakeCondition } from "../../domain/results";

// --- Sub-components for OnlinePlayerHand ---
export function FrameStat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="frame-stat">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-100/55">
        {label}
      </div>
      <div
        className={`mt-1 truncate text-2xl font-black ${
          accent ? "text-green-400" : "text-amber-50"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

export function FrameIconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="motion-button frame-icon-button"
      title={label}
    >
      <span>{children}</span>
      <span className="text-[10px] font-black">{label}</span>
    </button>
  );
}

export function TableChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="table-chip gap-2 px-3 py-1 text-xs font-black text-stone-700">
      <span className="text-stone-500">{label}</span>
      <span>{value}</span>
    </div>
  );
}

export function roleLabel(role: PlayerRole | undefined) {
  if (role === "villain") return "빌런";
  if (role === "citizen") return "시민";
  return "미정";
}

export function roleDescription(role: PlayerRole | undefined) {
  if (role === "villain") {
    return "당신은 빌런입니다. 이 정보는 본인 화면에만 보입니다.";
  }
  if (role === "citizen") {
    return "당신은 시민입니다. 거래 기록과 평판을 보고 빌런을 찾아내세요.";
  }
  return "게임이 시작되면 내 역할이 여기에 공개됩니다.";
}

interface MyDashboardProps {
  me: RoomSnapshot["me"];
  myHand: ItemCardSnapshot[];
  isMyTurn: boolean;
  selectedItemId: string;
  setSelectedItemId: (value: string) => void;
  likes: number;
  dislikes: number;
  villainScamCount?: number;
  activeActionType?: string;
}


export function MyDashboard({
  me,
  myHand,
  isMyTurn,
  selectedItemId,
  setSelectedItemId,
  likes,
  dislikes,
  villainScamCount = 0,
  activeActionType,
}: MyDashboardProps) {
  const [showJob, setShowJob] = useState(false);
  const [showRepHelp, setShowRepHelp] = useState(false);
  const [cardOrder, setCardOrder] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  if (!me) return null;
  const isVillain = me.role === "villain";

  // Keep cardOrder in sync with myHand
  React.useEffect(() => {
    const handIds = myHand.map((item) => item.instanceId);
    setCardOrder((prev) => {
      const activePrev = prev.filter((id) => handIds.includes(id));
      const newIds = handIds.filter((id) => !activePrev.includes(id));
      return [...activePrev, ...newIds];
    });
  }, [myHand]);

  // Sort hand cards based on custom cardOrder state
  const sortedHand = [...myHand].sort((a, b) => {
    const idxA = cardOrder.indexOf(a.instanceId);
    const idxB = cardOrder.indexOf(b.instanceId);
    return idxA - idxB;
  });

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    setCardOrder((prev) => {
      const updated = [...prev];
      const [draggedItem] = updated.splice(draggedIndex, 1);
      updated.splice(index, 0, draggedItem);
      return updated;
    });
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="mx-auto w-fit max-w-full flex items-center gap-3 h-full px-4 text-stone-100">
      {/* Left: Profile Card */}
      <div className="relative shrink-0 select-none">
        <div
          className={`side-player-card transition-all w-[216px] p-3 text-center ${
            isMyTurn ? "active-turn shadow-[0_0_15px_rgba(249,115,22,0.4)] border-orange-500/50" : ""
          }`}
        >
          <div className="flex items-center gap-2.5 justify-center">
            <RankBadgeCircle rank={me.assetRank} name={me.name} size="lg" />
            <div className="truncate text-lg font-black max-w-[130px] text-white">
              {me.name} (나)
            </div>
          </div>
          <div className="mt-1.5 flex justify-around items-center text-sm font-black text-stone-300">
            <span className="flex items-center gap-1">
              평판 {me.reputationTokens ?? 0}/5
              <button
                type="button"
                onClick={() => setShowRepHelp(!showRepHelp)}
                className="text-stone-400 hover:text-white cursor-pointer transition-colors"
                title="평판 도움말"
              >
                <HelpCircle size={13.5} />
              </button>
            </span>
            <span>물건 {myHand.length}</span>
          </div>
          <div className="mt-1.5 flex justify-center gap-4 border-t border-white/10 pt-1.5 text-sm text-stone-400">
            <span>👍 {likes}</span>
            <span>👎 {dislikes}</span>
          </div>
          <button
            type="button"
            onClick={() => setShowJob(!showJob)}
            className="mt-2 w-full py-1.5 themed-header-button rounded text-xs font-black transition-colors cursor-pointer border"
          >
            {showJob ? "직업/미션 닫기 🔒" : "내 직업 보기 👀"}
          </button>
        </div>

        {/* Floating Reputation Help box */}
        {showRepHelp && (
          <div className="absolute bottom-0 left-[calc(100%+12px)] z-30 w-[300px] flex flex-col gap-2 p-3 bg-stone-950/95 backdrop-blur-sm border border-orange-500/30 shadow-2xl rounded-lg select-text">
            <div className="flex items-center justify-between border-b border-white/5 pb-1">
              <span className="text-[13px] text-orange-400 font-bold">💡 평판 토큰 규칙</span>
              <button
                type="button"
                onClick={() => setShowRepHelp(false)}
                className="text-stone-400 hover:text-white cursor-pointer font-black text-xs"
              >
                ✕
              </button>
            </div>
            <div className="space-y-1.5 pt-1 text-xs leading-relaxed text-stone-300 text-left">
              <p>• <span className="text-orange-300 font-bold">평판 획득:</span> 거래 완료 후 상대방이 나에게 '만족' 후기를 남기면 1 증가합니다.</p>
              <p>• <span className="text-orange-300 font-bold">평판 감소:</span> 상대방이 나에게 '불만족' 후기를 남기면 내 평판이 1 감소합니다. (불만족 후기를 남긴 상대방의 평판은 소모되지 않음)</p>
              <p>• <span className="text-orange-300 font-bold">평판 무소모:</span> 내가 상대방에게 '만족' 후기를 남겨도 내 평판은 차감되지 않습니다.</p>
              <p>• <span className="text-orange-300 font-bold">탈락 조건:</span> 평판이 0이 되면 즉시 게임에서 탈락하고 패배합니다. (초기값: 3)</p>
            </div>
          </div>
        )}

        {/* Floating Job/Mission Info box - Rendered absolutely above the profile card to prevent shifting the hand cards */}
        {showJob && (
          <div className="absolute bottom-[calc(100%+12px)] left-0 z-30 w-[348px] flex flex-col gap-2 p-3 bg-stone-950/95 backdrop-blur-sm border border-purple-500/30 shadow-2xl rounded-lg select-text max-h-[180px] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/5 pb-1">
              <span className="text-[13px] text-stone-300 font-bold">
                직업: <strong className="text-purple-400">{me.job?.title ?? "없음"}</strong>
              </span>
              <div className={`px-2 py-0.5 rounded text-[11.5px] font-black uppercase tracking-wider ${isVillain ? "bg-red-900/80 text-red-200" : "bg-blue-900/80 text-blue-200"}`}>
                {roleLabel(me.role)}
              </div>
            </div>
            {isVillain ? (
              <div className="text-[13px] leading-tight space-y-1">
                <div className="text-red-400 font-black">🔥 빌런 미션: {me.mission ?? "대기 중..."}</div>
                <div className="text-orange-400 font-extrabold">🎯 사기 판매 성공 횟수: {villainScamCount} / 2회</div>
                {me.job && <div className="text-[11.5px] text-stone-300 font-bold border-t border-red-900/20 pt-0.5">행동강령: {me.job.description}</div>}
              </div>
            ) : (
              me.job && (
                <div className="text-[13px] font-black leading-tight text-purple-400">
                  ✨ 시민 미션: {me.job.description}
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* Right: Cards Row - Left-aligned within the centered container to keep positions stable */}
      <div className="flex-1 flex flex-col justify-center h-full min-w-0 py-1">
        <div className="flex items-center justify-start gap-4 overflow-x-auto overflow-y-hidden min-h-0 px-4 py-6 -my-4 h-[calc(100%+32px)] w-full no-scrollbar">
          {sortedHand.length === 0 ? (
            <div className="text-xs text-stone-500 font-bold select-none">게임 시작 대기 중...</div>
          ) : (
            sortedHand.map((item, index) => {
              const selected = selectedItemId === item.instanceId && (activeActionType === "saleRequest" || activeActionType === "recycle");
              const isDragging = draggedIndex === index;
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

              const isHandCardInteractive = isMyTurn && (activeActionType === "saleRequest" || activeActionType === "recycle");
              const isThisCardInteractive = isHandCardInteractive && (!selectedItemId || selected);

              return (
                <button
                  key={item.instanceId}
                  type="button"
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  onClick={() => {
                    if (isHandCardInteractive) {
                      setSelectedItemId(item.instanceId);
                    }
                  }}
                  className={`motion-button flex flex-col items-center justify-between border rounded-lg p-2 text-center transition-all w-[100px] h-[134px] shrink-0 select-none ${
                    isDragging ? "opacity-30 scale-95 border-dashed border-orange-500/50" : "cursor-grab active:cursor-grabbing"
                  } ${
                    selected
                      ? "selected-card-glow z-10"
                      : `${cardThemeClass} hover:scale-105 hover:border-white/40 ${isThisCardInteractive ? "card-glowing-interactive pulse-active cursor-pointer" : ""}`
                  }`}
                >
                  <div className="text-[34px] leading-none text-stone-200 flex-1 flex items-center justify-center pointer-events-none">
                    {productIcon(item, 34)}
                  </div>
                  <div className="w-full text-center mt-1 pointer-events-none">
                    <div className="text-[12px] font-black text-white whitespace-normal break-all leading-[1.1] w-full text-center" title={item.name}>
                      {item.name}
                    </div>
                    <div className="text-[11px] font-black text-orange-400 truncate w-full mt-0.5 leading-none">
                      {item.isBrick ? "0원" : (item.marketPrice > 0 ? moneyLabel(item.marketPrice) : "정가 미공개")}
                    </div>
                    {!item.isBrick && item.condition && (
                      <div className="text-[10px] font-bold text-stone-400 truncate w-full leading-none mt-1">
                        {conditionLabel(item.condition)}
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// --- Main OnlinePlayerHand Component ---
interface OnlinePlayerHandProps {
  snapshot: RoomSnapshot;
  me: RoomSnapshot["me"];
  myHand: ItemCardSnapshot[];
  totalAssets: number;
  isMyTurn: boolean;
  selectedItemId: string;
  setSelectedItemId: (value: string) => void;
}

export function OnlinePlayerHand({
  snapshot,
  me,
  myHand,
  totalAssets,
  isMyTurn,
  selectedItemId,
  setSelectedItemId,
}: OnlinePlayerHandProps) {
  if (!me) return null;

  const [showAssetDetails, setShowAssetDetails] = useState(false);

  const likes = snapshot.players.find((p) => p.id === me.id)?.likes ?? 0;
  const dislikes = snapshot.players.find((p) => p.id === me.id)?.dislikes ?? 0;
  const villainScamCount = snapshot.villainScamCount ?? 0;

  const isVillain = me.role === "villain";
  const { brickCount, brickValue, normalItemsInfo } = React.useMemo(() => {
    let bCount = 0;
    let bValue = 0;
    const nInfo: { name: string; value: number }[] = [];

    const remainingActions = snapshot.marketActionLimit - snapshot.usedActionCount;
    const isLastTurns = snapshot.marketActionLimit > 0 && remainingActions <= 4;
    const isFinished = snapshot.status === "reporting" || snapshot.status === "finished";

    myHand.forEach((item) => {
      if (item.isBrick) {
        bCount += 1;
        if (isVillain && !isLastTurns && !isFinished) {
          const fakePrice = item.disguiseMarketPrice ?? getFakeItemForBrick(item.instanceId).marketPrice;
          const fakeCond = item.disguiseCondition ?? getBrickFakeCondition(item.instanceId);
          let multiplier = 1.0;
          if (fakeCond === "mint") {
            multiplier = 0.8;
          } else if (fakeCond === "used") {
            multiplier = 0.6;
          } else if (fakeCond === "broken" || fakeCond === "defective") {
            multiplier = 0.4;
          }
          bValue += fakePrice * multiplier;
        }
      } else {
        let multiplier = 1.0;
        if (item.condition === "mint") {
          multiplier = 0.8;
        } else if (item.condition === "used") {
          multiplier = 0.6;
        } else if (item.condition === "broken" || item.condition === "defective") {
          multiplier = 0.4;
        }
        nInfo.push({
          name: item.name,
          value: (item.marketPrice ?? 0) * multiplier
        });
      }
    });

    return {
      brickCount: bCount,
      brickValue: bValue,
      normalItemsInfo: nInfo,
    };
  }, [myHand, isVillain, snapshot]);

  return (
    <div className="seat-bottom relative">
      {showAssetDetails && (
        <div className="absolute bottom-[calc(100%-4px)] left-1/2 -translate-x-1/2 z-[40] w-[260px] flex flex-col gap-2.5 p-3.5 bg-stone-950/95 backdrop-blur-md border border-amber-500/30 shadow-[0_0_25px_rgba(245,158,11,0.2)] rounded-xl text-left select-text">
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
            <span className="text-[13px] text-amber-400 font-black flex items-center gap-1">💰 자산 정산 상세 내역</span>
            <button
              type="button"
              onClick={() => setShowAssetDetails(false)}
              className="text-stone-400 hover:text-white cursor-pointer font-black text-xs h-5 w-5 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            >
              ✕
            </button>
          </div>
          <div className="space-y-2 pt-1 text-xs text-stone-300">
            <div className="flex justify-between">
              <span className="text-stone-400">💵 보유 현금</span>
              <span className="font-bold text-amber-400">{moneyLabel(me.money ?? 0)}</span>
            </div>

            {brickCount > 0 && (
              <div className="flex justify-between border-t border-white/5 pt-1.5">
                <span className="text-stone-400">🧱 벽돌 ({brickCount}개 합산)</span>
                <span className="font-bold text-stone-300">{moneyLabel(brickValue)}</span>
              </div>
            )}

            {normalItemsInfo.length > 0 && (
              <div className="border-t border-white/5 pt-1.5 space-y-1.5">
                {normalItemsInfo.map((item, idx) => (
                  <div key={idx} className="flex justify-between gap-2">
                    <span className="truncate text-stone-400">🏷️ {item.name}</span>
                    <span className="font-semibold text-stone-200 shrink-0">{moneyLabel(item.value)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between border-t border-amber-500/20 pt-2 font-black text-[13px] text-amber-300">
              <span>🧮 총 합계</span>
              <span>{moneyLabel(totalAssets)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="asset-banner asset-banner-large flex items-center gap-2">
        <span className="flex items-center gap-1.5">
          💰 총 자산: <strong className="text-amber-300 font-extrabold">{moneyLabel(totalAssets)}</strong>
          <button
            type="button"
            onClick={() => setShowAssetDetails(!showAssetDetails)}
            className="text-amber-500/80 hover:text-amber-400 cursor-pointer transition-colors p-0.5 hover:bg-amber-500/10 rounded flex items-center justify-center"
            title="자산 정산 상세 내역 보기"
          >
            <HelpCircle size={14} />
          </button>
        </span>
        <span className="text-stone-500 font-normal mx-1">|</span>
        <span>💵 보유 현금: <strong className="text-amber-400 font-black">{moneyLabel(me.money ?? 0)}</strong></span>
      </div>
      <div className="w-full h-[168px] min-w-0">
        <MyDashboard
          me={me}
          myHand={myHand}
          isMyTurn={isMyTurn}
          selectedItemId={selectedItemId}
          setSelectedItemId={setSelectedItemId}
          likes={likes}
          dislikes={dislikes}
          villainScamCount={villainScamCount}
          activeActionType={snapshot.currentActionCard?.type}
        />
      </div>
    </div>
  );
}
