import type { Item } from "../types";

export const ALL_ITEMS: Item[] = [
  { id: "iphone", name: "아이폰 15", emoji: "📱", marketPrice: 500000, category: "electronics", condition: "mint" },
  { id: "airpods", name: "에어팟 프로", emoji: "🎧", marketPrice: 150000, category: "electronics", condition: "used" },
  { id: "switch", name: "닌텐도 스위치", emoji: "🎮", marketPrice: 250000, category: "electronics", condition: "used" },
  { id: "laptop", name: "맥북 에어", emoji: "💻", marketPrice: 800000, category: "electronics", condition: "used" },
  { id: "camera", name: "미러리스 카메라", emoji: "📸", marketPrice: 400000, category: "electronics", condition: "defective" },
  { id: "tablet", name: "아이패드", emoji: "📋", marketPrice: 300000, category: "electronics", condition: "used" },
  { id: "sneakers", name: "나이키 운동화", emoji: "👟", marketPrice: 100000, category: "fashion", condition: "used" },
  { id: "bag", name: "브랜드 가방", emoji: "👜", marketPrice: 350000, category: "fashion", condition: "mint" },
  { id: "watch", name: "브랜드 시계", emoji: "⌚", marketPrice: 250000, category: "fashion", condition: "used" },
  { id: "jacket", name: "패딩 점퍼", emoji: "🧥", marketPrice: 180000, category: "fashion", condition: "used" },
  { id: "sunglasses", name: "선글라스", emoji: "🕶️", marketPrice: 90000, category: "fashion", condition: "mint" },
  { id: "wallet", name: "가죽 지갑", emoji: "👛", marketPrice: 80000, category: "fashion", condition: "defective" },
  { id: "bicycle", name: "자전거", emoji: "🚲", marketPrice: 200000, category: "hobby", condition: "used" },
  { id: "books", name: "베스트셀러 세트", emoji: "📚", marketPrice: 50000, category: "hobby", condition: "used" },
  { id: "guitar", name: "어쿠스틱 기타", emoji: "🎸", marketPrice: 150000, category: "hobby", condition: "defective" },
  { id: "figure", name: "한정판 피규어", emoji: "🗿", marketPrice: 120000, category: "hobby", condition: "mint" },
  { id: "boardgame_set", name: "보드게임 세트", emoji: "🎲", marketPrice: 90000, category: "hobby", condition: "mint" },
  { id: "camping_gear", name: "캠핑 장비", emoji: "🏕️", marketPrice: 160000, category: "hobby", condition: "used" },
  { id: "coffee_machine", name: "커피머신", emoji: "☕", marketPrice: 180000, category: "living", condition: "used" },
  { id: "air_purifier", name: "공기청정기", emoji: "🌬️", marketPrice: 220000, category: "living", condition: "defective" },
  { id: "chair", name: "인테리어 의자", emoji: "🪑", marketPrice: 70000, category: "living", condition: "used" },
  { id: "desk_lamp", name: "데스크 램프", emoji: "💡", marketPrice: 60000, category: "living", condition: "mint" },
  { id: "robot_vacuum", name: "로봇청소기", emoji: "🧹", marketPrice: 260000, category: "living", condition: "broken" },
  { id: "toaster", name: "토스터", emoji: "🍞", marketPrice: 50000, category: "living", condition: "broken" },
];

export const GOLDEN_ITEMS: Item[] = [
  { id: "gold_ps5", name: "PS5 + 게임 풀세트", emoji: "🕹️", marketPrice: 600000, category: "electronics", condition: "mint" },
  { id: "gold_macbook", name: "맥북 프로 M4", emoji: "🖥️", marketPrice: 1200000, category: "electronics", condition: "mint" },
  { id: "gold_rolex", name: "롤렉스 시계", emoji: "💎", marketPrice: 1000000, category: "fashion", condition: "mint" },
];

export function getRandomItems(count: number, pool: Item[] = ALL_ITEMS): Item[] {
  const conditions = ["mint", "used", "broken"] as const;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((item) => ({
    ...item,
    condition: conditions[Math.floor(Math.random() * conditions.length)],
  }));
}

export function getRandomItem(pool: Item[] = ALL_ITEMS): Item {
  const conditions = ["mint", "used", "broken"] as const;
  const item = pool[Math.floor(Math.random() * pool.length)];
  return {
    ...item,
    condition: conditions[Math.floor(Math.random() * conditions.length)],
  };
}
