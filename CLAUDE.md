# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 기술 스택

- **프레임워크**: React 19
- **번들러**: Vite 8
- **언어**: TypeScript 6 (strict 모드)
- **린터**: ESLint 10 (typescript-eslint, eslint-plugin-react-hooks, eslint-plugin-react-refresh)

## 주요 명령어

```bash
npm install       # 의존성 설치
npm run dev       # 개발 서버 실행 (http://localhost:5173)
npm run build     # 타입 체크 후 프로덕션 빌드 (tsc -b && vite build)
npm run preview   # 빌드 결과물 미리보기
npm run lint      # ESLint 검사
```

## 테스트 방법

현재 테스트 프레임워크(Vitest, Jest 등)가 설정되어 있지 않습니다. Vitest 추가 방법:

```bash
npm install -D vitest @testing-library/react @testing-library/user-event jsdom
```

`vite.config.ts`에 test 설정 추가:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts',
  },
})
```

`package.json` scripts에 추가:

```json
"test": "vitest",
"test:ui": "vitest --ui",
"test:run": "vitest run"
```

단일 테스트 파일 실행: `npx vitest run src/App.test.tsx`

## 아키텍처

진입점: `index.html` → `src/main.tsx` → `src/App.tsx`

- `src/main.tsx`: React 루트 마운트 (`StrictMode` 적용)
- `src/App.tsx`: 최상위 컴포넌트

## 개발 계획 및 설계 문서

### 계획 문서
- `docs/PLAN.md` — Phase별 목표 및 고객 확인 포인트 목록

### Phase별 설계 문서 (`docs/design/`)
구현을 시작하기 전에 반드시 해당 Phase의 설계 문서를 먼저 읽는다.

| 파일 | Phase | 내용 |
|------|-------|------|
| `docs/design/phase1.md` | Phase 1 | 게임 캔버스 & 플레이어 이동 |
| `docs/design/phase2.md` | Phase 2 | 풍선 물리 (바운스) |
| `docs/design/phase3.md` | Phase 3 | 작살 발사 & 풍선 분열 |
| `docs/design/phase4.md` | Phase 4 | 충돌 판정 & 목숨 시스템 |
| `docs/design/phase5.md` | Phase 5 | 스테이지 클리어 & 점수 |
| `docs/design/phase6.md` | Phase 6 | Mission 1 스테이지 구성 (블록 포함) |

> Phase가 추가될 때마다 위 표에 행을 추가한다.

### 설계 문서 활용 규칙
- 설계 문서에 명시된 **파일 구조**와 **모듈 인터페이스**를 따른다
- 설계 문서와 다르게 구현해야 할 이유가 생기면, 구현 전에 사용자에게 먼저 확인한다
- 설계 문서에 정의된 **완료 기준 체크리스트**를 모두 충족해야 해당 Phase 완료로 간주한다

## TypeScript 설정 주의사항

`tsconfig.app.json`에 엄격한 옵션이 활성화되어 있습니다:
- `noUnusedLocals` / `noUnusedParameters`: 미사용 변수/파라미터 오류
- `verbatimModuleSyntax`: 타입 import는 반드시 `import type` 사용
- `erasableSyntaxOnly`: `enum`, `namespace` 등 TypeScript 전용 런타임 문법 사용 불가 (런타임에서 제거 가능한 문법만 허용)
