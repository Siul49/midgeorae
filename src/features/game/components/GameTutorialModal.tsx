import {
  AlertTriangle,
  Ban,
  BookOpen,
  Check,
  ChevronRight,
  Crown,
  FileText,
  Handshake,
  Info,
  Play,
  Search,
  Settings,
  ShoppingBag,
  ThumbsUp,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import {
  JOB_GUIDES,
  ROLE_GUIDES,
  TUTORIAL_STEPS,
} from "../data/tutorial-data";

interface GameTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  // 전체 설명서 모드 여부
  isFullManual?: boolean;
  // 단계별 튜토리얼용 stepId
  stepId?: string;
  // 다시 보지 않기 콜백
  onDoNotShowAgain?: (checked: boolean, stepId?: string) => void;
}

function getIcon(name: string, size = 24, className = "") {
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

export function GameTutorialModal({
  isOpen,
  onClose,
  isFullManual = false,
  stepId,
  onDoNotShowAgain,
}: GameTutorialModalProps) {
  const [doNotShow, setDoNotShow] = useState(false);
  const [activeTab, setActiveTab] = useState<"steps" | "jobs" | "roles">("steps");
  const [userSelectedStepId, setUserSelectedStepId] = useState<string | null>(null);

  const selectedStepId = userSelectedStepId || stepId || "waiting";

  const handleClose = () => {
    if (onDoNotShowAgain && stepId) {
      onDoNotShowAgain(doNotShow, stepId);
    }
    onClose();
  };

  if (!isOpen) return null;

  // 전체 백과사전 가이드북 모드
  if (isFullManual || !stepId) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
        <div className="motion-panel w-full max-w-4xl bg-stone-50 rounded-2xl shadow-2xl overflow-hidden border border-stone-200 flex flex-col max-h-[85vh]">
          {/* 헤더 */}
          <div className="flex items-center justify-between border-b border-stone-200 bg-white px-6 py-4">
            <div className="flex items-center gap-2">
              <BookOpen className="text-orange-600 animate-pulse" size={24} />
              <h2 className="text-xl font-black text-stone-900">믿거래 백과사전 가이드북</h2>
            </div>
            <button
              onClick={handleClose}
              className="rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* 탭 네비게이션 */}
          <div className="flex border-b border-stone-200 bg-white">
            <button
              onClick={() => setActiveTab("steps")}
              className={`flex-1 py-3 text-center text-sm font-black transition-all border-b-2 ${
                activeTab === "steps"
                  ? "border-orange-600 text-orange-600 bg-orange-50/30"
                  : "border-transparent text-stone-500 hover:text-stone-800 hover:bg-stone-50"
              }`}
            >
              🎮 게임 진행 단계
            </button>
            <button
              onClick={() => setActiveTab("jobs")}
              className={`flex-1 py-3 text-center text-sm font-black transition-all border-b-2 ${
                activeTab === "jobs"
                  ? "border-orange-600 text-orange-600 bg-orange-50/30"
                  : "border-transparent text-stone-500 hover:text-stone-800 hover:bg-stone-50"
              }`}
            >
              🔍 직업 능력
            </button>
            <button
              onClick={() => setActiveTab("roles")}
              className={`flex-1 py-3 text-center text-sm font-black transition-all border-b-2 ${
                activeTab === "roles"
                  ? "border-orange-600 text-orange-600 bg-orange-50/30"
                  : "border-transparent text-stone-500 hover:text-stone-800 hover:bg-stone-50"
              }`}
            >
              👥 역할 & 승리 조건
            </button>
          </div>

          {/* 콘텐츠 영역 */}
          <div className="flex-1 overflow-y-auto p-6 min-h-[300px]">
            {activeTab === "steps" && (
              <div className="grid md:grid-cols-[240px_1fr] gap-6 h-full">
                {/* 왼쪽 사이드 탭 리스트 */}
                <div className="space-y-1 border-r border-stone-200 pr-4">
                  {TUTORIAL_STEPS.map((step) => {
                    const isSelected = selectedStepId === step.id;
                    return (
                      <button
                        key={step.id}
                        onClick={() => setUserSelectedStepId(step.id)}
                        className={`w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs font-black transition-all ${
                          isSelected
                            ? "bg-orange-600 text-white shadow-md transform scale-[1.02]"
                            : "bg-white text-stone-700 hover:bg-stone-200 border border-stone-200"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {getIcon(step.icon, 16, isSelected ? "text-white" : "text-orange-600")}
                          <span>{step.title}</span>
                        </div>
                        <ChevronRight size={14} className={isSelected ? "text-white" : "text-stone-400"} />
                      </button>
                    );
                  })}
                </div>

                {/* 오른쪽 상세 화면 */}
                <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-inner flex flex-col justify-between">
                  {(() => {
                    const activeStep = TUTORIAL_STEPS.find((s) => s.id === selectedStepId);
                    if (!activeStep) return null;
                    return (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 border-b border-stone-100 pb-3">
                          <div className="rounded-xl bg-orange-100 p-3 text-orange-600">
                            {getIcon(activeStep.icon, 28)}
                          </div>
                          <div>
                            <h3 className="text-lg font-black text-stone-900">{activeStep.title}</h3>
                            <p className="text-xs font-bold text-stone-500">{activeStep.subtitle}</p>
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-stone-700 leading-relaxed bg-stone-50 p-3 rounded-lg border border-stone-100">
                          {activeStep.description}
                        </p>
                        <div className="space-y-2">
                          <h4 className="text-xs font-black text-orange-800 uppercase tracking-wide">💡 이 단계의 핵심 꿀팁</h4>
                          <ul className="space-y-2">
                            {activeStep.tips.map((tip, index) => (
                              <li key={index} className="flex gap-2 text-xs font-bold text-stone-600">
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[10px] font-black text-orange-600">
                                  {index + 1}
                                </span>
                                <span className="leading-5">{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {activeTab === "jobs" && (
              <div className="grid md:grid-cols-3 gap-6">
                {JOB_GUIDES.map((job) => (
                  <div key={job.id} className="bg-white rounded-2xl border border-stone-200 p-5 shadow-md flex flex-col justify-between hover:shadow-lg transition-shadow">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                        <div className="rounded-xl bg-orange-100 p-2.5 text-orange-600">
                          {getIcon(job.icon, 22)}
                        </div>
                        <h3 className="text-base font-black text-stone-900">{job.title}</h3>
                      </div>
                      <p className="text-xs font-bold text-stone-500 leading-relaxed">{job.description}</p>
                    </div>
                    <div className="mt-4 rounded-xl bg-orange-50/60 border border-orange-100 p-3">
                      <div className="text-[10px] font-black text-orange-800 uppercase">보유 특수능력</div>
                      <p className="mt-1 text-xs font-bold text-orange-950 leading-relaxed">{job.effect}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "roles" && (
              <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                {ROLE_GUIDES.map((role) => {
                  const isVillain = role.id === "villain";
                  return (
                    <div
                      key={role.id}
                      className={`bg-white rounded-2xl border-2 p-6 shadow-md flex flex-col justify-between ${
                        isVillain
                          ? "border-red-200 hover:border-red-400"
                          : "border-emerald-200 hover:border-emerald-400"
                      }`}
                    >
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 border-b border-stone-100 pb-3">
                          <div className={`rounded-xl p-3 ${isVillain ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"}`}>
                            {getIcon(role.icon, 26)}
                          </div>
                          <div>
                            <h3 className={`text-lg font-black ${isVillain ? "text-red-950" : "text-emerald-950"}`}>{role.title}</h3>
                            <p className="text-xs font-bold text-stone-500">역할 요약</p>
                          </div>
                        </div>
                        <p className="text-xs font-bold text-stone-600 leading-relaxed">{role.description}</p>
                      </div>
                      <div className={`mt-5 rounded-xl border p-4 ${isVillain ? "bg-red-50/60 border-red-100" : "bg-emerald-50/60 border-emerald-100"}`}>
                        <div className={`text-[10px] font-black uppercase ${isVillain ? "text-red-800" : "text-emerald-800"}`}>승리 조건</div>
                        <p className="mt-1 text-xs font-bold text-stone-900 leading-relaxed">{role.winCondition}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-stone-200 bg-white px-6 py-4 flex justify-end">
            <button
              onClick={handleClose}
              className="motion-button rounded-xl bg-stone-900 px-6 py-2.5 text-sm font-black text-white hover:bg-stone-800 shadow-md"
            >
              가이드북 닫기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 특정 단계별 콤팩트 가이드 모달
  const currentStep = TUTORIAL_STEPS.find((s) => s.id === stepId);
  if (!currentStep) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="motion-panel w-full max-w-md bg-white p-6 shadow-2xl rounded-2xl border border-stone-150">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-orange-100 p-2 text-orange-600">
              {getIcon(currentStep.icon, 20)}
            </div>
            <div>
              <h2 className="text-base font-black text-stone-900">{currentStep.title}</h2>
              <p className="text-[10px] font-bold text-stone-400">{currentStep.subtitle}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* 바디 설명 */}
        <div className="space-y-4 py-5">
          <div className="rounded-xl bg-stone-50 border border-stone-100 p-3.5">
            <p className="text-xs font-semibold text-stone-600 leading-relaxed">
              {currentStep.description}
            </p>
          </div>

          <div className="space-y-2.5">
            <h3 className="text-xs font-black text-orange-800 uppercase tracking-wide">💡 행동 가이드 팁</h3>
            <div className="space-y-2">
              {currentStep.tips.map((tip, index) => (
                <div key={index} className="flex gap-2">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[10px] font-black text-orange-600">
                    {index + 1}
                  </div>
                  <p className="text-xs font-bold text-stone-600 leading-5">{tip}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-between border-t border-stone-100 pt-4">
          <label className="flex cursor-pointer items-center gap-2 select-none group">
            <div
              className={`flex h-4.5 w-4.5 items-center justify-center rounded border transition-colors ${
                doNotShow
                  ? "border-orange-600 bg-orange-600 text-white"
                  : "border-stone-300 bg-white group-hover:border-orange-400"
              }`}
            >
              {doNotShow && <Check size={12} strokeWidth={3} />}
            </div>
            <input
              type="checkbox"
              className="hidden"
              checked={doNotShow}
              onChange={(e) => setDoNotShow(e.target.checked)}
            />
            <span className="text-xs font-bold text-stone-500 group-hover:text-stone-800 transition-colors">
              이 단계 설명 다시 보지 않기
            </span>
          </label>

          <button
            onClick={handleClose}
            className="motion-button rounded-xl bg-stone-900 px-5 py-2 text-xs font-black text-white hover:bg-stone-800 shadow-sm"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
