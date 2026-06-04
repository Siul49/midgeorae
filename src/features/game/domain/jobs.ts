import type { ServerPlayer, Room } from "../server/types/game-server-types";
import { VILLAIN_MISSION_DESCRIPTIONS } from "../rules/game-rules";

/**
 * 시민 직업 및 공통 미션 진행률을 업데이트하고
 * 목표 달성 시 적절한 토큰/소지금 보상을 지급하는 공통 함수
 */
export function updateCitizenMissionProgress(
  room: Room,
  player: ServerPlayer,
  missionId: string,
  amount = 1,
) {
  if (!player.citizenMissions) return;
  const mission = player.citizenMissions.find((m) => m.id === missionId);
  if (!mission || mission.completed) return;

  mission.progress = Math.min(mission.target, mission.progress + amount);

  if (mission.progress >= mission.target) {
    mission.completed = true;

    let rewardLabel = "";
    if (mission.rewardType === "inspectToken") {
      player.inspectTokens += mission.rewardAmount;
      rewardLabel = `감정 토큰 ${mission.rewardAmount}개`;
    } else if (mission.rewardType === "negoToken") {
      player.negoTokens += mission.rewardAmount;
      rewardLabel = `네고 토큰 ${mission.rewardAmount}개`;
    } else if (mission.rewardType === "money") {
      player.money += mission.rewardAmount;
      rewardLabel = `소지금 ${mission.rewardAmount.toLocaleString()}원`;
    }

    room.logs.push(
      `🎉 [미션 성공] ${player.name}님이 '${mission.title}' 미션을 완료하여 [${rewardLabel}]을 획득했습니다!`,
    );
  }
}

/**
 * 빌런 미션 최종 성공 판정 함수
 */
export function evaluateVillainMission(villain: ServerPlayer): boolean {
  if (villain.role !== "villain" || !villain.mission) return false;

  switch (villain.mission) {
    case VILLAIN_MISSION_DESCRIPTIONS.VILLAIN_MISSION_BRICK:
      return villain.brickSalesCount >= 1;

    case VILLAIN_MISSION_DESCRIPTIONS.VILLAIN_MISSION_DEFECT:
      return villain.defectSalesCount >= 1;

    case VILLAIN_MISSION_DESCRIPTIONS.VILLAIN_MISSION_OVERPRICE:
      return villain.overpriceSalesCount >= 2;
  }

  return false;
}
