import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createRoom,
  getRoomSnapshot,
  joinRoom,
  resetRoomsForTests,
  submitRoomAction,
} from "../room-store";

describe("room-store", () => {
  beforeEach(async () => { await resetRoomsForTests(); });

  async function joinPlayers(code: string, names: string[]) {
    return Promise.all(names.map(async (name) => await joinRoom(code, name)));
  }

  async function advanceTurnTo(
    code: string,
    sessions: ReturnType<typeof createRoom>[],
    playerId: string,
  ) {
    for (let index = 0; index < sessions.length; index += 1) {
      const currentTurnPlayerId = (await getRoomSnapshot(
        code,
        sessions[0]!.playerToken,
      )).currentTurnPlayerId;
      if (currentTurnPlayerId === playerId) return;
      const currentSession = sessions.find(
        (session) => session.playerId === currentTurnPlayerId,
      );
      expect(currentSession).toBeDefined();
      await submitRoomAction(code, currentSession!.playerToken, { type: "endTurn" });
    }
  }

  async function drawUntilActionType(
    code: string,
    sessions: ReturnType<typeof createRoom>[],
    actionType: "tradeRequest" | "freeGive" | "directTrade",
  ) {
    for (let index = 0; index < 12; index += 1) {
      const currentTurnPlayerId = (await getRoomSnapshot(
        code,
        sessions[0]!.playerToken,
      )).currentTurnPlayerId;
      const currentSession = sessions.find(
        (session) => session.playerId === currentTurnPlayerId,
      );
      expect(currentSession).toBeDefined();
      const drawn = await submitRoomAction(code, currentSession!.playerToken, {
        type: "drawActionCard",
      });
      if (drawn.currentActionCard?.type === actionType) {
        return { session: currentSession!, snapshot: drawn };
      }
      await submitRoomAction(code, currentSession!.playerToken, { type: "endTurn" });
    }

    throw new Error(`Could not draw ${actionType}`);
  }

  async function currentTurnSession(
    code: string,
    sessions: ReturnType<typeof createRoom>[],
  ) {
    const currentTurnPlayerId = (await getRoomSnapshot(
      code,
      sessions[0]!.playerToken,
    )).currentTurnPlayerId;
    const session = sessions.find(
      (candidate) => candidate.playerId === currentTurnPlayerId,
    );
    expect(session).toBeDefined();
    return session!;
  }
  it("creates a room and lets up to four players join", async () => {
    const host = await createRoom("경수");

    expect(host.room.code).toMatch(/^[A-Z0-9]{4}$/);
    expect(host.room.mode).toBe("real");
    expect(host.room.players).toHaveLength(1);

    await joinPlayers(host.room.code, ["유현", "윤식", "환희"]);
    const fullRoom = await getRoomSnapshot(host.room.code, host.playerToken);

    expect(fullRoom.players).toHaveLength(4);
    await expect(joinRoom(host.room.code, "초과")).rejects.toThrow("방이 가득 찼습니다.");
  });

  it("uses default player names when players skip the name field", async () => {
    const host = await createRoom("");
    const second = await joinRoom(host.room.code, "   ");

    expect(host.room.players[0]?.name).toBe("호스트");
    expect(second.room.players.find((player) => player.id === second.playerId)?.name).toBe(
      "플레이어 2",
    );
  });

  it("keeps rooms available when the server module is reloaded", async () => {
    const host = await createRoom("경수");

    vi.resetModules();
    const reloadedStore = await import("../room-store");
    const snapshot = await reloadedStore.getRoomSnapshot(
      host.room.code,
      host.playerToken,
    );

    expect(snapshot.code).toBe(host.room.code);
    await reloadedStore.resetRoomsForTests();
  });

  it("filters villain role and mission to the owning player only", async () => {
    const host = await createRoom("경수");
    const p2 = await joinRoom(host.room.code, "유현");
    await joinRoom(host.room.code, "윤식");
    await joinRoom(host.room.code, "환희");

    await submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });

    const hostView = await getRoomSnapshot(host.room.code, host.playerToken);
    const p2View = await getRoomSnapshot(host.room.code, p2.playerToken);

    expect(hostView.me?.role).toMatch(/citizen|villain/);
    expect(p2View.me?.role).toMatch(/citizen|villain/);
    expect(hostView.players.every((player) => player.role === undefined)).toBe(
      true,
    );
    expect(p2View.players.every((player) => player.role === undefined)).toBe(
      true,
    );
  });

  it("starts each player with a private job, variable money, five item cards, deal cards, and five reputation tokens", async () => {
    const host = await createRoom("경수");
    const [p2, p3, p4] = await joinPlayers(host.room.code, [
      "유현",
      "윤식",
      "환희",
    ]);

    await submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });

    const hostView = await getRoomSnapshot(host.room.code, host.playerToken);
    const p2View = await getRoomSnapshot(host.room.code, p2.playerToken);
    const p3View = await getRoomSnapshot(host.room.code, p3.playerToken);
    const p4View = await getRoomSnapshot(host.room.code, p4.playerToken);
    const startingMoney = [
      hostView.me?.money,
      p2View.me?.money,
      p3View.me?.money,
      p4View.me?.money,
    ];

    expect(hostView.me?.role).toMatch(/citizen|villain/);
    expect(hostView.me?.job?.title).toBeTruthy();
    expect(hostView.me?.hand).toHaveLength(5);
    expect(new Set(startingMoney).size).toBe(1);
    expect(hostView.me?.money).toBe(1000000);
    expect(hostView.me?.reputationTokens).toBe(5);
    expect(hostView.me?.dealCards).toEqual({ cool: true, cancel: true });
    expect(hostView.players.every((player) => player.itemCount === 5)).toBe(true);
    expect(hostView.players.every((player) => player.hand === undefined)).toBe(true);
    expect(hostView.players.every((player) => player.money === undefined)).toBe(true);
    expect(hostView.players.every((player) => player.job === undefined)).toBe(true);
    expect(p2View.me?.hand).toHaveLength(5);
    expect(p4View.me?.hand).toHaveLength(5);
  });

  it("can start with the minimum three players", async () => {
    const host = await createRoom("경수");
    const [p2, p3] = await joinPlayers(host.room.code, ["유현", "윤식"]);

    await submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });

    const hostView = await getRoomSnapshot(host.room.code, host.playerToken);
    const p2View = await getRoomSnapshot(host.room.code, p2.playerToken);
    const p3View = await getRoomSnapshot(host.room.code, p3.playerToken);

    expect(hostView.status).toBe("playing");
    expect(hostView.players).toHaveLength(3);
    expect(hostView.me?.hand).toHaveLength(5);
    expect(p2View.me?.hand).toHaveLength(5);
    expect(p3View.me?.hand).toHaveLength(5);
  });

  it("sets the market action budget from the player count", async () => {
    const host = await createRoom("경수");
    await joinRoom(host.room.code, "유현");
    await joinRoom(host.room.code, "윤식");
    await joinRoom(host.room.code, "환희");

    const started = await submitRoomAction(host.room.code, host.playerToken, {
      type: "startGame",
    });

    expect(started.usedActionCount).toBe(0);
    expect(started.marketActionLimit).toBe(20);
  });

  it("includes item category, condition, and empty acquired price in private hands", async () => {
    const host = await createRoom("경수");
    await joinRoom(host.room.code, "유현");
    await joinRoom(host.room.code, "윤식");

    await submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });

    const hostView = await getRoomSnapshot(host.room.code, host.playerToken);
    const firstItem = hostView.me!.hand!.find((item) => !item.isBrick);

    expect(firstItem).toBeDefined();
    expect(firstItem!.category).toMatch(/electronics|fashion|hobby|living/);
    expect(firstItem!.condition).toMatch(/mint|used|defective|broken/);
    expect(firstItem!.acquiredPrice).toBeNull();
    expect(hostView.players.every((player) => player.hand === undefined)).toBe(true);
  });

  it("lets the host add automatic bot players for solo testing", async () => {
    const host = await createRoom("경수", "botTest");

    const withFirstBot = await submitRoomAction(host.room.code, host.playerToken, {
      type: "addBot",
    });
    const withSecondBot = await submitRoomAction(host.room.code, host.playerToken, {
      type: "addBot",
    });

    expect(withFirstBot.players.filter((player) => player.isBot)).toHaveLength(1);
    expect(withSecondBot.players).toHaveLength(3);
    expect(withSecondBot.players.filter((player) => player.isBot)).toHaveLength(2);

    const started = await submitRoomAction(host.room.code, host.playerToken, {
      type: "startGame",
    });
    expect(started.status).toBe("playing");
    expect(started.players.every((player) => player.itemCount === 5)).toBe(true);
  });

  it("automatically plays bot turns back to the human player", async () => {
    const host = await createRoom("경수", "botTest");
    await submitRoomAction(host.room.code, host.playerToken, { type: "addBot" });
    await submitRoomAction(host.room.code, host.playerToken, { type: "addBot" });
    await submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });

    // Host draws action card
    await submitRoomAction(host.room.code, host.playerToken, { type: "drawActionCard" });
    // Host acknowledges it
    await submitRoomAction(host.room.code, host.playerToken, { type: "ackActionCard" });

    const afterHostTurn = await submitRoomAction(host.room.code, host.playerToken, {
      type: "endTurn",
    });

    // Bot 1 drew a card and is waiting for Host acknowledgment.
    expect(afterHostTurn.currentTurnPlayerId).not.toBe(host.playerId);
    expect(afterHostTurn.currentActionCard).not.toBeNull();

    // Host acknowledges Bot 1's action card
    const afterAck1 = await submitRoomAction(host.room.code, host.playerToken, {
      type: "ackActionCard",
    });

    // Bot 1 performs trade with Bot 2, resolves it, and ends turn.
    // Bot 2 draws a card and is waiting for Host acknowledgment.
    expect(afterAck1.currentTurnPlayerId).not.toBe(host.playerId);
    expect(afterAck1.currentTurnPlayerId).not.toBe(afterHostTurn.currentTurnPlayerId);

    // Host acknowledges Bot 2's action card
    const afterAck2 = await submitRoomAction(host.room.code, host.playerToken, {
      type: "ackActionCard",
    });

    // Bot 2 performs action, ends turn, and transitions back to Host.
    expect(afterAck2.currentTurnPlayerId).toBe(host.playerId);
  });

  it("keeps real game rooms free of test bots", async () => {
    const host = await createRoom("경수", "real");

    await expect(submitRoomAction(host.room.code, host.playerToken, { type: "addBot" })).rejects.toThrow("봇 테스트 방에서만 봇을 추가할 수 있습니다.");
  });

  it("counts market progress when a turn action is consumed, not when an action card is drawn", async () => {
    const host = await createRoom("경수");
    const p2 = await joinRoom(host.room.code, "유현");
    const p3 = await joinRoom(host.room.code, "윤식");
    const sessions = [host, p2, p3];
    await submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });

    const drawn = await submitRoomAction(host.room.code, host.playerToken, {
      type: "drawActionCard",
    });
    expect(drawn.usedActionCount).toBe(0);

    const skipped = await submitRoomAction(host.room.code, host.playerToken, {
      type: "endTurn",
    });
    expect(skipped.usedActionCount).toBe(1);
    expect(skipped.marketActionLimit).toBe(15);
    expect(skipped.currentTurnPlayerId).toBe(p2.playerId);

    const nextSession = await currentTurnSession(host.room.code, sessions);
    const nextSkipped = await submitRoomAction(host.room.code, nextSession.playerToken, {
      type: "endTurn",
    });
    expect(nextSkipped.usedActionCount).toBe(2);
  });

  it("moves to final reporting when the market action budget is exhausted", async () => {
    const host = await createRoom("경수");
    const p2 = await joinRoom(host.room.code, "유현");
    const p3 = await joinRoom(host.room.code, "윤식");
    const sessions = [host, p2, p3];
    await submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });

    let snapshot = await getRoomSnapshot(host.room.code, host.playerToken);
    while (snapshot.usedActionCount < snapshot.marketActionLimit) {
      const session = await currentTurnSession(host.room.code, sessions);
      snapshot = await submitRoomAction(host.room.code, session.playerToken, {
        type: "endTurn",
      });
    }

    expect(snapshot.status).toBe("reporting");
    expect(snapshot.usedActionCount).toBe(15);
    expect(snapshot.marketActionLimit).toBe(15);
    expect(snapshot.currentTurnPlayerId).toBeNull();
    expect(snapshot.logs.some((log) => log.includes("시장 마감"))).toBe(true);
  });

  it("rejects starting with fewer than three players", async () => {
    const host = await createRoom("경수");
    await joinRoom(host.room.code, "유현");

    await expect(submitRoomAction(host.room.code, host.playerToken, { type: "startGame" })).rejects.toThrow("3명 이상 모여야 시작할 수 있습니다.");
  });

  it("starts a trade request from the current player for another player's item", async () => {
    const requester = await createRoom("A");
    const owner = await joinRoom(requester.room.code, "B");
    await joinRoom(requester.room.code, "C");
    await joinRoom(requester.room.code, "D");
    await submitRoomAction(requester.room.code, requester.playerToken, { type: "startGame" });
    await submitRoomAction(requester.room.code, requester.playerToken, { type: "drawActionCard" });

    const ownerItem = (await getRoomSnapshot(
      requester.room.code,
      owner.playerToken,
    )).me!.hand![0];

    const requested = await submitRoomAction(requester.room.code, requester.playerToken, {
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
      askingPrice: 0,
    });
    expect(requested.pendingDeal).not.toHaveProperty("sellerId");
    expect(requested.pendingDeal).not.toHaveProperty("buyerId");
  });

  it("treats free give as a zero-price trade request", async () => {
    const host = await createRoom("A");
    const p2 = await joinRoom(host.room.code, "B");
    const p3 = await joinRoom(host.room.code, "C");
    const p4 = await joinRoom(host.room.code, "D");
    const sessions = [host, p2, p3, p4];
    await submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });

    const { session: requesterSession } = await drawUntilActionType(
      host.room.code,
      sessions,
      "freeGive",
    );
    const ownerSession = sessions.find(
      (session) => session.playerId !== requesterSession.playerId,
    );
    expect(ownerSession).toBeDefined();
    const ownerItem = (await getRoomSnapshot(
      host.room.code,
      ownerSession!.playerToken,
    )).me!.hand![0];

    const requested = await submitRoomAction(host.room.code, requesterSession.playerToken, {
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

  it("reveals the requested item for direct trade requests", async () => {
    const host = await createRoom("A");
    const p2 = await joinRoom(host.room.code, "B");
    const p3 = await joinRoom(host.room.code, "C");
    const p4 = await joinRoom(host.room.code, "D");
    const sessions = [host, p2, p3, p4];
    await submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });

    const { session: requesterSession } = await drawUntilActionType(
      host.room.code,
      sessions,
      "directTrade",
    );
    const ownerSession = sessions.find(
      (session) => session.playerId !== requesterSession.playerId,
    );
    expect(ownerSession).toBeDefined();
    const ownerItem = (await getRoomSnapshot(
      host.room.code,
      ownerSession!.playerToken,
    )).me!.hand![0];

    const requested = await submitRoomAction(host.room.code, requesterSession.playerToken, {
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

  it("keeps a requested brick face down during a normal trade request", async () => {
    const host = await createRoom("A");
    const p2 = await joinRoom(host.room.code, "B");
    const p3 = await joinRoom(host.room.code, "C");
    const p4 = await joinRoom(host.room.code, "D");
    await submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });
    const sessions = [host, p2, p3, p4];
    let ownerSession;
    for (const session of sessions) {
      const snap = await getRoomSnapshot(host.room.code, session.playerToken);
      if (snap.me!.hand!.some((item) => item.isBrick)) {
        ownerSession = session;
        break;
      }
    }
    expect(ownerSession).toBeDefined();
    const requesterSession = sessions.find(
      (session) => session.playerId !== ownerSession!.playerId,
    );
    expect(requesterSession).toBeDefined();
    await advanceTurnTo(host.room.code, sessions, requesterSession!.playerId);

    await submitRoomAction(host.room.code, requesterSession!.playerToken, {
      type: "drawActionCard",
    });

    const ownerSnapshot = await getRoomSnapshot(
      host.room.code,
      ownerSession!.playerToken,
    );
    const brick = ownerSnapshot.me!.hand!.find((item) => item.isBrick);
    expect(brick).toBeDefined();

    await submitRoomAction(host.room.code, requesterSession!.playerToken, {
      type: "requestTrade",
      ownerId: ownerSession!.playerId,
      itemInstanceId: brick!.instanceId,
      offerPrice: 120000,
    });

    const requesterView = await getRoomSnapshot(
      host.room.code,
      requesterSession!.playerToken,
    );
    const ownerView = await getRoomSnapshot(host.room.code, ownerSession!.playerToken);

    expect(requesterView.pendingDealItem).toMatchObject({
      isBrick: false,
      marketPrice: 0,
      revealed: false,
    });
    expect(ownerView.pendingDealItem).toMatchObject({
      isBrick: true,
      marketPrice: 0,
      revealed: true,
    });
  });

  it("shows public item info during a normal trade and reveals hidden risk one turn later", async () => {
    const host = await createRoom("A");
    const p2 = await joinRoom(host.room.code, "B");
    const p3 = await joinRoom(host.room.code, "C");
    await joinRoom(host.room.code, "D");
    await submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });
    await submitRoomAction(host.room.code, host.playerToken, { type: "drawActionCard" });

    const ownerItem = (await getRoomSnapshot(host.room.code, p2.playerToken)).me!.hand!.find(
      (item) => !item.isBrick,
    );
    expect(ownerItem).toBeDefined();

    await submitRoomAction(host.room.code, host.playerToken, {
      type: "requestTrade",
      ownerId: p2.playerId,
      itemInstanceId: ownerItem!.instanceId,
      offerPrice: 120000,
    });

    const requesterDealView = await getRoomSnapshot(host.room.code, host.playerToken);
    const ownerDealView = await getRoomSnapshot(host.room.code, p2.playerToken);
    const nonPartyDealView = await getRoomSnapshot(host.room.code, p3.playerToken);

    expect(requesterDealView.pendingDealItem).toMatchObject({
      instanceId: ownerItem!.instanceId,
      id: "",
      name: "뒤집힌 물건",
      category: ownerItem!.category,
      marketPrice: 0,
      condition: null,
      isBrick: false,
      revealed: false,
    });
    expect(ownerDealView.pendingDealItem).toMatchObject({
      instanceId: ownerItem!.instanceId,
      category: ownerItem!.category,
      condition: ownerItem!.condition,
      revealed: true,
    });
    expect(nonPartyDealView.pendingDealItem).toMatchObject({
      category: null,
      marketPrice: 0,
      condition: null,
      revealed: false,
    });

    await submitRoomAction(host.room.code, host.playerToken, {
      type: "chooseDealCard",
      choice: "cool",
    });
    await submitRoomAction(host.room.code, p2.playerToken, {
      type: "chooseDealCard",
      choice: "cool",
    });

    const requesterAfterDeal = await getRoomSnapshot(host.room.code, host.playerToken);
    const boughtItem = requesterAfterDeal.me!.hand!.find(
      (item) => item.instanceId === ownerItem!.instanceId,
    );
    expect(boughtItem).toMatchObject({
      category: ownerItem!.category,
      marketPrice: ownerItem!.marketPrice,
      condition: ownerItem!.condition,
      isBrick: ownerItem!.isBrick,
      revealed: true,
    });

    await submitRoomAction(host.room.code, host.playerToken, {
      type: "reviewTrade",
      targetPlayerId: p2.playerId,
      satisfied: true,
    });
    await submitRoomAction(host.room.code, p2.playerToken, {
      type: "reviewTrade",
      targetPlayerId: host.playerId,
      satisfied: true,
    });

    await submitRoomAction(host.room.code, p2.playerToken, { type: "endTurn" });

    const requesterAfterDelivery = await getRoomSnapshot(host.room.code, host.playerToken);
    const deliveredItem = requesterAfterDelivery.me!.hand!.find(
      (item) => item.instanceId === ownerItem!.instanceId,
    );
    expect(deliveredItem).toMatchObject({
      condition: ownerItem!.condition,
      isBrick: ownerItem!.isBrick,
      revealed: true,
    });
  });

  it("completes a trade request only when requester and owner both choose cool deal", async () => {
    const host = await createRoom("A");
    const p2 = await joinRoom(host.room.code, "B");
    await joinRoom(host.room.code, "C");
    await joinRoom(host.room.code, "D");
    await submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });
    await submitRoomAction(host.room.code, host.playerToken, { type: "drawActionCard" });

    const beforeRequester = await getRoomSnapshot(host.room.code, host.playerToken);
    const beforeOwner = await getRoomSnapshot(host.room.code, p2.playerToken);
    const item = beforeOwner.me!.hand!.find((owned) => owned.category !== null);
    if (!item) throw new Error("expected owner to have a non-brick item");
    await submitRoomAction(host.room.code, host.playerToken, {
      type: "requestTrade",
      ownerId: p2.playerId,
      itemInstanceId: item.instanceId,
      offerPrice: 120000,
    });
    // The owner/seller p2 proposes the price of 120,000, which also marks their choice as "cool"
    await submitRoomAction(host.room.code, p2.playerToken, {
      type: "proposePrice",
      price: 120000,
    });
    // The host/buyer chooses "cool" to complete the deal
    const completed = await submitRoomAction(host.room.code, host.playerToken, {
      type: "chooseDealCard",
      choice: "cool",
    });

    const requesterView = await getRoomSnapshot(host.room.code, host.playerToken);
    const ownerView = await getRoomSnapshot(host.room.code, p2.playerToken);

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
    expect(requesterView.pendingReviews).toHaveLength(2);
    expect(ownerView.pendingReviews).toHaveLength(2);
  });

  it("cancels a trade request when either side chooses cancel", async () => {
    const host = await createRoom("A");
    const p2 = await joinRoom(host.room.code, "B");
    await joinRoom(host.room.code, "C");
    await joinRoom(host.room.code, "D");
    await submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });
    await submitRoomAction(host.room.code, host.playerToken, { type: "drawActionCard" });

    const beforeRequester = await getRoomSnapshot(host.room.code, host.playerToken);
    const beforeOwner = await getRoomSnapshot(host.room.code, p2.playerToken);
    const item = beforeOwner.me!.hand![0];
    await submitRoomAction(host.room.code, host.playerToken, {
      type: "requestTrade",
      ownerId: p2.playerId,
      itemInstanceId: item.instanceId,
      offerPrice: 120000,
    });
    await submitRoomAction(host.room.code, host.playerToken, {
      type: "chooseDealCard",
      choice: "cool",
    });
    await submitRoomAction(host.room.code, p2.playerToken, {
      type: "chooseDealCard",
      choice: "cancel",
    });

    const requesterView = await getRoomSnapshot(host.room.code, host.playerToken);
    const ownerView = await getRoomSnapshot(host.room.code, p2.playerToken);

    expect(requesterView.me?.money).toBe(beforeRequester.me?.money);
    expect(requesterView.me?.hand).toHaveLength(5);
    expect(ownerView.me?.money).toBe(beforeOwner.me?.money);
    expect(ownerView.me?.hand).toHaveLength(5);
    expect(requesterView.pendingDeal).toBeNull();
  });

  it("hides deal card choices from the other trading player", async () => {
    const host = await createRoom("A");
    const p2 = await joinRoom(host.room.code, "B");
    await joinRoom(host.room.code, "C");
    await joinRoom(host.room.code, "D");
    await submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });
    await submitRoomAction(host.room.code, host.playerToken, { type: "drawActionCard" });

    const item = (await getRoomSnapshot(host.room.code, p2.playerToken)).me!.hand![0];
    await submitRoomAction(host.room.code, host.playerToken, {
      type: "requestTrade",
      ownerId: p2.playerId,
      itemInstanceId: item.instanceId,
      offerPrice: 120000,
    });
    await submitRoomAction(host.room.code, host.playerToken, {
      type: "chooseDealCard",
      choice: "cool",
    });

    const requesterView = await getRoomSnapshot(host.room.code, host.playerToken);
    const ownerView = await getRoomSnapshot(host.room.code, p2.playerToken);

    expect(requesterView.pendingDeal?.choices).toEqual({
      [host.playerId]: "cool",
    });
    expect(ownerView.pendingDeal?.choices).toEqual({});
  });

  it("moves or destroys reputation tokens through post-trade reviews", async () => {
    const host = await createRoom("A");
    const p2 = await joinRoom(host.room.code, "B");
    await joinRoom(host.room.code, "C");
    await joinRoom(host.room.code, "D");
    await submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });
    await submitRoomAction(host.room.code, host.playerToken, { type: "drawActionCard" });

    const item = (await getRoomSnapshot(host.room.code, p2.playerToken)).me!.hand![0];
    await submitRoomAction(host.room.code, host.playerToken, {
      type: "requestTrade",
      ownerId: p2.playerId,
      itemInstanceId: item.instanceId,
      offerPrice: 120000,
    });
    await submitRoomAction(host.room.code, host.playerToken, {
      type: "chooseDealCard",
      choice: "cool",
    });
    await submitRoomAction(host.room.code, p2.playerToken, {
      type: "chooseDealCard",
      choice: "cool",
    });

    await submitRoomAction(host.room.code, host.playerToken, {
      type: "reviewTrade",
      targetPlayerId: p2.playerId,
      satisfied: true,
    });
    await submitRoomAction(host.room.code, p2.playerToken, {
      type: "reviewTrade",
      targetPlayerId: host.playerId,
      satisfied: false,
    });

    const requesterView = await getRoomSnapshot(host.room.code, host.playerToken);
    const ownerView = await getRoomSnapshot(host.room.code, p2.playerToken);

    expect(requesterView.me?.reputationTokens).toBe(3);
    expect(ownerView.me?.reputationTokens).toBe(6);
    expect(requesterView.pendingReviews).toHaveLength(0);
    expect(ownerView.pendingReviews).toHaveLength(0);
  });
  it("returns the host role in the start game response", async () => {
    const host = await createRoom("경수");
    await joinRoom(host.room.code, "유현");
    await joinRoom(host.room.code, "윤식");
    await joinRoom(host.room.code, "환희");

    const started = await submitRoomAction(host.room.code, host.playerToken, {
      type: "startGame",
    });

    expect(started.me?.role).toMatch(/citizen|villain/);
  });

  it("rejects actions from players who are not allowed to act", async () => {
    const host = await createRoom("경수");
    const p2 = await joinRoom(host.room.code, "유현");
    await joinRoom(host.room.code, "윤식");
    await joinRoom(host.room.code, "환희");
    await submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });

    await expect(submitRoomAction(host.room.code, p2.playerToken, { type: "rollDice" })).rejects.toThrow("현재 턴 플레이어만 할 수 있습니다.");
  });

  it("finishes the game after every player reports a suspicious trader", async () => {
    const host = await createRoom("경수");
    const p2 = await joinRoom(host.room.code, "유현");
    const p3 = await joinRoom(host.room.code, "윤식");
    const p4 = await joinRoom(host.room.code, "환희");
    await submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });

    const started = await getRoomSnapshot(host.room.code, host.playerToken);
    const target = started.players.find((player) => player.id !== host.playerId);
    expect(target).toBeDefined();
    await submitRoomAction(host.room.code, host.playerToken, {
      type: "startReporting",
    });

    for (const token of [
      host.playerToken,
      p2.playerToken,
      p3.playerToken,
      p4.playerToken,
    ]) {
      await submitRoomAction(host.room.code, token, {
        type: "reportSuspiciousPlayer",
        targetPlayerId: target!.id,
      });
    }

    const finished = await getRoomSnapshot(host.room.code, host.playerToken);
    expect(finished.status).toBe("finished");
    expect(finished.result).toBeDefined();
    expect(finished.result?.reports[target!.id]).toBe(4);

    // Host restarts the game
    const restarted = await submitRoomAction(host.room.code, host.playerToken, {
      type: "restartGame",
    });
    expect(restarted.status).toBe("waiting");
    expect(restarted.result).toBeNull();
    expect(restarted.me?.role).toBeUndefined();
    expect(restarted.me?.money).toBe(0);
  });

  it("makes bot review dissatisfied (dislike) when host sells at 80% or more of market price", async () => {
    const host = await createRoom("경수", "botTest");
    await submitRoomAction(host.room.code, host.playerToken, { type: "addBot" });
    await submitRoomAction(host.room.code, host.playerToken, { type: "addBot" });
    await submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });

    // Turn 1: Host draws tradeRequest
    await submitRoomAction(host.room.code, host.playerToken, { type: "drawActionCard" });
    await submitRoomAction(host.room.code, host.playerToken, { type: "ackActionCard" });
    await submitRoomAction(host.room.code, host.playerToken, { type: "endTurn" });

    // Acknowledge Bot 1 turn card
    await submitRoomAction(host.room.code, host.playerToken, { type: "ackActionCard" });
    // Acknowledge Bot 2 turn card
    await submitRoomAction(host.room.code, host.playerToken, { type: "ackActionCard" });

    // Turn 2: Host draws saleRequest
    await submitRoomAction(host.room.code, host.playerToken, { type: "drawActionCard" });

    const hostView = await getRoomSnapshot(host.room.code, host.playerToken);
    const item = hostView.me!.hand!.find((i) => !i.isBrick && i.marketPrice < 500000);
    expect(item).toBeDefined();

    const botPlayer = hostView.players.find((p) => p.isBot);
    expect(botPlayer).toBeDefined();

    // Sell at 100% of market price (which is >= 80%)
    const sellPrice = item!.marketPrice;

    // Host proposes sale to the bot (ownerId refers to the target player, which is the bot)
    await submitRoomAction(host.room.code, host.playerToken, {
      type: "requestTrade",
      ownerId: botPlayer!.id,
      itemInstanceId: item!.instanceId,
      offerPrice: sellPrice,
    });

    // Both accept (automatic for bot), and review finishes automatically.
    // Let's get the final snapshot to verify dislikes
    const afterTrade = await getRoomSnapshot(host.room.code, host.playerToken);
    const hostPlayerInSnapshot = afterTrade.players.find((p) => p.id === host.playerId);
    expect(hostPlayerInSnapshot!.dislikes).toBe(1);
    expect(hostPlayerInSnapshot!.likes).toBe(0);
  });

  it("makes bot review satisfied (like) when host sells at less than 80% of market price", async () => {
    const host = await createRoom("경수", "botTest");
    await submitRoomAction(host.room.code, host.playerToken, { type: "addBot" });
    await submitRoomAction(host.room.code, host.playerToken, { type: "addBot" });
    await submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });

    // Turn 1: Host draws tradeRequest
    await submitRoomAction(host.room.code, host.playerToken, { type: "drawActionCard" });
    await submitRoomAction(host.room.code, host.playerToken, { type: "ackActionCard" });
    await submitRoomAction(host.room.code, host.playerToken, { type: "endTurn" });

    // Acknowledge Bot 1 turn card
    await submitRoomAction(host.room.code, host.playerToken, { type: "ackActionCard" });
    // Acknowledge Bot 2 turn card
    await submitRoomAction(host.room.code, host.playerToken, { type: "ackActionCard" });

    // Turn 2: Host draws saleRequest
    await submitRoomAction(host.room.code, host.playerToken, { type: "drawActionCard" });

    const hostView = await getRoomSnapshot(host.room.code, host.playerToken);
    const item = hostView.me!.hand!.find((i) => !i.isBrick && i.marketPrice < 500000);
    expect(item).toBeDefined();

    const botPlayer = hostView.players.find((p) => p.isBot);
    expect(botPlayer).toBeDefined();

    // Sell at 60% of market price (which is strictly < 80% even with rounding)
    const sellPrice = Math.round((item!.marketPrice * 0.6) / 10000) * 10000;

    // Host proposes sale to the bot (ownerId refers to the target player, which is the bot)
    await submitRoomAction(host.room.code, host.playerToken, {
      type: "requestTrade",
      ownerId: botPlayer!.id,
      itemInstanceId: item!.instanceId,
      offerPrice: sellPrice,
    });

    const afterTrade = await getRoomSnapshot(host.room.code, host.playerToken);
    const hostPlayerInSnapshot = afterTrade.players.find((p) => p.id === host.playerId);
    expect(hostPlayerInSnapshot!.dislikes).toBe(0);
    expect(hostPlayerInSnapshot!.likes).toBe(1);
  });
});
