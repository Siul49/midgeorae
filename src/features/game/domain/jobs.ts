import type { ServerPlayer } from "../server/types";
import { VILLAIN_MISSION_DESCRIPTIONS } from "../rules/game-rules";

/**
 * 시민 직업 미션 평가 함수
 * 조건 충족 시 알맞은 토큰을 1개 증가시키고 알림 메시지를 반환합니다.
 * 중복 지급을 방지하기 위해 카운터가 임계치인 "2"에 정확히 도달하는 최초 1회만 지급합니다.
 */
export function evaluateCitizenMission(player: ServerPlayer): string | null {
  if (!player.job) return null;

  switch (player.job.id) {
    case "inspector":
      if (player.tradeParticipations === 2 && player.inspectTokens === 0) {
        player.inspectTokens += 1;
        return `${player.name}님이 '검수자' 미션(거래 2회 참여)을 달성하여 [감정 토큰] 1개를 획득했습니다!`;
      }
      break;

    case "negotiator":
      if (player.negoOffersSent === 2 && player.negoTokens === 0) {
        player.negoTokens += 1;
        return `${player.name}님이 '흥정가' 미션(흥정 제안 2회 전송)을 달성하여 [네고 토큰] 1개를 획득했습니다!`;
      }
      break;

    case "reporter":
      if (player.reviewsSubmitted === 2 && player.evidenceTokens === 0) {
        player.evidenceTokens += 1;
        return `${player.name}님이 '신고자' 미션(후기 2회 작성)을 달성하여 [증거 토큰] 1개를 획득했습니다!`;
      }
      break;
  }

  return null;
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
