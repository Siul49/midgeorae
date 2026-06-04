import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { BotGenes, ServerPlayer } from "./types/game-server-types";

const GENE_POOL_DIR = path.join(process.cwd(), "bot-data");
const GENE_POOL_FILE = path.join(GENE_POOL_DIR, "bot-genes.json");
const POOL_SIZE = 20;

function ensureDirExistsSync() {
  if (!fsSync.existsSync(GENE_POOL_DIR)) {
    fsSync.mkdirSync(GENE_POOL_DIR, { recursive: true });
  }
}

// 0.0 ~ 1.0 사이의 무작위 실수 반환
function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

// 범위 내로 값 클램프
function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// 무작위 초기 유전자 생성
function createRandomGene(generation = 1): BotGenes {
  return {
    id: randomUUID(),
    generation,
    fitness: 0,
    negoAcceptThreshold: randomFloat(0.8, 1.2),
    priceMarkupRatio: randomFloat(0.9, 1.3),
    negoPropensity: randomFloat(0.1, 0.9),
    deceitRatio: randomFloat(0.3, 1.0),
    suspicionRatio: randomFloat(0.2, 0.9),
    jobPriority: randomFloat(0.2, 0.9),
  };
}

let memoryPool: BotGenes[] | null = null;

// 유전자 풀 로드 (캐시 우선 리턴, 없으면 최초 1회만 동기 로드)
export function loadGenePool(): BotGenes[] {
  if (memoryPool) {
    return memoryPool;
  }

  ensureDirExistsSync();
  if (!fsSync.existsSync(GENE_POOL_FILE)) {
    // 풀이 없으면 새로 생성해서 저장
    const defaultPool = Array.from({ length: POOL_SIZE }, () => createRandomGene(1));
    saveGenePool(defaultPool);
    memoryPool = defaultPool;
    return defaultPool;
  }

  try {
    const data = fsSync.readFileSync(GENE_POOL_FILE, "utf-8");
    const parsed = JSON.parse(data) as BotGenes[];
    let pool = parsed;
    if (parsed.length < POOL_SIZE) {
      // 풀 크기가 모자라면 채움
      const gap = POOL_SIZE - parsed.length;
      const extra = Array.from({ length: gap }, () => createRandomGene(1));
      pool = [...parsed, ...extra];
      saveGenePool(pool);
    }
    memoryPool = pool;
    return pool;
  } catch (error) {
    console.error("유전자 풀 로딩 에러:", error);
    // 에러 발생 시 무작위 풀 반환
    const fallback = Array.from({ length: POOL_SIZE }, () => createRandomGene(1));
    memoryPool = fallback;
    return fallback;
  }
}

// 유전자 풀 저장 (메모리 풀 캐시 업데이트 + 비동기 백그라운드 파일 쓰기)
export function saveGenePool(pool: BotGenes[]) {
  memoryPool = pool;
  if (process.env.NODE_ENV === "test") {
    // 테스트 환경에서는 디스크에 직접 쓰지 않고 메모리 풀만 갱신하여 vitest 무한 watch 리로드 방지
    return;
  }

  // 비동기 쓰기를 백그라운드로 스케줄링 (Fire-and-forget)
  (async () => {
    try {
      if (!fsSync.existsSync(GENE_POOL_DIR)) {
        await fs.mkdir(GENE_POOL_DIR, { recursive: true });
      }
      await fs.writeFile(GENE_POOL_FILE, JSON.stringify(pool, null, 2), "utf-8");
    } catch (error) {
      console.error("비동기 유전자 풀 저장 에러:", error);
    }
  })();
}

// 피트니스 기반 선택 (룰렛 휠 선택)
function selectParent(pool: BotGenes[]): BotGenes {
  // 피트니스가 음수이거나 0일 수 있으므로 오프셋 설정
  const minFitness = Math.min(...pool.map((g) => g.fitness));
  const offset = minFitness < 0 ? -minFitness + 1 : 1;
  const fitnesses = pool.map((g) => g.fitness + offset);
  const totalFitness = fitnesses.reduce((acc, curr) => acc + curr, 0);

  let roll = Math.random() * totalFitness;
  for (let i = 0; i < pool.length; i++) {
    roll -= fitnesses[i]!;
    if (roll <= 0) {
      return pool[i]!;
    }
  }
  return pool[0]!;
}

