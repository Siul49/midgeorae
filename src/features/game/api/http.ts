import { NextResponse } from "next/server";

export function jsonOk<T>(data: T) {
  return NextResponse.json(data);
}

export function jsonError(error: unknown, status = 400) {
  const message =
    error instanceof Error ? error.message : "요청을 처리할 수 없습니다.";

  return NextResponse.json({ error: message }, { status });
}
