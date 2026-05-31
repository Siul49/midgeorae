# 믿거래 온라인 게임 영역 경계 문서

작성일: 2026-06-01  
대상 이슈: [GAME-0A 믿거래 온라인 게임 영역 경계와 폴더 구조 정리](https://github.com/Siul49/midgeorae/issues/1)

## 목표

이 문서는 현재 `/game` 온라인 게임 구현의 책임을 정리하고, 이후 이슈가 어느 영역을 중심으로 작업해야 하는지 판단할 수 있게 만드는 기준 문서다.

이번 이슈에서는 동작을 바꾸지 않는다. 파일 이동도 최소화한다. 우선 현재 구조를 읽을 수 있게 만들고, 다음 이슈인 GAME-0B부터 규칙과 서버 액션 처리를 작게 분리한다.

## 현재 구조 요약

현재 게임 구현은 크게 두 흐름이 함께 존재한다.

- `src/features/game/server`: `/game` 온라인 서버형 방, 액션, 스냅샷, 봇 자동 진행을 담당한다.
- `src/features/game/online`: 온라인 화면 UI를 담당한다.
- `src/features/game/engine`, `components`, `data`, `types.ts`: 기존 클라이언트 리듀서형 게임 초안과 UI 컴포넌트가 남아 있다.
- `public/game-cards`와 `outputs/printable-cards`: 카드 이미지 원본 또는 생성 결과물을 담고 있다.
- `docs/game`: 룰, 이슈 로드맵, 아키텍처 문서를 둔다.

현재 `src/features/game/server/room-store.ts`는 온라인 게임의 핵심 상태 저장소이면서 규칙 계산까지 많이 떠안고 있다. 그래서 이후 거래, 평판, 직업, 빌런 미션, 배포 작업이 같은 파일을 반복해서 수정할 가능성이 높다.

## `room-store.ts` 현재 책임

`room-store.ts`가 현재 담당하는 책임은 다음과 같다.

| 책임 | 현재 위치 | 이후 권장 위치 |
| --- | --- | --- |
| 방 생성, 참가, 조회 | `room-store.ts` | `server` |
| 플레이어 인증과 토큰 확인 | `room-store.ts` | `server` |
| 호스트 권한, 인원 제한 검증 | `room-store.ts` | `server` |
| 역할, 직업, 빌런 미션 배정 | `room-store.ts` | `rules` 또는 `domain` |
| 시작 자금, 평판, 라운드 같은 밸런스 상수 | `room-store.ts` | `rules` |
| 행동 카드 뽑기와 덱 보충 | `room-store.ts`, `cards.ts` | `rules`와 `server` |
| 거래 제안, 거래 선택, 거래 성사 처리 | `room-store.ts` | `domain` 판정 + `server` 적용 |
| 거래 물건 공개 범위 필터링 | `room-store.ts` | `domain` 또는 `server` snapshot 정책 |
| 후기와 평판 변화 | `room-store.ts` | `domain` |
| 악플테러, 분리수거, 물물교환 액션 처리 | `room-store.ts` | `domain` 판정 + `server` 적용 |
| 라운드 진행과 투표 전환 | `room-store.ts` | `domain` 또는 `rules` |
| 투표 집계, 결과 계산 | `room-store.ts` | `domain` |
| 봇 대상 선택과 자동 플레이 | `room-store.ts` | `server/bot` 또는 `server` 하위 모듈 |
| 플레이어별 공개 스냅샷 생성 | `room-store.ts` | `server` |
| 테스트용 방 초기화 | `room-store.ts` | `server` |

핵심 문제는 `room-store.ts`가 "상태를 보관하고 액션을 라우팅하는 곳"이면서 동시에 "게임 규칙을 계산하는 곳"이라는 점이다. GAME-0B에서는 동작 변경 없이 계산 책임만 순수 함수로 분리하는 것이 좋다.

## 목표 영역

### `src/features/game/rules`

정적 규칙과 밸런스 값을 둔다.

예시:

- 최소/최대 플레이어 수
- 시작 평판, 시작 매너, 기본 시장 진행도
- 직업 카드 정의
- 빌런 미션 정의
- 행동 카드 타입과 덱 구성 정책
- 아이템 카테고리와 위험 태그 정의

이 영역은 가능한 한 상태를 직접 바꾸지 않는다. "게임에 어떤 규칙이 있는가"를 읽는 곳이다.

### `src/features/game/domain`

순수 판정 로직을 둔다.

예시:

- 거래 성사 시 자산과 보유 카드 변경 결과 계산
- 후기와 평판 변화 계산
- 시장 종료 조건 판정
- 투표 결과와 승리 조건 계산
- 직업 미션 진행도 판정
- 빌런 미션 진행도와 증거 판정

이 영역의 함수는 입력을 받고 결과를 돌려주는 형태를 우선한다. 서버 저장소, HTTP, React UI에 직접 의존하지 않게 만든다.

### `src/features/game/server`

방 상태, 플레이어 세션, 서버 액션 라우팅을 둔다.

예시:

- 방 생성과 참가
- 플레이어 토큰 인증
- `RoomAction` 수신과 유효성 검사
- `domain` 함수 호출 후 상태 반영
- 플레이어별 스냅샷 필터링
- 인메모리 저장소와 이후 외부 저장소 어댑터
- 봇 테스트 방 자동 진행

이 영역은 "요청을 받아 현재 방 상태에 반영한다"에 집중한다.

### `src/features/game/online`

온라인 게임 화면 UI를 둔다.

예시:

- 로비와 방 입장 화면
- 카드 테이블
- 거래 패널
- 후기와 평판 패널
- 투표와 결과 패널
- 개인 손패, 직업, 미션 표시

UI는 서버 스냅샷을 기준으로 렌더링하고, 규칙 계산을 직접 재구현하지 않는다.

### `src/features/game/assets` 또는 `public/game-cards`

카드 이미지와 생성 스크립트의 기준을 둔다.

현재는 `public/game-cards`와 `outputs/printable-cards`가 함께 존재한다. GAME-0C에서 사람이 직접 편집하는 원본과 명령으로 재생성 가능한 결과물을 나눠야 한다.

### `docs/game`

게임 규칙, 밸런스, 아키텍처, 배포 절차를 둔다.

예시:

- `docs/game/architecture.md`: 영역 경계와 작업 위치
- `docs/game/rules/*.md`: 룰 초안과 확정 규칙
- `docs/game/issues/README.md`: 이슈별 참고 문서
- `docs/game/roadmap/*.md`: 진행 순서와 로드맵
- `docs/game/deployment.md`: 외부 접속과 배포 절차

## 다음 이슈별 작업 중심

| 이슈 | 중심 영역 | 비고 |
| --- | --- | --- |
| GAME-0B 규칙과 서버 액션 책임 분리 | `rules`, `domain`, `server` | 동작 변경 없이 `room-store.ts` 책임을 줄인다. |
| GAME-0C 생성물, 로그, 문서 위치 정리 | `.gitignore`, `docs/game`, `outputs`, `public/game-cards` | 기능 코드와 출력물이 섞이지 않게 한다. |
| GAME-6 물품 데이터 확장 | `rules` 또는 `data`, `server/cards.ts`, UI 표시 영역 | 카테고리, 시세, 상태, 위험 태그의 기반이다. |
| GAME-9 구매 주도 거래 신청 | `domain`, `server`, `online` | 거래 상태 모델과 UI 문구가 함께 바뀐다. |
| GAME-1 거래 품목 공개와 숨은 위험 | `domain`, `server` snapshot, `online` | 공개 정보와 숨은 위험 정보의 경계가 핵심이다. |
| GAME-2 시장 진행도와 종료 조건 | `rules`, `domain`, `server`, `online` | `maxRounds`를 대체할 시장 진행도 판정이 필요하다. |
| GAME-5 평판 시스템 개선 | `rules`, `domain`, `server`, `online` | 평판을 화폐가 아니라 공개 신뢰도로 재정의한다. |
| GAME-3 시민 직업 규칙 | `docs/game/rules`, `rules`, `domain`, `online` | 문서 확정 후 판정 함수와 UI를 붙인다. |
| GAME-7 빌런 행동과 증거 | `rules`, `domain`, `server`, `online` | 로그와 증거 판정을 함께 설계해야 한다. |
| GAME-8 결과 점수표 | `domain`, `online` | 팀 승리와 개인 점수를 분리해 보여준다. |
| GAME-4 배포 | `server`, `docs/game`, 실행 환경 | 인메모리 저장소 제약을 문서화한다. |

## 분리 원칙

- `server`는 방 상태를 보관하고 액션을 라우팅한다.
- `domain`은 게임 결과를 계산한다.
- `rules`는 변경 가능한 밸런스와 정적 정의를 모은다.
- `online`은 스냅샷을 보여주고 사용자 액션을 보낸다.
- `docs/game`은 합의된 규칙과 판단 근거를 남긴다.

한 파일을 이동하거나 분리할 때는 먼저 기존 테스트가 무엇을 보호하는지 확인한다. 실패한 테스트가 있으면 #1에서 고치지 말고 현재 상태를 기록한 뒤, 해당 이슈에서 고친다.

## 현재 검증 상태

2026-06-01 현재 작업트리 기준으로 다음 명령을 실행했다.

| 명령 | 결과 | 메모 |
| --- | --- | --- |
| `pnpm test` | 통과 | 7개 테스트 파일, 40개 테스트 통과. 단, `.claude/worktrees/codex-game-logic-cards` 하위 테스트도 함께 발견되어 실행된다. 이는 GAME-0C에서 추적 정책을 정리할 대상이다. |
| `pnpm lint` | 통과, 경고 1개 | `src/features/calendar/lib/google.ts`의 `GoogleEvent` 미사용 경고가 있다. 이 이슈 범위 밖이라 수정하지 않는다. |
| `pnpm build` | 통과, 경고 1개 | Next.js 16.2.2 기준 빌드 통과. `middleware` 파일 컨벤션이 deprecated 되었고 `proxy` 사용 권장 경고가 있다. |

## 이번 이슈에서 하지 않는 일

- `room-store.ts` 로직 분리
- 폴더 이동
- 테스트 실패 또는 경고 수정
- 거래, 평판, 직업, 빌런 규칙 변경
- 배포 방식 변경

이번 이슈의 산출물은 이 문서다. 다음 작업은 GAME-0B에서 `rules`와 `domain`을 작게 만들고, `room-store.ts`가 액션 라우팅에 집중하도록 줄이는 것이다.
