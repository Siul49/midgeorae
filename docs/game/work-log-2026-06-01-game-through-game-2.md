# GAME-9, GAME-1, GAME-2 작업 및 결정 기록

작성일: 2026-06-01

이 문서는 GAME-0A, GAME-0B, GAME-0C, GAME-6 이후 이어진 `/game` 온라인 게임 작업을 추적한다. 이전 기록은 `docs/game/work-log-2026-06-01-game-0a-0b-0c-game-6.md`를 기준으로 본다.

## 현재 기준 상태

- 대상 저장소: `Siul49/midgeorae`
- 기본 브랜치: `master`
- GAME-2 작업 시작 기준 커밋: `acdde6d feat(game): reveal normal deal item info after delivery`
- 작업 브랜치: `feat/game-2-market-clock`
- 이슈 상태 확인 기준:
  - #1 GAME-0A부터 #6 GAME-1까지 `CLOSED`
  - #7 GAME-2부터 #12 GAME-4까지 `OPEN`

## 병합된 선행 작업

| 이슈 | 커밋 | 핵심 변경 |
| --- | --- | --- |
| #5 GAME-9 | `17dd29a` | 판매자 중심 거래를 구매자 주도 `requestTrade` 흐름으로 바꾸고, 거래 상태를 `requesterId` / `ownerId` 기준으로 정리했다. |
| #6 GAME-1 | `acdde6d` | 일반 거래 중에는 물건명, 카테고리, 시세만 공개하고, 상태와 벽돌 여부 같은 숨은 위험은 거래 후 일정 턴이 지나야 공개되게 했다. |

## GAME-2 진행 전 결정

처음 로드맵에는 "최종 투표"라는 표현이 있었지만, 중고거래 게임의 맥락에서는 마피아식 투표보다 "최종 신고"와 "분쟁 심사"가 더 자연스럽다. 그래서 GAME-2부터 다음 용어를 기준으로 삼는다.

- 사용자-facing 용어: 최종 신고, 분쟁 심사
- 내부 상태명: `reporting`
- 사용자 액션명: `reportSuspiciousPlayer`
- 집계 데이터: `reports`

이번 이슈의 범위는 시장 진행도와 신고 단계 진입까지다. 빌런 미션 완료, 증거 보너스, 직업 보너스는 GAME-7, GAME-8에서 다룬다.

## GAME-2 구현 기준

- `maxRounds` / `round` 대신 `marketActionLimit` / `usedActionCount`를 사용한다.
- 1차 밸런스 값은 `playerCount * 5` 행동이다.
- 행동 카드를 뽑는 것만으로는 진행도가 올라가지 않는다.
- 거래, 액션 처리, 턴 넘김처럼 한 턴 행동이 소비될 때 진행도를 올린다.
- `usedActionCount`가 `marketActionLimit`에 도달하면 `reporting` 상태로 전환한다.
- 모든 플레이어가 한 번씩 신고하면 결과를 계산한다.

## 검증 기준

GAME-2 작업은 다음 테스트로 고정한다.

- `countReports`와 `calculateReportResult`가 신고 집계와 결과를 계산한다.
- 게임 시작 시 인원 수에 따라 `marketActionLimit`이 설정된다.
- 행동 카드 뽑기만으로는 `usedActionCount`가 증가하지 않는다.
- 턴 행동이 소비되면 `usedActionCount`가 증가한다.
- 시장 행동 예산을 모두 쓰면 `reporting`으로 진입한다.
- 모든 플레이어가 신고하면 게임이 `finished`가 되고 `result.reports`가 채워진다.

## 작업 중 검증 기록

2026-06-01 `feat/game-2-market-clock` 브랜치에서 다음을 확인했다.

- `pnpm test`: 9개 테스트 파일, 47개 테스트 통과
- `pnpm lint`: 에러 0개, 기존 `src/features/calendar/lib/google.ts`의 `GoogleEvent` 미사용 경고 1개
- `pnpm build`: Next.js 프로덕션 빌드와 TypeScript 통과, 기존 `middleware` deprecation 경고 1개
- GitHub #7 본문: `??` 쌍 0개, replacement character 0개
- 로컬 `/game`: 이미 떠 있던 dev server `http://localhost:3004/game`에서 HTTP 200 확인

## 남은 판단

- 최종 신고에서 증거 토큰이 실제 가중치로 작동할지는 GAME-7에서 결정한다.
- 결과 화면에서 신고 집계, 팀 승패, 개인 점수를 어떻게 나눠 보여줄지는 GAME-8에서 결정한다.
- 기존 클라이언트 리듀서형 초안(`src/features/game/engine`, `components`)에는 라운드/투표 용어가 남아 있다. 현재 `/game` 라우트는 온라인 서버형 `MidgeoraeOnlineGame`을 사용하므로, 이 초안은 후속 정리 이슈에서 제거하거나 용어를 맞춘다.
