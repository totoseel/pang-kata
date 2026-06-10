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

## TypeScript 설정 주의사항

`tsconfig.app.json`에 엄격한 옵션이 활성화되어 있습니다:
- `noUnusedLocals` / `noUnusedParameters`: 미사용 변수/파라미터 오류
- `verbatimModuleSyntax`: 타입 import는 반드시 `import type` 사용
- `erasableSyntaxOnly`: `enum`, `namespace` 등 TypeScript 전용 런타임 문법 사용 불가 (런타임에서 제거 가능한 문법만 허용)
