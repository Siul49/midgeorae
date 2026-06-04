import { randomUUID } from "node:crypto";
import {
  LOBBY_MONEY,
  MAX_PLAYERS,
  STARTING_MANNER_TEMP,
  STARTING_REPUTATION,
} from "../rules/game-rules";
import { makeRoomCode } from "./room-code";
import { loadGenePool } from "./bot-evolution";
import type {
  Room,
  RoomAction,
  RoomMode,
  RoomSessionResult,
  RoomSnapshot,
  ServerPlayer,
} from "./types/game-server-types";
import {
  touch,
  toSnapshot,
  startGame,
  drawActionCard,
  requestTrade,
  chooseDealCard,
  negoDeal,
  reviewTrade,
  terrorReview,
  recycleBrick,
  swapRandomItem,
  reportSuspiciousPlayer,
  fixPreparation,
  updateCustomCondition,
  useInspectToken,
  useNegoToken,
  assertPlaying,
  assertCurrentTurn,
  enterReporting,
  nextTurn,
} from "./room-action-handlers";
import {
  autoPrepareBot,
  autoPlayBots,
} from "./bot-handler";

const roomStoreKey = "__midgeoraeRooms" as const;
const globalRoomStore = globalThis as typeof globalThis &
  Record<typeof roomStoreKey, Map<string, Room> | undefined>;
export const rooms =
  globalRoomStore[roomStoreKey] ??
  (globalRoomStore[roomStoreKey] = new Map<string, Room>());

function now() {
  return Date.now();
}

function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

function normalizeName(name: string, fallbackName: string) {
  const trimmed = name.trim();
  return (trimmed || fallbackName).slice(0, 16);
}

