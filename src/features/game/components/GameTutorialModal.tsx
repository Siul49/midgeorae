import { BookOpen, Check, X } from "lucide-react";
import { useEffect, useState } from "react";

interface GameTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDoNotShowAgain: (checked: boolean) => void;
}

export function GameTutorialModal({
  isOpen,
  onClose,
  onDoNotShowAgain,
}: GameTutorialModalProps) {
  const [doNotShow, setDoNotShow] = useState(false);

  useEffect(() => {
    // 닫힐 때 상태를 전달
    if (!isOpen) {
      onDoNotShowAgain(doNotShow);
    }
  }, [isOpen, doNotShow, onDoNotShowAgain]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="motion-panel w-full max-w-lg bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-200 pb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="text-orange-600" size={24} />
            <h2 className="text-xl font-black text-stone-900">게임 플레이 가이드</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6 py-6">
          <div className="flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-black text-orange-600">
              1
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">내 턴이 오면?</h3>
              <p className="mt-1 text-sm font-semibold text-stone-600">
                우측 액션 패널에서 <strong>행동 카드를 뽑으세요.</strong> (거래 신청, 즉시 구매, 협상 등)
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-black text-orange-600">
              2
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">거래 제안하기</h3>
              <p className="mt-1 text-sm font-semibold text-stone-600">
                메인 화면에 펼쳐진 <strong>시장 매물 카드</strong> 중 원하는 것을 클릭하고 우측 패널에서 가격을 입력해 거래를 신청하세요. 상대가 수락하면 거래가 성사됩니다.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-black text-orange-600">
              3
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">직업 토큰과 특수 능력</h3>
              <p className="mt-1 text-sm font-semibold text-stone-600">
                행동을 누적하여 직업 토큰을 얻으세요.<br />
                🔍 <strong>검수자</strong>: 남의 물건 스펙 몰래 훔쳐보기<br />
                🤝 <strong>흥정가</strong>: 거래 성사 시 상대 돈 추가로 깎기<br />
                📄 <strong>신고자</strong>: 의심 유저의 거래 장부 엿보기
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-black text-orange-600">
              4
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">최종 신고 (상소문)</h3>
              <p className="mt-1 text-sm font-semibold text-stone-600">
                시장 행동 예산이 바닥나면 최종 투표가 진행됩니다. 사기를 친 것 같은 의심 유저를 찌르세요. 가장 많이 지목된 유저는 <strong>보유 자산이 대폭 삭감</strong>됩니다!
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-black text-orange-600">
              5
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">역할에 따른 승리 조건</h3>
              <p className="mt-1 text-sm font-semibold text-stone-600">
                <strong>시민</strong>은 평판을 높이고 가장 많은 돈을 모아야 합니다.<br />
                <strong>빌런</strong>은 정체를 숨긴 채 자신의 미션(예: 벽돌 판매)을 달성해야 승리합니다.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-stone-200 pt-5">
          <label className="flex cursor-pointer items-center gap-2">
            <div
              className={`flex h-5 w-5 items-center justify-center rounded border ${
                doNotShow
                  ? "border-orange-600 bg-orange-600 text-white"
                  : "border-stone-300 bg-white"
              }`}
            >
              {doNotShow && <Check size={14} />}
            </div>
            <input
              type="checkbox"
              className="hidden"
              checked={doNotShow}
              onChange={(e) => setDoNotShow(e.target.checked)}
            />
            <span className="text-sm font-bold text-stone-600">다시 보지 않기</span>
          </label>

          <button
            onClick={onClose}
            className="motion-button rounded-lg bg-stone-900 px-6 py-2.5 text-sm font-black text-white hover:bg-stone-800"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
