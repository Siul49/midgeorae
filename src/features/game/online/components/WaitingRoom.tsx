import { Users, Play } from "lucide-react";
import Image from "next/image";
import { ACTION_PREVIEW_CARDS, CARD_BACK } from "../constants/ui-constants";
import { MAX_PLAYERS, MIN_PLAYERS } from "../../rules/game-rules";
import type { RoomMode } from "../../server/types/game-server-types";

function TableActionCard({
  title,
  body,
  imagePath,
  accent,
}: {
  title: string;
  body: string;
  imagePath: string;
  accent: "orange" | "green";
}) {
  return (
    <div
      className={`table-card px-3 pb-3 pt-3 flex flex-col justify-between ${
        accent === "green" ? "table-card-accent-green" : "table-card-accent-orange"
      }`}
    >
      <div className="relative z-10 flex flex-col h-full">
        <div className="relative overflow-hidden rounded-md bg-stone-100 border border-stone-200/40 mb-3">
          <Image
            src={imagePath}
            alt={title}
            width={240}
            height={240}
            unoptimized
            className="table-card-image mx-auto transition-transform duration-300 hover:scale-105"
          />
        </div>
        <div className="text-sm font-black text-stone-950 px-0.5">{title}</div>
        <p className="mt-1 text-[11px] font-bold leading-relaxed text-stone-600 px-0.5 mb-1 flex-grow min-h-[32px]">
          {body}
        </p>
      </div>
    </div>
  );
}

function TableChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="table-chip gap-2 px-3 py-1 text-xs font-black text-stone-700">
      <span className="text-stone-500">{label}</span>
      <span>{value}</span>
    </div>
  );
}

interface WaitingRoomProps {
  mode: RoomMode;
  isHost: boolean;
  playerCount: number;
  loading: boolean;
  onAddBot: () => void;
}

export function WaitingRoom({
  mode,
  isHost,
  playerCount,
  loading,
  onAddBot,
}: WaitingRoomProps) {
  return (
    <section className="market-card-table p-5">
      <div className="relative space-y-4">
        <div className="table-center-board p-5">
          <div className="relative z-10">
            <div className="mb-4 flex justify-center">
              <span className="table-chip px-4 py-1 text-xs font-black">
                {mode === "botTest" ? "봇 테스트 버전" : "실제 플레이 버전"}
              </span>
            </div>
            <div className="turn-command-bar mx-auto max-w-3xl px-5 py-4 text-center text-white">
              <div className="text-xl font-black">테이블 세팅 중</div>
              <div className="mt-1 text-xs font-bold text-white/80">
                {mode === "botTest"
                  ? "봇을 추가해서 혼자 흐름을 테스트할 수 있습니다."
                  : "친구 3명 이상이 모이면 각자의 손패와 거래 카드가 배정됩니다."}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center gap-3">
              <div className="h-px w-24 bg-amber-900/25" />
              <div className="text-xl font-black text-stone-800">내 손패 자리</div>
              <div className="h-px w-24 bg-amber-900/25" />
            </div>
            <div className="public-market-row mt-4">
              {Array.from({ length: 5 }, (_, index) => (
                <div key={index} className="table-card px-3 pb-3 pt-4">
                  <div className="relative z-10 text-center">
                    <Image
                      src={CARD_BACK}
                      alt="시작 전 손패"
                      width={240}
                      height={160}
                      unoptimized
                      className="table-card-image mx-auto"
                    />
                    <div className="mt-2 text-sm font-black text-stone-900">
                      게임 시작 후 공개
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-7 flex items-center justify-center gap-3">
              <div className="h-px w-24 bg-amber-900/25" />
              <div className="text-xl font-black text-stone-800">행동 카드 미리보기</div>
              <div className="h-px w-24 bg-amber-900/25" />
            </div>
            <div className="hand-card-grid mt-4">
              {ACTION_PREVIEW_CARDS.map((card) => (
                <TableActionCard key={card.title} {...card} />
              ))}
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <TableChip label="인원" value={`${playerCount}/${MAX_PLAYERS}`} />
              <TableChip label="손패" value="5장" />
              <TableChip label="거래 카드" value="2장" />
              {isHost && (
                <span className="text-xs font-black text-stone-600">
                  {loading ? "준비 중" : "오른쪽 버튼으로 시작"}
                </span>
              )}
            </div>
            {isHost && mode === "botTest" && (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={onAddBot}
                  disabled={loading || playerCount >= MAX_PLAYERS}
                  className="motion-button inline-flex items-center justify-center gap-2 rounded-lg border border-stone-900 bg-white/70 px-4 py-3 text-sm font-black text-stone-950 hover:bg-stone-950 hover:text-white disabled:border-stone-300 disabled:text-stone-400"
                >
                  <Users size={16} />
                  자동 봇 추가
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
