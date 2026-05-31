# 믿거래 Server Multiplayer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an internet-accessible 4-player `믿거래` web game that runs from the host laptop through Cloudflare Tunnel.

**Architecture:** Keep the first multiplayer version intentionally small: an in-memory room store runs inside the Next.js Node server, API routes mutate room state through a focused server engine, and the browser polls the room snapshot every second. Client responses are filtered by player token so private role and mission data only appear on the owning device.

**Tech Stack:** Next.js App Router, TypeScript, React client components, Tailwind CSS, Vitest for server logic tests, Cloudflare Tunnel as an external runtime step.

---

## File Structure

- Create `src/features/game/server/types.ts`: multiplayer room, player, action, and snapshot types.
- Create `src/features/game/server/room-code.ts`: deterministic room-code generator helper with collision protection.
- Create `src/features/game/server/room-store.ts`: in-memory room creation, join, action submission, snapshot filtering.
- Create `src/features/game/server/__tests__/room-store.test.ts`: Vitest coverage for room lifecycle, private role filtering, action authorization, and voting results.
- Create `src/features/game/api/http.ts`: small HTTP helpers for route handlers.
- Create `src/app/api/game/rooms/route.ts`: `POST` room creation endpoint.
- Create `src/app/api/game/rooms/[code]/join/route.ts`: `POST` room join endpoint.
- Create `src/app/api/game/rooms/[code]/route.ts`: `GET` filtered room snapshot endpoint.
- Create `src/app/api/game/rooms/[code]/actions/route.ts`: `POST` game action endpoint.
- Create `src/features/game/online/MidgeoraeOnlineGame.tsx`: client-side lobby, room, and play UI with polling.
- Modify `src/app/game/page.tsx`: render the online game entry instead of the single-device reducer.
- Modify `src/app/page.tsx` and `src/app/layout.tsx`: clean title/copy for `믿거래`.
- Modify `package.json`: add `test` script and Vitest dev dependency.
- Modify or replace broken legacy `src/features/game` files only if TypeScript build still includes invalid source.

## Task 1: Add Test Harness

**Files:**
- Modify: `package.json`
- Create: `src/features/game/server/__tests__/room-store.test.ts`

- [ ] **Step 1: Add the failing room lifecycle tests**

```ts
import { beforeEach, describe, expect, it } from "vitest";
import {
  createRoom,
  getRoomSnapshot,
  joinRoom,
  resetRoomsForTests,
  submitRoomAction,
} from "../room-store";

describe("room-store", () => {
  beforeEach(() => resetRoomsForTests());

  it("creates a room and lets exactly four players join", () => {
    const host = createRoom("경수");
    expect(host.room.code).toMatch(/^[A-Z0-9]{4}$/);
    expect(host.room.players).toHaveLength(1);

    joinRoom(host.room.code, "유현");
    joinRoom(host.room.code, "윤식");
    joinRoom(host.room.code, "환희");

    expect(() => joinRoom(host.room.code, "초과")).toThrow("방이 가득 찼습니다.");
  });

  it("filters villain role and mission to the owning player only", () => {
    const host = createRoom("경수");
    const p2 = joinRoom(host.room.code, "유현");
    joinRoom(host.room.code, "윤식");
    joinRoom(host.room.code, "환희");

    submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });

    const hostView = getRoomSnapshot(host.room.code, host.playerToken);
    const p2View = getRoomSnapshot(host.room.code, p2.playerToken);

    expect(hostView.me?.role).toMatch(/citizen|villain/);
    expect(p2View.me?.role).toMatch(/citizen|villain/);
    expect(hostView.players.every((player) => player.role === undefined)).toBe(true);
    expect(p2View.players.every((player) => player.role === undefined)).toBe(true);
  });

  it("rejects actions from players who are not allowed to act", () => {
    const host = createRoom("경수");
    const p2 = joinRoom(host.room.code, "유현");
    joinRoom(host.room.code, "윤식");
    joinRoom(host.room.code, "환희");
    submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });

    expect(() =>
      submitRoomAction(host.room.code, p2.playerToken, { type: "rollDice" })
    ).toThrow("현재 턴 플레이어만 할 수 있습니다.");
  });

  it("finishes the game after four villain votes", () => {
    const host = createRoom("경수");
    const p2 = joinRoom(host.room.code, "유현");
    const p3 = joinRoom(host.room.code, "윤식");
    const p4 = joinRoom(host.room.code, "환희");
    submitRoomAction(host.room.code, host.playerToken, { type: "startGame" });

    const started = getRoomSnapshot(host.room.code, host.playerToken);
    const target = started.players.find((player) => player.id !== host.playerId);
    expect(target).toBeDefined();

    for (const token of [host.playerToken, p2.playerToken, p3.playerToken, p4.playerToken]) {
      submitRoomAction(host.room.code, token, { type: "voteVillain", targetPlayerId: target!.id });
    }

    const finished = getRoomSnapshot(host.room.code, host.playerToken);
    expect(finished.status).toBe("finished");
    expect(finished.result).toBeDefined();
  });
});
```

