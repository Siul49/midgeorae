import { describe, expect, it } from "vitest";
import { updateCitizenMissionProgress, evaluateVillainMission } from "../jobs";
import { VILLAIN_MISSION_DESCRIPTIONS } from "../../rules/game-rules";
import type { ServerPlayer, Room } from "../../server/types/game-server-types";

function mockRoom(): Room {
  return {
    code: "TEST",
    mode: "real",
    status: "playing",
    hostPlayerId: "p1",
    players: [],
    currentTurnPlayerId: "p1",
    turnCount: 1,
    usedActionCount: 0,
    marketActionLimit: 5,
    logs: [],
    actionDeck: [],
    discardPile: [],
    currentActionCard: null,
    pendingDeal: null,
    pendingReviews: [],
    reports: {},
    result: null,
    version: 1,
    createdAt: 0,
    updatedAt: 0,
  };
}

function mockPlayer(id: string, role: "citizen" | "villain", jobId?: string, missionText?: string): ServerPlayer {
  return {
    id,
    name: id,
    token: `${id}-token`,
    isHost: false,
    isBot: false,
    role,
    mission: missionText,
    job: jobId
      ? {
          id: jobId,
          title: jobId,
          description: "",
          startingMoney: 1000000,
        }
      : undefined,
    money: 1000000,
    reputationTokens: 5,
    manner: 36.5,
    likes: 0,
    dislikes: 0,
    position: 0,
    hand: [],
    dealCards: { cool: true, cancel: true },
    connectedAt: 0,
    tradeParticipations: 0,
    negoOffersSent: 0,
    reviewsSubmitted: 0,
    inspectTokens: 0,
    negoTokens: 0,
    evidenceTokens: 0,
    brickSalesCount: 0,
    defectSalesCount: 0,
    overpriceSalesCount: 0,
    citizenMissions: [],
  };
}

describe("game jobs domain", () => {
  describe("updateCitizenMissionProgress", () => {
    it("updates progress and awards token when target reached", () => {
      const room = mockRoom();
      const player = mockPlayer("p1", "citizen");
      player.citizenMissions = [
        {
          id: "inspector_trade",
          title: "현장 검수",
          description: "",
          progress: 0,
          target: 2,
          completed: false,
          rewardType: "inspectToken",
          rewardAmount: 1,
        },
      ];

      // 1. 1회 진행도 증가
      updateCitizenMissionProgress(room, player, "inspector_trade", 1);
      expect(player.citizenMissions[0]!.progress).toBe(1);
      expect(player.citizenMissions[0]!.completed).toBe(false);
      expect(player.inspectTokens).toBe(0);

      // 2. 2회차 도달 -> 완료 및 토큰 충전
      updateCitizenMissionProgress(room, player, "inspector_trade", 1);
      expect(player.citizenMissions[0]!.progress).toBe(2);
      expect(player.citizenMissions[0]!.completed).toBe(true);
      expect(player.inspectTokens).toBe(1);
      expect(room.logs.length).toBe(1);

      // 3. 초과 진행 시 중복 보상 방지
      updateCitizenMissionProgress(room, player, "inspector_trade", 1);
      expect(player.citizenMissions[0]!.progress).toBe(2);
      expect(player.inspectTokens).toBe(1);
    });

    it("awards money reward properly", () => {
      const room = mockRoom();
      const player = mockPlayer("p1", "citizen");
      player.citizenMissions = [
        {
          id: "cool_deal",
          title: "쿨거래",
          description: "",
          progress: 0,
          target: 1,
          completed: false,
          rewardType: "money",
          rewardAmount: 150000,
        },
      ];

      updateCitizenMissionProgress(room, player, "cool_deal", 1);
      expect(player.citizenMissions[0]!.completed).toBe(true);
      expect(player.money).toBe(1150000); // 1,000,000 + 150,000
    });
  });

  describe("evaluateVillainMission", () => {
    it("evaluates VILLAIN_MISSION_BRICK", () => {
      const text = VILLAIN_MISSION_DESCRIPTIONS.VILLAIN_MISSION_BRICK;
      const villain = mockPlayer("v1", "villain", undefined, text);

      villain.brickSalesCount = 0;
      expect(evaluateVillainMission(villain)).toBe(false);

      villain.brickSalesCount = 1;
      expect(evaluateVillainMission(villain)).toBe(true);
    });

    it("evaluates VILLAIN_MISSION_DEFECT", () => {
      const text = VILLAIN_MISSION_DESCRIPTIONS.VILLAIN_MISSION_DEFECT;
      const villain = mockPlayer("v1", "villain", undefined, text);

      villain.defectSalesCount = 0;
      expect(evaluateVillainMission(villain)).toBe(false);

      villain.defectSalesCount = 1;
      expect(evaluateVillainMission(villain)).toBe(true);
    });

    it("evaluates VILLAIN_MISSION_OVERPRICE", () => {
      const text = VILLAIN_MISSION_DESCRIPTIONS.VILLAIN_MISSION_OVERPRICE;
      const villain = mockPlayer("v1", "villain", undefined, text);

      villain.overpriceSalesCount = 1;
      expect(evaluateVillainMission(villain)).toBe(false);

      villain.overpriceSalesCount = 2;
      expect(evaluateVillainMission(villain)).toBe(true);
    });
  });
});
