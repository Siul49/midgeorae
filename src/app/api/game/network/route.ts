import { jsonError, jsonOk } from "@/features/game/api/http";
import { buildLanInviteUrls } from "@/features/game/server/network";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const roomCode = requestUrl.searchParams.get("room") ?? "";
    if (!roomCode.trim()) throw new Error("방 코드가 없습니다.");

    return jsonOk({
      inviteUrls: buildLanInviteUrls({
        port: requestUrl.port,
        roomCode,
      }),
    });
  } catch (error) {
    return jsonError(error);
  }
}
