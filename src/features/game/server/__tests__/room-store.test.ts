import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createRoom,
  getRoomSnapshot,
  joinRoom,
  resetRoomsForTests,
  submitRoomAction,
} from "../room-store";

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
    actionType: "tradeRequest" | "freeGive" | "directTrade",
  ) {
    for (let index = 0; index < 12; index += 1) {
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

    const afterBots = submitRoomAction(host.room.code, host.playerToken, {
      type: "endTurn",
    });

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

  it("starts a trade request from the current player for another player's item", () => {
    const requester = createRoom("A");
    const owner = joinRoom(requester.room.code, "B");
    joinRoom(requester.room.code, "C");
    joinRoom(requester.room.code, "D");
    submitRoomAction(requester.room.code, requester.playerToken, { type: "startGame" });
    submitRoomAction(requester.room.code, requester.playerToken, { type: "drawActionCard" });

    const ownerItem = getRoomSnapshot(
      requester.room.code,
      owner.playerToken,
    ).me!.hand![0];

    const requested = submitRoomAction(requester.room.code, requester.playerToken, {
      type: "requestTrade",
      ownerId: owner.playerId,
      itemInstanceId: ownerItem.instanceId,
      offerPrice: 120000,
    });

    expect(requested.pendingDeal).toMatchObject({
      actionType: "tradeRequest",
      requesterId: requester.playerId,
      ownerId: owner.playerId,
      itemInstanceId: ownerItem.instanceId,
      askingPrice: 120000,
    });
    expect(requested.pendingDeal).not.toHaveProperty("sellerId");
    expect(requested.pendingDeal).not.toHaveProperty("buyerId");
  });

  it("treats free give as a zero-price trade request", () => {
    const host = createRoom("A");
    const p2 = joinRoom(host.room.code, "B");
    const p3 = joinRoom(host.room.code, "C");
    const p4 = joinRoom(host.room.code, "D");
    const sessions = [host, p2, p3, p4];
    submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });

    const { session: requesterSession } = drawUntilActionType(
      host.room.code,
      sessions,
      "freeGive",
    );
    const ownerSession = sessions.find(
      (session) => session.playerId !== requesterSession.playerId,
    );
    expect(ownerSession).toBeDefined();
    const ownerItem = getRoomSnapshot(
      host.room.code,
      ownerSession!.playerToken,
    ).me!.hand![0];

    const requested = submitRoomAction(host.room.code, requesterSession.playerToken, {
      type: "requestTrade",
      ownerId: ownerSession!.playerId,
      itemInstanceId: ownerItem.instanceId,
      offerPrice: 120000,
    });

    expect(requested.pendingDeal).toMatchObject({
      actionType: "freeGive",
      requesterId: requesterSession.playerId,
      ownerId: ownerSession!.playerId,
      itemInstanceId: ownerItem.instanceId,
      askingPrice: 0,
    });
  });

  it("reveals the requested item for direct trade requests", () => {
    const host = createRoom("A");
    const p2 = joinRoom(host.room.code, "B");
    const p3 = joinRoom(host.room.code, "C");
    const p4 = joinRoom(host.room.code, "D");
    const sessions = [host, p2, p3, p4];
    submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });

    const { session: requesterSession } = drawUntilActionType(
      host.room.code,
      sessions,
      "directTrade",
    );
    const ownerSession = sessions.find(
      (session) => session.playerId !== requesterSession.playerId,
    );
    expect(ownerSession).toBeDefined();
    const ownerItem = getRoomSnapshot(
      host.room.code,
      ownerSession!.playerToken,
    ).me!.hand![0];

    const requested = submitRoomAction(host.room.code, requesterSession.playerToken, {
      type: "requestTrade",
      ownerId: ownerSession!.playerId,
      itemInstanceId: ownerItem.instanceId,
      offerPrice: 120000,
    });

    expect(requested.pendingDeal).toMatchObject({
      actionType: "directTrade",
      revealedBeforeDeal: true,
    });
    expect(requested.pendingDealItem).toMatchObject({
      instanceId: ownerItem.instanceId,
      id: ownerItem.id,
      revealed: true,
    });
  });

  it("keeps a requested brick face down during a normal trade request", () => {
    const host = createRoom("A");
    const p2 = joinRoom(host.room.code, "B");
    const p3 = joinRoom(host.room.code, "C");
    const p4 = joinRoom(host.room.code, "D");
    submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });
    const sessions = [host, p2, p3, p4];
    const ownerSession = sessions.find((session) =>
      getRoomSnapshot(host.room.code, session.playerToken).me!.hand!.some(
        (item) => item.isBrick,
      ),
    );
    expect(ownerSession).toBeDefined();
    const requesterSession = sessions.find(
      (session) => session.playerId !== ownerSession!.playerId,
    );
    expect(requesterSession).toBeDefined();
    advanceTurnTo(host.room.code, sessions, requesterSession!.playerId);

    submitRoomAction(host.room.code, requesterSession!.playerToken, {
      type: "drawActionCard",
    });

    const ownerSnapshot = getRoomSnapshot(
      host.room.code,
      ownerSession!.playerToken,
    );
    const brick = ownerSnapshot.me!.hand!.find((item) => item.isBrick);
    expect(brick).toBeDefined();

    submitRoomAction(host.room.code, requesterSession!.playerToken, {
      type: "requestTrade",
      ownerId: ownerSession!.playerId,
      itemInstanceId: brick!.instanceId,
      offerPrice: 120000,
    });

    const requesterView = getRoomSnapshot(
      host.room.code,
      requesterSession!.playerToken,
    );
    const ownerView = getRoomSnapshot(host.room.code, ownerSession!.playerToken);

    expect(requesterView.pendingDealItem).toMatchObject({
      isBrick: false,
      marketPrice: 0,
      revealed: false,
    });
    expect(ownerView.pendingDealItem).toMatchObject({
      isBrick: false,
      marketPrice: 0,
      revealed: false,
    });
  });

  it("shows public item info during a normal trade and reveals hidden risk one turn later", () => {
    const host = createRoom("A");
    const p2 = joinRoom(host.room.code, "B");
    const p3 = joinRoom(host.room.code, "C");
    joinRoom(host.room.code, "D");
    submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });
    submitRoomAction(host.room.code, host.playerToken, { type: "drawActionCard" });

    const ownerItem = getRoomSnapshot(host.room.code, p2.playerToken).me!.hand!.find(
      (item) => !item.isBrick,
    );
    expect(ownerItem).toBeDefined();

    submitRoomAction(host.room.code, host.playerToken, {
      type: "requestTrade",
      ownerId: p2.playerId,
      itemInstanceId: ownerItem!.instanceId,
      offerPrice: 120000,
    });

    const requesterDealView = getRoomSnapshot(host.room.code, host.playerToken);
    const ownerDealView = getRoomSnapshot(host.room.code, p2.playerToken);
    const nonPartyDealView = getRoomSnapshot(host.room.code, p3.playerToken);

    expect(requesterDealView.pendingDealItem).toMatchObject({
      instanceId: ownerItem!.instanceId,
      id: ownerItem!.id,
      name: ownerItem!.name,
      category: ownerItem!.category,
      marketPrice: ownerItem!.marketPrice,
      condition: null,
      isBrick: false,
      revealed: false,
    });
    expect(ownerDealView.pendingDealItem).toMatchObject({
      instanceId: ownerItem!.instanceId,
      category: ownerItem!.category,
      condition: null,
      revealed: false,
    });
    expect(nonPartyDealView.pendingDealItem).toMatchObject({
      category: null,
      marketPrice: 0,
      condition: null,
      revealed: false,
    });

    submitRoomAction(host.room.code, host.playerToken, {
      type: "chooseDealCard",
      choice: "cool",
    });
    submitRoomAction(host.room.code, p2.playerToken, {
      type: "chooseDealCard",
      choice: "cool",
    });

    const requesterAfterDeal = getRoomSnapshot(host.room.code, host.playerToken);
    const boughtItem = requesterAfterDeal.me!.hand!.find(
      (item) => item.instanceId === ownerItem!.instanceId,
    );
    expect(boughtItem).toMatchObject({
      category: ownerItem!.category,
      marketPrice: ownerItem!.marketPrice,
      condition: null,
      isBrick: false,
      revealed: false,
    });

    submitRoomAction(host.room.code, p2.playerToken, { type: "endTurn" });

    const requesterAfterDelivery = getRoomSnapshot(host.room.code, host.playerToken);
    const deliveredItem = requesterAfterDelivery.me!.hand!.find(
      (item) => item.instanceId === ownerItem!.instanceId,
    );
    expect(deliveredItem).toMatchObject({
      condition: ownerItem!.condition,
      isBrick: ownerItem!.isBrick,
      revealed: true,
    });
  });

  it("completes a trade request only when requester and owner both choose cool deal", () => {
    const host = createRoom("A");
    const p2 = joinRoom(host.room.code, "B");
    joinRoom(host.room.code, "C");
    joinRoom(host.room.code, "D");
    submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });
    submitRoomAction(host.room.code, host.playerToken, { type: "drawActionCard" });

    const beforeRequester = getRoomSnapshot(host.room.code, host.playerToken);
    const beforeOwner = getRoomSnapshot(host.room.code, p2.playerToken);
    const item = beforeOwner.me!.hand![0];
    submitRoomAction(host.room.code, host.playerToken, {
      type: "requestTrade",
      ownerId: p2.playerId,
      itemInstanceId: item.instanceId,
      offerPrice: 120000,
    });
    submitRoomAction(host.room.code, host.playerToken, {
      type: "chooseDealCard",
      choice: "cool",
    });
    const completed = submitRoomAction(host.room.code, p2.playerToken, {
      type: "chooseDealCard",
      choice: "cool",
    });

    const requesterView = getRoomSnapshot(host.room.code, host.playerToken);
    const ownerView = getRoomSnapshot(host.room.code, p2.playerToken);

    expect(completed.pendingDeal).toBeNull();
    expect(requesterView.me?.money).toBe((beforeRequester.me?.money ?? 0) - 120000);
    expect(requesterView.me?.hand).toHaveLength(6);
    expect(ownerView.me?.money).toBe((beforeOwner.me?.money ?? 0) + 120000);
    expect(ownerView.me?.hand).toHaveLength(4);
    expect(
      requesterView.me?.hand?.some((owned) => owned.instanceId === item.instanceId),
    ).toBe(true);
    const boughtItem = requesterView.me?.hand?.find(
      (owned) => owned.instanceId === item.instanceId,
    );
    expect(boughtItem?.acquiredPrice).toBe(120000);
    expect(requesterView.pendingReviews).toHaveLength(1);
    expect(ownerView.pendingReviews).toHaveLength(1);
  });

  it("cancels a trade request when either side chooses cancel", () => {
    const host = createRoom("A");
    const p2 = joinRoom(host.room.code, "B");
    joinRoom(host.room.code, "C");
    joinRoom(host.room.code, "D");
    submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });
    submitRoomAction(host.room.code, host.playerToken, { type: "drawActionCard" });

    const beforeRequester = getRoomSnapshot(host.room.code, host.playerToken);
    const beforeOwner = getRoomSnapshot(host.room.code, p2.playerToken);
    const item = beforeOwner.me!.hand![0];
    submitRoomAction(host.room.code, host.playerToken, {
      type: "requestTrade",
      ownerId: p2.playerId,
      itemInstanceId: item.instanceId,
      offerPrice: 120000,
    });
    submitRoomAction(host.room.code, host.playerToken, {
      type: "chooseDealCard",
      choice: "cool",
    });
    submitRoomAction(host.room.code, p2.playerToken, {
      type: "chooseDealCard",
      choice: "cancel",
    });

    const requesterView = getRoomSnapshot(host.room.code, host.playerToken);
    const ownerView = getRoomSnapshot(host.room.code, p2.playerToken);

    expect(requesterView.me?.money).toBe(beforeRequester.me?.money);
    expect(requesterView.me?.hand).toHaveLength(5);
    expect(ownerView.me?.money).toBe(beforeOwner.me?.money);
    expect(ownerView.me?.hand).toHaveLength(5);
    expect(requesterView.pendingDeal).toBeNull();
  });

  it("hides deal card choices from the other trading player", () => {
    const host = createRoom("A");
    const p2 = joinRoom(host.room.code, "B");
    joinRoom(host.room.code, "C");
    joinRoom(host.room.code, "D");
    submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });
    submitRoomAction(host.room.code, host.playerToken, { type: "drawActionCard" });

    const item = getRoomSnapshot(host.room.code, p2.playerToken).me!.hand![0];
    submitRoomAction(host.room.code, host.playerToken, {
      type: "requestTrade",
      ownerId: p2.playerId,
      itemInstanceId: item.instanceId,
      offerPrice: 120000,
    });
    submitRoomAction(host.room.code, host.playerToken, {
      type: "chooseDealCard",
      choice: "cool",
    });

    const requesterView = getRoomSnapshot(host.room.code, host.playerToken);
    const ownerView = getRoomSnapshot(host.room.code, p2.playerToken);

    expect(requesterView.pendingDeal?.choices).toEqual({
      [host.playerId]: "cool",
    });
    expect(ownerView.pendingDeal?.choices).toEqual({});
  });

  it("moves or destroys reputation tokens through post-trade reviews", () => {
    const host = createRoom("A");
    const p2 = joinRoom(host.room.code, "B");
    joinRoom(host.room.code, "C");
    joinRoom(host.room.code, "D");
    submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });
    submitRoomAction(host.room.code, host.playerToken, { type: "drawActionCard" });

    const item = getRoomSnapshot(host.room.code, p2.playerToken).me!.hand![0];
    submitRoomAction(host.room.code, host.playerToken, {
      type: "requestTrade",
      ownerId: p2.playerId,
      itemInstanceId: item.instanceId,
      offerPrice: 120000,
    });
    submitRoomAction(host.room.code, host.playerToken, {
      type: "chooseDealCard",
      choice: "cool",
    });
    submitRoomAction(host.room.code, p2.playerToken, {
      type: "chooseDealCard",
      choice: "cool",
    });

    submitRoomAction(host.room.code, host.playerToken, {
      type: "reviewTrade",
      targetPlayerId: p2.playerId,
      satisfied: true,
    });
    submitRoomAction(host.room.code, p2.playerToken, {
      type: "reviewTrade",
      targetPlayerId: host.playerId,
      satisfied: false,
    });

    const requesterView = getRoomSnapshot(host.room.code, host.playerToken);
    const ownerView = getRoomSnapshot(host.room.code, p2.playerToken);

    expect(requesterView.me?.reputationTokens).toBe(3);
    expect(ownerView.me?.reputationTokens).toBe(6);
    expect(requesterView.pendingReviews).toHaveLength(0);
    expect(ownerView.pendingReviews).toHaveLength(0);
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
});
