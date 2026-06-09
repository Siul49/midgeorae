import type { RoomResult, ServerPlayer } from "../server/types";
import {
  CONDITION_MULTIPLIERS,
  CITIZEN_VICTORY_ASSET_GOAL,
  VILLAIN_SCAM_VICTORY_LIMIT,
} from "../rules/game-rules";
import { ALL_ITEMS } from "../data/items";

export function getFakeItemForBrick(instanceId: string) {
  let hash = 0;
  for (let i = 0; i < instanceId.length; i++) {
    hash = instanceId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % ALL_ITEMS.length;
  return ALL_ITEMS[index]!;
}

export function getBrickFakeCondition(instanceId: string): "mint" | "used" | "broken" {
  let hash = 0;
  for (let i = 0; i < instanceId.length; i++) {
    hash = instanceId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const conditions = ["mint", "used", "broken"] as const;
  const index = Math.abs(hash) % conditions.length;
  return conditions[index];
}

export function countReports(
  reports: Record<string, string>,
): Record<string, number> {
  return Object.values(reports).reduce<Record<string, number>>((acc, targetId) => {
    acc[targetId] = (acc[targetId] ?? 0) + 1;
    return acc;
  }, {});
}

export function getItemAssetValue(
  item: { isBrick?: boolean; marketPrice: number; condition: string | null; instanceId?: string; acquiredPrice?: number | null },
  roomStatus: string = "finished"
): number {
  if (item.isBrick) {
    if (roomStatus !== "reporting" && roomStatus !== "finished" && item.instanceId) {
      const fake = getFakeItemForBrick(item.instanceId);
      const fakeCond = getBrickFakeCondition(item.instanceId);
      const multiplier = fakeCond && fakeCond in CONDITION_MULTIPLIERS
        ? CONDITION_MULTIPLIERS[fakeCond as keyof typeof CONDITION_MULTIPLIERS]
        : 1.0;
      return fake.marketPrice * multiplier;
    }
    return 0;
  }
  const cond = item.condition;
  const multiplier = cond && cond in CONDITION_MULTIPLIERS
    ? CONDITION_MULTIPLIERS[cond as keyof typeof CONDITION_MULTIPLIERS]
    : 1.0;
  return item.marketPrice * multiplier;
}

export function calculateAsset(player: ServerPlayer, roomStatus: string = "finished") {
  return (
    player.money +
    player.hand.reduce((sum, item) => sum + getItemAssetValue(item, roomStatus), 0)
  );
}

export function checkJobMission(player: ServerPlayer, roomStatus: string = "finished"): boolean {
  if (!player.job) return false;
  const hand = player.hand ?? [];
  const nonBricks = hand.filter((item) => !item.isBrick);
  const bricks = hand.filter((item) => item.isBrick);

  switch (player.job.id) {
    case "developer":
      return nonBricks.length > 0 && nonBricks.every((item) => item.category === "electronics");
    case "model":
      return nonBricks.length > 0 && nonBricks.every((item) => item.category === "fashion");
    case "housewife":
      return nonBricks.length > 0 && nonBricks.every((item) => item.category === "living");
    case "brick-collector":
      return bricks.length >= 2;
    case "collector":
      return hand.length >= 8;
    case "citizen":
      return calculateAsset(player, roomStatus) >= CITIZEN_VICTORY_ASSET_GOAL;
    default:
      return false;
  }
}

export function calculateCitizenWinner(citizens: ServerPlayer[], roomStatus: string = "finished"): string {
  if (citizens.length === 0) return "";

  const completedCitizens = citizens.filter((p) => checkJobMission(p, roomStatus));

  if (completedCitizens.length === 1) {
    return completedCitizens[0].id;
  }

  const pool = completedCitizens.length >= 2 ? completedCitizens : citizens;

  const sorted = [...pool].sort((a, b) => {
    const assetA = calculateAsset(a, roomStatus);
    const assetB = calculateAsset(b, roomStatus);
    if (assetB !== assetA) return assetB - assetA;
    if (b.reputationTokens !== a.reputationTokens) return b.reputationTokens - a.reputationTokens;
    return b.money - a.money;
  });

  return sorted[0]?.id ?? citizens[0].id;
}

export function calculateReportResult(
  players: ServerPlayer[],
  reports: Record<string, string>,
  villainId: string,
  villainScamCount = 0,
): RoomResult {
  const countedReports = countReports(reports);
  const mostReportedId =
    Object.entries(countedReports).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
  const villainCaught = mostReportedId === villainId;

  const citizens = players.filter((p) => p.id !== villainId);
  const citizenWinnerId = calculateCitizenWinner(citizens);

  // 빌런 승리 조건: 검거되지 않았고, 동시에 성공적으로 2회 이상 사기를 쳤어야 함 (총자산 가치보다 비싸게 판매)
  const villainWins = !villainCaught && villainScamCount >= VILLAIN_SCAM_VICTORY_LIMIT;

  const winnerId = villainWins ? villainId : citizenWinnerId;

  return {
    villainId,
    villainCaught,
    winnerId,
    winningSide: villainWins ? "villain" : "citizens",
    reports: countedReports,
  };
}

export function calculateReputationEliminationResult(
  players: ServerPlayer[],
  eliminatedPlayer: ServerPlayer,
): RoomResult {
  const villain = players.find((player) => player.role === "villain");
  const villainCaught = eliminatedPlayer.id === villain?.id;
  
  const citizens = players.filter((player) => player.role === "citizen");
  const citizenWinnerId = calculateCitizenWinner(citizens);

  return {
    villainId: villain?.id,
    villainCaught,
    winnerId: villainCaught ? citizenWinnerId : (villain?.id ?? eliminatedPlayer.id),
    winningSide: villainCaught ? "citizens" : "villain",
    eliminatedPlayerId: eliminatedPlayer.id,
    reports: {},
  };
}
