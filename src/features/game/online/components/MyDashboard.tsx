import { Search, Handshake, FileText } from "lucide-react";
import type { ItemCardSnapshot, RoomSnapshot, PlayerSnapshot } from "../../server/types/game-server-types";
import { moneyLabel, categoryLabel, conditionLabel } from "../constants/ui-constants";
import { CardImage } from "./CardImage";
import { StatusBox } from "./StatusComponents";

function roleLabel(role: string | undefined) {
  if (role === "villain") return "빌런";
  if (role === "citizen") return "시민";
  return "미정";
}

function roleDescription(role: string | undefined) {
  if (role === "villain") {
    return "당신은 빌런입니다. 이 정보는 본인 화면에만 보입니다.";
  }
  if (role === "citizen") {
    return "당신은 시민입니다. 거래 기록과 평판을 보고 빌런을 찾아내세요.";
  }
  return "게임이 시작되면 내 역할이 여기에 공개됩니다.";
}

function TableHandCard({
  item,
  selected,
  onSelect,
}: {
  item: ItemCardSnapshot;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`motion-button table-card hand-item-card deal-card-lift px-3 pb-3 pt-4 text-left ${
        selected ? "table-card-accent-orange" : ""
      }`}
    >
      <div className="relative z-10 text-center">
        <div
          className={`hand-product-art mx-auto ${
            item.isBrick ? "hand-product-art-brick" : ""
          }`}
          aria-hidden="true"
        >
          <CardImage src={item.imagePath} alt={item.name} />
        </div>
        <div className="mt-2 min-h-10 text-sm font-black leading-5 text-stone-950">
          {item.name}
        </div>
        {item.originalPrice > 0 && (
          <div className="mt-2 text-xs font-bold text-stone-500 line-through decoration-stone-400">
            정가 {moneyLabel(item.originalPrice)}
          </div>
        )}
        <div className="mt-1 text-xs font-black text-orange-700">
          {item.marketPrice > 0 ? moneyLabel(item.marketPrice) : "시세 미공개"}
        </div>
        {item.category && (
          <div className="mt-2 text-[10px] font-black text-stone-500">
            {categoryLabel(item.category)} · {conditionLabel(item.condition)}
          </div>
        )}
        {item.isBrick && (
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-rose-600 to-red-700 px-2.5 py-0.5 text-[9px] font-black tracking-wider text-white shadow-sm ring-1 ring-red-400/20">
            <span>🚨</span>
            <span>벽돌</span>
          </div>
        )}
      </div>
    </button>
  );
}

interface MyDashboardProps {
  me: RoomSnapshot["me"];
  myHand: ItemCardSnapshot[];
  isMyTurn: boolean;
  selectedItemId: string;
  setSelectedItemId: (value: string) => void;
}

export function MyDashboard({
  me,
  myHand,
  isMyTurn,
  selectedItemId,
  setSelectedItemId,
}: MyDashboardProps) {
  if (!me) return null;
  const isVillain = me.role === "villain";

  return (
    <section
      className={`motion-panel-strong market-card-table p-4 ${
        isMyTurn ? "ring-2 ring-orange-500/75" : ""
      }`}
    >
      <div className="relative z-10 space-y-3">
        <div className="my-status-strip">
          <div
            className={`inline-flex items-center justify-center rounded px-3 py-2 text-xs font-black text-white ${
              isMyTurn ? "bg-orange-600" : "bg-stone-700"
            }`}
          >
            {isMyTurn ? "내 턴" : "대기"}
          </div>
          <StatusBox label="내 자금" value={moneyLabel(me.money ?? 0)} />
          <StatusBox label="매너온도" value={`${(me.manner ?? 36.5).toFixed(1)}°C`} />
          <div
            className={`my-role-chip ${
              isVillain ? "my-role-chip-villain" : "my-role-chip-citizen"
            }`}
            title={roleDescription(me.role)}
          >
            <span>내 역할</span>
            <strong>{roleLabel(me.role)}</strong>
          </div>
          {me.job && (
            <div className="my-role-chip my-role-chip-job flex-row items-center gap-3">
              <div>
                <span>직업</span>
                <strong>{me.job.title}</strong>
              </div>
              <div className="flex gap-3 border-l border-orange-200 pl-3">
                <div className="flex items-center gap-1 text-blue-700" title="감정 토큰">
                  <Search size={15} />
                  <span className="text-xs font-black">{me.inspectTokens ?? 0}</span>
                </div>
                <div className="flex items-center gap-1 text-violet-700" title="네고 토큰">
                  <Handshake size={15} />
                  <span className="text-xs font-black">{me.negoTokens ?? 0}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {isVillain && (
          <div className="rounded border-2 border-red-300 bg-red-50/95 px-4 py-3">
            <div className="text-[11px] font-black uppercase text-red-700">
              빌런 행동 미션
            </div>
            <div className="mt-1 text-sm font-black leading-6 text-red-900">
              {me.mission ?? "게임이 시작되면 빌런 미션이 표시됩니다."}
            </div>
          </div>
        )}

        {!isVillain && me.citizenMissions && me.citizenMissions.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 mt-2">
            {me.citizenMissions.map((mission) => (
              <div
                key={mission.id}
                className={`rounded-lg border px-4 py-3 shadow-sm transition-all ${
                  mission.completed
                    ? "border-emerald-300 bg-emerald-50/70"
                    : "border-stone-200 bg-white/70"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-black uppercase tracking-wider ${
                    mission.completed ? "text-emerald-700" : "text-stone-500"
                  }`}>
                    시민 미션 {mission.completed ? "✓ 완료" : "진행 중"}
                  </span>
                  <span className="text-xs font-black text-stone-700">
                    {mission.progress} / {mission.target}
                  </span>
                </div>
                <div className="mt-1 text-sm font-black text-stone-900">
                  {mission.title}
                </div>
                <p className="mt-1 text-[11px] font-bold text-stone-500 leading-4">
                  {mission.description}
                </p>
                <div className="mt-2 text-[10px] font-black text-orange-700">
                  보상: {mission.rewardType === "inspectToken" ? "감정 토큰 1개" :
                        mission.rewardType === "negoToken" ? "네고 토큰 1개" :
                        `소지금 ${mission.rewardAmount.toLocaleString()}원`}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="market-card-lane p-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-xl font-black text-stone-950">내 손패</h2>
              <p className="mt-1 text-xs font-bold text-stone-500">
                사진과 시세를 보고 거래할 물건을 바로 선택하세요.
              </p>
            </div>
            <span className="table-chip px-3 py-1 text-xs font-black">
              {myHand.length}장
            </span>
          </div>

          {myHand.length === 0 ? (
            <div className="mt-4 rounded border border-dashed border-stone-300 bg-white/70 px-4 py-6 text-center text-sm font-bold text-stone-500">
              게임이 시작되면 내 물건 카드가 여기에 표시됩니다.
            </div>
          ) : (
            <div className="player-hand-grid mt-4">
              {myHand.map((item) => (
                <TableHandCard
                  key={item.instanceId}
                  item={item}
                  selected={selectedItemId === item.instanceId}
                  onSelect={() => setSelectedItemId(item.instanceId)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
