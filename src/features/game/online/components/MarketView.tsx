import { useMemo } from "react";
import { Store, Check } from "lucide-react";
import type { PublicPlayer } from "../../server/types/game-server-types";
import { categoryLabel, conditionLabel, moneyLabel } from "../constants/ui-constants";
import { CardImage } from "./CardImage";

interface MarketViewProps {
  otherPlayers: PublicPlayer[];
  dealTargetId: string;
  selectedItemId: string;
  onSelectTarget: (ownerId: string, itemId: string) => void;
}

export function MarketView({
  otherPlayers,
  dealTargetId,
  selectedItemId,
  onSelectTarget,
}: MarketViewProps) {
  const allItems = useMemo(() => {
    return otherPlayers.flatMap((p) =>
      p.publicItems
        .filter((item) => item.acquiredPrice === null)
        .map((item) => ({ owner: p, item }))
    );
  }, [otherPlayers]);

  return (
    <div className="flex-1 overflow-y-auto bg-orange-50/50 p-4 lg:p-6 rounded-xl border border-orange-200 shadow-inner">
      <h2 className="mb-4 text-xl font-black text-orange-950 flex items-center gap-2">
        <Store size={24} className="text-orange-600" />
        시장 매물 (원하는 물건을 클릭하세요)
      </h2>
      {allItems.length === 0 ? (
        <div className="p-8 text-center text-stone-500 font-bold">시장에 등록된 매물이 없습니다.</div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {allItems.map(({ owner, item }) => {
            const isSelected = dealTargetId === owner.id && selectedItemId === item.instanceId;
            return (
              <div
                key={item.instanceId}
                onClick={() => onSelectTarget(owner.id, item.instanceId)}
                className={`motion-card relative cursor-pointer overflow-hidden border-2 bg-white transition-all ${
                  isSelected ? "border-orange-600 ring-2 ring-orange-200 shadow-md transform scale-105" : "border-stone-200 hover:border-orange-400"
                }`}
              >
                <div className="aspect-square bg-stone-100 p-2 relative">
                  <CardImage src={item.imagePath} alt={item.name} />
                  <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full font-bold">
                    {owner.name}
                  </div>
                </div>
                <div className="p-3 text-center">
                  <div className="text-sm font-black text-stone-900 truncate">{item.name || "미공개"}</div>
                  <div className="mt-1 text-xs font-bold text-stone-500 truncate">
                    {categoryLabel(item.category)} · {conditionLabel(item.condition)}
                  </div>
                  {item.originalPrice > 0 && (
                    <div className="mt-2 text-xs font-bold text-stone-500 line-through decoration-stone-400">
                      정가 {moneyLabel(item.originalPrice)}
                    </div>
                  )}
                  <div className="mt-1 text-sm font-black text-orange-600">
                    {item.marketPrice > 0 ? moneyLabel(item.marketPrice) : "시세 미공개"}
                  </div>
                </div>
                {isSelected && (
                  <div className="absolute inset-0 bg-orange-600/10 pointer-events-none flex items-center justify-center">
                    <div className="bg-orange-600 text-white rounded-full p-2 shadow-lg scale-110 motion-safe:animate-bounce">
                      <Check size={24} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
