# TILT HOLDER 프로젝트 요약 (Vibe Coding용)

## 1. 프로젝트 개요
- **프로젝트명**: TILT HOLDER (보드게임 동호회/모임 정산 및 랭킹 관리 웹 애플리케이션)
- **주요 기능**:
  1. **게임 세션 개설 및 관리**: 날짜, 게임 이름, 참가자 선택, HOST 및 BANK 지정, 유저 관리(추가 및 이름 변경)
  2. **라이브 바이인(Buy-in) 기록**: 1회 = 50,000원 기준 참가자별 바이인 횟수 실시간 +/- 조절
  3. **정산 시스템 (특수 룰 적용)**:
     - 최종 칩 금액 입력 및 검증 (`총 바이인 금액 === 총 최종 칩 금액`)
     - **특수 룰**: 딴 돈(최종 금액 - 바이인 총액)의 50%만 플레이어에게 지급하고, 나머지 50%는 공금으로 자동 귀속
     - 당일 사용 지출(식사 등) 등록 및 완료/취소 처리, 공금 잔액 계산
     - 정산 완료 시 모달로 최종 정산 요약(지급액, 손실금, 공금 잔액 등) 표시 및 관리자 비밀번호('0511') 인증
  4. **랭킹 및 전적 시스템**:
     - 전체 시즌 및 연도별(예: 2026 시즌) 필터링
     - 누적 NET 상금(만원 단위) 및 승률/참여 횟수 기준 랭킹 정렬 및 티어 부여 (챌린저, 그랜드마스터, 마스터, 다이아 등)
     - 관리자 모드(비밀번호 인증)를 통한 지난 게임 이력 삭제 기능
  5. **공금(Fund) 관리**:
     - 공금 직접 입금, 지출 내역, 게임 정산으로 인한 공금 변동 이력 통합 관리 및 잔액 표시

## 2. 기술 스택 및 구조
- **Frontend (`artifacts/tilt-holder`)**:
  - React, Vite, TailwindCSS (v4), Radix UI / Shadcn UI components, Wouter (라우팅), Lucide React (아이콘), TanStack React Query
- **Backend (`artifacts/api-server`)**:
  - Express.js, CORS, Pino HTTP Logger, RESTful API (`/api/users`, `/api/expenses`, `/api/fund`, `/api/games`)
- **Monorepo / Workspace**:
  - pnpm workspace 구조 (`@workspace/tilt-holder`, `@workspace/api-server`)
  - Vercel 배포 설정 (`vercel.json`)

## 3. 핵심 데이터 구조 (TypeScript Types)
- **Player**: `{ name: string, score: number, color: string, text: string }`
- **SessionState**: `{ date: string, gameName: string, participantNames: string[], buyIns: Record<string, number>, finalAmounts: Record<string, number>, hostName: string | null, bankName: string | null, isFinished: boolean, fundApplied: boolean }`
- **ExpenseEntry**: `{ id: string, title: string, payer: string, amount: number, time: string, settled?: boolean }`
- **FundEntry**: `{ id: string, title: string, meta: string, amount: number }`
- **HistoricalRecord**: `{ name: string, values: (number | null)[] }`
