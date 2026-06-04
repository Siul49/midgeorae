import { evaluateVillainMission } from "../../domain/jobs";
import { calculateReportResult } from "../../domain/results";
import { evolveNewGeneration } from "../bot-evolution";
import { enterReporting } from "./common-utils";
import type { Room, ServerPlayer } from "../types/game-server-types";

export function checkVillainMissionComplete(room: Room, villain: ServerPlayer): boolean {
  return evaluateVillainMission(villain);
}

export function reportSuspiciousPlayer(
  room: Room,
  actor: ServerPlayer,
  targetPlayerId: string,
) {
  if (room.status !== "reporting") {
    throw new Error("신고할 수 없는 상태입니다.");
  }
  if (!room.players.some((player) => player.id === targetPlayerId)) {
    throw new Error("신고 대상이 존재하지 않습니다.");
  }
  if (room.reports[actor.id]) throw new Error("이미 신고했습니다.");

  room.status = "reporting";
  room.currentTurnPlayerId = null;
  room.reports[actor.id] = targetPlayerId;
  room.logs.push(`${actor.name}님이 사기 의심 계정을 신고했습니다.`);

  if (Object.keys(room.reports).length === room.players.length) {
    const villain = room.players.find((player) => player.role === "villain");
    if (!villain) throw new Error("빌런 정보가 없습니다.");
    const missionComplete = checkVillainMissionComplete(room, villain);
    room.result = calculateReportResult(
      room.players,
      room.reports,
      villain.id,
      missionComplete,
    );
    room.result.villainMissionComplete = missionComplete;
    room.status = "finished";
    room.logs.push("최종 신고가 접수되었습니다. 분쟁 심사 결과를 공개합니다.");
    evolveNewGeneration(room.players, room.result.winningSide);
  }
}
