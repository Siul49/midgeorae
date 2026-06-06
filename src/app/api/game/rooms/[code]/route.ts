import { jsonError, jsonOk } from "@/features/game/api/http";
import { getRoomSnapshot } from "@/features/game/server/room-store";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ code: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { code } = await context.params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token") ?? "";
    return jsonOk(await getRoomSnapshot(code, token));
  } catch (error) {
    return jsonError(error, 404);
  }
}
