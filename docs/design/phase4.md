# Phase 4 설계 — 충돌 판정 & 목숨 시스템

## 목표 요약

플레이어가 풍선에 닿으면 목숨이 1개 줄어든다.
피격 직후 일정 시간 무적 상태(깜빡임)가 부여된다.
목숨이 0이 되면 게임 루프를 멈추고 게임 오버 화면을 표시한다.
목숨 수는 HUD로 화면에 항상 표시된다.

---

## 기술 결정

| 항목 | 결정 | 이유 |
|------|------|------|
| 충돌 판정 방식 | AABB (축 정렬 경계 박스) | 플레이어는 사각형, 풍선은 원 — 원과 사각형의 최근접점 거리 계산 |
| 무적 시간 | 프레임 카운터 (`invincibleFrames` 카운트다운) | 시간 기반보다 구현이 단순하고 게임 루프와 일치 |
| 무적 프레임 수 | 120 프레임 (60fps 기준 약 2초) | 피격 후 재정비할 충분한 시간 |
| 깜빡임 효과 | 무적 중 짝수 프레임에만 플레이어 렌더 | 단순하고 명확한 시각 피드백 |
| 게임 오버 상태 | `GameEngine` 내부 `state: 'playing' \| 'gameover'` 필드 | Phase 9 화면 전환 전까지 엔진 내부에서 관리 |
| 게임 오버 화면 | canvas 위에 직접 텍스트 오버레이 | Phase 9에서 React 화면 전환으로 교체 예정 |
| 목숨 HUD | canvas 상단에 직접 렌더 | 텍스트로 `♥ x3` 표시 |

---

## 플레이어-풍선 충돌 판정

플레이어는 사각형, 풍선은 원이므로 **원-사각형 최근접점 거리**로 판정한다.

```
// 사각형 내에서 원의 중심과 가장 가까운 점을 구한 뒤 거리 비교
const nearestX = clamp(balloon.x, player.x, player.x + player.width)
const nearestY = clamp(balloon.y, player.y, player.y + player.height)
const dx = balloon.x - nearestX
const dy = balloon.y - nearestY
return dx * dx + dy * dy < balloon.radius * balloon.radius
```

무적 상태(`invincibleFrames > 0`)이면 충돌 판정을 건너뛴다.

---

## 파일 구조

```
src/
└── game/
    ├── constants.ts       # 목숨 초기값, 무적 프레임 수 상수 추가
    ├── GameEngine.ts      # 목숨 관리, 충돌 판정, 게임 오버 상태, HUD 렌더 추가
    └── entities/
        └── Player.ts      # invincibleFrames 필드, isInvincible(), tickInvincible() 추가
```

> 신규 파일 없음. 기존 파일 3개 수정.

---

## 각 모듈 설계

### `constants.ts` 추가 내용

```ts
export const PLAYER_LIVES = 3
export const INVINCIBLE_FRAMES = 120
```

---

### `Player.ts` 추가 내용

```
Player (추가)
  - invincibleFrames: number = 0
  + isInvincible(): boolean        ← invincibleFrames > 0
  + tickInvincible(): void         ← invincibleFrames > 0 이면 1씩 감소
  + hit(): void                    ← invincibleFrames = INVINCIBLE_FRAMES 설정
  + shouldRender(): boolean        ← 무적 중 짝수 프레임만 true (깜빡임)
```

**draw() 수정**
- `shouldRender()`가 false이면 아무것도 그리지 않음

```ts
draw(ctx: CanvasRenderingContext2D) {
  if (!this.shouldRender()) return
  ctx.fillStyle = '#4ade80'
  ctx.fillRect(this.x, this.y, this.width, this.height)
}
```

**shouldRender()**
```ts
shouldRender(): boolean {
  if (this.invincibleFrames <= 0) return true
  return Math.floor(this.invincibleFrames / 6) % 2 === 0
}
```
> 6프레임 단위로 on/off 전환 → 약 10Hz 깜빡임

---

### `GameEngine.ts` 수정 내용

**필드 추가**
```ts
private lives: number = PLAYER_LIVES
private state: 'playing' | 'gameover' = 'playing'
```

**update() 수정**
- `state === 'gameover'`이면 즉시 반환 (루프는 계속 돌지만 상태 변경 없음)
- 플레이어 무적 타이머 tick 추가
- 플레이어-풍선 충돌 판정 추가

```
update() 흐름:
  if (state === 'gameover') return

  player.update(input)
  player.tickInvincible()          ← 신규

  // 작살 발사 (기존)
  // 작살 업데이트 (기존)
  // 풍선 업데이트 + 작살-풍선 충돌 (기존)

  // 플레이어-풍선 충돌 판정 (신규)
  if (!player.isInvincible()) {
    for (const balloon of balloons) {
      if (playerHitsBalloon(player, balloon)) {
        lives -= 1
        if (lives <= 0) {
          state = 'gameover'
        } else {
          player.hit()             ← 무적 시작
        }
        break
      }
    }
  }

  input.flush()
```

**draw() 수정**
- HUD 렌더 추가 (목숨 표시)
- `state === 'gameover'`이면 게임 오버 오버레이 추가 렌더

```
draw() 흐름:
  clearRect + 배경
  player.draw(ctx)          ← 깜빡임 포함
  harpoon?.draw(ctx)
  balloons.forEach draw
  drawHUD(ctx)              ← 신규: 목숨 표시
  if (state === 'gameover') drawGameOver(ctx)  ← 신규
```

**drawHUD()**
```ts
private drawHUD(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 18px monospace'
  ctx.fillText(`♥ x${this.lives}`, 12, 24)
}
```

**drawGameOver()**
```ts
private drawGameOver(ctx: CanvasRenderingContext2D) {
  // 반투명 검정 오버레이
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 48px monospace'
  ctx.textAlign = 'center'
  ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2)
  ctx.textAlign = 'left'
}
```

---

## 충돌 판정 함수 — `playerHitsBalloon()`

`GameEngine.ts` 상단 모듈 레벨 함수로 작성 (`harpoonHitsBalloon`과 동일한 위치).

```ts
function playerHitsBalloon(player: Player, balloon: Balloon): boolean {
  const nearestX = Math.max(player.x, Math.min(balloon.x, player.x + player.width))
  const nearestY = Math.max(player.y, Math.min(balloon.y, player.y + player.height))
  const dx = balloon.x - nearestX
  const dy = balloon.y - nearestY
  return dx * dx + dy * dy < balloon.radius * balloon.radius
}
```

---

## 상태 흐름

```
state: 'playing'
    │
    │ 풍선에 피격
    ▼
lives -= 1
    ├─ lives > 0 → player.hit() → 무적 120프레임 → state 유지
    └─ lives === 0 → state = 'gameover'
                         │
                         ▼
                   게임 오버 오버레이 표시
                   (루프는 계속, update는 skip)
```

---

## Phase 4 완료 기준

- [x] 플레이어가 풍선에 닿으면 목숨이 1개 줄어든다
- [x] 피격 후 플레이어가 약 2초간 깜빡이며 무적 상태가 된다
- [x] 무적 중에는 풍선에 닿아도 목숨이 줄지 않는다
- [x] 화면 좌상단에 목숨 수가 표시된다 (`♥ x3` 형식)
- [x] 목숨이 0이 되면 GAME OVER 오버레이가 표시된다
- [x] 게임 오버 후 플레이어·풍선이 멈춘다 (루프는 유지, update만 skip)
