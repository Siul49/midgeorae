import { beforeEach, describe, expect, it } from "vitest";
import {
  createRoom,
  getRoomSnapshot,
  joinRoom,
  resetRoomsForTests,
  submitRoomAction as originalSubmitRoomAction,
  rooms,
} from "../../room-store";

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

describe("action-card-handler", () => {
  beforeEach(() => resetRoomsForTests());

  it("counts market progress when a turn action is consumed, not when an action card is drawn", () => {
    const host = createRoom("A");
    joinRoom(host.room.code, "B");
    joinRoom(host.room.code, "C");
    joinRoom(host.room.code, "D");
    submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });

    // 행동카드 뽑았을 때 사용한 예산 증가하지 않음
    const afterDraw = submitRoomAction(host.room.code, host.playerToken, {
      type: "drawActionCard",
    });
    expect(afterDraw.usedActionCount).toBe(0);

    // 턴을 종료할 때 예산 소비
    const afterEndTurn = submitRoomAction(host.room.code, host.playerToken, {
      type: "endTurn",
    });
    expect(afterEndTurn.usedActionCount).toBe(1);
  });

  it("treats free give as a zero-price forced trade (instantly completed)", () => {
    const host = createRoom("A");
    const p2 = joinRoom(host.room.code, "B");
    const p3 = joinRoom(host.room.code, "C");
    const p4 = joinRoom(host.room.code, "D");
    const sessions = [host, p2, p3, p4];
    submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });

    const { session: actorSession } = drawUntilActionType(
      host.room.code,
      sessions,
      "freeGive",
    );
    const targetSession = sessions.find(
      (session) => session.playerId !== actorSession.playerId,
    );
    expect(targetSession).toBeDefined();
    const targetItem = getRoomSnapshot(
      host.room.code,
      targetSession!.playerToken,
    ).me!.hand!.find((i) => !i.isBrick && i.acquiredPrice === null);
    expect(targetItem).toBeDefined();

    const requested = submitRoomAction(host.room.code, actorSession.playerToken, {
      type: "requestTrade",
      ownerId: targetSession!.playerId,
      itemInstanceId: targetItem!.instanceId,
      offerPrice: 0,
    });

    expect(requested.pendingDeal).toBeNull();
    expect(requested.currentTurnPlayerId).not.toBe(actorSession.playerId);

    const actorSnapshot = getRoomSnapshot(host.room.code, actorSession.playerToken);
    expect(
      actorSnapshot.me!.hand!.some((i) => i.instanceId === targetItem!.instanceId),
    ).toBe(true);

    const targetSnapshot = getRoomSnapshot(host.room.code, targetSession!.playerToken);
    expect(
      targetSnapshot.me!.hand!.some((i) => i.instanceId === targetItem!.instanceId),
    ).toBe(false);
  });

  it("treats forceBuy as a forced sale at offering price (instantly completed)", () => {
    const host = createRoom("A");
    const p2 = joinRoom(host.room.code, "B");
    const p3 = joinRoom(host.room.code, "C");
    const p4 = joinRoom(host.room.code, "D");
    const sessions = [host, p2, p3, p4];
    submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });

    const { session: actorSession } = drawUntilActionType(
      host.room.code,
      sessions,
      "forceBuy",
    );
    const targetSession = sessions.find(
      (session) => session.playerId !== actorSession.playerId,
    );
    expect(targetSession).toBeDefined();
    const actorItem = getRoomSnapshot(
      host.room.code,
      actorSession.playerToken,
    ).me!.hand!.find((i) => !i.isBrick && i.acquiredPrice === null);
    expect(actorItem).toBeDefined();

    const beforeActorMoney = getRoomSnapshot(host.room.code, actorSession.playerToken).me!.money ?? 0;
    const beforeTargetMoney = getRoomSnapshot(host.room.code, targetSession!.playerToken).me!.money ?? 0;

    const requested = submitRoomAction(host.room.code, actorSession.playerToken, {
      type: "requestTrade",
      ownerId: targetSession!.playerId,
      itemInstanceId: actorItem!.instanceId,
      offerPrice: 200000,
    });

    expect(requested.pendingDeal).toBeNull();

    const actorSnapshot = getRoomSnapshot(host.room.code, actorSession.playerToken);
    const targetSnapshot = getRoomSnapshot(host.room.code, targetSession!.playerToken);

    expect(actorSnapshot.me!.money).toBe(beforeActorMoney + 200000);
    expect(targetSnapshot.me!.money).toBe(beforeTargetMoney - 200000);
    expect(actorSnapshot.me!.hand!.some((i) => i.instanceId === actorItem!.instanceId)).toBe(false);
    expect(targetSnapshot.me!.hand!.some((i) => i.instanceId === actorItem!.instanceId)).toBe(true);
  });

  it("treats freeShare as a forced gift at 0 price (instantly completed)", () => {
    const host = createRoom("A");
    const p2 = joinRoom(host.room.code, "B");
    const p3 = joinRoom(host.room.code, "C");
    const p4 = joinRoom(host.room.code, "D");
    const sessions = [host, p2, p3, p4];
    submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });

    const { session: actorSession } = drawUntilActionType(
      host.room.code,
      sessions,
      "freeShare",
    );
    const targetSession = sessions.find(
      (session) => session.playerId !== actorSession.playerId,
    );
    expect(targetSession).toBeDefined();
    const actorItem = getRoomSnapshot(
      host.room.code,
      actorSession.playerToken,
    ).me!.hand!.find((i) => !i.isBrick && i.acquiredPrice === null);
    expect(actorItem).toBeDefined();

    const beforeActorMoney = getRoomSnapshot(host.room.code, actorSession.playerToken).me!.money ?? 0;
    const beforeTargetMoney = getRoomSnapshot(host.room.code, targetSession!.playerToken).me!.money ?? 0;

    const requested = submitRoomAction(host.room.code, actorSession.playerToken, {
      type: "requestTrade",
      ownerId: targetSession!.playerId,
      itemInstanceId: actorItem!.instanceId,
      offerPrice: 0,
    });

    expect(requested.pendingDeal).toBeNull();

    const actorSnapshot = getRoomSnapshot(host.room.code, actorSession.playerToken);
    const targetSnapshot = getRoomSnapshot(host.room.code, targetSession!.playerToken);

    expect(actorSnapshot.me!.money).toBe(beforeActorMoney);
    expect(targetSnapshot.me!.money).toBe(beforeTargetMoney);
    expect(actorSnapshot.me!.hand!.some((i) => i.instanceId === actorItem!.instanceId)).toBe(false);
    expect(targetSnapshot.me!.hand!.some((i) => i.instanceId === actorItem!.instanceId)).toBe(true);
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
    ).me!.hand![0]!;

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
      marketPrice: 500000,
      revealed: false,
    });
    expect(ownerView.pendingDealItem).toMatchObject({
      isBrick: false,
      marketPrice: 500000,
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
      condition: ownerItem!.condition,
      isBrick: false,
      revealed: false,
    });
    expect(ownerDealView.pendingDealItem).toMatchObject({
      instanceId: ownerItem!.instanceId,
      category: ownerItem!.category,
      condition: ownerItem!.condition,
      revealed: false,
    });
    expect(nonPartyDealView.pendingDealItem).toMatchObject({
      category: ownerItem!.category,
      marketPrice: ownerItem!.marketPrice,
      condition: ownerItem!.condition,
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
      condition: ownerItem!.condition,
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
});