- [ ] **Step 2: Add Vitest script**

Update `package.json` scripts:

```json
"test": "vitest run"
```

Add dev dependency:

```json
"vitest": "^3.2.4"
```

- [ ] **Step 3: Run tests to verify RED**

Run: `pnpm test -- src/features/game/server/__tests__/room-store.test.ts`

Expected: FAIL because `../room-store` does not exist.

## Task 2: Implement Multiplayer Room Store

**Files:**
- Create: `src/features/game/server/types.ts`
- Create: `src/features/game/server/room-code.ts`
- Create: `src/features/game/server/room-store.ts`
- Test: `src/features/game/server/__tests__/room-store.test.ts`

- [ ] **Step 1: Create server types**

```ts
export type RoomStatus = "waiting" | "playing" | "voting" | "finished";
export type PlayerRole = "citizen" | "villain";

export interface ServerPlayer {
  id: string;
  name: string;
  token: string;
  isHost: boolean;
  role?: PlayerRole;
  mission?: string;
  money: number;
  manner: number;
  likes: number;
  dislikes: number;
  position: number;
  items: string[];
  connectedAt: number;
}

export interface PublicPlayer {
  id: string;
  name: string;
  isHost: boolean;
  money: number;
  manner: number;
  likes: number;
  dislikes: number;
  position: number;
  itemCount: number;
  role?: never;
  mission?: never;
}

export interface RoomResult {
  villainId: string;
  villainCaught: boolean;
  winnerId: string;
  votes: Record<string, number>;
}

export interface Room {
  code: string;
  status: RoomStatus;
  hostPlayerId: string;
  players: ServerPlayer[];
  currentTurnPlayerId: string | null;
  round: number;
  maxRounds: number;
  logs: string[];
  votes: Record<string, string>;
  result: RoomResult | null;
  version: number;
  createdAt: number;
  updatedAt: number;
}

export interface PlayerSnapshot {
  id: string;
  name: string;
  isHost: boolean;
  role?: PlayerRole;
  mission?: string;
}

export interface RoomSnapshot {
  code: string;
  status: RoomStatus;
  players: PublicPlayer[];
  me: PlayerSnapshot | null;
  currentTurnPlayerId: string | null;
  round: number;
  maxRounds: number;
  logs: string[];
  votesCast: number;
  result: RoomResult | null;
  version: number;
}

export type RoomAction =
  | { type: "startGame" }
  | { type: "rollDice" }
  | { type: "buyItem"; itemName: string; price: number }
  | { type: "sellItem"; itemName: string; targetPlayerId: string; price: number }
  | { type: "ratePlayer"; targetPlayerId: string; rating: "like" | "dislike" }
  | { type: "endTurn" }
  | { type: "startVoting" }
  | { type: "voteVillain"; targetPlayerId: string };
```

- [ ] **Step 2: Implement room code helper**

