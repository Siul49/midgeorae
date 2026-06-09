import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { LOBBY_MONEY, STARTING_REPUTATION, STARTING_MANNER } from "../../rules/game-rules";
import type { Room, ServerPlayer } from "../types";

const roomStoreKey = "__midgeoraeRooms" as const;
const globalRoomStore = globalThis as typeof globalThis &
  Record<typeof roomStoreKey, Map<string, Room> | undefined>;

export const rooms =
  globalRoomStore[roomStoreKey] ??
  (globalRoomStore[roomStoreKey] = new Map<string, Room>());

export function now() {
  return Date.now();
}

export function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

export function normalizeName(name: string, fallbackName: string) {
  const trimmed = name.trim();
  return (trimmed || fallbackName).slice(0, 16);
}

export function formatWon(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

export function createPlayer(
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
    likes: 0,
    dislikes: 0,
    position: 0,
    hand: [],
    dealCards: { cool: true, cancel: true },
    connectedAt: now(),
  };
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const isUrlValid = supabaseUrl.startsWith("http://") || supabaseUrl.startsWith("https://");
export const supabase = (supabaseUrl && supabaseAnonKey && isUrlValid)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export async function findRoom(code: string): Promise<Room> {
  const normalized = normalizeCode(code);
  if (!supabase) {
    const room = rooms.get(normalized);
    if (!room) throw new Error("방을 찾을 수 없습니다.");
    return room;
  }
  const { data, error } = await supabase
    .from("game_rooms")
    .select("room_data")
    .eq("code", normalized)
    .single();

  if (error || !data) {
    throw new Error("방을 찾을 수 없습니다.");
  }
  return data.room_data as Room;
}

export async function saveRoom(room: Room) {
  if (!supabase) {
    rooms.set(room.code, room);
    return;
  }
  const { error } = await supabase
    .from("game_rooms")
    .upsert({
      code: room.code,
      room_data: room,
      updated_at: new Date().toISOString(),
    });
  if (error) {
    console.error("Failed to save room to Supabase:", error);
    throw new Error("방 정보를 저장하는 중 오류가 발생했습니다.");
  }
}

export async function mutateRoomWithRetry<T>(
  code: string,
  mutateFn: (room: Room) => T | Promise<T>
): Promise<{ room: Room; result: T }> {
  if (!supabase) {
    const room = rooms.get(normalizeCode(code));
    if (!room) throw new Error("방을 찾을 수 없습니다.");
    const beforeStr = JSON.stringify(room);
    const result = await mutateFn(room);
    const afterStr = JSON.stringify(room);
    if (beforeStr !== afterStr) {
      room.version += 1;
      room.updatedAt = now();
      const humanPlayers = room.players.filter((p) => !p.isBot);
      if (humanPlayers.length === 0) {
        rooms.delete(room.code);
      } else {
        rooms.set(room.code, room);
      }
    }
    return { room, result };
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const normalized = normalizeCode(code);
    const { data, error } = await supabase
      .from("game_rooms")
      .select("room_data")
      .eq("code", normalized)
      .single();

    if (error || !data) {
      throw new Error("방을 찾을 수 없습니다.");
    }
    const room = data.room_data as Room;
    const currentVersion = room.version;

    const beforeStr = JSON.stringify(room);
    const result = await mutateFn(room);
    const afterStr = JSON.stringify(room);

    if (beforeStr === afterStr) {
      return { room, result };
    }

    room.version = currentVersion + 1;
    room.updatedAt = now();

    const humanPlayers = room.players.filter((p) => !p.isBot);
    if (humanPlayers.length === 0) {
      const { error: deleteError } = await supabase
        .from("game_rooms")
        .delete()
        .eq("code", room.code);
      if (!deleteError) {
        rooms.delete(room.code);
        return { room, result };
      }
    } else {
      const { data: updatedData, error: updateError } = await supabase
        .from("game_rooms")
        .update({
          room_data: room,
          updated_at: new Date().toISOString(),
        })
        .eq("code", room.code)
        .eq("room_data->>version", currentVersion.toString())
        .select();

      if (!updateError && updatedData && updatedData.length > 0) {
        return { room, result };
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 50 + Math.random() * 100));
  }

  throw new Error("서버 혼잡으로 인해 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.");
}

export async function generateUniqueRoomCode(): Promise<string> {
  const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 100; attempt += 1) {
    let code = "";
    for (let index = 0; index < 4; index += 1) {
      code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }
    if (!supabase) {
      if (!rooms.has(code)) return code;
      continue;
    }
    const { data } = await supabase
      .from("game_rooms")
      .select("code")
      .eq("code", code)
      .maybeSingle();
    if (!data) {
      return code;
    }
  }
  throw new Error("사용 가능한 방 코드를 만들 수 없습니다.");
}

export function findPlayer(room: Room, token: string): ServerPlayer {
  const player = room.players.find((candidate) => candidate.token === token);
  if (!player) throw new Error("플레이어 인증에 실패했습니다.");
  return player;
}

export function findPlayerById(room: Room, playerId: string): ServerPlayer {
  const player = room.players.find((candidate) => candidate.id === playerId);
  if (!player) throw new Error("플레이어를 찾을 수 없습니다.");
  return player;
}

export function touch(room: Room) {
  room.version += 1;
  room.updatedAt = now();
}
