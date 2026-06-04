import { jsonError, jsonOk } from "@/features/game/api/http";
import { submitRoomAction } from "@/features/game/server/room-store";
import type { RoomAction } from "@/features/game/server/types/game-server-types";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ code: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { code } = await context.params;
    const body = (await request.json()) as {
      token?: string;
      action?: RoomAction;
    };

    if (!body.action) throw new Error("액션이 없습니다.");

    return jsonOk(submitRoomAction(code, body.token ?? "", body.action));
  } catch (error) {
    return jsonError(error);
  }
}
