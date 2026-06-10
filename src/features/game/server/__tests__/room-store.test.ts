import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createRoom,
  getRoomSnapshot,
  joinRoom,
  resetRoomsForTests,
  submitRoomAction,
} from "../room-store";
import { rooms, mutateRoomWithRetry } from "../room/room-db";
import { getItemAssetValue } from "../../domain/results";

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
    const getPlayerTotalAsset = (view: any) => {
      return view.me!.money + view.me!.hand!.reduce((sum: number, item: any) => sum + getItemAssetValue(item, "playing"), 0);
    };
    expect(getPlayerTotalAsset(hostView)).toBeGreaterThanOrEqual(1500000);
    expect(getPlayerTotalAsset(p2View)).toBeGreaterThanOrEqual(1500000);
    expect(getPlayerTotalAsset(p3View)).toBeGreaterThanOrEqual(1500000);
    expect(getPlayerTotalAsset(p4View)).toBeGreaterThanOrEqual(1500000);
    expect(hostView.me?.reputationTokens).toBe(3);
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
    expect(firstItem!.condition).toMatch(/unopened|mint|used|defective|broken/);
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
    const requesterItem = (await getRoomSnapshot(
      host.room.code,
      requesterSession.playerToken,
    )).me!.hand![0];

    const requested = await submitRoomAction(host.room.code, requesterSession.playerToken, {
      type: "requestTrade",
      ownerId: ownerSession!.playerId,
      itemInstanceId: requesterItem.instanceId,
      offerPrice: 120000,
    });

    expect(requested.pendingDeal).toMatchObject({
      actionType: "freeGive",
      requesterId: ownerSession!.playerId,
      ownerId: requesterSession.playerId,
      itemInstanceId: requesterItem.instanceId,
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

    // Ensure citizen requester does not get brick-collector job to keep disguise test working
    await mutateRoomWithRetry(host.room.code, (r) => {
      const req = r.players.find((p) => p.id === requesterSession.playerId);
      if (req && req.role === "citizen") {
        req.job = {
          id: "citizen",
          title: "일반 시민",
          description: "게임 종료 시 총 자산이 250만 원 이상이어야 합니다.",
          startingMoney: 1500000,
        };
      }
    });

    const room = rooms.get(host.room.code)!;
    const ownerPlayer = room.players.find((p) => p.id === ownerSession!.playerId)!;
    const realOwnerItem = ownerPlayer.hand[0]!;
    const requesterPlayer = room.players.find((p) => p.id === requesterSession.playerId)!;
    const isRequesterVillain = requesterPlayer.role === "villain";

    const requested = await submitRoomAction(host.room.code, requesterSession.playerToken, {
      type: "requestTrade",
      ownerId: ownerSession!.playerId,
      itemInstanceId: realOwnerItem.instanceId,
      offerPrice: 120000,
    });

    expect(requested.pendingDeal).toMatchObject({
      actionType: "directTrade",
      revealedBeforeDeal: true,
    });

    if (realOwnerItem.isBrick) {
      if (isRequesterVillain) {
        expect(requested.pendingDealItem).toMatchObject({
          instanceId: realOwnerItem.instanceId,
          id: realOwnerItem.id,
          isBrick: true,
          revealed: true,
        });
      } else {
        expect(requested.pendingDealItem).toMatchObject({
          instanceId: realOwnerItem.instanceId,
          isBrick: false,
          revealed: true,
        });
      }
    } else {
      expect(requested.pendingDealItem).toMatchObject({
        instanceId: realOwnerItem.instanceId,
        id: realOwnerItem.id,
        revealed: true,
      });
    }
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
      if (snap.me!.hand!.some((item) => item.instanceId.startsWith("brick"))) {
        ownerSession = session;
        break;
      }
    }
    expect(ownerSession).toBeDefined();

    let villainSession;
    for (const session of sessions) {
      const snap = await getRoomSnapshot(host.room.code, session.playerToken);
      if (snap.me!.role === "villain") {
        villainSession = session;
        break;
      }
    }
    expect(villainSession).toBeDefined();

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
    const brick = ownerSnapshot.me!.hand!.find((item) => item.instanceId.startsWith("brick"));
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

    const isRequesterVillain = requesterSession!.playerId === villainSession!.playerId;
    const isRequesterBrickCollector = requesterView.me?.job?.id === "brick-collector";
    expect(requesterView.pendingDealItem).toMatchObject({
      isBrick: isRequesterVillain || isRequesterBrickCollector,
      revealed: true,
    });
    if (isRequesterVillain || isRequesterBrickCollector) {
      expect(requesterView.pendingDealItem!.marketPrice).toBe(0);
    } else {
      expect(requesterView.pendingDealItem!.marketPrice).toBeGreaterThan(0);
    }

    const isOwnerVillain = ownerSession!.playerId === villainSession!.playerId;
    const isOwnerBrickCollector = ownerView.me?.job?.id === "brick-collector";
    expect(ownerView.pendingDealItem).toMatchObject({
      isBrick: isOwnerVillain || isOwnerBrickCollector,
      revealed: true,
    });
    if (isOwnerVillain || isOwnerBrickCollector) {
      expect(ownerView.pendingDealItem!.marketPrice).toBe(0);
    } else {
      expect(ownerView.pendingDealItem!.marketPrice).toBeGreaterThan(0);
    }
  });

  it("shows public item info during a normal trade and reveals hidden risk one turn later", async () => {
    const host = await createRoom("A");
    const p2 = await joinRoom(host.room.code, "B");
    const p3 = await joinRoom(host.room.code, "C");
    await joinRoom(host.room.code, "D");
    await submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });
    await submitRoomAction(host.room.code, host.playerToken, { type: "drawActionCard" });

    const ownerItem = (await getRoomSnapshot(host.room.code, p2.playerToken)).me!.hand!.find(
      (item) => !item.isBrick && !item.instanceId.startsWith("brick"),
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

    if (ownerItem!.isBrick) {
      expect(requesterDealView.pendingDealItem).toMatchObject({
        instanceId: ownerItem!.instanceId,
        isBrick: false,
        revealed: true,
      });
      expect(requesterDealView.pendingDealItem!.condition).toBeNull();
    } else {
      expect(requesterDealView.pendingDealItem).toMatchObject({
        instanceId: ownerItem!.instanceId,
        id: ownerItem!.id,
        name: ownerItem!.name,
        category: ownerItem!.category,
        marketPrice: ownerItem!.marketPrice,
        condition: null,
        isBrick: false,
        revealed: true,
      });
    }
    expect(ownerDealView.pendingDealItem).toMatchObject({
      instanceId: ownerItem!.instanceId,
      category: ownerItem!.category,
      condition: ownerItem!.condition,
      revealed: true,
    });
    expect(nonPartyDealView.pendingDealItem).toMatchObject({
      instanceId: ownerItem!.instanceId,
      id: ownerItem!.id,
      name: ownerItem!.name,
      category: ownerItem!.category,
      marketPrice: ownerItem!.marketPrice,
      condition: null,
      isBrick: false,
      revealed: true,
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

    // Ensure deterministic money and action card type for test stability
    await mutateRoomWithRetry(host.room.code, (room) => {
      for (const p of room.players) {
        p.money = 1000000;
      }
      room.currentActionCard = {
        type: "tradeRequest",
        title: "거래 제안",
        description: "상대방의 물건을 구매할 제안을 보냅니다.",
        imagePath: "/game-cards/actions/trade.svg",
      };
    });

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

  it("handles counter-proposals where askingPrice is updated and choices reset", async () => {
    const host = await createRoom("A");
    const p2 = await joinRoom(host.room.code, "B");
    await joinRoom(host.room.code, "C");
    await joinRoom(host.room.code, "D");
    await submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });
    await submitRoomAction(host.room.code, host.playerToken, { type: "drawActionCard" });
    
    // Ensure deterministic money and action card type for test stability
    await mutateRoomWithRetry(host.room.code, (room) => {
      for (const p of room.players) {
        p.money = 1000000;
      }
      room.currentActionCard = {
        type: "tradeRequest",
        title: "거래 제안",
        description: "상대방의 물건을 구매할 제안을 보냅니다.",
        imagePath: "/game-cards/actions/trade.svg",
      };
    });

    const beforeOwner = await getRoomSnapshot(host.room.code, p2.playerToken);
    const item = beforeOwner.me!.hand!.find((owned) => owned.category !== null);
    if (!item) throw new Error("expected owner to have a non-brick item");
    
    // Requester requests to buy item from owner
    await submitRoomAction(host.room.code, host.playerToken, {
      type: "requestTrade",
      ownerId: p2.playerId,
      itemInstanceId: item.instanceId,
      offerPrice: 100000,
    });
    
    // Seller p2 proposes the price of 150,000, which sets askingPrice to 150,000, p2: cool, host: undefined
    await submitRoomAction(host.room.code, p2.playerToken, {
      type: "proposePrice",
      price: 150000,
    });

    let snapP2 = await getRoomSnapshot(host.room.code, p2.playerToken);
    expect(snapP2.pendingDeal?.askingPrice).toBe(150000);
    expect(snapP2.pendingDeal?.choices[p2.playerId]).toBe("cool");

    let snapHost = await getRoomSnapshot(host.room.code, host.playerToken);
    expect(snapHost.pendingDeal?.choices[host.playerId]).toBeUndefined();

    // Buyer host counter-proposes 120,000, which updates askingPrice to 120,000, host: cool, p2: undefined
    await submitRoomAction(host.room.code, host.playerToken, {
      type: "proposePrice",
      price: 120000,
    });

    snapHost = await getRoomSnapshot(host.room.code, host.playerToken);
    expect(snapHost.pendingDeal?.askingPrice).toBe(120000);
    expect(snapHost.pendingDeal?.choices[host.playerId]).toBe("cool");

    snapP2 = await getRoomSnapshot(host.room.code, p2.playerToken);
    expect(snapP2.pendingDeal?.choices[p2.playerId]).toBeUndefined();

    // Seller p2 accepts the counter-proposed price of 120,000
    const completed = await submitRoomAction(host.room.code, p2.playerToken, {
      type: "chooseDealCard",
      choice: "cool",
    });

    expect(completed.pendingDeal).toBeNull();
    const finalRequester = await getRoomSnapshot(host.room.code, host.playerToken);
    expect(finalRequester.me?.money).toBe(1000000 - 120000);
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
    expect(ownerView.pendingDeal?.choices).toEqual({
      [host.playerId]: "cool",
    });
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

    expect(requesterView.me?.reputationTokens).toBe(2);
    expect(ownerView.me?.reputationTokens).toBe(4);
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
    // 초기 평판 조정(3개)으로 인해 봇 테스트 중 조기 종료를 방지하기 위해 테스트 시작 전 임시로 토큰 수를 5로 강제 복구합니다.
    // 봇 1이 호스트에게 거래를 신청하도록 다른 봇들의 손패를 비웁니다.
    const testRoom = rooms.get(host.room.code);
    if (testRoom) {
      const firstBot = testRoom.players.find(p => p.isBot);
      if (firstBot) {
        firstBot.money = 2000000;
      }
      testRoom.players.forEach(p => {
        p.reputationTokens = 5;
        if (p.isBot && p.id !== firstBot?.id) {
          p.hand = [];
        }
      });
    }

    // Turn 1: Host draws tradeRequest
    await submitRoomAction(host.room.code, host.playerToken, { type: "drawActionCard" });
    await submitRoomAction(host.room.code, host.playerToken, { type: "ackActionCard" });
    await submitRoomAction(host.room.code, host.playerToken, { type: "endTurn" });

    // Acknowledge Bot 1 turn card (which makes Bot 1 start its turn, draw tradeRequest, and request trade from Host)
    await submitRoomAction(host.room.code, host.playerToken, { type: "ackActionCard" });

    const hostView = await getRoomSnapshot(host.room.code, host.playerToken);
    const deal = hostView.pendingDeal;
    expect(deal).toBeDefined();

    const item = hostView.me!.hand!.find((i) => i.instanceId === deal!.itemInstanceId);
    expect(item).toBeDefined();

    // Host proposes a counter-proposal price of 100% of market price (which is >= 80%)
    await submitRoomAction(host.room.code, host.playerToken, {
      type: "proposePrice",
      price: item!.marketPrice,
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
    // 초기 평판 조정(3개)으로 인해 봇 테스트 중 조기 종료를 방지하기 위해 테스트 시작 전 임시로 토큰 수를 5로 강제 복구합니다.
    // 봇 1이 호스트에게 거래를 신청하도록 다른 봇들의 손패를 비웁니다.
    const testRoom = rooms.get(host.room.code);
    if (testRoom) {
      const firstBot = testRoom.players.find(p => p.isBot);
      if (firstBot) {
        firstBot.money = 2000000;
      }
      testRoom.players.forEach(p => {
        p.reputationTokens = 5;
        if (p.isBot && p.id !== firstBot?.id) {
          p.hand = [];
        }
      });
    }

    // Turn 1: Host draws tradeRequest
    await submitRoomAction(host.room.code, host.playerToken, { type: "drawActionCard" });
    await submitRoomAction(host.room.code, host.playerToken, { type: "ackActionCard" });
    await submitRoomAction(host.room.code, host.playerToken, { type: "endTurn" });

    // Acknowledge Bot 1 turn card (which makes Bot 1 start its turn, draw tradeRequest, and request trade from Host)
    await submitRoomAction(host.room.code, host.playerToken, { type: "ackActionCard" });

    const hostView = await getRoomSnapshot(host.room.code, host.playerToken);
    const deal = hostView.pendingDeal;
    expect(deal).toBeDefined();

    // Host accepts the trade at 70% of market price (which is < 80%)
    await submitRoomAction(host.room.code, host.playerToken, {
      type: "chooseDealCard",
      choice: "cool",
    });

    const afterTrade = await getRoomSnapshot(host.room.code, host.playerToken);
    const hostPlayerInSnapshot = afterTrade.players.find((p) => p.id === host.playerId);
    expect(hostPlayerInSnapshot!.dislikes).toBe(0);
    expect(hostPlayerInSnapshot!.likes).toBe(1);
  });

  it("allows renaming a player in the lobby and fails after game start", async () => {
    const host = await createRoom("경수");
    const updated = await submitRoomAction(host.room.code, host.playerToken, {
      type: "renamePlayer",
      name: "시울",
    });
    expect(updated.players[0]?.name).toBe("시울");

    // add other players to start the game
    await joinRoom(host.room.code, "유현");
    await joinRoom(host.room.code, "윤식");
    await submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });

    // renaming should fail after game start
    await expect(
      submitRoomAction(host.room.code, host.playerToken, {
        type: "renamePlayer",
        name: "경수",
      }),
    ).rejects.toThrow("게임 시작 전에만 이름을 변경할 수 있습니다.");
  });

  it("throws an error when attempting to cancel a free giveaway", async () => {
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
    const requesterItem = (await getRoomSnapshot(
      host.room.code,
      requesterSession.playerToken,
    )).me!.hand![0];

    await submitRoomAction(host.room.code, requesterSession.playerToken, {
      type: "requestTrade",
      ownerId: ownerSession!.playerId,
      itemInstanceId: requesterItem!.instanceId,
      offerPrice: 0,
    });

    // Attempting to cancel freebie should throw an error
    await expect(
      submitRoomAction(host.room.code, ownerSession!.playerToken, {
        type: "chooseDealCard",
        choice: "cancel",
      }),
    ).rejects.toThrow("무료나눔은 거절할 수 없습니다.");
  });

  it("disguises brick item names in transaction logs and hides villain scam logs from citizens", async () => {
    const host = await createRoom("경수");
    const p2 = await joinRoom(host.room.code, "유현");
    const p3 = await joinRoom(host.room.code, "윤식");
    
    // Start game
    await submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });

    // Retrieve room directly to control states
    const room = rooms.get(host.room.code);
    expect(room).toBeDefined();
    if (!room) return;

    // Find the villain player and citizen player
    const villain = room.players.find((p) => p.role === "villain");
    const citizen = room.players.find((p) => p.role === "citizen");
    expect(villain).toBeDefined();
    expect(citizen).toBeDefined();

    const villainSessionToken = [host, p2, p3].find((s) => s.playerId === villain!.id)!.playerToken;
    const citizenSessionToken = [host, p2, p3].find((s) => s.playerId === citizen!.id)!.playerToken;

    // Inject a brick item in the villain's hand
    const brickInstanceId = "test-brick-123";
    const brickItem = {
      id: "brick-test",
      name: "벽돌",
      marketPrice: 0,
      category: null,
      condition: null,
      acquiredPrice: null,
      isBrick: true,
      imagePath: "/game-cards/actions/brick.svg",
      instanceId: brickInstanceId,
      revealed: false,
      revealedToPlayerIds: [villain!.id],
    };
    villain!.hand.push(brickItem);

    // Set turn to the villain
    room.currentTurnPlayerId = villain!.id;
    room.currentActionCard = {
      type: "saleRequest",
      title: "판매 신청",
      description: "내 물건 카드 1장의 가격을 정해 다른 플레이어에게 판매 신청을 보냅니다.",
      imagePath: "/game-cards/actions/direct-trade.svg",
    };

    // Request trade from villain to citizen, selling the brick at 100,000 won
    await submitRoomAction(host.room.code, villainSessionToken, {
      type: "requestTrade",
      ownerId: citizen!.id,
      itemInstanceId: brickInstanceId,
      offerPrice: 100000,
    });

    // Verify the log contains a fake item name, not "벽돌"
    const citizenSnapshotBefore = await getRoomSnapshot(host.room.code, citizenSessionToken);
    const lastLogBefore = citizenSnapshotBefore.logs[citizenSnapshotBefore.logs.length - 1];
    expect(lastLogBefore).toContain("팔아요 신청을 보냈습니다");
    expect(lastLogBefore).not.toContain("벽돌");
    expect(lastLogBefore).not.toContain("[벽돌]");

    // The citizen accepts the trade
    await submitRoomAction(host.room.code, citizenSessionToken, {
      type: "chooseDealCard",
      choice: "cool",
    });

    // Villain successfully scammed because the brick (value 0) was sold for 100,000 won
    // This logs a "[사기 성공]" entry.
    // Verify citizen does NOT see "[사기 성공]", "빌런이" or "빌런의" in snapshot logs
    const citizenSnapshotAfter = await getRoomSnapshot(host.room.code, citizenSessionToken);
    const hasScamLogForCitizen = citizenSnapshotAfter.logs.some(
      (log) => log.includes("[사기 성공]") || log.includes("빌런이") || log.includes("빌런의")
    );
    expect(hasScamLogForCitizen).toBe(false);

    // Verify villain DOES see the scam log
    const villainSnapshotAfter = await getRoomSnapshot(host.room.code, villainSessionToken);
    const hasScamLogForVillain = villainSnapshotAfter.logs.some(
      (log) => log.includes("[사기 성공]")
    );
    expect(hasScamLogForVillain).toBe(true);
  });

  it("implements new rules: blind brick disguise, trade-based asset value, final reveal, and round-end log", async () => {
    const host = await createRoom("A");
    const p2 = await joinRoom(host.room.code, "B");
    const p3 = await joinRoom(host.room.code, "C");
    const sessions = [host, p2, p3];

    // Start game
    await submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });

    const room = rooms.get(host.room.code);
    expect(room).toBeDefined();
    if (!room) return;

    // Find villain and citizen
    const villain = room.players.find((p) => p.role === "villain");
    const citizen = room.players.find((p) => p.role === "citizen");
    expect(villain).toBeDefined();
    expect(citizen).toBeDefined();

    const villainToken = sessions.find((s) => s.playerId === villain!.id)!.playerToken;
    const citizenToken = sessions.find((s) => s.playerId === citizen!.id)!.playerToken;

    // Ensure citizen does not get brick-collector job to keep disguise test working
    await mutateRoomWithRetry(host.room.code, (r) => {
      const c = r.players.find((p) => p.id === citizen!.id);
      if (c) {
        c.job = {
          id: "citizen",
          title: "일반 시민",
          description: "게임 종료 시 총 자산이 250만 원 이상이어야 합니다.",
          startingMoney: 1500000,
        };
      }
    });

    // 1. Force a brick card in the villain's hand
    const brickInstanceId = "test-brick-999";
    const brickItem = {
      id: "brick-1",
      name: "벽돌",
      marketPrice: 0,
      category: null,
      condition: null,
      acquiredPrice: null,
      isBrick: true,
      imagePath: "/game-cards/actions/brick.svg",
      instanceId: brickInstanceId,
      revealed: false,
      revealedToPlayerIds: [villain!.id],
    };
    villain!.hand.push(brickItem);

    // Verify villain (owner) sees it as "벽돌" (no disguise name or fake price)
    let villainSnapshot = await getRoomSnapshot(host.room.code, villainToken);
    let ownerBrickSnap = villainSnapshot.me!.hand!.find((c) => c.instanceId === brickInstanceId);
    expect(ownerBrickSnap).toBeDefined();
    expect(ownerBrickSnap!.name).toBe("벽돌");
    expect(ownerBrickSnap!.isBrick).toBe(true);
    expect(ownerBrickSnap!.marketPrice).toBe(0);

    // Verify citizen (public) sees it as the disguised fake item (not "벽돌")
    let citizenSnapshot = await getRoomSnapshot(host.room.code, citizenToken);
    let publicBrickSnap = citizenSnapshot.players
      .find((p) => p.id === villain!.id)!
      .publicItems.find((c) => c.instanceId === brickInstanceId);
    expect(publicBrickSnap).toBeDefined();
    expect(publicBrickSnap!.name).not.toBe("벽돌");
    expect(publicBrickSnap!.isBrick).toBe(false);
    expect(publicBrickSnap!.marketPrice).toBeGreaterThan(0);

    // Set turn to villain
    room.currentTurnPlayerId = villain!.id;
    room.currentActionCard = {
      type: "saleRequest",
      title: "판매 신청",
      description: "판매합니다",
      imagePath: "/game-cards/actions/direct-trade.svg",
    };

    // 2. Perform a successful trade of this brick to the citizen
    await submitRoomAction(host.room.code, villainToken, {
      type: "requestTrade",
      ownerId: citizen!.id,
      itemInstanceId: brickInstanceId,
      offerPrice: 200000,
    });

    await submitRoomAction(host.room.code, citizenToken, {
      type: "chooseDealCard",
      choice: "cool",
    });

    // Perform trade reviews to end the turn
    await submitRoomAction(host.room.code, villainToken, {
      type: "reviewTrade",
      targetPlayerId: citizen!.id,
      satisfied: true,
    });
    await submitRoomAction(host.room.code, citizenToken, {
      type: "reviewTrade",
      targetPlayerId: villain!.id,
      satisfied: true,
    });
    // Verify the brick is now in the citizen's hand
    citizenSnapshot = await getRoomSnapshot(host.room.code, citizenToken);
    let boughtBrickSnap = citizenSnapshot.me!.hand!.find((c) => c.instanceId === brickInstanceId);
    expect(boughtBrickSnap).toBeDefined();
    // The buyer sees it as the fake item (not "벽돌") and isBrick is false
    expect(boughtBrickSnap!.name).not.toBe("벽돌");
    expect(boughtBrickSnap!.isBrick).toBe(false);
    // It contributes its fake value to the buyer's asset value during active play
    expect(boughtBrickSnap!.marketPrice).toBeGreaterThan(0);

    // 3. Complete turn and check round-end log
    // We will advance turns so the round completes (room.turnCount % room.players.length === 0)
    // The starting turnCount was 0.
    // Turn 1 ends.
    // We will end turns for other players to complete the round.
    while (room.turnCount % room.players.length !== 0) {
      const currentTurnPlayer = room.players.find((p) => p.id === room.currentTurnPlayerId);
      const sessionToken = sessions.find((s) => s.playerId === currentTurnPlayer!.id)!.playerToken;
      await submitRoomAction(host.room.code, sessionToken, { type: "endTurn" });
    }

    // Now the round has completed. Check the log for round-end scam count
    const finalSnapshot = await getRoomSnapshot(host.room.code, host.playerToken);
    const roundLog = finalSnapshot.logs.find((log) => log.includes("[라운드 종료]"));
    expect(roundLog).toBeDefined();
    // One scam trade occurred because the villain sold a brick card
    expect(roundLog).toContain("사기 거래가 1건 발생했습니다!");

    // 4. Transition status to reporting (final reveal)
    room.status = "reporting";

    // Verify the brick's disguise is lifted and its value drops to 0
    const finalRevealSnapshot = await getRoomSnapshot(host.room.code, citizenToken);
    const revealedBrick = finalRevealSnapshot.me!.hand!.find((c) => c.instanceId === brickInstanceId);
    expect(revealedBrick).toBeDefined();
    expect(revealedBrick!.name).toContain("[벽돌]");
    expect(revealedBrick!.isBrick).toBe(true);
    expect(revealedBrick!.marketPrice).toBe(0);
  });

  it("disguises brick item names in bot trade logs", async () => {
    const host = await createRoom("경수", "botTest");
    await submitRoomAction(host.room.code, host.playerToken, { type: "addBot" });
    await submitRoomAction(host.room.code, host.playerToken, { type: "addBot" });

    // Start game
    await submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });

    const room = rooms.get(host.room.code);
    expect(room).toBeDefined();
    if (!room) return;

    // Find bot 1 and inject a brick item in its hand
    const bot = room.players.find((p) => p.isBot);
    expect(bot).toBeDefined();
    if (!bot) return;

    const brickInstanceId = "bot-brick-123";
    const brickItem = {
      id: "brick-bot",
      name: "벽돌",
      marketPrice: 0,
      category: null,
      condition: null,
      acquiredPrice: null,
      isBrick: true,
      imagePath: "/game-cards/actions/brick.svg",
      instanceId: brickInstanceId,
      revealed: false,
      revealedToPlayerIds: [bot.id],
    };
    bot.hand.push(brickItem);

    // Prepare a deal where bot is the owner and itemInstanceId is the brick
    room.pendingDeal = {
      id: "test-bot-deal",
      actionType: "saleRequest",
      requesterId: host.playerId,
      ownerId: bot.id,
      itemInstanceId: brickInstanceId,
      askingPrice: 0,
      choices: {},
      resolved: false,
    };

    // Force host to be citizen
    const hostPlayer = room.players.find((p) => p.id === host.playerId)!;
    hostPlayer.role = "citizen";

    // Trigger autoResolveBotDeal
    const { autoResolveBotDeal } = await import("../room/room-bot");
    autoResolveBotDeal(room);

    // Verify the bot log does NOT contain "벽돌" but the disguised item name for citizen
    const citizenSnapshot = await getRoomSnapshot(host.room.code, host.playerToken);
    const botLogsCitizen = citizenSnapshot.logs.filter((log) => log.includes("판매할 물품"));
    expect(botLogsCitizen.length).toBeGreaterThan(0);
    botLogsCitizen.forEach((log) => {
      expect(log).not.toContain("벽돌");
      expect(log).not.toContain("[벽돌]");
    });

    // Force host to be villain
    hostPlayer.role = "villain";
    const villainSnapshot = await getRoomSnapshot(host.room.code, host.playerToken);
    const botLogsVillain = villainSnapshot.logs.filter((log) => log.includes("판매할 물품"));
    expect(botLogsVillain.length).toBeGreaterThan(0);
    botLogsVillain.forEach((log) => {
      expect(log).toContain("벽돌");
      expect(log).not.toContain("350,000"); // the price of the transaction should be hidden
    });
  });

  it("allows players to request donation and transfers a random card from target's hand", async () => {
    const host = await createRoom("호스트");
    const p2 = await joinRoom(host.room.code, "기부자");
    const p3 = await joinRoom(host.room.code, "관전자");
    const room = rooms.get(host.room.code)!;
    room.status = "playing";
    room.currentTurnPlayerId = host.playerId;

    // Set the action card to donation
    room.currentActionCard = {
      type: "donation",
      title: "기부천사 😇",
      description: "이웃 중 1명을 지목해 그들의 손패 중 무작위 물품 1장을 일방적으로 기부(강탈)받아 옵니다.",
      imagePath: "/game-cards/actions/donation.svg",
    };

    const hostPlayer = room.players.find((p) => p.id === host.playerId)!;
    const p2Player = room.players.find((p) => p.id === p2.playerId)!;

    // Empty hands first to control sizes
    hostPlayer.hand = [];
    p2Player.hand = [
      {
        id: "iphone",
        name: "아이폰 15",
        marketPrice: 500000,
        category: "electronics" as const,
        condition: "mint" as const,
        acquiredPrice: null,
        isBrick: false,
        imagePath: "/game-cards/backs/item-back.svg",
        instanceId: "donation-test-item",
        revealed: false,
        revealedToPlayerIds: [p2.playerId],
      }
    ];

    // Call submitRoomAction with requestDonation action
    await submitRoomAction(host.room.code, host.playerToken, {
      type: "requestDonation",
      targetPlayerId: p2.playerId,
    });

    // Check hand sizes
    expect(p2Player.hand.length).toBe(0);
    expect(hostPlayer.hand.length).toBe(1);
    expect(hostPlayer.hand[0]!.instanceId).toBe("donation-test-item");

    // Check lastActionNotification was created
    expect(hostPlayer.lastActionNotification).toBeDefined();
    expect(hostPlayer.lastActionNotification?.type).toBe("donation");
    expect(hostPlayer.lastActionNotification?.gainedItemName).toBe("아이폰 15");
    expect(p2Player.lastActionNotification?.lostItemName).toBe("아이폰 15");

    // Clear notification
    await submitRoomAction(host.room.code, host.playerToken, {
      type: "clearNotification",
    });
    expect(hostPlayer.lastActionNotification).toBeNull();

    // Check that round ended / action card is null
    expect(room.currentActionCard).toBeNull();

    // Check that the log is present
    const donationLog = room.logs.find((log) => log.includes("기부천사 카드로"));
    expect(donationLog).toBeDefined();
  });

  it("repairItem action upgrades item/disguise condition to mint", async () => {
    const host = await createRoom("test-player", "botTest");
    await joinRoom(host.room.code, "player-2");
    await joinRoom(host.room.code, "player-3");
    const room = rooms.get(host.room.code)!;
    
    // Start game so players are initialized and hands dealt
    await submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });
    
    // Set current turn and force current action card to 'repair'
    room.currentTurnPlayerId = host.playerId;
    room.currentActionCard = {
      type: "repair",
      title: "자가 수리 🛠️",
      description: "내 손패의 물건 중 원하는 카드 1장을 '민트급' 상태로 업그레이드합니다.",
      imagePath: "/game-cards/actions/repair.svg",
    };

    // 1. Test normal item repair
    const normalItem = {
      id: "iphone",
      name: "아이폰 15",
      marketPrice: 500000,
      category: "electronics" as const,
      condition: "broken" as const,
      acquiredPrice: null,
      isBrick: false,
      imagePath: "/game-cards/backs/item-back.svg",
      instanceId: "repair-test-item",
      revealed: false,
      revealedToPlayerIds: [host.playerId],
    };
    
    const hostPlayer = room.players.find((p) => p.id === host.playerId)!;
    hostPlayer.hand.push(normalItem);

    // Call submitRoomAction with repairItem action
    await submitRoomAction(host.room.code, host.playerToken, {
      type: "repairItem",
      itemInstanceId: "repair-test-item",
    });

    // Verify condition changed to mint
    expect(normalItem.condition).toBe("mint");
    
    // Check that round ended / action card is null
    expect(room.currentActionCard).toBeNull();

    // 2. Test brick disguiseCondition repair
    // Force repair card again
    room.currentTurnPlayerId = host.playerId;
    room.currentActionCard = {
      type: "repair",
      title: "자가 수리 🛠️",
      description: "내 손패의 물건 중 원하는 카드 1장을 '민트급' 상태로 업그레이드합니다.",
      imagePath: "/game-cards/actions/repair.svg",
    };

    const brickItem = {
      id: "brick-1",
      name: "벽돌",
      marketPrice: 0,
      category: null,
      condition: null,
      acquiredPrice: null,
      isBrick: true,
      imagePath: "/game-cards/actions/brick.svg",
      instanceId: "repair-test-brick",
      revealed: false,
      revealedToPlayerIds: [host.playerId],
      disguiseId: "iphone",
      disguiseName: "아이폰 15",
      disguiseCategory: "electronics" as const,
      disguiseCondition: "broken" as const,
      disguiseMarketPrice: 500000,
      disguiseImagePath: "/game-cards/backs/item-back.svg",
    };
    hostPlayer.hand.push(brickItem);

    // Call submitRoomAction with repairItem action
    await submitRoomAction(host.room.code, host.playerToken, {
      type: "repairItem",
      itemInstanceId: "repair-test-brick",
    });

    // Verify disguiseCondition changed to mint
    expect(brickItem.disguiseCondition).toBe("mint");
    
    // Verify logs
    const repairLog = room.logs.find((log) => log.includes("정성껏 수리하여 '민트급' 상태로 만들었습니다! 🛠️"));
    expect(repairLog).toBeDefined();
  });
});