// 교배 연산 (블렌딩 교배)
function crossover(parentA: BotGenes, parentB: BotGenes, nextGen: number): BotGenes {
  const alpha = 0.5; // 두 부모의 평균에 가중치
  
  const mix = (valA: number, valB: number) => {
    // alpha 가중치로 평균을 내되 약간의 다양성 추가
    const base = valA * alpha + valB * (1 - alpha);
    const range = Math.abs(valA - valB) * 0.1;
    return base + randomFloat(-range, range);
  };

  return {
    id: randomUUID(),
    generation: nextGen,
    fitness: 0,
    negoAcceptThreshold: clamp(mix(parentA.negoAcceptThreshold, parentB.negoAcceptThreshold), 0.7, 1.3),
    priceMarkupRatio: clamp(mix(parentA.priceMarkupRatio, parentB.priceMarkupRatio), 0.8, 1.4),
    negoPropensity: clamp(mix(parentA.negoPropensity, parentB.negoPropensity), 0.0, 1.0),
    deceitRatio: clamp(mix(parentA.deceitRatio, parentB.deceitRatio), 0.1, 1.0),
    suspicionRatio: clamp(mix(parentA.suspicionRatio, parentB.suspicionRatio), 0.1, 1.0),
    jobPriority: clamp(mix(parentA.jobPriority, parentB.jobPriority), 0.1, 1.0),
  };
}

// 돌연변이 연산 (10% 확률로 수치 미세 조절)
function mutate(gene: BotGenes, rate = 0.1): BotGenes {
  const mutated = { ...gene };
  const checkAndMutate = (val: number, min: number, max: number) => {
    if (Math.random() < rate) {
      // 현재 값의 ±15% 내외로 돌연변이
      const delta = randomFloat(-0.15, 0.15);
      return clamp(val + delta, min, max);
    }
    return val;
  };

  mutated.negoAcceptThreshold = checkAndMutate(mutated.negoAcceptThreshold, 0.7, 1.3);
  mutated.priceMarkupRatio = checkAndMutate(mutated.priceMarkupRatio, 0.8, 1.4);
  mutated.negoPropensity = checkAndMutate(mutated.negoPropensity, 0.0, 1.0);
  mutated.deceitRatio = checkAndMutate(mutated.deceitRatio, 0.1, 1.0);
  mutated.suspicionRatio = checkAndMutate(mutated.suspicionRatio, 0.1, 1.0);
  mutated.jobPriority = checkAndMutate(mutated.jobPriority, 0.1, 1.0);

  return mutated;
}

// 봇 플레이어의 피트니스 계산
export function calculateFitness(player: ServerPlayer, winningSide?: "citizens" | "villain"): number {
  const isWinner =
    (player.role === "villain" && winningSide === "villain") ||
    (player.role === "citizen" && winningSide === "citizens");

  // 피트니스 산식: 최종 획득 금액(70%) + 남은 평판(30% 상당) + 승리 보너스
  const moneyScore = player.money * 0.7;
  const reputationScore = player.reputationTokens * 100000;
  const winBonus = isWinner ? 500000 : 0;

  return moneyScore + reputationScore + winBonus;
}

// 게임이 끝난 후 유전자 풀 진화
export function evolveNewGeneration(finishedPlayers: ServerPlayer[], winningSide?: "citizens" | "villain") {
  const pool = loadGenePool();
  const botPlayers = finishedPlayers.filter((p) => p.isBot && p.genes);
  
  if (botPlayers.length === 0) return;

  // 1. 참여한 봇들의 피트니스를 업데이트하고 기존 풀의 해당 유전자와 병합
  for (const bot of botPlayers) {
    const fitness = calculateFitness(bot, winningSide);
    const existing = pool.find((g) => g.id === bot.genes?.id);
    if (existing) {
      // 기존 유전자 기록이 풀에 있으면 피트니스 누적 업데이트 (지수이동평균 등으로 누적 성적 계산)
      existing.fitness = existing.fitness * 0.5 + fitness * 0.5;
    } else if (bot.genes) {
      // 풀에 없는 유전자면 풀에 추가
      bot.genes.fitness = fitness;
      pool.push(bot.genes);
    }
  }

  // 2. 전체 풀을 피트니스 성적 기준 내림차순 정렬
  pool.sort((a, b) => b.fitness - a.fitness);

  // 현재 최고 세대 번호 확인
  const maxGen = Math.max(...pool.map((g) => g.generation));
  const nextGen = maxGen + 1;

  // 3. 엘리트주의(Elitist): 상위 30%는 다음 세대로 무조건 보존
  const eliteCount = Math.floor(POOL_SIZE * 0.3);
  const nextPool: BotGenes[] = [];

  for (let i = 0; i < eliteCount; i++) {
    if (pool[i]) {
      nextPool.push({
        ...pool[i]!,
        fitness: pool[i]!.fitness, // 기존 성적 일부 유지
      });
    }
  }

  // 4. 나머지 슬롯은 선택, 교배, 돌연변이로 채움
  while (nextPool.length < POOL_SIZE) {
    const parentA = selectParent(pool);
    const parentB = selectParent(pool);
    
    let child = crossover(parentA, parentB, nextGen);
    child = mutate(child, 0.15); // 15% 돌연변이율 적용
    
    nextPool.push(child);
  }

  // 5. 새 유전자 풀 저장
  saveGenePool(nextPool);
}
