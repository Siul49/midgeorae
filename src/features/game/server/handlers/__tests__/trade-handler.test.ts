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

describe("trade-handler", () => {
  beforeEach(() => resetRoomsForTests());

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
    ).me!.hand![0]!;

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
    const item = beforeOwner.me!.hand!.find((i) => !i.isBrick) ?? beforeOwner.me!.hand![0]!;
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

    // 턴을 넘겨서 배송을 완료시킴 (p2 턴 종료 -> 다음 턴 진행)
    submitRoomAction(host.room.code, p2.playerToken, { type: "endTurn" });

    const requesterViewAfterDelivery = getRoomSnapshot(host.room.code, host.playerToken);
    const deliveredItem = requesterViewAfterDelivery.me?.hand?.find(
      (owned) => owned.instanceId === item.instanceId,
    );
    expect(deliveredItem?.acquiredPrice).toBe(120000);
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
    const item = beforeOwner.me!.hand![0]!;
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

    const item = getRoomSnapshot(host.room.code, p2.playerToken).me!.hand![0]!;
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

    const item = getRoomSnapshot(host.room.code, p2.playerToken).me!.hand![0]!;
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

    expect(requesterView.me?.reputationTokens).toBe(4);
    expect(ownerView.me?.reputationTokens).toBe(6);
    expect(requesterView.pendingReviews).toHaveLength(0);
    expect(ownerView.pendingReviews).toHaveLength(0);
  });

  it("allows villain to scam buy an item at 50% price covertly", () => {
    const host = createRoom("A");
    const p2 = joinRoom(host.room.code, "B");
    const p3 = joinRoom(host.room.code, "C");
    const p4 = joinRoom(host.room.code, "D");
    submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });

    const roomInstance = rooms.get(host.room.code);
    expect(roomInstance).toBeDefined();

    // 빌런을 구매자, 시민을 판매자로 조작
    const villain = roomInstance!.players.find((p) => p.role === "villain")!;
    const citizen = roomInstance!.players.find((p) => p.role === "citizen")!;

    roomInstance!.currentTurnPlayerId = villain.id;
    const citizenItem = citizen.hand.find((i) => !i.isBrick && i.acquiredPrice === null)!;
    expect(citizenItem).toBeDefined();

    roomInstance!.currentActionCard = {
      type: "tradeRequest",
      title: "구매 신청",
      description: "사기 테스트",
      imagePath: "",
    };

    const offerPrice = 300000;
    submitRoomAction(host.room.code, villain.token, {
      type: "requestTrade",
      ownerId: citizen.id,
      itemInstanceId: citizenItem.instanceId,
      offerPrice,
    });

    const beforeVillainMoney = villain.money;
    const beforeCitizenMoney = citizen.money;

    // 판매자(시민) 수락
    submitRoomAction(host.room.code, citizen.token, {
      type: "chooseDealCard",
      choice: "cool",
    });
    // 구매자(빌런) scam: true 수락
    submitRoomAction(host.room.code, villain.token, {
      type: "chooseDealCard",
      choice: "cool",
      scam: true,
    });

    expect(roomInstance!.pendingDeal).toBeNull();

    // 50%인 150,000원만 정산되어 이체
    const expectedTransfer = Math.floor(offerPrice / 2);
    expect(villain.money).toBe(beforeVillainMoney - expectedTransfer);
    expect(citizen.money).toBe(beforeCitizenMoney + expectedTransfer);

    // 그러나 카드 영수증은 300,000원 그대로 위장
    const acquiredItem = villain.hand.find((i) => i.instanceId === citizenItem.instanceId)!;
    expect(acquiredItem).toBeDefined();
    expect(acquiredItem.acquiredPrice).toBe(offerPrice);
  });

  it("prevents normal citizen from triggering 50% price scam even if they pass scam: true", () => {
    const host = createRoom("A");
    const p2 = joinRoom(host.room.code, "B");
    const p3 = joinRoom(host.room.code, "C");
    const p4 = joinRoom(host.room.code, "D");
    submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });

    const roomInstance = rooms.get(host.room.code);
    const citizen1 = roomInstance!.players.filter((p) => p.role === "citizen")[0]!;
    const citizen2 = roomInstance!.players.filter((p) => p.role === "citizen")[1]!;

    roomInstance!.currentTurnPlayerId = citizen1.id;
    const targetItem = citizen2.hand.find((i) => !i.isBrick && i.acquiredPrice === null)!;

    roomInstance!.currentActionCard = {
      type: "tradeRequest",
      title: "구매 신청",
      description: "시민 해킹 테스트",
      imagePath: "",
    };

    const offerPrice = 400000;
    submitRoomAction(host.room.code, citizen1.token, {
      type: "requestTrade",
      ownerId: citizen2.id,
      itemInstanceId: targetItem.instanceId,
      offerPrice,
    });

    const beforeCitizen1Money = citizen1.money;
    const beforeCitizen2Money = citizen2.money;

    submitRoomAction(host.room.code, citizen2.token, {
      type: "chooseDealCard",
      choice: "cool",
    });
    // 일반 시민이 scam: true 전송
    submitRoomAction(host.room.code, citizen1.token, {
      type: "chooseDealCard",
      choice: "cool",
      scam: true,
    });

    // 일반 시민은 scam 옵션이 무시되어 100% 정상 정산
    expect(citizen1.money).toBe(beforeCitizen1Money - offerPrice);
    expect(citizen2.money).toBe(beforeCitizen2Money + offerPrice);
  });
});
