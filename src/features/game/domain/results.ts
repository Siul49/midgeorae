import type { RoomResult, ServerPlayer } from "../server/types";

export function countReports(
  reports: Record<string, string>,
): Record<string, number> {
  return Object.values(reports).reduce<Record<string, number>>((acc, targetId) => {
    acc[targetId] = (acc[targetId] ?? 0) + 1;
    return acc;
  }, {});
}

export function getItemAssetValue(item: { isBrick?: boolean; marketPrice: number; condition: string | null }): number {
  if (item.isBrick) return 0;
  let multiplier = 1.0;
  if (item.condition === "mint") {
    multiplier = 0.8;
  } else if (item.condition === "used") {
    multiplier = 0.6;
  } else if (item.condition === "broken" || item.condition === "defective") {
    multiplier = 0.4;
  }
  return item.marketPrice * multiplier;
}

export function calculateAsset(player: ServerPlayer) {
  return (
    player.money +
    player.hand.reduce((sum, item) => sum + getItemAssetValue(item), 0)
  );
}

export function checkJobMission(player: ServerPlayer): boolean {
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
      return bricks.length >= 4;
    case "collector":
      return hand.length >= 8;
    case "citizen":
      return calculateAsset(player) >= 2500000;
    default:
      return false;
  }
}

export function calculateCitizenWinner(citizens: ServerPlayer[]): string {
  if (citizens.length === 0) return "";

  const completedCitizens = citizens.filter((p) => checkJobMission(p));

  if (completedCitizens.length === 1) {
    return completedCitizens[0].id;
  }

  const pool = completedCitizens.length >= 2 ? completedCitizens : citizens;

  const sorted = [...pool].sort((a, b) => {
    const assetA = calculateAsset(a);
    const assetB = calculateAsset(b);
    if (assetB !== assetA) return assetB - assetA;
    if (b.reputationTokens !== a.reputationTokens) return b.reputationTokens - a.reputationTokens;
    if (b.manner !== a.manner) return b.manner - a.manner;
    return b.money - a.money;
  });

  return sorted[0]?.id ?? citizens[0].id;
}

export function calculateReportResult(
  players: ServerPlayer[],
  reports: Record<string, string>,
  villainId: string,
): RoomResult {
  const countedReports = countReports(reports);
  const mostReportedId =
    Object.entries(countedReports).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
  const villainCaught = mostReportedId === villainId;

  const citizens = players.filter((p) => p.id !== villainId);
  const citizenWinnerId = calculateCitizenWinner(citizens);

  const winnerId = villainCaught ? citizenWinnerId : villainId;

  return {
    villainId,
    villainCaught,
    winnerId,
    winningSide: villainCaught ? "citizens" : "villain",
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
