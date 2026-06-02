import { describe, expect, it } from "vitest";
import { evaluateCitizenMission, evaluateVillainMission } from "../jobs";
import { VILLAIN_MISSION_DESCRIPTIONS } from "../../rules/game-rules";
import type { ServerPlayer } from "../../server/types";

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
  };
}

describe("game jobs domain", () => {
  describe("evaluateCitizenMission", () => {
    it("gives inspectToken to inspector on their 2nd trade participation", () => {
      const player = mockPlayer("p1", "citizen", "inspector");
      player.tradeParticipations = 2;

      const result = evaluateCitizenMission(player);

      expect(player.inspectTokens).toBe(1);
      expect(result).toContain("검수자");
    });

    it("does not reward inspector twice or when threshold not reached", () => {
      const player = mockPlayer("p1", "citizen", "inspector");

      // 1회 도달 시 무반응
      player.tradeParticipations = 1;
      expect(evaluateCitizenMission(player)).toBeNull();
      expect(player.inspectTokens).toBe(0);

      // 2회 도달 시 1개 충전
      player.tradeParticipations = 2;
      expect(evaluateCitizenMission(player)).not.toBeNull();
      expect(player.inspectTokens).toBe(1);

      // 3회 도달 시 추가 충전 안 함
      player.tradeParticipations = 3;
      expect(evaluateCitizenMission(player)).toBeNull();
      expect(player.inspectTokens).toBe(1);
    });

    it("rewards negotiator and reporter accordingly", () => {
      const negotiator = mockPlayer("p2", "citizen", "negotiator");
      negotiator.negoOffersSent = 2;
      expect(evaluateCitizenMission(negotiator)).toContain("흥정가");
      expect(negotiator.negoTokens).toBe(1);

      const reporter = mockPlayer("p3", "citizen", "reporter");
      reporter.reviewsSubmitted = 2;
      expect(evaluateCitizenMission(reporter)).toContain("신고자");
      expect(reporter.evidenceTokens).toBe(1);
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
