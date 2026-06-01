# 생성물, 로그, 문서 추적 정책

이 문서는 게임 작업 중 생기는 파일이 기능 PR에 섞이지 않도록 추적 기준을 정리한다. 기본 원칙은 "직접 편집하는 원천은 추적하고, 명령으로 다시 만들 수 있는 결과물과 로컬 실행 흔적은 추적하지 않는다"이다.

## 추적한다

- `src/features/game/data/`: 카드, 미션, 이벤트처럼 게임 규칙의 원천이 되는 데이터
- `public/game-cards/`: 앱 화면에서 직접 참조하는 카드 이미지
- `docs/game/`: 규칙, 로드맵, 설계, 배포 절차처럼 사람이 읽고 수정하는 문서
- 생성 스크립트가 필요해지면 `scripts/game/` 또는 관련 기능 폴더 아래에 둔다.

## 추적하지 않는다

- `outputs/`: 카드 인쇄물, PDF/DOCX 빌드 결과, 스크린샷, 렌더링 결과처럼 다시 만들 수 있는 산출물
- `.codex-*`: Codex 실행 중 생기는 세션별 작업 파일
- `.playwright-mcp/`, `playwright-report/`, `test-results/`: 브라우저 자동화와 테스트 실행 결과
- `*.log`, `logs/`, `dev-server.log*`: 로컬 서버와 도구 실행 로그
- `.next/`, `node_modules/`, `coverage/`: 프레임워크와 패키지 매니저가 만드는 캐시

## 카드 파일 기준

- 게임에서 실제로 읽는 카드 이미지는 `public/game-cards/`를 기준 위치로 삼는다.
- 인쇄용 카드 묶음처럼 앱 런타임에 필요하지 않은 결과물은 `outputs/printable-cards/`에 생성하고 커밋하지 않는다.
- 인쇄용 결과물을 공유해야 하면 PR에 산출물을 넣기보다 재생성 명령과 생성 기준을 문서에 남긴다.
- 사람이 직접 다듬어야 하는 SVG가 생기면 `outputs/`에서 꺼내 `public/game-cards/` 또는 별도 원천 폴더로 옮긴 뒤 그 이유를 문서화한다.

## 최종 공유 파일 기준

- 발표, 피드백, 규칙 설명처럼 최종 파일 자체가 검토 대상이면 `docs/game/` 아래에 원본 문서나 링크를 둔다.
- PDF, DOCX, PNG처럼 빌드 결과만 있는 파일은 기본적으로 `outputs/`에 두고 커밋하지 않는다.
- 예외적으로 결과물 자체를 보존해야 한다면 해당 PR 설명에 이유와 재생성 가능 여부를 적는다.

## 작업 전 확인

새 이슈 브랜치에서 산출물이 섞였는지 확인할 때는 아래 명령을 먼저 본다.

```powershell
git status --short
git check-ignore -v outputs .codex-worktree .playwright-mcp/state.json dev-server.log
```

`outputs/` 아래 파일이 상태 목록에 보이면 `.gitignore` 정책을 먼저 확인한 뒤 작업을 계속한다.