```ts
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeRoomCode(existingCodes: Set<string>, random = Math.random): string {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    let code = "";
    for (let index = 0; index < 4; index += 1) {
      code += ALPHABET[Math.floor(random() * ALPHABET.length)];
    }
    if (!existingCodes.has(code)) return code;
  }
  throw new Error("사용 가능한 방 코드를 만들 수 없습니다.");
}
```

- [ ] **Step 3: Implement minimal room store**

Implement `createRoom`, `joinRoom`, `getRoomSnapshot`, `submitRoomAction`, and `resetRoomsForTests`. The implementation must validate capacity, host-only start, current-turn actions, private role filtering, and final voting.

- [ ] **Step 4: Run tests to verify GREEN**

Run: `pnpm test -- src/features/game/server/__tests__/room-store.test.ts`

Expected: PASS.

## Task 3: Add API Routes

**Files:**
- Create: `src/features/game/api/http.ts`
- Create: `src/app/api/game/rooms/route.ts`
- Create: `src/app/api/game/rooms/[code]/join/route.ts`
- Create: `src/app/api/game/rooms/[code]/route.ts`
- Create: `src/app/api/game/rooms/[code]/actions/route.ts`

- [ ] **Step 1: Add route helper**

```ts
import { NextResponse } from "next/server";

export function jsonOk<T>(data: T) {
  return NextResponse.json(data);
}

export function jsonError(error: unknown, status = 400) {
  const message = error instanceof Error ? error.message : "요청을 처리할 수 없습니다.";
  return NextResponse.json({ error: message }, { status });
}
```

- [ ] **Step 2: Add room creation route**

`POST /api/game/rooms` reads `{ name }`, calls `createRoom`, and returns `{ room, playerId, playerToken }`.

- [ ] **Step 3: Add join route**

`POST /api/game/rooms/[code]/join` reads `{ name }`, calls `joinRoom`, and returns `{ room, playerId, playerToken }`.

- [ ] **Step 4: Add snapshot route**

`GET /api/game/rooms/[code]?token=...` calls `getRoomSnapshot` and returns filtered state.

- [ ] **Step 5: Add action route**

`POST /api/game/rooms/[code]/actions` reads `{ token, action }`, calls `submitRoomAction`, and returns filtered state.

## Task 4: Build Online Game UI

**Files:**
- Create: `src/features/game/online/MidgeoraeOnlineGame.tsx`
- Modify: `src/app/game/page.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create client component with lobby modes**

The component manages `name`, `joinCode`, `session`, `snapshot`, `error`, and `loading` state. It supports room creation, joining, polling, and action submission through the API routes.

- [ ] **Step 2: Render waiting room**

Show room code, player list, current public URL, and host-only start button. Disable start until exactly four players have joined.

- [ ] **Step 3: Render playing room**

Show current round, turn owner, player public stats, private role panel, logs, and action buttons. Only current turn player can roll, buy/sell, rate, or end turn.

- [ ] **Step 4: Render voting and result states**

Allow each player to vote once. Show final villain reveal and winner after all four votes.

- [ ] **Step 5: Replace `/game` entry**

Update `src/app/game/page.tsx` to render `MidgeoraeOnlineGame`.

## Task 5: Verify and Tunnel Runbook

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add Cloudflare Tunnel run instructions**

Document:

```powershell
pnpm dev --hostname 0.0.0.0
cloudflared tunnel --url http://localhost:3000
```

- [ ] **Step 2: Run checks**

Run:

```powershell
pnpm test
pnpm lint
pnpm build
```

Expected: all pass.

- [ ] **Step 3: Browser verification**

Open four browser sessions to `/game`, create one room, join with three players, start, perform a turn, vote, and confirm the result page appears.

## Self-Review

- Spec coverage: room creation, four-player join, host laptop server, Cloudflare Tunnel, private roles, turn actions, voting, and no persistent storage are covered.
- Placeholder scan: no `TBD`, `TODO`, or unspecified "handle later" steps remain.
- Type consistency: `RoomAction`, `RoomSnapshot`, `ServerPlayer`, route names, and client action names are aligned across tasks.
