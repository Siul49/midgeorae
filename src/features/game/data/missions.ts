import type { Mission, Player, GameLog } from "../types";

export const VILLAIN_MISSIONS: Mission[] = [
  {
    id: "m1",
    title: "네고왕",
    description: "3번의 거래에서 원래 가격보다 30% 이상 깎아서 구매하기",
    emoji: "💸",
    checkComplete: (_player: Player, logs: GameLog[]) => {
      const hardNegos = logs.filter(
        (l) => l.playerId === _player.id && l.action === "hardNego"
      );
      return hardNegos.length >= 3;
    },
  },
  {
    id: "m2",
    title: "노쇼 마스터",
    description: "2번 이상 거래를 파기하기 (거래 중 취소)",
    emoji: "👻",
    checkComplete: (_player: Player, logs: GameLog[]) => {
      const cancels = logs.filter(
        (l) => l.playerId === _player.id && l.action === "tradeCancelled"
      );
      return cancels.length >= 2;
    },
  },
  {
    id: "m3",
    title: "싫어요 수집가",
    description: "싫어요를 3개 이상 받기",
    emoji: "👎",
    checkComplete: (player: Player) => {
      return player.dislikes >= 3;
    },
  },
  {
    id: "m4",
    title: "가격 파괴자",
    description: "물건 2개를 시장 가격의 50% 이하로 구매하기",
    emoji: "🔨",
    checkComplete: (_player: Player, logs: GameLog[]) => {
      const cheapBuys = logs.filter(
        (l) => l.playerId === _player.id && l.action === "cheapBuy"
      );
      return cheapBuys.length >= 2;
    },
  },
  {
    id: "m5",
    title: "독점러",
    description: "같은 카테고리의 물건을 3개 이상 모으기",
    emoji: "🏦",
    checkComplete: (player: Player) => {
      const categoryCount: Record<string, number> = {};
      for (const owned of player.items) {
        const cat = owned.item.category;
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
      }
      return Object.values(categoryCount).some((c) => c >= 3);
    },
  },
  {
    id: "m6",
    title: "매너 파괴왕",
    description: "매너 온도를 34°C 이하로 만들기",
    emoji: "🌡️",
    checkComplete: (player: Player) => {
      return player.mannerTemp <= 34;
    },
  },
];

export function getRandomMission(): Mission {
  return VILLAIN_MISSIONS[Math.floor(Math.random() * VILLAIN_MISSIONS.length)];
}
