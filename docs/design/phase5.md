# Phase 5 설계 — 스테이지 클리어 & 점수

## 목표 요약

풍선을 터뜨릴 때마다 크기별 점수가 누적되고, 화면 상단 HUD에 표시된다.
모든 풍선을 제거하면 스테이지 클리어 보너스(10,000점)가 추가되고 "STAGE CLEAR" 메시지를 잠시 표시한 뒤 풍선을 초기 상태로 리셋해 다음 스테이지처럼 재시작한다.

> Phase 6에서 실제 다중 스테이지 데이터 구조로 교체 예정. 이번 Phase는 클리어 판정·점수·전환 흐름의 뼈대를 만드는 것이 목표다.

---

## 기술 결정

| 항목 | 결정 | 이유 |
|------|------|------|
| 클리어 판정 | `balloons.length === 0` | 작살-풍선 충돌 처리 후 배열이 비면 즉시 감지 |
| 클리어 연출 | `stageclear` 상태 + 프레임 카운터로 대기 후 리셋 | 즉시 전환 시 클리어 인지 불가, 타이머 없이 프레임으로 관리 |
| 클리어 대기 시간 | 180 프레임 (60fps 기준 약 3초) | 메시지를 충분히 인지할 시간 |
| 점수 누적 시점 | 작살이 풍선에 맞는 순간 (분열 전 부모 풍선 크기 기준) | 분열된 자식이 아닌 직접 터뜨린 풍선에 점수 부여 |
| 점수 HUD 위치 | 화면 우상단 | 목숨(좌상단)과 겹치지 않도록 분리 |
| 스테이지 리셋 | 풍선 배열을 초기 구성으로 복원, 플레이어 위치 리셋 | Phase 6에서 스테이지 데이터로 교체 예정 |

---

## 점수 체계

| 풍선 크기 | 점수 |
|-----------|------|
| Large | 100점 |
| Medium | 200점 |
| Small | 300점 |
| Tiny | 400점 |
| 스테이지 클리어 보너스 | 10,000점 |

`constants.ts`에 상수로 정의한다.

```ts
export const BALLOON_SCORE: Record<BalloonSize, number> = {
  large:  100,
  medium: 200,
  small:  300,
  tiny:   400,
}

export const STAGE_CLEAR_BONUS = 10_000
export const STAGE_CLEAR_FRAMES = 180
```

---

## 파일 구조

```
src/
└── game/
    ├── constants.ts     # BALLOON_SCORE, STAGE_CLEAR_BONUS, STAGE_CLEAR_FRAMES 추가
    └── GameEngine.ts    # score 필드, 클리어 판정, stageclear 상태, HUD 점수 표시 추가
```

> 신규 파일 없음. 기존 파일 2개 수정.

---

## 각 모듈 설계

### `GameEngine.ts` 수정 내용

**필드 추가**
```ts
private score = 0
private stageClearFrames = 0
// state에 'stageclear' 추가
private state: 'playing' | 'stageclear' | 'gameover' = 'playing'
```

**update() 수정**

`stageclear` 상태일 때는 카운트다운만 처리하고 게임 로직은 skip한다.

```
if (state === 'gameover') return

if (state === 'stageclear') {
  stageClearFrames -= 1
  if (stageClearFrames <= 0) resetStage()
  return
}

// ... 기존 로직 (플레이어 이동, 작살, 풍선, 충돌) ...

// 작살-풍선 충돌 처리 시 점수 추가 (신규)
if (harpoonHitsBalloon) {
  score += BALLOON_SCORE[balloon.size]
  ...
}

// 스테이지 클리어 판정 (신규)
if (balloons.length === 0) {
  score += STAGE_CLEAR_BONUS
  state = 'stageclear'
  stageClearFrames = STAGE_CLEAR_FRAMES
}
```

**resetStage()**
```ts
private resetStage() {
  this.balloons = [new Balloon('large', CANVAS_WIDTH / 2, 1)]
  this.harpoon = null
  this.player = new Player()
  this.state = 'playing'
}
```

**draw() 수정**

`stageclear` 상태일 때 STAGE CLEAR 오버레이를 추가 렌더한다.

```
draw():
  clearRect + 배경
  player.draw(ctx)
  harpoon?.draw(ctx)
  balloons.forEach draw
  drawHUD(ctx)                                        ← 점수 표시 추가
  if (state === 'stageclear') drawStageClear(ctx)     ← 신규
  if (state === 'gameover') drawGameOver(ctx)
```

**drawHUD() 수정** — 점수 우상단 추가

```ts
private drawHUD(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 18px monospace'
  // 목숨 (좌상단, 기존)
  ctx.textAlign = 'left'
  ctx.fillText(`♥ x${this.lives}`, 12, 24)
  // 점수 (우상단, 신규)
  ctx.textAlign = 'right'
  ctx.fillText(`${this.score}`, CANVAS_WIDTH - 12, 24)
  ctx.textAlign = 'left'
}
```

**drawStageClear()**
```ts
private drawStageClear(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  ctx.fillStyle = '#facc15'
  ctx.font = 'bold 40px monospace'
  ctx.textAlign = 'center'
  ctx.fillText('STAGE CLEAR!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20)
  ctx.font = 'bold 24px monospace'
  ctx.fillStyle = '#ffffff'
  ctx.fillText(`+${STAGE_CLEAR_BONUS.toLocaleString()}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 24)
  ctx.textAlign = 'left'
}
```

---

## 상태 흐름

```
state: 'playing'
    │
    │ balloons.length === 0
    ▼
score += 10,000
state = 'stageclear'
stageClearFrames = 180
    │
    │ 180프레임 카운트다운
    ▼
resetStage() → 풍선 초기화, 플레이어 위치 리셋
state = 'playing'
```

---

## Phase 5 완료 기준

- [x] 풍선을 터뜨릴 때마다 크기별 점수가 우상단에 누적 표시된다
- [x] Large(100) < Medium(200) < Small(300) < Tiny(400) 순으로 점수가 맞게 오르는가
- [x] 모든 풍선 제거 시 "STAGE CLEAR!" 오버레이와 +10,000 보너스가 표시된다
- [x] 약 3초 후 풍선이 초기 상태로 리셋되며 게임이 재개된다
- [x] 목숨은 스테이지 클리어 시 이월된다 (줄지 않는다)
