import {
  JOB_CARDS,
  MAX_PLAYERS,
  getMarketActionLimit,
  MIN_PLAYERS,
  STARTING_REPUTATION,
  VILLAIN_MISSIONS,
  VILLAIN_MISSION_DESCRIPTIONS,
  CITIZEN_MISSION_TEMPLATES,
} from "../rules/game-rules";
import { dealItemHands, makeActionDeck } from "./cards";
import type { Room, ServerPlayer, JobCardSnapshot } from "./types/game-server-types";

// ===== 1. Sub-handlers Re-exports (호환성 보장) =====
export * from "./handlers/common-utils";
export * from "./handlers/preparation-handler";
export * from "./handlers/action-card-handler";
export * from "./handlers/trade-handler";
export * from "./handlers/report-handler";
export * from "./handlers/snapshot-helper";

// ===== 2. Core Game Room Start Handlers =====

export function dealJobs(playerIds: string[]): Record<string, JobCardSnapshot> {
  const shuffled = [...JOB_CARDS].sort(() => Math.random() - 0.5);
  return Object.fromEntries(
    playerIds.map((playerId, index) => [playerId, shuffled[index % shuffled.length]!]),
  );
}

export function startGame(room: Room, actor: ServerPlayer) {
  if (!actor.isHost) throw new Error("호스트만 게임을 시작할 수 있습니다.");
  if (room.status !== "waiting") throw new Error("이미 시작된 방입니다.");
  if (room.players.length < MIN_PLAYERS) {
    throw new Error("3명 이상 모여야 시작할 수 있습니다.");
  }
  if (room.players.length > MAX_PLAYERS) {
    throw new Error("5명 이하로만 시작할 수 있습니다.");
  }

  const villainIndex = Math.floor(Math.random() * room.players.length);
  const villainId = room.players[villainIndex]?.id ?? null;
  const missionId =
    VILLAIN_MISSIONS[Math.floor(Math.random() * VILLAIN_MISSIONS.length)]!;
  const missionText = VILLAIN_MISSION_DESCRIPTIONS[missionId]!;
  const hands = dealItemHands(room.players.map((player) => player.id), villainId);
  const jobs = dealJobs(room.players.map((player) => player.id));

  room.players.forEach((player, index) => {
    player.role = index === villainIndex ? "villain" : "citizen";
    player.mission = index === villainIndex ? missionText : undefined;
    player.job = jobs[player.id];
    player.money = player.job?.startingMoney ?? 1000000;
    player.reputationTokens = STARTING_REPUTATION;
    player.hand = hands[player.id] ?? [];
    player.dealCards = { cool: true, cancel: true };
    player.isPrepared = false;

    if (player.role === "citizen") {
      const jobMissionId =
        player.job?.id === "inspector"
          ? "inspector_trade"
          : player.job?.id === "negotiator"
            ? "negotiator_nego"
            : player.job?.id === "reporter"
              ? "reporter_review"
              : "";
      const candidates = [
        jobMissionId,
        "cool_deal",
        "discount_register",
        "receive_like",
      ].filter(Boolean);

      const shuffled = [...candidates].sort(() => Math.random() - 0.5);
      const selectedIds = shuffled.slice(0, 2);

      player.citizenMissions = selectedIds.map((id) => {
        const tmpl = CITIZEN_MISSION_TEMPLATES[id]!;
        return {
          id: tmpl.id,
          title: tmpl.title,
          description: tmpl.description,
          progress: 0,
          target: tmpl.target,
          completed: false,
          rewardType: tmpl.rewardType,
          rewardAmount: tmpl.rewardAmount,
        };
      });
    } else {
      player.citizenMissions = [];
    }
  });
  room.status = "preparing";
  room.currentTurnPlayerId = null;
  room.usedActionCount = 0;
  room.marketActionLimit = getMarketActionLimit(room.players.length);
  room.actionDeck = makeActionDeck();
  room.discardPile = [];
  room.currentActionCard = null;
  room.logs.push(
    `게임이 시작되었습니다. 사전 매물 등록 단계입니다. 손패 카드들의 상태와 제안가를 결정해 주세요.`,
  );
}
