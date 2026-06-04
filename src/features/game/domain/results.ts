import type { RoomResult, ServerPlayer } from "../server/types/game-server-types";

export function countReports(
  reports: Record<string, string>,
): Record<string, number> {
  return Object.values(reports).reduce<Record<string, number>>((acc, targetId) => {
    acc[targetId] = (acc[targetId] ?? 0) + 1;
    return acc;
  }, {});
}

export function calculateAsset(player: ServerPlayer) {
  return (
    player.money +
    player.hand.reduce((sum, item) => sum + item.marketPrice, 0)
  );
}

export function calculateReportResult(
  players: ServerPlayer[],
  reports: Record<string, string>,
  villainId: string,
  villainMissionComplete: boolean = false,
): RoomResult {
  const countedReports = countReports(reports);
  const mostReportedId =
    Object.entries(countedReports).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
  const villainCaught = mostReportedId === villainId;

  const villainWon = !villainCaught && villainMissionComplete;
  const winningSide = villainWon ? "villain" : "citizens";

  const eligiblePlayers = winningSide === "citizens"
    ? players.filter((player) => player.id !== villainId)
    : players;
  const winnerId =
    [...eligiblePlayers].sort((a, b) => calculateAsset(b) - calculateAsset(a))[0]
      ?.id ?? villainId;

  return {
    villainId,
    villainCaught,
    winnerId,
    winningSide,
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
  const citizenWinner =
    [...citizens].sort((a, b) => calculateAsset(b) - calculateAsset(a))[0]?.id ??
    eliminatedPlayer.id;

  return {
    villainId: villain?.id,
    villainCaught,
    winnerId: villainCaught ? citizenWinner : (villain?.id ?? eliminatedPlayer.id),
    winningSide: villainCaught ? "citizens" : "villain",
    eliminatedPlayerId: eliminatedPlayer.id,
    reports: {},
  };
}
