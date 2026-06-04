import { jsonError, jsonOk } from "@/features/game/api/http";
import { createRoom } from "@/features/game/server/room-store";
import type { RoomMode } from "@/features/game/server/types/game-server-types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: string; mode?: RoomMode };
    const mode: RoomMode = body.mode === "botTest" ? "botTest" : "real";
    return jsonOk(createRoom(body.name ?? "", mode));
  } catch (error) {
    return jsonError(error);
  }
}
