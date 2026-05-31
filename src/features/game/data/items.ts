import type { Item } from "../types";

export const ALL_ITEMS: Item[] = [
  { id: "iphone", name: "아이폰 15", emoji: "📱", basePrice: 500000, category: "electronics" },
  { id: "airpods", name: "에어팟 프로", emoji: "🎧", basePrice: 150000, category: "electronics" },
  { id: "switch", name: "닌텐도 스위치", emoji: "🎮", basePrice: 250000, category: "electronics" },
  { id: "bicycle", name: "자전거", emoji: "🚲", basePrice: 200000, category: "hobby" },
  { id: "books", name: "베스트셀러 세트", emoji: "📚", basePrice: 50000, category: "hobby" },
  { id: "sneakers", name: "나이키 운동화", emoji: "👟", basePrice: 100000, category: "fashion" },
  { id: "laptop", name: "맥북 에어", emoji: "💻", basePrice: 800000, category: "electronics" },
  { id: "camera", name: "미러리스 카메라", emoji: "📸", basePrice: 400000, category: "electronics" },
  { id: "tablet", name: "아이패드", emoji: "📋", basePrice: 300000, category: "electronics" },
  { id: "keyboard", name: "기계식 키보드", emoji: "⌨️", basePrice: 80000, category: "electronics" },
  { id: "guitar", name: "어쿠스틱 기타", emoji: "🎸", basePrice: 150000, category: "hobby" },
  { id: "bag", name: "브랜드 가방", emoji: "👜", basePrice: 350000, category: "fashion" },
  { id: "watch", name: "애플워치", emoji: "⌚", basePrice: 250000, category: "electronics" },
  { id: "figure", name: "한정판 피규어", emoji: "🗿", basePrice: 120000, category: "hobby" },
  { id: "jacket", name: "패딩 점퍼", emoji: "🧥", basePrice: 180000, category: "fashion" },
  { id: "speaker", name: "블루투스 스피커", emoji: "🔊", basePrice: 70000, category: "electronics" },
];

export const GOLDEN_ITEMS: Item[] = [
  { id: "gold_ps5", name: "PS5 + 게임 풀세트", emoji: "🕹️", basePrice: 600000, category: "electronics" },
  { id: "gold_macbook", name: "맥북 프로 M4", emoji: "🖥️", basePrice: 1200000, category: "electronics" },
  { id: "gold_rolex", name: "롤렉스 시계", emoji: "💎", basePrice: 1000000, category: "fashion" },
];

export function getRandomItems(count: number, pool: Item[] = ALL_ITEMS): Item[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function getRandomItem(pool: Item[] = ALL_ITEMS): Item {
  return pool[Math.floor(Math.random() * pool.length)];
}
