import { useState } from "react";
import { ALL_ITEMS } from "../../data/items";
import type { ItemCondition } from "../../types/game-core-types";
import type { RoomSnapshot, ItemCardSnapshot } from "../../server/types/game-server-types";
import { moneyLabel, conditionLabel } from "../constants/ui-constants";
import { PriceScrollPicker } from "./PriceScrollPicker";
import { CardImage } from "./CardImage";
import { SelectLabel } from "./StatusComponents";

function roleLabel(role: string | undefined) {
  if (role === "villain") return "빌런";
  if (role === "citizen") return "시민";
  return "미정";
}

interface PreparationPanelProps {
  me: RoomSnapshot["me"];
  myHand: ItemCardSnapshot[];
  loading: boolean;
  onSubmit: (
    configs: {
      instanceId: string;
      customCondition: ItemCondition;
      askingPrice: number;
      fakeItemId?: string;
    }[],
  ) => void;
}

export function PreparationPanel({
  me,
  myHand,
  loading,
  onSubmit,
}: PreparationPanelProps) {
  const [configs, setConfigs] = useState<
    Record<
      string,
      {
        customCondition: ItemCondition;
        askingPrice: number;
        fakeItemId?: string;
      }
    >
  >(() => {
    const initial: Record<
      string,
      {
        customCondition: ItemCondition;
        askingPrice: number;
        fakeItemId?: string;
      }
    > = {};
    myHand.forEach((item) => {
      initial[item.instanceId] = {
        customCondition: item.customCondition ?? item.condition ?? "used",
        askingPrice: item.askingPrice || item.originalPrice || 500000,
        fakeItemId: undefined,
      };
    });
    return initial;
  });
  const [carouselIndex, setCarouselIndex] = useState(0);

  if (!me) return null;

  if (me.isPrepared) {
    return (
      <div className="motion-panel-strong p-8 text-center text-stone-700 bg-orange-50/50 border border-orange-200 rounded-xl space-y-4">
        <div className="mx-auto w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
        <h2 className="text-xl font-black text-orange-950">내 매물 사전 등록 완료!</h2>
        <p className="text-sm font-bold text-stone-500">
          다른 플레이어들이 매물 설정을 마치고 게임 준비를 완료할 때까지 기다리고 있습니다...
        </p>
      </div>
    );
  }

  const isVillain = me.role === "villain";
  const hasUnpreparedBrick = isVillain && myHand.some(
    (item) => item.isBrick && !configs[item.instanceId]?.fakeItemId
  );

  const handleConditionChange = (instanceId: string, value: ItemCondition) => {
    setConfigs((prev) => ({
      ...prev,
      [instanceId]: { ...prev[instanceId]!, customCondition: value },
    }));
  };

  const handleFakeItemChange = (instanceId: string, fakeId: string) => {
    setConfigs((prev) => ({
      ...prev,
      [instanceId]: { ...prev[instanceId]!, fakeItemId: fakeId },
    }));
  };

  const handleConfirm = () => {
    if (isVillain) {
      const brickItem = myHand.find((i) => i.isBrick);
      if (brickItem) {
        const config = configs[brickItem.instanceId];
        if (!config?.fakeItemId) {
          alert("벽돌 카드를 위장할 제품을 선택해 주세요!");
          return;
        }
      }
    }

    const payload = Object.entries(configs).map(([instanceId, config]) => ({
      instanceId,
      customCondition: config.customCondition,
      askingPrice: config.askingPrice,
      fakeItemId: config.fakeItemId,
    }));
    onSubmit(payload);
  };

  return (
    <div className="motion-panel-strong bg-white p-6 rounded-xl border border-stone-200 shadow-md space-y-6">
      <div>
        <h2 className="text-2xl font-black text-stone-950">📦 사전 매물 등록 단계</h2>
        <p className="text-sm font-bold text-stone-500 mt-1">
          내 물건 5장에 기입할 상태와 희망가를 셋팅해 주세요. 다른 유저들은 기입된 상태만 볼 수 있습니다.
        </p>
        {isVillain && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-950 font-bold text-sm flex items-start gap-2 shadow-sm">
            <span className="text-base shrink-0">😈</span>
            <div>
              당신은 <span className="text-red-700 font-extrabold">빌런</span>입니다! 소지하고 있는 벽돌 카드는 반드시 다른 일반 제품으로 위장하여 등록해야 합니다.
            </div>
          </div>
        )}
      </div>

      <div className="bg-stone-50 border border-stone-150 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-black text-stone-800 shrink-0">🤫 내 비밀 프로필</span>
          <div className="flex items-center gap-1.5 bg-white border border-stone-200 px-2.5 py-1 rounded shadow-sm">
            <span className="text-[10px] text-stone-500 font-black uppercase">내 자금</span>
            <span className="font-extrabold text-stone-900">{moneyLabel(me.money ?? 0)}</span>
          </div>
          <div className={`flex items-center gap-1.5 border px-2.5 py-1 rounded shadow-sm ${
            isVillain
              ? "border-red-200 bg-red-50/50 text-red-950"
              : "border-green-200 bg-green-50/50 text-green-950"
          }`}>
            <span className="text-[10px] font-black uppercase opacity-60">내 역할</span>
            <span className="font-extrabold">{roleLabel(me.role)}</span>
          </div>
        </div>
        {isVillain && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100/70 border border-red-200 rounded text-red-950 font-bold text-xs shadow-sm">
            <span className="text-base shrink-0">🎯</span>
            <div>
              <span className="text-red-700 font-extrabold">빌런 행동 미션:</span> {me.mission}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="overflow-hidden w-full rounded-xl">
          <div
            className="flex transition-transform duration-500 ease-in-out"
            style={{
              width: `${Math.ceil(myHand.length / 2) * 100}%`,
              transform: `translateX(-${(carouselIndex / 2) * (100 / Math.ceil(myHand.length / 2))}%)`
            }}
          >
            {Array.from({ length: Math.ceil(myHand.length / 2) }).map((_, pageIdx) => {
              const pageItems = myHand.slice(pageIdx * 2, pageIdx * 2 + 2);
              return (
                <div
                  key={pageIdx}
                  style={{ width: `${100 / Math.ceil(myHand.length / 2)}%` }}
                  className="px-1 shrink-0"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    {pageItems.map((item) => {
                      const config = configs[item.instanceId]!;
                      return (
                        <div
                          key={item.instanceId}
                          className="p-4 border border-stone-200 rounded-xl bg-stone-50/50 flex flex-col gap-4"
                        >
                          <div className="w-24 shrink-0 mx-auto">
                            <CardImage src={item.imagePath} alt={item.name} />
                          </div>
                          <div className="flex-1 flex flex-col gap-3">
                            <div className="grid gap-4 sm:grid-cols-2">
                              <div className="flex flex-col justify-between h-full space-y-2.5">
                                <div className="space-y-1.5">
                                  <div>
                                    <span className="font-bold text-stone-900">{item.name}</span>
                                    {item.isBrick && (
                                      <span
                                        className={`ml-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] font-black tracking-wider text-white shadow-sm ${
                                          configs[item.instanceId]?.fakeItemId
                                            ? "bg-gradient-to-r from-emerald-600 to-green-700 ring-1 ring-green-400/20"
                                            : "bg-gradient-to-r from-rose-600 to-red-700 ring-1 ring-red-400/20 animate-pulse"
                                        }`}
                                      >
                                        {configs[item.instanceId]?.fakeItemId ? (
                                          <>
                                            <span>✅</span>
                                            <span>위장 완료</span>
                                          </>
                                        ) : (
                                          <>
                                            <span>🚨</span>
                                            <span>위장 필수</span>
                                          </>
                                        )}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-stone-500">
                                    실제 정가: {moneyLabel(item.originalPrice)} · 실제 시세: {moneyLabel(item.marketPrice)}
                                  </div>
                                  <div className="text-xs font-bold text-red-600">
                                    실제 상태: {conditionLabel(item.condition)}
                                  </div>
                                </div>

                                <div className="mt-1">
                                  <label className="text-[11px] font-black text-stone-500 block mb-2">
                                    표기 상태 설정
                                  </label>
                                  <div className="grid grid-cols-1 gap-1.5 bg-stone-100/60 border border-stone-200/40 p-2 rounded-lg">
                                    {(["mint", "used", "defective", "broken"] as const).map((cond) => {
                                      const condLabels = {
                                        mint: "민트급 (새 상품 수준)",
                                        used: "사용감 있음 (일반 중고)",
                                        defective: "하자 있음 (결함 존재)",
                                        broken: "파손 (동작 불가)",
                                      };
                                      const isChecked = config.customCondition === cond;
                                      return (
                                        <label
                                          key={cond}
                                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer text-xs font-bold transition-all border ${
                                            isChecked
                                              ? "bg-white border-orange-500/30 text-orange-600 shadow-sm"
                                              : "bg-transparent border-transparent text-stone-700 hover:bg-stone-50/70"
                                          }`}
                                        >
                                          <input
                                            type="radio"
                                            name={`condition-${item.instanceId}`}
                                            value={cond}
                                            checked={isChecked}
                                            onChange={() => handleConditionChange(item.instanceId, cond)}
                                            className="h-3.5 w-3.5 border-stone-300 text-orange-600 focus:ring-orange-500 accent-orange-600 cursor-pointer"
                                          />
                                          <span className="leading-none">{condLabels[cond]}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-col justify-start">
                                <SelectLabel label="판매 희망가 설정">
                                  <PriceScrollPicker
                                    value={config.askingPrice}
                                    onChange={(val) => {
                                      setConfigs((prev) => ({
                                        ...prev,
                                        [item.instanceId]: { ...prev[item.instanceId]!, askingPrice: val },
                                      }));
                                    }}
                                  />
                                </SelectLabel>
                              </div>
                            </div>

                            {item.isBrick && isVillain && (
                              <div className={`mt-1 p-3 rounded-lg border transition-all ${
                                config.fakeItemId
                                  ? "bg-stone-50/50 border-stone-200"
                                  : "bg-red-50/30 border-red-200 shadow-[0_0_8px_rgba(239,68,68,0.15)]"
                              }`}>
                                <SelectLabel label="벽돌 위장 타겟 설정 (필수)">
                                  <select
                                    value={config.fakeItemId ?? ""}
                                    onChange={(event) => handleFakeItemChange(item.instanceId, event.target.value)}
                                    className={`w-full border bg-white px-3 py-2 text-sm font-bold transition-colors focus:outline-none ${
                                      config.fakeItemId
                                        ? "border-stone-300 focus:border-stone-500 text-stone-900"
                                        : "border-red-400 focus:border-red-600 text-red-950 bg-red-50/10"
                                    }`}
                                  >
                                    <option value="">-- 위장할 제품 선택 --</option>
                                    {ALL_ITEMS.map((ai) => (
                                      <option key={ai.id} value={ai.id}>
                                        {ai.name} (시세: {moneyLabel(ai.marketPrice)})
                                      </option>
                                    ))}
                                  </select>
                                </SelectLabel>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {pageItems.length === 1 && (
                      <div className="hidden md:block p-4 rounded-xl border border-dashed border-stone-200 bg-stone-50/10" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between bg-stone-50 border border-stone-150 p-2.5 rounded-xl mt-4">
          <button
            type="button"
            disabled={carouselIndex === 0}
            onClick={() => setCarouselIndex(Math.max(0, carouselIndex - 2))}
            className="px-4 py-2 border border-stone-300 bg-white hover:bg-stone-100 disabled:opacity-40 text-stone-700 font-black text-sm rounded shadow-sm transition-colors"
          >
            &larr; 이전 물품
          </button>
          <span className="text-sm font-black text-stone-600">
            {Math.floor(carouselIndex / 2) + 1} / {Math.ceil(myHand.length / 2)} 페이지 ({myHand.length}개 중 {Math.min(myHand.length, carouselIndex + 1)}-{Math.min(myHand.length, carouselIndex + 2)} 표시)
          </span>
          <button
            type="button"
            disabled={carouselIndex + 2 >= myHand.length}
            onClick={() => setCarouselIndex(Math.min(myHand.length - 1, carouselIndex + 2))}
            className="px-4 py-2 border border-stone-300 bg-white hover:bg-stone-100 disabled:opacity-40 text-stone-700 font-black text-sm rounded shadow-sm transition-colors"
          >
            다음 물품 &rarr;
          </button>
        </div>
      </div>

      <div className="flex justify-end pt-3">
        <button
          onClick={handleConfirm}
          disabled={loading || hasUnpreparedBrick}
          className="motion-button inline-flex items-center justify-center bg-orange-600 px-6 py-3 text-base font-black text-white hover:bg-orange-700 disabled:bg-stone-300"
        >
          {hasUnpreparedBrick ? "위장할 제품을 선택해 주세요" : "등록 및 준비 완료"}
        </button>
      </div>
    </div>
  );
}
