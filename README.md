# 믿거래

4명이 각자 브라우저로 접속해 중고거래를 진행하고, 숨어 있는 빌런을 찾는 웹 보드게임입니다.

## 같은 Wi-Fi에서 4인 플레이

```powershell
pnpm install
pnpm dev:lan
```

호스트 노트북에서 `http://localhost:3000/game`을 열고 새 방을 만듭니다. 방 화면에 `http://192.168...:3000/game?room=...` 형태의 같은 Wi-Fi 초대 링크가 표시되면, 나머지 3명이 각자 휴대폰이나 노트북 브라우저에서 그 주소로 접속하면 됩니다.

Windows 방화벽 안내가 뜨면 같은 Wi-Fi 기기 접속을 위해 Node.js/Next.js의 사설 네트워크 접근을 허용해야 합니다.

### 다른 사람이 접속하지 못할 때

- 방 화면의 초대 링크가 `http://10.41.68.38:3001/game?room=...`처럼 현재 Wi-Fi IP로 보이는지 확인합니다. 오래된 방 화면이면 5초 안에 자동 갱신됩니다.
- Windows 네트워크가 `Public`으로 잡혀 있으면 외부 기기 접속이 막힐 수 있습니다. Windows 설정에서 현재 Wi-Fi를 `Private` 네트워크로 바꾸거나, 방화벽 안내가 뜰 때 Node.js의 사설 네트워크 접근을 허용합니다.
- 학교/카페 Wi-Fi처럼 기기 간 통신을 막는 네트워크에서는 같은 Wi-Fi여도 접속이 안 될 수 있습니다. 그 경우 휴대폰 핫스팟이나 Cloudflare Tunnel 옵션을 사용합니다.

## 인터넷 접속용 실행 옵션

호스트 노트북에서 Next.js 서버를 실행한 뒤 Cloudflare Tunnel로 공개 URL을 엽니다.

```powershell
pnpm dev:lan
cloudflared tunnel --url http://localhost:3000
```

Cloudflare Tunnel이 출력하는 `https://...trycloudflare.com` 주소를 플레이어에게 공유합니다. 호스트가 `/game`에서 방을 만들면 방 코드와 초대 링크가 표시됩니다.

## 게임 흐름

1. 호스트가 `/game`에서 새 방을 만듭니다.
2. 나머지 3명이 초대 링크 또는 방 코드로 입장합니다.
3. 네 명이 모이면 호스트가 게임을 시작합니다.
4. 각 플레이어는 자기 화면에서만 역할과 비밀 미션을 확인합니다.
5. 턴마다 거래, 구매, 평가를 진행합니다.
6. 최종 투표에서 빌런을 지목하고 결과를 확인합니다.

## 검증

```powershell
pnpm test
pnpm lint
pnpm build
```
