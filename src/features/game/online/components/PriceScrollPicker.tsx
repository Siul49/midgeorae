import { useState, useEffect, useRef } from "react";

export const PRICES = Array.from({ length: 201 }, (_, i) => i * 10000); // 1만원 단위로 변경 (0원 ~ 200만원)

interface PriceScrollPickerProps {
  value: number;
  onChange: (val: number) => void;
}

export function PriceScrollPicker({ value, onChange }: PriceScrollPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(String(value));
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getClosestIndex = (val: number) => {
    let closestIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < PRICES.length; i++) {
      const diff = Math.abs(PRICES[i]! - val);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }
    return closestIdx;
  };

  const [selectedIndex, setSelectedIndex] = useState(() => {
    return getClosestIndex(value);
  });

  useEffect(() => {
    const idx = getClosestIndex(value);
    if (idx !== selectedIndex) {
      setSelectedIndex(idx);
      scrollToIndex(idx);
    }
  }, [value]);

  const scrollToIndex = (index: number) => {
    const container = containerRef.current;
    if (container) {
      container.scrollTop = index * 32;
    }
  };

  const handleScroll = () => {
    const container = containerRef.current;
    if (container) {
      const scrollTop = container.scrollTop;
      const index = Math.round(scrollTop / 32);
      if (index >= 0 && index < PRICES.length && index !== selectedIndex) {
        setSelectedIndex(index);
        onChange(PRICES[index]!);
      }
    }
  };

  const handleInputConfirm = () => {
    let num = Number(tempValue);
    if (isNaN(num) || num < 0) num = 0;
    num = Math.min(num, 2000000); // 200만원 한도

    onChange(num);
    setIsEditing(false);

    const nextIdx = getClosestIndex(num);
    setSelectedIndex(nextIdx);
    setTimeout(() => scrollToIndex(nextIdx), 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleInputConfirm();
    } else if (e.key === "Escape") {
      setTempValue(String(value));
      setIsEditing(false);
    }
  };

  const adjustPCPriceByIndex = (indexDelta: number) => {
    const currentIdx = getClosestIndex(value);
    let nextIdx = currentIdx + indexDelta;
    if (nextIdx < 0) nextIdx = 0;
    if (nextIdx >= PRICES.length) nextIdx = PRICES.length - 1;
    onChange(PRICES[nextIdx]!);
  };

  const resetPCPrice = () => {
    onChange(PRICES[50]!); // 50만 원 (1만 원 단위에서 인덱스 50)
  };

  if (isEditing && isMobile) {
    return (
      <div className="flex items-center gap-1.5 h-[96px] justify-center">
        <input
          type="number"
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onBlur={handleInputConfirm}
          onKeyDown={handleKeyDown}
          autoFocus
          step={10000}
          min={0}
          className="w-full text-center border-2 border-orange-500 rounded px-2.5 py-1.5 text-sm font-black focus:outline-none bg-white text-stone-900 shadow-inner"
        />
        <button
          type="button"
          onClick={handleInputConfirm}
          className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs rounded shadow transition-colors shrink-0"
        >
          확인
        </button>
      </div>
    );
  }

  return (
    <div className="w-full font-sans">
      <div className="block md:hidden relative border border-stone-300 bg-white rounded-lg overflow-hidden w-full select-none shadow-sm">
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="price-wheel-viewport py-[32px] scroll-smooth"
        >
          {PRICES.map((price, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <div
                key={price}
                onClick={() => {
                  if (isSelected) {
                    setTempValue(String(price));
                    setIsEditing(true);
                  } else {
                    setSelectedIndex(idx);
                    scrollToIndex(idx);
                    onChange(price);
                  }
                }}
                className={`price-wheel-item cursor-pointer text-center ${
                  isSelected
                    ? "text-orange-600 font-extrabold text-sm scale-105"
                    : "text-stone-400 font-bold text-xs hover:text-stone-600"
                }`}
              >
                {price.toLocaleString("ko-KR")}원
              </div>
            );
          })}
        </div>
        <div className="price-wheel-center-line pointer-events-none" />
        <div className="absolute right-3 top-1 pointer-events-none text-[8px] font-black text-stone-300 opacity-60">
          터치스크롤/클릭
        </div>
      </div>

      <div className="hidden md:block bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-3.5 shadow-sm w-full select-none">
        <div className="text-center">
          <span className="text-[9px] font-extrabold tracking-wider text-stone-400 uppercase">희망 입찰가 (클릭하여 입력)</span>
          <div className="text-xl font-black text-orange-600 mt-0.5 flex items-center justify-center gap-1 min-h-[32px]">
            <span>₩</span>
            {isEditing && !isMobile ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                  onBlur={handleInputConfirm}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  step={10000}
                  min={0}
                  className="w-24 text-center border-b border-orange-500 bg-transparent text-xl font-black text-orange-600 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none p-0 h-7"
                />
                <button
                  type="button"
                  onClick={handleInputConfirm}
                  className="px-1.5 py-0.5 bg-orange-600 hover:bg-orange-700 text-white font-black text-[9px] rounded shadow transition-colors shrink-0 leading-none h-5 flex items-center justify-center"
                >
                  확인
                </button>
              </div>
            ) : (
              <span
                onClick={() => {
                  setTempValue(String(value));
                  setIsEditing(true);
                }}
                className="cursor-pointer hover:bg-stone-200/60 px-1 rounded transition-all border-b border-dashed border-orange-400/40"
                title="클릭하여 직접 입력"
              >
                {value.toLocaleString("ko-KR")}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-[9px] font-extrabold text-stone-400 block">⚡ 빠른 가격 조정</span>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => adjustPCPriceByIndex(-1)}
              className="px-2 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 border border-stone-300 text-[11px] font-bold text-stone-700 transition-colors shadow-sm text-center"
            >
              -1만
            </button>
            <button
              type="button"
              onClick={() => adjustPCPriceByIndex(1)}
              className="px-2 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 border border-orange-200 text-[11px] font-bold text-orange-600 transition-colors shadow-sm text-center"
            >
              +1만
            </button>
            <button
              type="button"
              onClick={() => adjustPCPriceByIndex(-5)}
              className="px-2 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 border border-stone-300 text-[11px] font-bold text-stone-700 transition-colors shadow-sm text-center"
            >
              -5만
            </button>
            <button
              type="button"
              onClick={() => adjustPCPriceByIndex(5)}
              className="px-2 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 border border-orange-200 text-[11px] font-bold text-orange-600 transition-colors shadow-sm text-center"
            >
              +5만
            </button>
            <button
              type="button"
              onClick={() => adjustPCPriceByIndex(-10)}
              className="px-2 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 border border-stone-300 text-[11px] font-bold text-stone-700 transition-colors shadow-sm text-center"
            >
              -10만
            </button>
            <button
              type="button"
              onClick={() => adjustPCPriceByIndex(10)}
              className="px-2 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-[11px] font-bold text-white transition-colors shadow-sm text-center"
            >
              +10만
            </button>
            <button
              type="button"
              onClick={resetPCPrice}
              className="col-span-2 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-900 text-xs font-bold text-white transition-colors shadow-sm text-center"
            >
              초기화
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
