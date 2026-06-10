import type { Room, RoomAction, RoomMode, RoomSnapshot, RoomSessionResult } from "./types";
import { makeActionDeck } from "./cards";
import { MAX_PLAYERS } from "../rules/game-rules";
import {
  rooms,
  now,
  createPlayer,
  findRoom,
  saveRoom,
  mutateRoomWithRetry,
  findPlayer,
  touch,
  supabase,
  generateUniqueRoomCode,
} from "./room/room-db";
import { toSnapshot } from "./room/room-snapshot";
import * as actions from "./room/room-actions";
import { autoPlayBots, addBot } from "./room/room-bot";

export async function createRoom(name: string, mode: RoomMode = "real"): Promise<RoomSessionResult> {
  const player = createPlayer(name, true, "호스트");
  const code = await generateUniqueRoomCode();
  const room: Room = {
    code,
    mode,
    status: "waiting",
    hostPlayerId: player.id,
    players: [player],
    currentTurnPlayerId: null,
    turnCount: 0,
    usedActionCount: 0,
    marketActionLimit: 0,
    logs: [
      `${player.name}님이 ${
        mode === "botTest" ? "봇 테스트 방" : "실제 플레이 방"
      }을 만들었습니다.`,
    ],
    actionDeck: makeActionDeck(),
    discardPile: [],
    currentActionCard: null,
    pendingDeal: null,
    pendingReviews: [],
    reports: {},
    result: null,
    currentActionAcks: [],
    version: 1,
    createdAt: now(),
    updatedAt: now(),
  };

  await saveRoom(room);

  return {
    room: toSnapshot(room, player),
    playerId: player.id,
    playerToken: player.token,
  };
}

export async function joinRoom(code: string, name: string): Promise<RoomSessionResult> {
  let playerInfo: { id: string; token: string } | null = null;
  const { room } = await mutateRoomWithRetry(code, (room) => {
    if (room.status !== "waiting") throw new Error("이미 시작된 방입니다.");
    if (room.players.length >= MAX_PLAYERS) throw new Error("방이 가득 찼습니다.");

    const player = createPlayer(name, false, `플레이어 ${room.players.length + 1}`);
    room.players.push(player);
    room.logs.push(`${player.name}님이 입장했습니다.`);
    touch(room);
    playerInfo = { id: player.id, token: player.token };
  });

  const player = room.players.find((p) => p.id === playerInfo!.id)!;
  return {
    room: toSnapshot(room, player),
    playerId: player.id,
    playerToken: player.token,
  };
}

export async function getRoomSnapshot(code: string, token: string): Promise<RoomSnapshot> {
  const room = await findRoom(code);
  const viewer = findPlayer(room, token);

  if (room.mode === "botTest") {
    let viewerId = viewer.id;
    const { room: mutatedRoom } = await mutateRoomWithRetry(code, (r) => {
      const v = findPlayer(r, token);
      viewerId = v.id;
      if (autoPlayBots(r)) {
        touch(r);
      }
    });
    const updatedViewer = mutatedRoom.players.find((p) => p.id === viewerId) || null;
    return toSnapshot(mutatedRoom, updatedViewer);
  }

  return toSnapshot(room, viewer);
}

export async function submitRoomAction(
  code: string,
  token: string,
  action: RoomAction,
): Promise<RoomSnapshot> {
  let viewerId: string = "";
  const { room } = await mutateRoomWithRetry(code, (room) => {
    const actor = findPlayer(room, token);
    viewerId = actor.id;

    switch (action.type) {
      case "addBot":
        addBot(room, actor);
        break;
      case "startGame":
        actions.startGame(room, actor);
        break;
      case "drawActionCard":
        actions.drawActionCard(room, actor);
        break;
      case "requestTrade":
        actions.requestTrade(
          room,
          actor,
          action.ownerId,
          action.itemInstanceId,
          action.offerPrice,
        );
        break;
      case "chooseDealCard":
        actions.chooseDealCard(room, actor, action.choice);
        break;
      case "proposePrice":
        actions.proposePrice(room, actor, action.price);
        break;
      case "reviewTrade":
        actions.reviewTrade(room, actor, action.targetPlayerId, action.satisfied);
        break;
      case "terrorReview":
        actions.terrorReview(room, actor, action.targetPlayerId);
        break;
      case "toggleShowBrickDisguise":
        if (!actor.isHost) throw new Error("호스트만 설정을 변경할 수 있습니다.");
        if (room.status !== "waiting") throw new Error("게임 시작 전에만 설정을 변경할 수 있습니다.");
        room.showBrickDisguise = !room.showBrickDisguise;
        room.logs.push(`방장이 내 벽돌 위장 보기 설정을 ${room.showBrickDisguise ? "켬" : "끔"}으로 변경했습니다.`);
        break;
      case "requestDonation":
        actions.requestDonation(room, actor, action.targetPlayerId);
        break;
      case "repairItem":
        actions.repairItem(room, actor, action.itemInstanceId);
        break;
      case "swapRandomItem":
        actions.swapRandomItem(room, actor, action.targetPlayerId);
        break;
      case "rollDice":
        actions.assertPlaying(room);
        actions.assertCurrentTurn(room, actor);
        throw new Error("이 버전에서는 주사위 대신 행동카드를 뽑습니다.");
      case "buyItem":
        throw new Error("이 버전에서는 시장 구매 대신 물건 카드 거래를 사용합니다.");
      case "sellItem":
        throw new Error("이 버전에서는 행동카드 거래를 사용합니다.");
      case "ratePlayer":
        throw new Error("거래 후 후기에서만 평판 토큰을 조정할 수 있습니다.");
      case "endTurn":
        actions.assertPlaying(room);
        actions.assertCurrentTurn(room, actor);
        room.currentActionCard = null;
        room.pendingDeal = null;
        actions.nextTurn(room);
        break;
      case "startReporting":
        if (!actor.isHost) throw new Error("호스트만 최종 신고를 시작할 수 있습니다.");
        if (room.status !== "playing") throw new Error("최종 신고를 시작할 수 없는 상태입니다.");
        actions.enterReporting(room, "호스트가 최종 신고를 시작했습니다.");
        break;
      case "reportSuspiciousPlayer":
        actions.reportSuspiciousPlayer(room, actor, action.targetPlayerId);
        break;
      case "restartGame":
        actions.restartGame(room, actor);
        break;
      case "ackActionCard":
        actions.ackActionCard(room, actor);
        break;
      case "leaveRoom":
        actions.leaveRoom(room, actor);
        break;
      case "toggleRevealAllItems":
        if (!actor.isHost) throw new Error("호스트만 설정을 변경할 수 있습니다.");
        if (room.status !== "waiting") throw new Error("게임 시작 전에만 설정을 변경할 수 있습니다.");
        room.revealAllItems = !room.revealAllItems;
        room.logs.push(`방장이 물건 공개 설정을 ${room.revealAllItems ? "켬" : "끔"}으로 변경했습니다.`);
        break;
      case "renamePlayer":
        actions.renamePlayer(room, actor, action.name);
        break;
    }

    touch(room);
    if (autoPlayBots(room)) touch(room);
  });

  const viewer = room.players.find((p) => p.id === viewerId) || null;
  return toSnapshot(room, viewer);
}

export async function resetRoomsForTests() {
  if (supabase) {
    await supabase.from("game_rooms").delete().neq("code", "");
  } else {
    rooms.clear();
  }
}
