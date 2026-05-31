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

  it("rejects starting with fewer than three players", () => {
    const host = createRoom("경수");
    joinRoom(host.room.code, "유현");

    expect(() =>
      submitRoomAction(host.room.code, host.playerToken, { type: "startGame" }),
    ).toThrow("3명 이상 모여야 시작할 수 있습니다.");
  });

  it("keeps a listed brick face down during a normal sale", () => {
    const host = createRoom("경수");
    const p2 = joinRoom(host.room.code, "유현");
    const p3 = joinRoom(host.room.code, "윤식");
    const p4 = joinRoom(host.room.code, "환희");
    submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });
    const sessions = [host, p2, p3, p4];
    const sellerSession = sessions.find((session) =>
      getRoomSnapshot(host.room.code, session.playerToken).me!.hand!.some(
        (item) => item.isBrick,
      ),
    );
    expect(sellerSession).toBeDefined();

    for (let index = 0; index < sessions.length; index += 1) {
      const currentTurnPlayerId = getRoomSnapshot(
        host.room.code,
        host.playerToken,
      ).currentTurnPlayerId;
      if (currentTurnPlayerId === sellerSession!.playerId) break;
      const currentSession = sessions.find(
        (session) => session.playerId === currentTurnPlayerId,
      );
      expect(currentSession).toBeDefined();
      submitRoomAction(host.room.code, currentSession!.playerToken, {
        type: "endTurn",
      });
    }

    submitRoomAction(host.room.code, sellerSession!.playerToken, {
      type: "drawActionCard",
    });

    const sellerSnapshot = getRoomSnapshot(
      host.room.code,
      sellerSession!.playerToken,
    );
    const brick = sellerSnapshot.me!.hand!.find((item) => item.isBrick);
    expect(brick).toBeDefined();
    const buyerSession = sessions.find(
      (session) => session.playerId !== sellerSession!.playerId,
    );
    expect(buyerSession).toBeDefined();

    submitRoomAction(host.room.code, sellerSession!.playerToken, {
      type: "listItemForSale",
      itemInstanceId: brick!.instanceId,
      askingPrice: 120000,
      targetPlayerId: buyerSession!.playerId,
    });

    const sellerView = getRoomSnapshot(host.room.code, sellerSession!.playerToken);
    const buyerView = getRoomSnapshot(host.room.code, buyerSession!.playerToken);

    expect(sellerView.pendingDealItem).toMatchObject({
      name: "뒤집힌 물건",
      isBrick: false,
      revealed: false,
    });
    expect(buyerView.pendingDealItem).toMatchObject({
      name: "뒤집힌 물건",
      isBrick: false,
      revealed: false,
    });
  });

  it("completes a sale only when seller and buyer both choose cool deal", () => {
    const host = createRoom("경수");
    const p2 = joinRoom(host.room.code, "유현");
    joinRoom(host.room.code, "윤식");
    joinRoom(host.room.code, "환희");
    submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });
    submitRoomAction(host.room.code, host.playerToken, { type: "drawActionCard" });

    const beforeSale = getRoomSnapshot(host.room.code, host.playerToken);
    const beforeBuyer = getRoomSnapshot(host.room.code, p2.playerToken);
    const item = beforeSale.me!.hand![0];
    submitRoomAction(host.room.code, host.playerToken, {
      type: "listItemForSale",
      itemInstanceId: item.instanceId,
      askingPrice: 120000,
      targetPlayerId: p2.playerId,
    });
    submitRoomAction(host.room.code, host.playerToken, {
      type: "chooseDealCard",
      choice: "cool",
    });
    const completed = submitRoomAction(host.room.code, p2.playerToken, {
      type: "chooseDealCard",
      choice: "cool",
    });

    const sellerView = getRoomSnapshot(host.room.code, host.playerToken);
    const buyerView = getRoomSnapshot(host.room.code, p2.playerToken);

    expect(completed.pendingDeal).toBeNull();
    expect(sellerView.me?.money).toBe((beforeSale.me?.money ?? 0) + 120000);
    expect(sellerView.me?.hand).toHaveLength(4);
    expect(buyerView.me?.money).toBe((beforeBuyer.me?.money ?? 0) - 120000);
    expect(buyerView.me?.hand).toHaveLength(6);
    expect(buyerView.me?.hand?.some((owned) => owned.instanceId === item.instanceId)).toBe(
      true,
    );
    expect(buyerView.pendingReviews).toHaveLength(1);
    expect(sellerView.pendingReviews).toHaveLength(1);
  });

  it("cancels a sale when either side chooses cancel", () => {
    const host = createRoom("경수");
    const p2 = joinRoom(host.room.code, "유현");
    joinRoom(host.room.code, "윤식");
    joinRoom(host.room.code, "환희");
    submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });
    submitRoomAction(host.room.code, host.playerToken, { type: "drawActionCard" });

    const beforeSale = getRoomSnapshot(host.room.code, host.playerToken);
    const beforeBuyer = getRoomSnapshot(host.room.code, p2.playerToken);
    const item = beforeSale.me!.hand![0];
    submitRoomAction(host.room.code, host.playerToken, {
      type: "listItemForSale",
      itemInstanceId: item.instanceId,
      askingPrice: 120000,
      targetPlayerId: p2.playerId,
    });
    submitRoomAction(host.room.code, host.playerToken, {
      type: "chooseDealCard",
      choice: "cool",
    });
    submitRoomAction(host.room.code, p2.playerToken, {
      type: "chooseDealCard",
      choice: "cancel",
    });

    const sellerView = getRoomSnapshot(host.room.code, host.playerToken);
    const buyerView = getRoomSnapshot(host.room.code, p2.playerToken);

    expect(sellerView.me?.money).toBe(beforeSale.me?.money);
    expect(sellerView.me?.hand).toHaveLength(5);
    expect(buyerView.me?.money).toBe(beforeBuyer.me?.money);
    expect(buyerView.me?.hand).toHaveLength(5);
    expect(sellerView.pendingDeal).toBeNull();
  });

  it("hides deal card choices from the other trading player", () => {
    const host = createRoom("경수");
    const p2 = joinRoom(host.room.code, "유현");
    joinRoom(host.room.code, "윤식");
    joinRoom(host.room.code, "환희");
    submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });
    submitRoomAction(host.room.code, host.playerToken, { type: "drawActionCard" });

    const item = getRoomSnapshot(host.room.code, host.playerToken).me!.hand![0];
    submitRoomAction(host.room.code, host.playerToken, {
      type: "listItemForSale",
      itemInstanceId: item.instanceId,
      askingPrice: 120000,
      targetPlayerId: p2.playerId,
    });
    submitRoomAction(host.room.code, host.playerToken, {
      type: "chooseDealCard",
      choice: "cool",
    });

    const sellerView = getRoomSnapshot(host.room.code, host.playerToken);
    const buyerView = getRoomSnapshot(host.room.code, p2.playerToken);

    expect(sellerView.pendingDeal?.choices).toEqual({
      [host.playerId]: "cool",
    });
    expect(buyerView.pendingDeal?.choices).toEqual({});
  });

  it("moves or destroys reputation tokens through post-trade reviews", () => {
    const host = createRoom("경수");
    const p2 = joinRoom(host.room.code, "유현");
    joinRoom(host.room.code, "윤식");
    joinRoom(host.room.code, "환희");
    submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });
    submitRoomAction(host.room.code, host.playerToken, { type: "drawActionCard" });

    const item = getRoomSnapshot(host.room.code, host.playerToken).me!.hand![0];
    submitRoomAction(host.room.code, host.playerToken, {
      type: "listItemForSale",
      itemInstanceId: item.instanceId,
      askingPrice: 120000,
      targetPlayerId: p2.playerId,
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

    const sellerView = getRoomSnapshot(host.room.code, host.playerToken);
    const buyerView = getRoomSnapshot(host.room.code, p2.playerToken);

    expect(sellerView.me?.reputationTokens).toBe(3);
    expect(buyerView.me?.reputationTokens).toBe(6);
    expect(sellerView.pendingReviews).toHaveLength(0);
    expect(buyerView.pendingReviews).toHaveLength(0);
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

  it("finishes the game after every player votes for the villain", () => {
    const host = createRoom("경수");
    const p2 = joinRoom(host.room.code, "유현");
    const p3 = joinRoom(host.room.code, "윤식");
    const p4 = joinRoom(host.room.code, "환희");
    const p5 = joinRoom(host.room.code, "민지");
    submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });

    const started = getRoomSnapshot(host.room.code, host.playerToken);
    const target = started.players.find((player) => player.id !== host.playerId);
    expect(target).toBeDefined();

    for (const token of [
      host.playerToken,
      p2.playerToken,
      p3.playerToken,
      p4.playerToken,
      p5.playerToken,
    ]) {
      submitRoomAction(host.room.code, token, {
        type: "voteVillain",
        targetPlayerId: target!.id,
      });
    }

    const finished = getRoomSnapshot(host.room.code, host.playerToken);
    expect(finished.status).toBe("finished");
    expect(finished.result).toBeDefined();
  });
});
