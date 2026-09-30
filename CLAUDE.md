# TILT HOLDER

보드게임 동호회/모임의 게임 세션 정산 및 랭킹 관리 웹 애플리케이션입니다.

이 저장소는 `heysung99/tilt_holder`이며, **다른 프로젝트(예: `raising-yeoul` 육아 앱)와는
무관**합니다. 세션 대화 기록에 다른 저장소 관련 내용이 섞여 있다면 그것은 이 저장소의
맥락이 아니니 혼동하지 마세요.

## 주요 기능
1. **게임 세션 개설 및 관리**: 날짜, 게임 이름, 참가자 선택, HOST/BANK 지정, 유저 관리
2. **라이브 바이인(Buy-in) 기록**: 1회 50,000원 기준 참가자별 바이인 횟수 실시간 조절
3. **정산 시스템**: 최종 칩 금액 검증, 딴 돈의 50%만 지급하고 나머지 50%는 공금으로 귀속,
   당일 지출 등록/정산, 관리자 비밀번호('0511') 인증 후 최종 정산 요약
4. **랭킹 및 전적 시스템**: 시즌/연도별 필터링, 누적 NET 상금·승률 기준 랭킹 및 티어
5. **공금(Fund) 관리**: 입금·지출·정산 변동 이력 통합 관리

## 기술 스택
- **Frontend** (`artifacts/tilt-holder`): React, Vite, TailwindCSS v4, Radix UI/Shadcn UI,
  Wouter(라우팅), Lucide React, TanStack React Query
- **Backend** (`artifacts/api-server`): Express 5, CORS, Pino HTTP Logger, RESTful API
  (`/api/users`, `/api/expenses`, `/api/fund`, `/api/games`)
- **Monorepo**: pnpm workspaces, Node.js 24, TypeScript 5.9
- **DB**: PostgreSQL + Drizzle ORM (`lib/db`)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval — OpenAPI 스펙(`lib/api-spec/openapi.yaml`)에서 훅·Zod 스키마 생성
- **배포**: Vercel (`vercel.json`)

## Run & Operate
- `pnpm --filter @workspace/api-server run dev` — API 서버 실행 (포트 5000)
- `pnpm run typecheck` — 전체 패키지 타입체크
- `pnpm run build` — 타입체크 + 전체 패키지 빌드
- `pnpm --filter @workspace/api-spec run codegen` — OpenAPI 스펙에서 API 훅/Zod 스키마 재생성
- `pnpm --filter @workspace/db run push` — DB 스키마 변경 반영 (dev 전용)
- 필수 환경변수: `DATABASE_URL` (Postgres 커넥션 스트링)

## 핵심 데이터 구조
- **Player**: `{ name: string, score: number, color: string, text: string }`
- **SessionState**: `{ date, gameName, participantNames[], buyIns, finalAmounts, hostName,
  bankName, isFinished, fundApplied }`
- **ExpenseEntry**: `{ id, title, payer, amount, time, settled? }`
- **FundEntry**: `{ id, title, meta, amount }`
- **HistoricalRecord**: `{ name, values: (number | null)[] }`

## Where things live
- `artifacts/tilt-holder` — 프론트엔드 (메인 앱)
- `artifacts/api-server` — 백엔드 API 서버
- `artifacts/mockup-sandbox` — 목업/프로토타입 샌드박스
- `lib/db` — Drizzle ORM 스키마·DB 패키지
- `lib/api-spec` — OpenAPI 스펙 소스
- `lib/api-zod`, `lib/api-client-react` — 생성된 Zod 스키마 / React API 클라이언트

## Pointers
- `pnpm-workspace` 스킬 참고 — 워크스페이스 구조, TypeScript 설정, 패키지 세부사항
- 더 자세한 제품 설명은 `app-summary.md` 참고
