# GAME-0A, GAME-0B, GAME-0C, GAME-6 작업 및 통합 기록

작성일: 2026-06-01  
대상 브랜치: `master`  
대상 이슈:

- [#1 GAME-0A] 게임 영역 경계와 폴더 구조 정리
- [#2 GAME-0B] 게임 규칙과 서버 액션 처리 책임 분리
- [#3 GAME-0C] 생성물, 로그, 문서 위치와 추적 정책 정리
- [#4 GAME-6] 물품, 카테고리, 상태 데이터 확장

## 현재 통합 상태

`master`에는 #1, #2, #3, #4의 기반 작업이 반영되어 있다. #4는 원래 게임 구현 베이스가 Git에 고정되어 있지 않은 상태였기 때문에, 리뷰 가능한 기록을 위해 다음처럼 분리했다.

| 커밋 | 내용 |
| --- | --- |
| `3bcfee1` | 플레이 가능한 믿거래 온라인 게임 베이스를 Git에 고정 |
| `56519c5` | GAME-6 물품 데이터 확장 구현 |
| `001eb30` | GAME-6 브랜치 병합 |
| `6207dc4` | GAME-0C 생성물/로그 추적 정책 문서화 |

## GAME-0A: 영역 경계와 폴더 구조

영역 경계는 `docs/game/architecture.md`에 문서화했다.

정리된 기준:

- `src/features/game/rules`: 정적 규칙과 밸런스 값
- `src/features/game/domain`: 순수 판정 로직
- `src/features/game/server`: 방 상태, 액션 라우팅, 스냅샷 생성
- `src/features/game/online`: 온라인 게임 화면
- `public/game-cards`: 앱에서 직접 참조하는 카드 이미지
- `docs/game`: 룰, 로드맵, 작업 기준 문서

이번 단계에서는 대규모 파일 이동보다 이후 작업자가 어느 영역을 건드릴지 판단할 수 있게 하는 데 집중했다.

## GAME-0B: 규칙과 서버 액션 책임 분리

서버 저장소에 몰려 있던 계산 책임 일부를 `rules`와 `domain`으로 분리했다.

반영된 파일:

- `src/features/game/rules/game-rules.ts`
- `src/features/game/domain/trade.ts`
- `src/features/game/domain/reputation.ts`
- `src/features/game/domain/results.ts`
- `src/features/game/domain/__tests__/trade.test.ts`
- `src/features/game/domain/__tests__/reputation.test.ts`
- `src/features/game/domain/__tests__/results.test.ts`

현재 `room-store.ts`는 여전히 방 상태와 액션 처리를 많이 담당하지만, 거래 정산, 후기/평판 계산, 결과 계산은 독립 함수와 테스트로 일부 분리되어 있다. 이후 이슈에서는 이 방향을 유지해 `room-store.ts`를 더 얇게 만드는 것이 좋다.

## GAME-0C: 생성물, 로그, 문서 추적 정책

생성물과 로컬 실행 로그가 기능 변경에 섞이지 않도록 `.gitignore`와 문서를 정리했다.

반영된 기준:

- `.codex-*`, `.playwright-mcp/`, `outputs/`, `*.log`, `logs/`, `playwright-report/`, `test-results/`는 추적하지 않는다.
- 앱 런타임에서 직접 참조하는 카드 이미지는 `public/game-cards/`에 둔다.
- 인쇄물, 스크린샷, PDF/DOCX 같은 재생성 가능한 산출물은 `outputs/`에 두고 커밋하지 않는다.
- 추적 정책은 `docs/game/generated-files.md`에 문서화했다.

현재 `master` 트리에는 `outputs/`, `.codex-*`, `.playwright-mcp/`, 로그 파일이 포함되어 있지 않다.

## GAME-6: 물품 데이터 확장

물품 데이터를 거래 추리와 수집가 미션에 맞게 확장했다.

확정 분포:

- 일반 물품: 24개
- 카테고리: `electronics`, `fashion`, `hobby`, `living`
- 카테고리별 물품 수: 각 6개
- 상태: `mint`, `used`, `defective`, `broken`
- 상태 분포: `mint` 6개, `used` 12개, `defective` 4개, `broken` 2개
- 위험 물품 기준: `defective`와 `broken`

반영된 내용:

- `Item` 타입에 `marketPrice`, `category`, `condition`을 명시했다.
- 기존 `basePrice` 사용처를 `marketPrice` 중심으로 정리했다.
- 서버 카드 스냅샷에 `category`, `condition`, `acquiredPrice`를 포함했다.
- 거래 성사 시 구매자 카드에 실제 거래가를 `acquiredPrice`로 기록한다.
- 숨김 거래의 공개 정책은 바꾸지 않았다.
- 온라인 UI에서 공개된 물품의 카테고리와 상태를 표시할 수 있게 했다.
- 5인 게임 첫 분배에서 일반 물품 ID가 반복되지 않는지 테스트로 고정했다.

관련 테스트:

- `src/features/game/data/__tests__/items.test.ts`
- `src/features/game/server/__tests__/cards.test.ts`
- `src/features/game/server/__tests__/room-store.test.ts`

## 검증 기록

`master` 기준으로 다음 명령을 실행했다.

| 명령 | 결과 | 메모 |
| --- | --- | --- |
| `pnpm exec tsc --noEmit` | 통과 | 타입 오류 없음 |
| `pnpm test` | 통과 | 9개 테스트 파일, 39개 테스트 통과 |
| `pnpm lint` | 통과, 경고 1개 | `src/features/calendar/lib/google.ts`의 기존 `GoogleEvent` 미사용 경고 |
| `pnpm build` | 통과, 경고 1개 | Next.js `middleware` 파일 컨벤션 deprecation 경고 |

## 남은 주의점

- GAME-6 문서에는 `riskTag` 후보가 남아 있지만, 현재 구현은 별도 필드 대신 `condition`에서 위험 여부를 파생한다. 이 설계가 계속 맞다면 이슈 문구나 후속 문서에서 명확히 적어두는 것이 좋다.
- `docs/game/architecture.md`의 과거 검증 수치는 작성 당시 값이므로, 최신 검증 기록은 이 문서를 기준으로 보면 된다.
- 원래 작업 폴더 `C:\Users\kksu1\Dev\보드게임`에는 이전 dirty 브랜치 상태가 남아 있다. 병합된 기준 상태를 확인할 때는 `master` 또는 `C:\tmp\midgeorae-master-merge`를 기준으로 봐야 한다.
- 원격에는 아직 push하지 않았다. 원격 반영 전에는 `origin`이 `Siul49/midgeorae.git`를 가리키는지 확인한 뒤 push해야 한다.
