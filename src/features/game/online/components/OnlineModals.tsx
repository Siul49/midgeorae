"use client";

import React from "react";
import { HelpCircle } from "lucide-react";
import { JOB_CARDS } from "../../rules/game-rules";
import { ALL_ITEMS, GOLDEN_ITEMS } from "../../data/items";

// --- 공용 모달 래퍼 컴포넌트 (디자인 시스템 통합 및 DRY 준수) ---
interface ModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  maxWidth?: string;
  children: React.ReactNode;
}

function ModalWrapper({
  isOpen,
  onClose,
  title,
  maxWidth = "420px",
  children,
}: ModalWrapperProps) {
  if (!isOpen) return null;

  return (
    <div className="settings-menu-overlay" onClick={onClose}>
      <div
        className="themed-board-modal flex flex-col relative !p-6"
        style={{ maxWidth, width: "95%", outline: "none" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-orange-500/20 flex-shrink-0">
          <h3 className="text-lg font-black text-orange-400 flex items-center gap-2">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="themed-text-muted hover:text-white font-black text-sm cursor-pointer"
          >
            닫기
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// --- HelpModal ---
interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title={
        <>
          <HelpCircle size={20} /> 믿거래 도움말
        </>
      }
      maxWidth="512px"
    >
      <div className="space-y-3 text-xs text-stone-300 overflow-y-auto max-h-[300px] leading-relaxed pr-1 select-text">
        <p className="font-extrabold text-orange-400 text-sm">중고거래를 진행하며 숨어 있는 빌런을 찾는 3~4인용 추론 웹 보드게임입니다.</p>
        <div>
          <h4 className="font-black text-white text-xs mb-1">🎮 게임 진행 순서:</h4>
          <ol className="list-decimal list-inside space-y-1">
            <li><strong>행동 카드 뽑기</strong>: 자기 턴에 행동 카드를 뽑습니다. (거래 신청, 보호 등)</li>
            <li><strong>거래 제안/액션</strong>: 뽑은 카드에 따라 거래를 하거나 기타 액션을 실행합니다.</li>
            <li><strong>거래 수락/취소</strong>: 거래 상대방과 서로 카드를 내어 쿨거래 시 거래 성공, 어느 한쪽이라도 취소 시 실패합니다.</li>
            <li><strong>거래 후 평판 평가</strong>: 거래 완료 후 만족/불만족 리뷰를 남겨 상대방의 평판을 올리거나 깎습니다.</li>
            <li><strong>시장 마감 &amp; 최종 신고</strong>: 액션 제한 횟수가 모두 소진되면 의심스러운 빌런을 지목해 최종 고발합니다.</li>
          </ol>
        </div>
        <div className="border-t border-white/10 pt-2">
          <h4 className="font-black text-white text-xs mb-1">🎭 역할 설명:</h4>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>시민</strong>: 정상 거래를 하며 빌런을 찾습니다.</li>
            <li><strong>빌런</strong>: 사기 거래(벽돌 판매 등)나 가짜 평판 테러 등을 통해 정체를 숨기고 시민들을 교란합니다.</li>
          </ul>
        </div>
      </div>
    </ModalWrapper>
  );
}

// --- PriceListModal ---
interface PriceListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PriceListModal({ isOpen, onClose }: PriceListModalProps) {
  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title="📋 모든 물건 정가표"
      maxWidth="1100px"
    >
      <div className="themed-panel border border-orange-500/20 p-2.5 rounded-lg mb-3 text-[13px] leading-relaxed mx-1 flex-shrink-0 flex flex-col md:flex-row md:justify-between md:items-center gap-2">
        <div>
          <p className="font-black text-orange-300 mb-0.5 text-[14px]">💡 물건 상태 &amp; 자산 가치 시스템</p>
          <p className="text-stone-300">모든 물건 카드의 상태는 게임 시작 시 무작위로 부여됩니다. 각 상태에 따라 총 자산에 반영되는 가치가 다릅니다:</p>
        </div>
        <ul className="flex items-center gap-4 font-bold text-[12px] shrink-0 bg-stone-950/40 px-3 py-1.5 rounded-md border border-white/5">
          <li>🟢 <span className="text-emerald-400">미개봉 (Mint)</span>: 정가의 <span className="text-orange-300">80%</span> 가치 반영</li>
          <li>🟡 <span className="text-amber-400">사용감 있음 (Used)</span>: 정가의 <span className="text-orange-300">60%</span> 가치 반영</li>
          <li>🔴 <span className="text-red-400">하자 있음 (Broken)</span>: 정가의 <span className="text-orange-300">40%</span> 가치 반영</li>
        </ul>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5 text-[14px] select-text pr-1 flex-1">
        {(["electronics", "fashion", "hobby", "living", "golden"] as const).map((cat) => {
          const items = cat === "golden"
            ? GOLDEN_ITEMS
            : ALL_ITEMS.filter((item) => item.category === cat);
          
          const catName = {
            electronics: "🔌 전자제품",
            fashion: "👜 패션잡화",
            hobby: "🎨 취미/레저",
            living: "🪑 생활용품",
            golden: "✨ 희귀/황금",
          }[cat];

          const cardBg = cat === "golden"
            ? "bg-amber-950/25 border-amber-500/30 hover:bg-amber-950/45 text-amber-200"
            : "bg-[rgba(0,0,0,0.25)] border-white/5 hover:bg-[rgba(0,0,0,0.4)] text-stone-200";

          return (
            <div key={cat} className="space-y-1.5 flex flex-col bg-black/10 p-2.5 rounded-lg border border-white/5">
              <h4 className="font-extrabold text-orange-300 text-[13px] px-1 pb-1 border-b border-orange-500/20">
                {catName}
              </h4>
              <div className="flex flex-col gap-1.5 mt-1">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-1.5 rounded border ${cardBg} transition-colors`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-base shrink-0" role="img" aria-label={item.name}>
                        {item.emoji}
                      </span>
                      <span className="font-bold leading-tight truncate text-[12px] text-stone-200" title={item.name}>
                        {item.name}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-black text-amber-500 text-[12px]">
                        {Math.round(item.marketPrice / 10000)}만
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </ModalWrapper>
  );
}

// --- MissionListModal ---
interface MissionListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MissionListModal({ isOpen, onClose }: MissionListModalProps) {
  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title="🎭 모든 직업 미션표"
      maxWidth="1100px"
    >
      <p className="text-stone-400 font-bold mb-2.5 px-1 text-[13px]">
        시민 승리 시 아래 비밀 미션을 단독으로 달성한 플레이어가 최종 우승자가 됩니다. (동점/미달성 시 자산 순)
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 text-[14px] select-text animate-fade-in flex-1">
        {/* Row 1: Villain (😈) spanning 2 columns, then Developer, Model */}
        <div className="col-span-1 md:col-span-2 p-2.5 rounded-xl border border-red-500/20 bg-red-950/15 flex items-start gap-2.5 hover:bg-white/5 transition-colors">
          <span className="text-xl pt-0.5 shrink-0" role="img" aria-label="빌런">
            😈
          </span>
          <div className="space-y-0.5">
            <div className="font-extrabold text-red-400 text-[14px]">
              빌런 (Villain)
            </div>
            <div className="font-bold text-stone-300 leading-snug text-[12px]">
              최종 승리 조건: 발각되지 않고 벽돌 2개를 사기거래 성공할 것 (다른 플레이어에게 벽돌 거래 성사 2회)
            </div>
          </div>
        </div>

        {/* Developer, Model */}
        {(() => {
          const devAndModel = JOB_CARDS.filter(job => job.id === "developer" || job.id === "model");
          return devAndModel.map((job) => {
            const emoji = job.id === "developer" ? "💻" : "👜";
            return (
              <div
                key={job.id}
                className="p-2.5 rounded-xl border border-orange-500/15 bg-orange-950/5 flex items-start gap-2.5 hover:bg-white/5 transition-colors"
              >
                <span className="text-xl pt-0.5 shrink-0" role="img" aria-label={job.title}>
                  {emoji}
                </span>
                <div className="space-y-0.5">
                  <div className="font-extrabold text-white text-[14px]">
                    {job.title}
                  </div>
                  <div className="font-bold text-stone-300 leading-snug text-[12px]">
                    {job.description}
                  </div>
                </div>
              </div>
            );
          });
        })()}

        {/* Row 2: Housewife, Brick-collector, Collector, Citizen */}
        {(() => {
          const restJobs = JOB_CARDS.filter(job => job.id !== "developer" && job.id !== "model");
          return restJobs.map((job) => {
            const emoji = {
              housewife: "🪑",
              "brick-collector": "🧱",
              collector: "📦",
              citizen: "👑",
            }[job.id] || "🎭";

            const borderGlow = job.id === "citizen"
              ? "border-amber-500/20 bg-amber-950/10"
              : "border-orange-500/15 bg-orange-950/5";

            return (
              <div
                key={job.id}
                className={`p-2.5 rounded-xl border ${borderGlow} flex items-start gap-2.5 hover:bg-white/5 transition-colors`}
              >
                <span className="text-xl pt-0.5 shrink-0" role="img" aria-label={job.title}>
                  {emoji}
                </span>
                <div className="space-y-0.5">
                  <div className="font-extrabold text-white text-[14px]">
                    {job.title}
                  </div>
                  <div className="font-bold text-stone-300 leading-snug text-[12px]">
                    {job.description}
                  </div>
                </div>
              </div>
            );
          });
        })()}
      </div>
    </ModalWrapper>
  );
}

// --- Combined OnlineModals Component ---
interface OnlineModalsProps {
  isHelpOpen: boolean;
  setIsHelpOpen: (open: boolean) => void;
  isPriceListOpen: boolean;
  setIsPriceListOpen: (open: boolean) => void;
  isMissionListOpen: boolean;
  setIsMissionListOpen: (open: boolean) => void;
}

export function OnlineModals({
  isHelpOpen,
  setIsHelpOpen,
  isPriceListOpen,
  setIsPriceListOpen,
  isMissionListOpen,
  setIsMissionListOpen,
}: OnlineModalsProps) {
  return (
    <>
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <PriceListModal isOpen={isPriceListOpen} onClose={() => setIsPriceListOpen(false)} />
      <MissionListModal isOpen={isMissionListOpen} onClose={() => setIsMissionListOpen(false)} />
    </>
  );
}
