import {
  getMarketActionLimit,
  STARTING_REPUTATION,
} from "../../rules/game-rules";
import { calculateReputationEliminationResult } from "../../domain/results";
import { evolveNewGeneration } from "../bot-evolution";
import type { Room, ServerPlayer } from "../types/game-server-types";

export function now() {
  return Date.now();
}

export function formatWon(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

export function findPlayerById(room: Room, playerId: string): ServerPlayer {
  const player = room.players.find((candidate) => candidate.id === playerId);
  if (!player) throw new Error("플레이어를 찾을 수 없습니다.");
  return player;
}

export function touch(room: Room) {
  room.version += 1;
  room.updatedAt = now();
}

export function assertCurrentTurn(room: Room, player: ServerPlayer) {
  if (room.currentTurnPlayerId !== player.id) {
    throw new Error("현재 턴 플레이어만 할 수 있습니다.");
  }
}

export function assertPlaying(room: Room) {
  if (room.status !== "playing") {
    throw new Error("진행 중인 게임에서만 할 수 있습니다.");
  }
}

export function enterReporting(room: Room, message = "시장 마감입니다. 최종 신고를 시작합니다.") {
  room.status = "reporting";
  room.currentTurnPlayerId = null;
  room.currentActionCard = null;
  room.pendingDeal = null;
  room.logs.push(message);
}

export function nextTurn(room: Room) {
  room.turnCount += 1;
  room.usedActionCount = Math.min(
    room.marketActionLimit,
    room.usedActionCount + 1,
  );

  if (
    room.marketActionLimit > 0 &&
    room.usedActionCount >= room.marketActionLimit
  ) {
    enterReporting(room);
    return;
  }

  if (!room.currentTurnPlayerId) {
    room.currentTurnPlayerId = room.players[0]?.id ?? null;
    return;
  }

  const currentIndex = room.players.findIndex(
    (player) => player.id === room.currentTurnPlayerId,
  );
  const nextIndex = (currentIndex + 1) % room.players.length;

  room.currentTurnPlayerId = room.players[nextIndex]?.id ?? null;
  room.currentActionCard = null;
}

export function finishByReputation(room: Room, eliminatedPlayer: ServerPlayer) {
  room.status = "finished";
  room.currentTurnPlayerId = null;
  const result = calculateReputationEliminationResult(
    room.players,
    eliminatedPlayer,
  );
  room.result = {
    ...result,
    villainMissionComplete: false,
  };
  room.logs.push(
    `${eliminatedPlayer.name}님의 좋아요 토큰이 0개가 되어 게임이 종료되었습니다.`,
  );
  evolveNewGeneration(room.players, room.result.winningSide);
}

export function adjustReputation(room: Room, target: ServerPlayer, amount: number) {
  target.reputationTokens = Math.max(0, target.reputationTokens + amount);
  if (target.reputationTokens === 0) {
    if (target.role === "villain") {
      finishByReputation(room, target);
    } else {
      enterReporting(
        room,
        `${target.name}님의 평판이 0이 되어 즉시 시장이 폐쇄되고 최종 투표에 돌입합니다.`,
      );
    }
  }
}
