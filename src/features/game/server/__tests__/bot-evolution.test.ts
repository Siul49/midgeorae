import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  loadGenePool,
  saveGenePool,
  calculateFitness,
  evolveNewGeneration,
} from "../bot-evolution";
import type { ServerPlayer } from "../types";

const GENE_POOL_DIR = path.join(process.cwd(), "src", "features", "game", "server", "data");
const GENE_POOL_FILE = path.join(GENE_POOL_DIR, "bot-genes.json");

describe("Bot Evolution (Genetic Algorithm) Tests", () => {
  let originalFileContent: string | null = null;

  beforeEach(() => {
    // 기존 유전자 백업
    if (fs.existsSync(GENE_POOL_FILE)) {
      originalFileContent = fs.readFileSync(GENE_POOL_FILE, "utf-8");
    }
  });

  afterEach(() => {
    // 기존 유전자 복구
    if (originalFileContent !== null) {
      fs.writeFileSync(GENE_POOL_FILE, originalFileContent, "utf-8");
    } else if (fs.existsSync(GENE_POOL_FILE)) {
      fs.unlinkSync(GENE_POOL_FILE);
    }
  });

  it("loads and saves the gene pool correctly", () => {
    // 1. 로딩 검증 (파일이 없으면 defaultPool 생성)
    if (fs.existsSync(GENE_POOL_FILE)) {
      fs.unlinkSync(GENE_POOL_FILE);
    }
    const pool = loadGenePool();
    expect(pool).toHaveLength(20);
    expect(pool[0]).toHaveProperty("negoAcceptThreshold");
    expect(pool[0]).toHaveProperty("deceitRatio");

    // 2. 저장 검증
    pool[0]!.negoAcceptThreshold = 1.15;
    saveGenePool(pool);

    const reloaded = loadGenePool();
    expect(reloaded[0]!.negoAcceptThreshold).toBeCloseTo(1.15);
  });

  it("calculates fitness based on money and reputation", () => {
    const mockPlayer: Partial<ServerPlayer> = {
      role: "citizen",
      money: 1200000,
      reputationTokens: 4,
    };

    // 피트니스 점수: 1,200,000 * 0.7 + 4 * 100,000 + 500,000 (승리 보너스) = 840,000 + 400,000 + 500,000 = 1,740,000
    const fitness = calculateFitness(mockPlayer as ServerPlayer, "citizens");
    expect(fitness).toBe(1740000);

    // 빌런 승리 보너스 검증
    const villainPlayer: Partial<ServerPlayer> = {
      role: "villain",
      money: 1000000,
      reputationTokens: 3,
    };

    // 피트니스 점수: 1,000,000 * 0.7 + 3 * 100,000 + 500,000 (승리 보너스) = 700,000 + 300,000 + 500,000 = 1,500,000
    const villainFitness = calculateFitness(villainPlayer as ServerPlayer, "villain");
    expect(villainFitness).toBe(1500000);
  });

  it("evolves the gene pool on new generation", () => {
    // 임의의 유전자 풀 준비
    const initialPool = loadGenePool();
    
    // 테스트용 봇 플레이어 세트
    const finishedBots: Partial<ServerPlayer>[] = [
      {
        id: "bot-1",
        name: "자동봇 1",
        isBot: true,
        role: "citizen",
        money: 1500000,
        reputationTokens: 5,
        genes: initialPool[0],
      },
      {
        id: "bot-2",
        name: "자동봇 2",
        isBot: true,
        role: "villain",
        money: 800000,
        reputationTokens: 2,
        genes: initialPool[1],
      },
    ];

    // 진화 시뮬레이션
    evolveNewGeneration(finishedBots as ServerPlayer[], "citizens");

    // 진화된 풀 로딩
    const evolvedPool = loadGenePool();
    expect(evolvedPool).toHaveLength(20);

    // 세대가 증가한 유전자가 존재하는지 확인 (돌연변이와 교배로 새롭게 태어난 자식의 generation은 maxGen + 1)
    const hasNextGen = evolvedPool.some((g) => g.generation > 1);
    expect(hasNextGen).toBe(true);
  });
});
