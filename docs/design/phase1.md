# Phase 1 설계 — 게임 캔버스 & 플레이어 이동

## 목표 요약

브라우저에서 게임 화면이 열리고, 플레이어 캐릭터가 키보드로 좌우 이동한다.
게임 루프가 돌아가는 뼈대를 만드는 단계로, 이후 모든 Phase의 기반이 된다.

---

## 기술 결정

| 항목 | 결정 | 이유 |
|------|------|------|
| 렌더링 방식 | HTML `<canvas>` + 2D Context | 매 프레임 전체를 직접 그리는 아케이드 게임에 적합. React DOM 리렌더링 오버헤드 없음 |
| 게임 루프 | `requestAnimationFrame` | 브라우저 주사율에 맞춰 자동 최적화 |
| React 역할 | 캔버스 마운트 및 화면 전환 상태 관리만 담당 | 게임 로직은 순수 TS 클래스로 분리, React와 결합도 최소화 |
| 상태 관리 | `useRef` (게임 엔진 인스턴스) + `useState` (화면 전환) | 게임 루프는 리렌더링 없이 ref로 유지 |
| 캔버스 크기 | 480×640 (세로형 고정) | 원작 아케이드 비율과 유사, 반응형은 추후 대응 |

---

## 파일 구조

```
src/
├── App.tsx                     # 화면 전환 (메인/게임/게임오버) — Phase 9에서 완성
├── game/
│   ├── GameEngine.ts           # 게임 루프, 씬 관리
│   ├── InputManager.ts         # 키보드 입력 처리
│   ├── entities/
│   │   └── Player.ts           # 플레이어 위치, 이동 로직
│   └── constants.ts            # 캔버스 크기, 물리 상수 등
└── components/
    └── GameCanvas.tsx          # <canvas> 마운트, GameEngine 연결
```

> Phase 1에서 생성하는 파일: `constants.ts`, `InputManager.ts`, `Player.ts`, `GameEngine.ts`, `GameCanvas.tsx`  
> `App.tsx`는 `GameCanvas`를 렌더링하도록 최소 수정

---

## 각 모듈 설계

### `constants.ts`
```ts
export const CANVAS_WIDTH = 480
export const CANVAS_HEIGHT = 640
export const PLAYER_SPEED = 4       // px/frame
export const PLAYER_WIDTH = 32
export const PLAYER_HEIGHT = 48
```

---

### `InputManager.ts`
- `keydown` / `keyup` 이벤트를 등록해 현재 눌린 키를 `Set<string>`으로 관리
- `isDown(key: string): boolean` 메서드 제공
- GameEngine 생성 시 등록, 소멸 시 이벤트 제거

```
InputManager
  - keys: Set<string>
  + isDown(key): boolean
  + destroy(): void
```

---

### `Player.ts`
- 위치(`x`, `y`), 크기(`width`, `height`) 보유
- `update(input: InputManager)`: 매 프레임 호출, 좌우 이동 처리
- 화면 경계 초과 방지 (x < 0, x > CANVAS_WIDTH - width 클램핑)
- `draw(ctx: CanvasRenderingContext2D)`: 임시로 직사각형으로 표현 (Phase 10에서 스프라이트로 교체)

```
Player
  - x, y: number
  - width, height: number
  + update(input): void     ← 이동 처리 + 경계 클램핑
  + draw(ctx): void         ← 사각형 렌더
```

---

### `GameEngine.ts`
- 게임 루프의 진입점
- `canvas`, `ctx`, `InputManager`, `Player` 인스턴스를 보유
- `start()`: `requestAnimationFrame` 루프 시작
- `stop()`: 루프 취소
- 매 프레임: `update()` → `draw()` 순서 실행

```
GameEngine
  - canvas: HTMLCanvasElement
  - ctx: CanvasRenderingContext2D
  - input: InputManager
  - player: Player
  - animFrameId: number
  + start(): void
  + stop(): void
  - update(): void    ← player.update(input)
  - draw(): void      ← ctx 초기화 → player.draw(ctx)
```

---

### `GameCanvas.tsx`
- `<canvas>` 엘리먼트를 `useRef`로 참조
- `useEffect`에서 `GameEngine` 인스턴스 생성 → `start()`
- cleanup에서 `stop()` 호출 (StrictMode 이중 실행 대응)

```tsx
const canvasRef = useRef<HTMLCanvasElement>(null)

useEffect(() => {
  const engine = new GameEngine(canvasRef.current!)
  engine.start()
  return () => engine.stop()
}, [])

return <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />
```

---

## 게임 루프 흐름

```
GameCanvas 마운트
    ↓
GameEngine.start()
    ↓
requestAnimationFrame(loop)
    ┌──────────────────────────┐
    │ update()                 │
    │   └─ player.update(input)│  ← 키 입력 → x 이동 → 경계 클램핑
    │ draw()                   │
    │   └─ ctx.clearRect()     │  ← 이전 프레임 지우기
    │   └─ player.draw(ctx)    │  ← 플레이어 사각형 그리기
    └──────────────────────────┘
    ↓
requestAnimationFrame(loop) 반복
```

---

## 경계 처리 로직

```
// Player.update() 내부
if (ArrowLeft) x -= PLAYER_SPEED
if (ArrowRight) x += PLAYER_SPEED

x = Math.max(0, Math.min(x, CANVAS_WIDTH - width))  // 클램핑
```

---

## Phase 1 완료 기준

- [x] 브라우저에서 480×640 캔버스가 표시된다
- [x] 플레이어(사각형)가 캔버스 하단 중앙에 위치한다
- [x] ←→ 키 입력으로 플레이어가 좌우로 움직인다
- [x] 화면 끝에서 플레이어가 막힌다 (이탈 없음)
- [x] 탭을 닫거나 컴포넌트 언마운트 시 게임 루프가 정상 종료된다