function createPlayer(
  name: string,
  isHost: boolean,
  fallbackName: string,
  isBot = false,
): ServerPlayer {
  return {
    id: randomUUID(),
    name: normalizeName(name, fallbackName),
    token: randomUUID(),
    isHost,
    isBot,
    money: LOBBY_MONEY,
    reputationTokens: STARTING_REPUTATION,
    manner: STARTING_MANNER_TEMP,
    likes: 0,
    dislikes: 0,
    position: 0,
    hand: [],
    dealCards: { cool: true, cancel: true },
    connectedAt: now(),
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

function findRoom(code: string): Room {
  const room = rooms.get(normalizeCode(code));
  if (!room) throw new Error("방을 찾을 수 없습니다.");
  return room;
}

function findPlayer(room: Room, token: string): ServerPlayer {
  const player = room.players.find((candidate) => candidate.token === token);
  if (!player) throw new Error("플레이어 인증에 실패했습니다.");
  return player;
}

function addBot(room: Room, actor: ServerPlayer) {
  if (!actor.isHost) throw new Error("호스트만 봇을 추가할 수 있습니다.");
  if (room.mode !== "botTest") throw new Error("봇 테스트 방에서만 봇을 추가할 수 있습니다.");
  if (room.status !== "waiting") throw new Error("대기 중인 방에서만 봇을 추가할 수 있습니다.");
  if (room.players.length >= MAX_PLAYERS) throw new Error("방이 가득 찼습니다.");

  const botNumber = room.players.filter((player) => player.isBot).length + 1;
  const bot = createPlayer(`자동봇 ${botNumber}`, false, `자동봇 ${botNumber}`, true);
  
  const pool = loadGenePool();
  const unassigned = pool.filter((g) => !room.players.some((p) => p.genes?.id === g.id));
  const selectedGene = unassigned.length > 0
    ? unassigned[Math.floor(Math.random() * unassigned.length)]!
    : pool[Math.floor(Math.random() * pool.length)]!;
    
  bot.genes = { ...selectedGene };
  bot.suspectScores = {};

  room.players.push(bot);
  room.logs.push(`${bot.name}님이 테스트 봇으로 추가되었습니다.`);
}

export function createRoom(name: string, mode: RoomMode = "real"): RoomSessionResult {
  const player = createPlayer(name, true, "호스트");
  const code = makeRoomCode(new Set(rooms.keys()));
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
    actionDeck: [],
    discardPile: [],
    currentActionCard: null,
    pendingDeal: null,
    pendingReviews: [],
    reports: {},
    result: null,
    version: 1,
    createdAt: now(),
    updatedAt: now(),
  };

  rooms.set(code, room);

  return {
    room: toSnapshot(room, player),
    playerId: player.id,
    playerToken: player.token,
  };
}

export function joinRoom(code: string, name: string): RoomSessionResult {
  const room = findRoom(code);
  if (room.status !== "waiting") throw new Error("이미 시작된 방입니다.");
  if (room.players.length >= MAX_PLAYERS) throw new Error("방이 가득 찼습니다.");

  const player = createPlayer(name, false, `플레이어 ${room.players.length + 1}`);
  room.players.push(player);
  room.logs.push(`${player.name}님이 입장했습니다.`);
  touch(room);

  return {
    room: toSnapshot(room, player),
    playerId: player.id,
    playerToken: player.token,
  };
}

export function getRoomSnapshot(code: string, token: string): RoomSnapshot {
  const room = findRoom(code);
  const viewer = findPlayer(room, token);
  if (autoPlayBots(room)) touch(room);
  return toSnapshot(room, viewer);
}

export function submitRoomAction(
  code: string,
  token: string,
  action: RoomAction,
): RoomSnapshot {
  const room = findRoom(code);
  const actor = findPlayer(room, token);

  switch (action.type) {
    case "addBot":
      addBot(room, actor);
      break;
    case "startGame":
      startGame(room, actor);
      // 봇 플레이어의 사전 준비 즉시 처리
      room.players.forEach((player) => {
        if (player.isBot) {
          autoPrepareBot(room, player);
        }
      });
      break;
    case "drawActionCard":
      drawActionCard(room, actor);
      break;
    case "requestTrade":
      requestTrade(
        room,
        actor,
        action.ownerId,
        action.itemInstanceId,
        action.offerPrice,
      );
      break;
    case "chooseDealCard":
      chooseDealCard(room, actor, action.choice, action.scam);
      break;
    case "negoDeal":
      negoDeal(room, actor, action.price);
      break;
    case "reviewTrade":
      reviewTrade(room, actor, action.targetPlayerId, action.satisfied);
      break;
    case "terrorReview":
      terrorReview(room, actor, action.targetPlayerId);
      break;
    case "recycleBrick":
      recycleBrick(room, actor, action.itemInstanceId);
      break;
    case "swapRandomItem":
      swapRandomItem(room, actor, action.targetPlayerId);
      break;
    case "rollDice":
      assertPlaying(room);
      assertCurrentTurn(room, actor);
      throw new Error("이 버전에서는 주사위 대신 행동카드를 뽑습니다.");
    case "buyItem":
      throw new Error("이 버전에서는 시장 구매 대신 물건 카드 거래를 사용합니다.");
    case "sellItem":
      throw new Error("이 버전에서는 행동카드 거래를 사용합니다.");
    case "ratePlayer":
      throw new Error("거래 후 후기에서만 평판 토큰을 조정할 수 있습니다.");
    case "endTurn":
      assertPlaying(room);
      assertCurrentTurn(room, actor);
      room.currentActionCard = null;
      room.pendingDeal = null;
      nextTurn(room);
      break;
    case "startReporting":
      if (!actor.isHost) throw new Error("호스트만 최종 신고를 시작할 수 있습니다.");
      if (room.status !== "playing") throw new Error("최종 신고를 시작할 수 없는 상태입니다.");
      enterReporting(room, "호스트가 최종 신고를 시작했습니다.");
      break;
    case "reportSuspiciousPlayer":
      reportSuspiciousPlayer(room, actor, action.targetPlayerId);
      break;
    case "fixPreparation":
      fixPreparation(room, actor, action.itemsConfig);
      break;
    case "updateCustomCondition":
      updateCustomCondition(room, actor, action.itemInstanceId, action.customCondition);
      break;
    case "useInspectToken":
      useInspectToken(room, actor);
      break;
    case "useNegoToken":
      useNegoToken(room, actor);
      break;
  }

  touch(room);
  if (autoPlayBots(room)) touch(room);
  return toSnapshot(room, actor);
}

export function resetRoomsForTests() {
  rooms.clear();
}
