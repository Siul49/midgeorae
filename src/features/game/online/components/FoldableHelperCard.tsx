import {
  AlertTriangle,
  Ban,
  ChevronDown,
  ChevronUp,
  Crown,
  FileText,
  Handshake,
  Info,
  Lightbulb,
  Play,
  Search,
  Settings,
  ShoppingBag,
  ThumbsUp,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { TUTORIAL_STEPS } from "../../data/tutorial-data";

interface StepGuidePopoverProps {
  stepId: string;
  onClose: () => void;
}

function getIcon(name: string, size = 16, className = "") {
  const props = { size, className };
  switch (name) {
    case "Users":
      return <Users {...props} />;
    case "Settings":
      return <Settings {...props} />;
    case "Play":
      return <Play {...props} />;
    case "ShoppingBag":
      return <ShoppingBag {...props} />;
    case "FileText":
      return <FileText {...props} />;
    case "AlertTriangle":
      return <AlertTriangle {...props} />;
    case "Crown":
      return <Crown {...props} />;
    case "Search":
      return <Search {...props} />;
    case "Handshake":
      return <Handshake {...props} />;
    case "ThumbsUp":
      return <ThumbsUp {...props} />;
    case "Ban":
      return <Ban {...props} />;
    default:
      return <Info {...props} />;
  }
}

export function StepGuidePopover({ stepId, onClose }: StepGuidePopoverProps) {
  const stepData = TUTORIAL_STEPS.find((s) => s.id === stepId);
  if (!stepData) return null;

  return (
    <div className="w-80 bg-white border border-stone-200 rounded-2xl shadow-2xl p-4 text-left space-y-3 z-50 text-stone-900 select-none">
      {/* 팝오버 헤더 */}
      <div className="flex items-center justify-between border-b border-stone-100 pb-2">
        <div className="flex items-center gap-1.5 text-orange-600">
          <div className="rounded-lg bg-orange-50 p-1 text-orange-600">
            {getIcon(stepData.icon, 14)}
          </div>
          <span className="text-xs font-black text-stone-900">{stepData.title} 가이드</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-stone-400 hover:text-stone-600 p-1 rounded-full hover:bg-stone-100 transition-colors"
          title="닫기"
        >
          <X size={14} />
        </button>
      </div>

      {/* 가이드 설명 */}
      <div>
        <span className="text-[9px] font-bold text-stone-400 block mb-1">
          {stepData.subtitle}
        </span>
        <p className="text-xs font-semibold text-stone-600 leading-relaxed bg-stone-50 p-2.5 rounded-xl border border-stone-100">
          {stepData.description}
        </p>
      </div>

      {/* 실전 행동 팁 */}
      <div className="space-y-2 pt-1">
        <div className="text-[10px] font-black text-orange-800 uppercase tracking-wider flex items-center gap-1">
          💡 실전 행동 팁
        </div>
        <div className="space-y-1.5">
          {stepData.tips.map((tip, index) => (
            <div key={index} className="flex gap-2 items-start">
              <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[8px] font-black text-orange-600 mt-0.5">
                {index + 1}
              </div>
              <p className="text-[10px] font-bold text-stone-500 leading-normal">
                {tip}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function FoldableHelperCard({ stepId }: { stepId: string }) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  const stepData = TUTORIAL_STEPS.find((s) => s.id === stepId);
  if (!stepData) return null;

  return (
    <div className="w-full bg-orange-50/50 border border-orange-200/80 rounded-2xl shadow-sm transition-all overflow-hidden">
      {/* 요약 헤더 (클릭 시 접고 펴기) */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-orange-100/40 transition-colors focus:outline-none"
      >
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-orange-100 p-1.5 text-orange-600">
            {getIcon(stepData.icon, 16)}
          </div>
          <div>
            <span className="text-xs font-black text-stone-900">
              {stepData.title} 가이드
            </span>
            <span className="ml-2 text-[10px] font-bold text-stone-400 hidden sm:inline">
              | {stepData.subtitle}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Lightbulb size={14} className="text-amber-500 animate-bounce" />
          <span className="text-[10px] font-black text-orange-700">
            {isCollapsed ? "도움말 펼치기" : "도움말 접기"}
          </span>
          {isCollapsed ? (
            <ChevronDown size={16} className="text-stone-400" />
          ) : (
            <ChevronUp size={16} className="text-stone-400" />
          )}
        </div>
      </button>

      {/* 펼쳐진 상세 본문 */}
      {!isCollapsed && (
        <div className="px-4 pb-4 pt-1 border-t border-orange-100 animate-slide-down">
          <p className="text-xs font-semibold text-stone-600 leading-relaxed bg-white/70 p-2.5 rounded-xl border border-stone-100 mb-3">
            {stepData.description}
          </p>

          <div className="space-y-2">
            <div className="text-[10px] font-black text-orange-800 uppercase tracking-wider flex items-center gap-1">
              💡 실전 행동 팁
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {stepData.tips.map((tip, index) => (
                <div
                  key={index}
                  className="flex gap-2 bg-white/40 p-2 rounded-lg border border-orange-100/50"
                >
                  <div className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[9px] font-black text-orange-600">
                    {index + 1}
                  </div>
                  <p className="text-[11px] font-bold text-stone-600 leading-relaxed">
                    {tip}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
