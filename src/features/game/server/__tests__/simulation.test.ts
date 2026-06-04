import { describe, it, expect } from "vitest";
import {
  createRoom,
  getRoomSnapshot,
  submitRoomAction,
  rooms,
} from "../room-store";
import type { Room, ServerPlayer } from "../types/game-server-types";

describe("25-turn 10-run Bot Simulation Test", () => {
  it("runs the game 10 times and completes all 25 turns successfully without errors", () => {
    const RUN_COUNT = 10;
    const TARGET_TURN_COUNT = 25;

    for (let run = 1; run <= RUN_COUNT; run++) {
      console.log(`\n=================== SIMULATION RUN #${run} START ===================`);
      
      // 1. 방 만들기 (botTest 모드)
      const hostSession = createRoom("인간플레이어", "botTest");
      const code = hostSession.room.code;
      const hostToken = hostSession.playerToken;
      const hostId = hostSession.playerId;

      const roomInstance = rooms.get(code)!;
      expect(roomInstance).toBeDefined();

      // marketActionLimit를 25턴 이상으로 강제 설정 (사용자 요구사항인 25턴 이상 충족)
      roomInstance.marketActionLimit = TARGET_TURN_COUNT;

      // 2. 봇 4인 추가 (총 5인)
      for (let i = 0; i < 4; i++) {
        submitRoomAction(code, hostToken, { type: "addBot" });
      }

      const snapAfterAdd = getRoomSnapshot(code, hostToken);
      expect(snapAfterAdd.players).toHaveLength(5);
      expect(snapAfterAdd.players.filter((p) => p.isBot)).toHaveLength(4);

      // 3. 게임 시작
      let currentSnap = submitRoomAction(code, hostToken, { type: "startGame" });
      expect(currentSnap.status).toBe("preparing");

      // 4. 인간 플레이어 매물 준비 (사전 작업)
      // 호스트의 핸드에서 상품 구성
      const meInRoom = roomInstance.players.find((p) => p.id === hostId)!;
      const hostItemsConfig = meInRoom.hand.map((item) => {
        let fakeItemId: string | undefined = undefined;
        if (item.isBrick) {
          fakeItemId = "iphone"; // 가짜 아이디 설정
        }
        return {
          instanceId: item.instanceId,
          customCondition: item.condition ?? "used",
          askingPrice: item.originalPrice > 0 ? item.originalPrice : 150000,
          fakeItemId,
        };
      });

      currentSnap = submitRoomAction(code, hostToken, {
        type: "fixPreparation",
        itemsConfig: hostItemsConfig,
      });

      // 봇들은 자동으로 fixPreparation이 진행되므로 방 상태는 playing으로 전이되어야 함
      expect(currentSnap.status).toBe("playing");

      let loopCount = 0;
      const maxLoops = 1000; // 무한 루프 방지용 가드

      while (currentSnap.status !== "finished" && loopCount < maxLoops) {
        loopCount++;

        // 봇들의 자동 플레이 트리거를 위해 매 루프마다 스냅샷 조회
        currentSnap = getRoomSnapshot(code, hostToken);

        if (currentSnap.status === "finished") {
          break;
        }

        // 1. 신고 단계 처리
        if (currentSnap.status === "reporting") {
          // 호스트가 아직 신고하지 않았다면 무작위 봇 신고
          if (!roomInstance.reports[hostId]) {
            const targets = currentSnap.players.filter((p) => p.id !== hostId);
            const randomTarget = targets[Math.floor(Math.random() * targets.length)]!;
            currentSnap = submitRoomAction(code, hostToken, {
              type: "reportSuspiciousPlayer",
              targetPlayerId: randomTarget.id,
            });
          }
          continue;
        }

        // 2. 거래 제안 중인 경우 처리
        if (currentSnap.pendingDeal) {
          const deal = currentSnap.pendingDeal;
          const isHostPart = deal.ownerId === hostId || deal.requesterId === hostId;

          if (isHostPart && !deal.choices[hostId]) {
            // 호스트가 딜 참여자인데 의사결정을 내리지 않은 경우
            // 토큰이 있다면 테스트 목적으로 적극 활용해 봄
            const hostInRoom = roomInstance.players.find((p) => p.id === hostId)!;

            if (deal.requesterId === hostId && hostInRoom.inspectTokens > 0 && Math.random() < 0.5) {
              // 50% 확률로 감정 토큰 사용
              currentSnap = submitRoomAction(code, hostToken, { type: "useInspectToken" });
              console.log(`[Run #${run}] 인간플레이어가 감정 토큰을 사용했습니다.`);
            } else if (hostInRoom.negoTokens > 0 && Math.random() < 0.5) {
              // 50% 확률로 네고 토큰 사용
              currentSnap = submitRoomAction(code, hostToken, { type: "useNegoToken" });
              console.log(`[Run #${run}] 인간플레이어가 네고 토큰을 사용했습니다.`);
            } else {
              // 일반 의사결정 (쿨거래 또는 취소)
              const choice = Math.random() < 0.7 ? "cool" : "cancel";
              currentSnap = submitRoomAction(code, hostToken, {
                type: "chooseDealCard",
                choice,
              });
              console.log(`[Run #${run}] 인간플레이어가 거래 딜에 대해 '${choice}'를 선택했습니다.`);
            }
          }
          continue;
        }

        // 3. 거래 후기 등록 중인 경우 처리
        if (roomInstance.pendingReviews.length > 0) {
          const myReview = roomInstance.pendingReviews.find((r) => r.reviewerId === hostId);
          if (myReview) {
            // 호스트가 후기를 작성해야 하는 경우 만족도 무작위 결정
            const satisfied = Math.random() < 0.8;
            currentSnap = submitRoomAction(code, hostToken, {
              type: "reviewTrade",
              targetPlayerId: myReview.targetPlayerId,
              satisfied,
            });
            console.log(`[Run #${run}] 인간플레이어가 ${myReview.targetPlayerId}에게 후기(만족: ${satisfied})를 남겼습니다.`);
          }
          continue;
        }

        // 4. 인간 플레이어의 턴인 경우 카드 드로우 및 액션
        if (currentSnap.currentTurnPlayerId === hostId) {
          if (!currentSnap.currentActionCard) {
            // 카드 드로우
            currentSnap = submitRoomAction(code, hostToken, { type: "drawActionCard" });
            console.log(`[Run #${run}] 인간플레이어가 행동카드를 드로우했습니다: ${currentSnap.currentActionCard?.title}`);
          } else {
            const card = currentSnap.currentActionCard;
            const hostInRoom = roomInstance.players.find((p) => p.id === hostId)!;

            if (
              card.type === "tradeRequest" ||
              card.type === "directTrade" ||
              card.type === "freeGive"
            ) {
              // 구매/획득 액션 -> 타겟 플레이어의 아이템 탐색
              const otherPlayers = roomInstance.players.filter((p) => p.id !== hostId);
              let targetFound = false;

              for (const targetPlayer of otherPlayers) {
                const targetItem = targetPlayer.hand.find((item) => item.acquiredPrice === null);
                if (targetItem) {
                  const offerPrice = card.type === "freeGive" ? 0 : targetItem.marketPrice;
                  if (hostInRoom.money >= offerPrice) {
                    currentSnap = submitRoomAction(code, hostToken, {
                      type: "requestTrade",
                      ownerId: targetPlayer.id,
                      itemInstanceId: targetItem.instanceId,
                      offerPrice,
                    });
                    console.log(`[Run #${run}] 인간플레이어가 ${targetPlayer.name}의 물건에 거래를 요청했습니다.`);
                    targetFound = true;
                    break;
                  }
                }
              }

              if (!targetFound) {
                currentSnap = submitRoomAction(code, hostToken, { type: "endTurn" });
                console.log(`[Run #${run}] 인간플레이어가 거래 대상이 없어 턴을 넘겼습니다.`);
              }
            } else if (card.type === "forceBuy" || card.type === "freeShare") {
              // 강매/무료나눔 액션 -> 내 아이템을 남에게 보냄
              const myItems = hostInRoom.hand.filter((item) => item.acquiredPrice === null);
              const otherPlayers = roomInstance.players.filter((p) => p.id !== hostId);
              let targetFound = false;

              if (myItems.length > 0) {
                for (const targetPlayer of otherPlayers) {
                  const item = myItems[0]!;
                  const offerPrice = card.type === "freeShare" ? 0 : Math.round(item.marketPrice * 1.1);
                  if (card.type === "freeShare" || targetPlayer.money >= offerPrice) {
                    currentSnap = submitRoomAction(code, hostToken, {
                      type: "requestTrade",
                      ownerId: targetPlayer.id,
                      itemInstanceId: item.instanceId,
                      offerPrice,
                    });
                    console.log(`[Run #${run}] 인간플레이어가 ${targetPlayer.name}에게 물건을 강매/나눔 제안했습니다.`);
                    targetFound = true;
                    break;
                  }
                }
              }

              if (!targetFound) {
                currentSnap = submitRoomAction(code, hostToken, { type: "endTurn" });
                console.log(`[Run #${run}] 인간플레이어가 강매/나눔 대상이 없어 턴을 넘겼습니다.`);
              }
            } else if (card.type === "badReview") {
              // 악플 테러 -> 평판 높은 봇 타겟
              const targets = roomInstance.players.filter((p) => p.id !== hostId);
              targets.sort((a, b) => b.reputationTokens - a.reputationTokens);
              const target = targets[0]!;
              currentSnap = submitRoomAction(code, hostToken, {
                type: "terrorReview",
                targetPlayerId: target.id,
              });
              console.log(`[Run #${run}] 인간플레이어가 ${target.name}에게 악플 테러를 날렸습니다.`);
            } else if (card.type === "recycle") {
              // 분리수거 -> 벽돌이 있으면 버림
              const brick = hostInRoom.hand.find((item) => item.isBrick);
              if (brick) {
                currentSnap = submitRoomAction(code, hostToken, {
                  type: "recycleBrick",
                  itemInstanceId: brick.instanceId,
                });
                console.log(`[Run #${run}] 인간플레이어가 벽돌을 분리수거했습니다.`);
              } else {
                currentSnap = submitRoomAction(code, hostToken, { type: "endTurn" });
                console.log(`[Run #${run}] 인간플레이어가 벽돌이 없어 분리수거를 건너뛰었습니다.`);
              }
            } else if (card.type === "swap") {
              // 아이템 강제 교환
              const targets = roomInstance.players.filter((p) => p.id !== hostId && p.hand.length > 0);
              if (targets.length > 0) {
                const target = targets[0]!;
                currentSnap = submitRoomAction(code, hostToken, {
                  type: "swapRandomItem",
                  targetPlayerId: target.id,
                });
                console.log(`[Run #${run}] 인간플레이어가 ${target.name}와 아이템을 교환했습니다.`);
              } else {
                currentSnap = submitRoomAction(code, hostToken, { type: "endTurn" });
                console.log(`[Run #${run}] 인간플레이어가 교환할 대상이 없어 턴을 넘겼습니다.`);
              }
            } else {
              currentSnap = submitRoomAction(code, hostToken, { type: "endTurn" });
              console.log(`[Run #${run}] 인간플레이어가 턴을 종료했습니다.`);
            }
          }
        }
      }

      expect(loopCount).toBeLessThan(maxLoops); // 무한 루프에 걸리지 않았음을 검증
      expect(currentSnap.status).toBe("finished");
      expect(currentSnap.result).toBeDefined();
      console.log(`[Run #${run}] 게임 정상 완료! 최종 턴수: ${roomInstance.turnCount}, 액션수: ${roomInstance.usedActionCount}/${roomInstance.marketActionLimit}`);
      console.log(`[Run #${run}] 승리 진영: ${currentSnap.result?.winningSide}`);
      console.log(`=================== SIMULATION RUN #${run} END ===================\n`);
    }
  });
});
