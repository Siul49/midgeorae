import { jsonError, jsonOk } from "@/features/game/api/http";
import { joinRoom } from "@/features/game/server/room-store";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ code: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { code } = await context.params;
    const body = (await request.json()) as { name?: string };
    return jsonOk(joinRoom(code, body.name ?? ""));
  } catch (error) {
    return jsonError(error);
  }
}
