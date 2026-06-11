# Phase 9 설계 — 메인화면 & 화면 전환 흐름

## 목표 요약

메인화면(타이틀·메뉴)을 추가하고, 메인 → 게임 → 게임오버/미션클리어 → 메인으로 이어지는
전체 화면 전환 흐름을 완성한다. 하이스코어는 localStorage에 저장·표시한다.

---

## 화면 상태 정의

```
'title'          — 메인화면 (PANG 타이틀, GAME START / HIGH SCORE 메뉴)
'playing'        — 게임 진행 중 (기존 GameEngine 담당)
'gameover'       — 게임 오버 (점수 표시, 재시작 안내)
'missioncomplete'— Mission 1 클리어 (점수·하이스코어 표시, 메인 복귀 안내)
```

---

## 기술 결정

| 항목 | 결정 | 이유 |
|------|------|------|
| 화면 상태 관리 위치 | `App.tsx`에서 React `useState`로 관리 | GameEngine은 게임 로직만 담당, 화면 전환은 React 레이어에서 처리 |
| 메인화면 구현 | `TitleScreen` React 컴포넌트 (canvas 없음, HTML/CSS) | 타이틀·메뉴는 canvas보다 HTML이 관리 편함 |
| 게임화면 | 기존 `GameCanvas` 컴포넌트 재사용 | GameEngine 변경 최소화 |
| 게임오버·클리어 화면 | `ResultScreen` React 컴포넌트 (canvas 없음, HTML/CSS) | 점수·하이스코어 표시와 키 입력 처리를 단순하게 |
| GameEngine → React 콜백 | `GameCanvas`에 `onGameOver(score)`, `onMissionComplete(score)` prop 전달 | GameEngine이 직접 상태를 바꾸지 않고 콜백으로 위임 |
| 하이스코어 저장 | `localStorage.getItem/setItem('pang_highscore')` | 새로고침 후에도 유지, 구현 단순 |
| 메뉴 조작 | 키보드 ↑↓로 항목 선택, Enter로 확정 | 팡 원작 스타일 |
| 재시작 | 게임오버·클리어 화면에서 Enter → 타이틀로 복귀, 타이틀에서 GAME START 선택 시 새 게임 시작 | `GameCanvas`를 unmount → remount하면 `GameEngine`이 초기화됨 |

---

## 파일 구조

```
src/
├── App.tsx                        # 화면 상태(AppState) 관리, 컴포넌트 전환
└── components/
    ├── GameCanvas.tsx             # onGameOver / onMissionComplete prop 추가
    ├── TitleScreen.tsx            # 신규 — 메인화면
    └── ResultScreen.tsx           # 신규 — 게임오버·클리어 공용 결과 화면
```

`GameEngine.ts`는 **변경하지 않는다.**
대신 `GameCanvas.tsx`가 GameEngine의 `state` 변화를 감지해 콜백을 호출한다.

---

## 각 모듈 설계

### `App.tsx`

```tsx
type AppState =
  | { screen: 'title' }
  | { screen: 'playing' }
  | { screen: 'result'; reason: 'gameover' | 'missioncomplete'; score: number }

export default function App() {
  const [appState, setAppState] = useState<AppState>({ screen: 'title' })
  const [highScore, setHighScore] = useState(() =>
    Number(localStorage.getItem('pang_highscore') ?? 0)
  )

  function handleStart() {
    setAppState({ screen: 'playing' })
  }

  function handleEnd(reason: 'gameover' | 'missioncomplete', score: number) {
    if (score > highScore) {
      setHighScore(score)
      localStorage.setItem('pang_highscore', String(score))
    }
    setAppState({ screen: 'result', reason, score })
  }

  function handleBackToTitle() {
    setAppState({ screen: 'title' })
  }

  return (
    <>
      {appState.screen === 'title' && (
        <TitleScreen highScore={highScore} onStart={handleStart} />
      )}
      {appState.screen === 'playing' && (
        <GameCanvas
          onGameOver={score => handleEnd('gameover', score)}
          onMissionComplete={score => handleEnd('missioncomplete', score)}
        />
      )}
      {appState.screen === 'result' && (
        <ResultScreen
          reason={appState.reason}
          score={appState.score}
          highScore={highScore}
          onBack={handleBackToTitle}
        />
      )}
    </>
  )
}
```

---

### `TitleScreen.tsx` (신규)

**props**
```ts
{ highScore: number; onStart: () => void }
```

**동작**
- 메뉴 항목: `['GAME START', 'HIGH SCORE']`
- ↑↓ 키로 `selectedIndex` 이동
- Enter 키로 확정
  - `GAME START` → `onStart()` 호출
  - `HIGH SCORE` → 같은 화면에서 하이스코어 수치를 강조 표시 (별도 화면 전환 없음)
- `GameCanvas`와 동일한 `CANVAS_WIDTH × CANVAS_HEIGHT` 크기의 div에 canvas 배경처럼 렌더

