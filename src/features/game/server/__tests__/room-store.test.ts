import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createRoom,
  getRoomSnapshot,
  joinRoom,
  resetRoomsForTests,
  submitRoomAction as originalSubmitRoomAction,
  rooms,
} from "../room-store";

function submitRoomAction(
  code: string,
  token: string,
  action: Parameters<typeof originalSubmitRoomAction>[2],
) {
  const result = originalSubmitRoomAction(code, token, action);

  if (action.type === "startGame") {
    const room = rooms.get(code);
    if (room && room.status === "preparing") {
      room.players.forEach((player) => {
        if (!player.isPrepared) {
          const itemsConfig = player.hand.map((item) => {
            let fakeItemId: string | undefined = undefined;
            if (item.isBrick) {
              fakeItemId = "iphone";
            }
            return {
              instanceId: item.instanceId,
              customCondition: item.condition ?? "used",
              askingPrice: item.originalPrice > 0 ? item.originalPrice : 500000,
              fakeItemId,
            };
          });
          originalSubmitRoomAction(code, player.token, {
            type: "fixPreparation",
            itemsConfig,
          });
        }
      });
    }
    return getRoomSnapshot(code, token);
  }

  return result;
}

describe("room-store", () => {
  beforeEach(() => resetRoomsForTests());

  function joinPlayers(code: string, names: string[]) {
    return names.map((name) => joinRoom(code, name));
  }

  function advanceTurnTo(
    code: string,
    sessions: ReturnType<typeof createRoom>[],
    playerId: string,
  ) {
    for (let index = 0; index < sessions.length; index += 1) {
      const currentTurnPlayerId = getRoomSnapshot(
        code,
        sessions[0]!.playerToken,
      ).currentTurnPlayerId;
      if (currentTurnPlayerId === playerId) return;
      const currentSession = sessions.find(
        (session) => session.playerId === currentTurnPlayerId,
      );
      expect(currentSession).toBeDefined();
      submitRoomAction(code, currentSession!.playerToken, { type: "endTurn" });
    }
  }

  function drawUntilActionType(
    code: string,
    sessions: ReturnType<typeof createRoom>[],
    actionType: "tradeRequest" | "freeGive" | "directTrade" | "forceBuy" | "freeShare",
  ) {
    const roomObj = rooms.get(code);
    if (roomObj) {
      roomObj.actionDeck.unshift({
        type: actionType,
        title: actionType,
        description: "forced test draw",
        imagePath: "",
      });
    }

    for (let index = 0; index < 30; index += 1) {
      const currentTurnPlayerId = getRoomSnapshot(
        code,
        sessions[0]!.playerToken,
      ).currentTurnPlayerId;
      const currentSession = sessions.find(
        (session) => session.playerId === currentTurnPlayerId,
      );
      expect(currentSession).toBeDefined();
      const drawn = submitRoomAction(code, currentSession!.playerToken, {
        type: "drawActionCard",
      });
      if (drawn.currentActionCard?.type === actionType) {
        return { session: currentSession!, snapshot: drawn };
      }
      submitRoomAction(code, currentSession!.playerToken, { type: "endTurn" });
    }

    throw new Error(`Could not draw ${actionType}`);
  }

  function currentTurnSession(
    code: string,
    sessions: ReturnType<typeof createRoom>[],
  ) {
    const currentTurnPlayerId = getRoomSnapshot(
      code,
      sessions[0]!.playerToken,
    ).currentTurnPlayerId;
    const session = sessions.find(
      (candidate) => candidate.playerId === currentTurnPlayerId,
    );
    expect(session).toBeDefined();
    return session!;
  }
  it("creates a room and lets up to five players join", () => {
    const host = createRoom("경수");

    expect(host.room.code).toMatch(/^[A-Z0-9]{4}$/);
    expect(host.room.mode).toBe("real");
    expect(host.room.players).toHaveLength(1);

    joinPlayers(host.room.code, ["유현", "윤식", "환희", "민지"]);
    const fullRoom = getRoomSnapshot(host.room.code, host.playerToken);

    expect(fullRoom.players).toHaveLength(5);
    expect(() => joinRoom(host.room.code, "초과")).toThrow(
      "방이 가득 찼습니다.",
    );
  });

  it("uses default player names when players skip the name field", () => {
    const host = createRoom("");
    const second = joinRoom(host.room.code, "   ");

    expect(host.room.players[0]?.name).toBe("호스트");
    expect(second.room.players.find((player) => player.id === second.playerId)?.name).toBe(
      "플레이어 2",
    );
  });

  it("keeps rooms available when the server module is reloaded", async () => {
    const host = createRoom("경수");

    vi.resetModules();
    const reloadedStore = await import("../room-store");
    const snapshot = reloadedStore.getRoomSnapshot(
      host.room.code,
      host.playerToken,
    );

    expect(snapshot.code).toBe(host.room.code);
    reloadedStore.resetRoomsForTests();
  });

  it("filters villain role and mission to the owning player only", () => {
    const host = createRoom("경수");
    const p2 = joinRoom(host.room.code, "유현");
    joinRoom(host.room.code, "윤식");
    joinRoom(host.room.code, "환희");

    submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });

    const hostView = getRoomSnapshot(host.room.code, host.playerToken);
    const p2View = getRoomSnapshot(host.room.code, p2.playerToken);

    expect(hostView.me?.role).toMatch(/citizen|villain/);
    expect(p2View.me?.role).toMatch(/citizen|villain/);
    expect(hostView.players.every((player) => player.role === undefined)).toBe(
      true,
    );
    expect(p2View.players.every((player) => player.role === undefined)).toBe(
      true,
    );
  });

  it("starts each player with a private job, variable money, five item cards, deal cards, and five reputation tokens", () => {
    const host = createRoom("경수");
    const [p2, p3, p4, p5] = joinPlayers(host.room.code, [
      "유현",
      "윤식",
      "환희",
      "민지",
    ]);

    submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });

    const hostView = getRoomSnapshot(host.room.code, host.playerToken);
    const p2View = getRoomSnapshot(host.room.code, p2.playerToken);
    const p3View = getRoomSnapshot(host.room.code, p3.playerToken);
    const p4View = getRoomSnapshot(host.room.code, p4.playerToken);
    const p5View = getRoomSnapshot(host.room.code, p5.playerToken);
    const startingMoney = [
      hostView.me?.money,
      p2View.me?.money,
      p3View.me?.money,
      p4View.me?.money,
      p5View.me?.money,
    ];

    expect(hostView.me?.role).toMatch(/citizen|villain/);
    expect(hostView.me?.job?.title).toBeTruthy();
    expect(hostView.me?.hand).toHaveLength(5);
    expect(new Set(startingMoney).size).toBeGreaterThan(1);
    expect(hostView.me?.reputationTokens).toBe(5);
    expect(hostView.me?.dealCards).toEqual({ cool: true, cancel: true });
    expect(hostView.players.every((player) => player.itemCount === 5)).toBe(true);
    expect(hostView.players.every((player) => player.hand === undefined)).toBe(true);
    expect(hostView.players.every((player) => player.money === undefined)).toBe(true);
    expect(hostView.players.every((player) => player.job === undefined)).toBe(true);
    expect(p2View.me?.hand).toHaveLength(5);
    expect(p5View.me?.hand).toHaveLength(5);
  });

  it("can start with the minimum three players", () => {
    const host = createRoom("경수");
    const [p2, p3] = joinPlayers(host.room.code, ["유현", "윤식"]);

    submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });

    const hostView = getRoomSnapshot(host.room.code, host.playerToken);
    const p2View = getRoomSnapshot(host.room.code, p2.playerToken);
    const p3View = getRoomSnapshot(host.room.code, p3.playerToken);

    expect(hostView.status).toBe("playing");
    expect(hostView.players).toHaveLength(3);
    expect(hostView.me?.hand).toHaveLength(5);
    expect(p2View.me?.hand).toHaveLength(5);
    expect(p3View.me?.hand).toHaveLength(5);
  });

  it("sets the market action budget from the player count", () => {
    const host = createRoom("경수");
    joinRoom(host.room.code, "유현");
    joinRoom(host.room.code, "윤식");
    joinRoom(host.room.code, "환희");

    const started = submitRoomAction(host.room.code, host.playerToken, {
      type: "startGame",
    });

    expect(started.usedActionCount).toBe(0);
    expect(started.marketActionLimit).toBe(20);
  });

  it("includes item category, condition, and empty acquired price in private hands", () => {
    const host = createRoom("경수");
    joinRoom(host.room.code, "유현");
    joinRoom(host.room.code, "윤식");

    submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });

    const hostView = getRoomSnapshot(host.room.code, host.playerToken);
    const firstItem = hostView.me!.hand!.find((item) => !item.isBrick);

    expect(firstItem).toBeDefined();
    expect(firstItem!.category).toMatch(/electronics|fashion|hobby|living/);
    expect(firstItem!.condition).toMatch(/mint|used|defective|broken/);
    expect(firstItem!.acquiredPrice).toBeNull();
    expect(hostView.players.every((player) => player.hand === undefined)).toBe(true);
  });

  it("lets the host add automatic bot players for solo testing", () => {
    const host = createRoom("경수", "botTest");

    const withFirstBot = submitRoomAction(host.room.code, host.playerToken, {
      type: "addBot",
    });
    const withSecondBot = submitRoomAction(host.room.code, host.playerToken, {
      type: "addBot",
    });

    expect(withFirstBot.players.filter((player) => player.isBot)).toHaveLength(1);
    expect(withSecondBot.players).toHaveLength(3);
    expect(withSecondBot.players.filter((player) => player.isBot)).toHaveLength(2);

    const started = submitRoomAction(host.room.code, host.playerToken, {
      type: "startGame",
    });
    expect(started.status).toBe("playing");
    expect(started.players.every((player) => player.itemCount === 5)).toBe(true);
  });

  it("automatically plays bot turns back to the human player", () => {
    const host = createRoom("경수", "botTest");
    submitRoomAction(host.room.code, host.playerToken, { type: "addBot" });
    submitRoomAction(host.room.code, host.playerToken, { type: "addBot" });
    submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });

    let afterBots = submitRoomAction(host.room.code, host.playerToken, {
      type: "endTurn",
    });

    // 봇들이 사람(호스트)에게 거래를 제안하여 턴이 멈춘 동안, 호스트가 지속적으로 거래를 취소(cancel)하여 턴이 호스트에게 되돌아오게 함
    while (afterBots.pendingDeal && afterBots.currentTurnPlayerId !== host.playerId) {
      afterBots = submitRoomAction(host.room.code, host.playerToken, {
        type: "chooseDealCard",
        choice: "cancel",
      });
    }

    expect(afterBots.currentTurnPlayerId).toBe(host.playerId);
    expect(afterBots.logs.some((log) => log.includes("자동"))).toBe(true);
  });

  it("keeps real game rooms free of test bots", () => {
    const host = createRoom("경수", "real");

    expect(() =>
      submitRoomAction(host.room.code, host.playerToken, { type: "addBot" }),
    ).toThrow("봇 테스트 방에서만 봇을 추가할 수 있습니다.");
  });

  it("counts market progress when a turn action is consumed, not when an action card is drawn", () => {
    const host = createRoom("경수");
    const p2 = joinRoom(host.room.code, "유현");
    const p3 = joinRoom(host.room.code, "윤식");
    const sessions = [host, p2, p3];
    submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });

    const drawn = submitRoomAction(host.room.code, host.playerToken, {
      type: "drawActionCard",
    });
    expect(drawn.usedActionCount).toBe(0);

    const skipped = submitRoomAction(host.room.code, host.playerToken, {
      type: "endTurn",
    });
    expect(skipped.usedActionCount).toBe(1);
    expect(skipped.marketActionLimit).toBe(15);
    expect(skipped.currentTurnPlayerId).toBe(p2.playerId);

    const nextSession = currentTurnSession(host.room.code, sessions);
    const nextSkipped = submitRoomAction(host.room.code, nextSession.playerToken, {
      type: "endTurn",
    });
    expect(nextSkipped.usedActionCount).toBe(2);
  });

  it("moves to final reporting when the market action budget is exhausted", () => {
    const host = createRoom("경수");
    const p2 = joinRoom(host.room.code, "유현");
    const p3 = joinRoom(host.room.code, "윤식");
    const sessions = [host, p2, p3];
    submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });

    let snapshot = getRoomSnapshot(host.room.code, host.playerToken);
    while (snapshot.usedActionCount < snapshot.marketActionLimit) {
      const session = currentTurnSession(host.room.code, sessions);
      snapshot = submitRoomAction(host.room.code, session.playerToken, {
        type: "endTurn",
      });
    }

    expect(snapshot.status).toBe("reporting");
    expect(snapshot.usedActionCount).toBe(15);
    expect(snapshot.marketActionLimit).toBe(15);
    expect(snapshot.currentTurnPlayerId).toBeNull();
    expect(snapshot.logs.some((log) => log.includes("시장 마감"))).toBe(true);
  });

  it("rejects starting with fewer than three players", () => {
    const host = createRoom("경수");
    joinRoom(host.room.code, "유현");

    expect(() =>
      submitRoomAction(host.room.code, host.playerToken, { type: "startGame" }),
    ).toThrow("3명 이상 모여야 시작할 수 있습니다.");
  });


  it("returns the host role in the start game response", () => {
    const host = createRoom("경수");
    joinRoom(host.room.code, "유현");
    joinRoom(host.room.code, "윤식");
    joinRoom(host.room.code, "환희");

    const started = submitRoomAction(host.room.code, host.playerToken, {
      type: "startGame",
    });

    expect(started.me?.role).toMatch(/citizen|villain/);
  });

  it("rejects actions from players who are not allowed to act", () => {
    const host = createRoom("경수");
    const p2 = joinRoom(host.room.code, "유현");
    joinRoom(host.room.code, "윤식");
    joinRoom(host.room.code, "환희");
    submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });

    expect(() =>
      submitRoomAction(host.room.code, p2.playerToken, { type: "rollDice" }),
    ).toThrow("현재 턴 플레이어만 할 수 있습니다.");
  });

  it("finishes the game after every player reports a suspicious trader", () => {
    const host = createRoom("경수");
    const p2 = joinRoom(host.room.code, "유현");
    const p3 = joinRoom(host.room.code, "윤식");
    const p4 = joinRoom(host.room.code, "환희");
    const p5 = joinRoom(host.room.code, "민지");
    submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });

    const started = getRoomSnapshot(host.room.code, host.playerToken);
    const target = started.players.find((player) => player.id !== host.playerId);
    expect(target).toBeDefined();
    submitRoomAction(host.room.code, host.playerToken, {
      type: "startReporting",
    });

    for (const token of [
      host.playerToken,
      p2.playerToken,
      p3.playerToken,
      p4.playerToken,
      p5.playerToken,
    ]) {
      submitRoomAction(host.room.code, token, {
        type: "reportSuspiciousPlayer",
        targetPlayerId: target!.id,
      });
    }

    const finished = getRoomSnapshot(host.room.code, host.playerToken);
    expect(finished.status).toBe("finished");
    expect(finished.result).toBeDefined();
    expect(finished.result?.reports[target!.id]).toBe(5);
  });

  it("forces reporting phase when a citizen's reputation drops to 0, and finishes game when villain's reputation drops to 0", () => {
    const host = createRoom("A");
    joinRoom(host.room.code, "B");
    joinRoom(host.room.code, "C");
    joinRoom(host.room.code, "D");
    submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });

    const roomInstance = rooms.get(host.room.code);
    expect(roomInstance).toBeDefined();

    const citizen = roomInstance!.players.find((p) => p.role === "citizen");
    const villain = roomInstance!.players.find((p) => p.role === "villain");
    expect(citizen).toBeDefined();
    expect(villain).toBeDefined();

    // 1. 시민 평판 0 도달 시: 강제 투표(reporting) 진입 검증
    citizen!.reputationTokens = 1;
    roomInstance!.status = "playing";
    roomInstance!.currentTurnPlayerId = villain!.id;
    roomInstance!.currentActionCard = {
      type: "badReview",
      title: "악플테러",
      description: "평판 깎기",
      imagePath: "",
    };

    const snapAfterTerror = submitRoomAction(host.room.code, villain!.token, {
      type: "terrorReview",
      targetPlayerId: citizen!.id,
    });

    expect(citizen!.reputationTokens).toBe(0);
    expect(snapAfterTerror.status).toBe("reporting");
    expect(snapAfterTerror.logs.some((l) => l.includes("평판이 0이 되어"))).toBe(true);

    // 2. 빌런 평판 0 도달 시: 즉시 게임 종료(finished) 및 시민 승리 검증
    roomInstance!.status = "playing";
    villain!.reputationTokens = 1;
    roomInstance!.currentTurnPlayerId = citizen!.id;
    roomInstance!.currentActionCard = {
      type: "badReview",
      title: "악플테러",
      description: "평판 깎기",
      imagePath: "",
    };

    const snapAfterVillainTerror = submitRoomAction(host.room.code, citizen!.token, {
      type: "terrorReview",
      targetPlayerId: villain!.id,
    });

    expect(villain!.reputationTokens).toBe(0);
    expect(snapAfterVillainTerror.status).toBe("finished");
    expect(snapAfterVillainTerror.result?.winningSide).toBe("citizens");
  });

  it("allocates random 2 citizen missions to citizen players on start", () => {
    const host = createRoom("A");
    joinRoom(host.room.code, "B");
    joinRoom(host.room.code, "C");
    joinRoom(host.room.code, "D");
    submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });

    const roomInstance = rooms.get(host.room.code);
    expect(roomInstance).toBeDefined();

    const citizen = roomInstance!.players.find((p) => p.role === "citizen")!;
    expect(citizen.citizenMissions).toBeDefined();
    expect(citizen.citizenMissions!.length).toBe(2);
    expect(citizen.citizenMissions![0]!.completed).toBe(false);
    expect(citizen.citizenMissions![1]!.completed).toBe(false);

    const villain = roomInstance!.players.find((p) => p.role === "villain")!;
    expect(villain.citizenMissions!.length).toBe(0);
  });

  it("allows requester to use inspect token and view the real brick status in snapshot covertly", () => {
    const host = createRoom("A");
    const p2 = joinRoom(host.room.code, "B");
    joinRoom(host.room.code, "C");
    joinRoom(host.room.code, "D");
    submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });

    const roomInstance = rooms.get(host.room.code);
    const villain = roomInstance!.players.find((p) => p.role === "villain")!;
    const citizen = roomInstance!.players.find((p) => p.role === "citizen" && p.id !== host.playerId)!;

    // 빌런의 아이템 강제로 벽돌 설정
    const villainItem = villain.hand[0]!;
    villainItem.isBrick = true;

    // 시민을 구매자, 빌런을 판매자로 거래 강제 빌드
    roomInstance!.status = "playing";
    roomInstance!.currentTurnPlayerId = citizen.id;
    roomInstance!.currentActionCard = {
      type: "tradeRequest",
      title: "거래",
      description: "감정테스트",
      imagePath: "",
    };

    submitRoomAction(host.room.code, citizen.token, {
      type: "requestTrade",
      ownerId: villain.id,
      itemInstanceId: villainItem.instanceId,
      offerPrice: 200000,
    });

    // 감정 토큰 충전
    citizen.inspectTokens = 1;

    // 감정 토큰 사용 액션 전송
    const afterInspectSnap = submitRoomAction(host.room.code, citizen.token, {
      type: "useInspectToken",
    });

    expect(citizen.inspectTokens).toBe(0);
    expect(roomInstance!.pendingDeal!.inspectedResult).toBe("scam");

    // 구매자(시민) 스냅샷 조회 -> isBrick: true 노출 확인
    const citizenSnap = getRoomSnapshot(host.room.code, citizen.token);
    expect(citizenSnap.pendingDealItem!.isBrick).toBe(true);

    // 판매자(빌런) 스냅샷 조회 -> isBrick: false로 마스킹 확인
    const villainSnap = getRoomSnapshot(host.room.code, villain.token);
    expect(villainSnap.pendingDealItem!.isBrick).toBe(false);
  });

  it("allows deal party to use nego token and complete the trade instantly with 50% discount", () => {
    const host = createRoom("A");
    const p2 = joinRoom(host.room.code, "B");
    joinRoom(host.room.code, "C");
    joinRoom(host.room.code, "D");
    submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });

    const roomInstance = rooms.get(host.room.code);
    const citizen1 = roomInstance!.players.find((p) => p.role === "citizen")!;
    const citizen2 = roomInstance!.players.find((p) => p.role === "citizen" && p.id !== citizen1.id)!;

    const targetItem = citizen2.hand[0]!;
    targetItem.isBrick = false;

    roomInstance!.status = "playing";
    roomInstance!.currentTurnPlayerId = citizen1.id;
    roomInstance!.currentActionCard = {
      type: "tradeRequest",
      title: "거래",
      description: "네고테스트",
      imagePath: "",
    };

    submitRoomAction(host.room.code, citizen1.token, {
      type: "requestTrade",
      ownerId: citizen2.id,
      itemInstanceId: targetItem.instanceId,
      offerPrice: 400000,
    });

    // 네고 토큰 충전
    citizen1.negoTokens = 1;
    const beforeCitizen1Money = citizen1.money;
    const beforeCitizen2Money = citizen2.money;

    // 네고 토큰 사용 액션 전송
    const afterNegoSnap = submitRoomAction(host.room.code, citizen1.token, {
      type: "useNegoToken",
    });

    // 즉시 거래 성사 및 가격 50% 할인 검증
    expect(citizen1.negoTokens).toBe(0);
    expect(roomInstance!.pendingDeal).toBeNull();
    expect(citizen1.money).toBe(beforeCitizen1Money - 200000);
    expect(citizen2.money).toBe(beforeCitizen2Money + 200000);
  });

});
