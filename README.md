# TwinDate

"내 AI Twin이 먼저 데이트하고, 사람은 그 결과를 보고 결정한다"는 핵심 루프를 모바일 웹에서 끝까지 눌러볼 수 있는 클릭 데모입니다. 백엔드 없이 동작하며 모든 데이터는 번들된 JSON과 브라우저 localStorage에만 있습니다. Instagram 연결만 별도의 agent 서비스를 씁니다.

| 경로 | 내용 |
| --- | --- |
| `web/` | Next.js 15 App Router + TypeScript + Tailwind 4.1 + Zustand. 앱 본체 |
| `agent/` | Node + express + playwright + ws. Instagram 브라우저 에이전트 (포트 3100) |
| `261106_Twindatev1.pen` | Pencil 디자인 소스. 전 화면 |
| `design-assets/` | Pencil 파일에서만 쓰는 영상 스틸. 앱은 참조하지 않음 |

## 실행

Node 22.5 (`.nvmrc`).

```bash
npm ci --prefix web && npm run dev --prefix web
```

```bash
npm ci --prefix agent && npm run dev --prefix agent
```

웹 `http://localhost:3000`, 에이전트 `http://localhost:3100`. Turbopack dev 서버는 `globals.css` 수정이나 브랜치 전환 후 스타일이 남아 있을 때가 있어 그럴 때는 재시작합니다.

환경 변수는 `web/.env.example`, `agent/.env.example` 참고. agent 주소가 없으면 Instagram 연결 시트만 "연결 불가"로 닫히고 나머지는 그대로 동작합니다.

## 화면

루트 `/`는 온보딩 완료 여부만 보고 `/watch` 또는 `/onboarding/signup`으로 보냅니다.

| 라우트 | 화면 |
| --- | --- |
| `/onboarding/signup` → `intro` → `connect` → `interview` → `kit` → (`address`) → `matching` | 온보딩 (스플래시, 서비스 소개 + Twin 이름, 앱 연결, 6문항 인터뷰, 웨어러블 키트 안내, 주소(선택), Twin 첫 데이트 로딩 → "Ready to date!" → Feed) |
| `/watch`, `/watch/suggested`, `/watch/{id}` | Feed, Suggested, Date 상세 (영상 + 자막 + 하이라이트 + Momo's take) |
| `/match/pick?c=`, `/match`, `/match/{chatId}`, `/match/{chatId}/plan` | 프로필 (Like → Match), Matches, 채팅, 만남 제안 |
| `/survey/{meetingId}` | 만남 후 설문 |
| `/me`, `/tune` | Momo 탭, Tune Momo |
| `/dev/ui`, `/dev/avatars` | 개발용 갤러리 |

모든 데이터 접근은 `web/lib/api.ts`를 거치므로 실제 API로 바꿀 때 화면 코드는 그대로 둘 수 있습니다. 읽기 전용 콘텐츠는 `web/data/*.json`, 사용자 상태는 `web/lib/store.ts` (localStorage 키 `twindate-store`).

## 배포

- Vercel Root Directory는 `web`. 아니면 모든 경로가 404.
- `main` 직접 push 금지. 기능 브랜치 → PR → 리뷰 후 머지.
- `.claude/`, `agent/profiles`, `agent/data`, `node_modules`는 추적하지 않음.
- `.pen`은 Pencil에서 저장해야 디스크에 반영되므로 커밋 전에 저장 확인.