**레이아웃 (HTML/CSS)**
```
┌─────────────────────┐
│                     │
│       PANG          │  ← 타이틀 (큰 텍스트)
│                     │
│   ▶ GAME START      │  ← 선택된 항목은 앞에 ▶ 표시
│     HIGH SCORE      │
│                     │
│   HI  000000        │  ← 하이스코어
│                     │
└─────────────────────┘
```

**키 처리**: `useEffect`로 `keydown` 리스너 등록/해제

---

### `GameCanvas.tsx` 수정

**추가 props**
```ts
{
  onGameOver: (score: number) => void
  onMissionComplete: (score: number) => void
}
```

**GameEngine에서 종료 감지 방법**

`GameEngine`의 `state`는 `private`이므로 직접 읽을 수 없다.
`GameEngine`에 `onGameOver`·`onMissionComplete` 콜백을 생성자 옵션으로 전달하는 방식으로 구현한다.

```ts
// GameEngine 생성자 옵션 추가
constructor(canvas: HTMLCanvasElement, callbacks?: {
  onGameOver?: (score: number) => void
  onMissionComplete?: (score: number) => void
})
```

`GameEngine.ts`에서 상태가 `gameover`·`missioncomplete`로 전환되는 시점에 각 콜백을 1회 호출한다.

```ts
// state 전환 시점에 콜백 호출 (중복 호출 방지용 플래그 필요)
private endCallbackFired = false

// gameover 전환 시
if (!this.endCallbackFired) {
  this.endCallbackFired = true
  this.callbacks?.onGameOver?.(this.score)
}

// missioncomplete 전환 시
if (!this.endCallbackFired) {
  this.endCallbackFired = true
  this.callbacks?.onMissionComplete?.(this.score)
}
```

> GameEngine.ts는 콜백 필드와 호출 2곳만 추가한다. 기존 로직은 변경 없음.

**GameCanvas 사용**
```tsx
useEffect(() => {
  const engine = new GameEngine(canvasRef.current!, {
    onGameOver: props.onGameOver,
    onMissionComplete: props.onMissionComplete,
  })
  engine.start()
  return () => engine.stop()
}, [])
```

---

### `ResultScreen.tsx` (신규)

**props**
```ts
{
  reason: 'gameover' | 'missioncomplete'
  score: number
  highScore: number
  onBack: () => void
}
```

**동작**
- Enter 키로 `onBack()` 호출 → 타이틀로 복귀
- `reason === 'gameover'`일 때: "GAME OVER" 표시
- `reason === 'missioncomplete'`일 때: "MISSION 1 COMPLETE!" 표시
- 점수·하이스코어 표시, 신기록이면 "NEW RECORD!" 강조

**레이아웃**
```
┌─────────────────────┐
│                     │
│    GAME OVER        │  ← reason에 따라 다른 텍스트
│                     │
│  SCORE   012345     │
│  HI      034567     │
│                     │
│  NEW RECORD!        │  ← 신기록 시에만 표시
│                     │
│  Press ENTER        │
└─────────────────────┘
```

---

## 전체 흐름 요약

```
앱 시작
  → TitleScreen
      ↓ GAME START (Enter)
  → GameCanvas (GameEngine 초기화·실행)
      ↓ 게임오버 콜백         ↓ 미션클리어 콜백
  → ResultScreen('gameover') / ResultScreen('missioncomplete')
      ↓ Enter
  → TitleScreen
```

---

## GameEngine.ts 변경 범위 요약

| 변경 항목 | 내용 |
|----------|------|
| 생성자 2번째 인자 추가 | `callbacks?: { onGameOver?: (score) => void; onMissionComplete?: (score) => void }` |
| 필드 추가 | `private callbacks`, `private endCallbackFired = false` |
| gameover 전환 시 | `this.callbacks?.onGameOver?.(this.score)` 1회 호출 |
| missioncomplete 전환 시 | `this.callbacks?.onMissionComplete?.(this.score)` 1회 호출 |

> 그 외 게임 로직(update, draw, loadStage 등)은 **일절 변경하지 않는다.**

---

## Phase 9 완료 기준

- [ ] 앱 시작 시 메인화면(타이틀·메뉴)이 표시된다
- [ ] ↑↓ 키로 메뉴 항목을 선택할 수 있다
- [ ] GAME START → Enter로 게임이 시작된다
- [ ] 게임 오버 시 결과 화면(점수 표시)이 표시된다
- [ ] 미션 클리어 시 결과 화면(점수 표시)이 표시된다
- [ ] 결과 화면에서 Enter를 누르면 타이틀로 복귀한다
- [ ] 하이스코어가 localStorage에 저장된다
- [ ] 새로고침 후에도 하이스코어가 유지된다
- [ ] 신기록 달성 시 결과 화면에 강조 표시된다
