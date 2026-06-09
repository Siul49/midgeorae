"use client";

import React from "react";
import { Play, Users } from "lucide-react";
import { ErrorNotice } from "./OnlineHelpers";

interface OnlineLobbyProps {
  name: string;
  setName: (name: string) => void;
  joinCode: string;
  setJoinCode: (code: string) => void;
  createGameRoom: (mode: "real" | "botTest") => void;
  joinGameRoom: () => void;
  loading: boolean;
  error: string;
}

export function OnlineLobby({
  name,
  setName,
  joinCode,
  setJoinCode,
  createGameRoom,
  joinGameRoom,
  loading,
  error,
}: OnlineLobbyProps) {
  return (
    <main className="game-shell min-h-screen text-stone-950">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-5 py-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_420px] lg:items-center">
          <div>
            <div className="token-pop mb-6 inline-flex h-14 w-14 items-center justify-center rounded-lg bg-orange-600 text-3xl font-black text-white shadow-sm">
              믿
            </div>
            <h1 className="max-w-2xl text-5xl font-black leading-tight tracking-normal text-stone-950 sm:text-6xl">
              믿거래
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-8 text-stone-700">
              테이블에 깔린 물건 카드와 거래 제안을 보며 평판을 관리하고,
              숨어 있는 빌런을 찾아내는 중고거래 추론 게임입니다.
            </p>
            <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
              {["카드 테이블", "거래 제안", "평판 추리"].map((label, index) => (
                <div
                  key={label}
                  className="status-tile border border-stone-300 bg-white/70 px-4 py-3"
                >
                  <div className="text-sm font-black text-orange-700">
                    0{index + 1}
                  </div>
                  <div className="mt-1 text-sm font-bold text-stone-800">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="motion-panel market-card-table p-5">
            <div className="relative">
              <label className="text-sm font-bold text-stone-700">
                플레이어 이름
              </label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="예: 경수"
                className="mt-2 w-full border border-stone-300 px-4 py-3 text-base font-semibold outline-none focus:border-orange-600"
              />

              <div className="mt-4 grid gap-2">
                <button
                  onClick={() => createGameRoom("botTest")}
                  disabled={loading}
                  className="motion-button flex w-full items-center justify-center gap-2 bg-orange-600 px-4 py-3 text-base font-black text-white hover:bg-orange-700 disabled:opacity-50"
                >
                  <Play size={18} />
                  봇 테스트로 시작
                </button>
                <button
                  onClick={() => createGameRoom("real")}
                  disabled={loading}
                  className="motion-button flex w-full items-center justify-center gap-2 border border-stone-900 px-4 py-3 text-base font-black text-stone-950 hover:bg-stone-950 hover:text-white disabled:opacity-50"
                >
                  <Users size={18} />
                  실제 플레이 방 만들기
                </button>
              </div>

              <div className="my-5 h-px bg-stone-200" />

              <label className="text-sm font-bold text-stone-700">방 코드</label>
              <input
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                placeholder="ABCD"
                className="mt-2 w-full border border-stone-300 px-4 py-3 text-center text-2xl font-black uppercase tracking-[0.25em] outline-none focus:border-orange-600"
                maxLength={4}
              />
              <button
                onClick={joinGameRoom}
                disabled={loading}
                className="motion-button mt-4 flex w-full items-center justify-center gap-2 border border-stone-900 px-4 py-3 text-base font-black text-stone-950 hover:bg-stone-950 hover:text-white disabled:opacity-50"
              >
                <Users size={18} />
                방 입장
              </button>

              {error && <ErrorNotice message={error} />}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
