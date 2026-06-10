# Phase 3 설계 — 작살 발사 & 풍선 분열

## 목표 요약

스페이스바를 누르면 작살이 위로 발사되고, 풍선에 맞으면 크기에 따라 분열한다.
Tiny 풍선을 맞히면 완전히 소멸한다. 이 Phase에서 팡 게임의 핵심 인터랙션이 완성된다.

---

## 기술 결정

| 항목 | 결정 | 이유 |
|------|------|------|
| 작살 발사 제한 | 화면에 작살이 1개 있을 때 추가 발사 불가 | 원작 팡의 1발 제한 규칙 재현 |
| 발사 입력 방식 | `keydown` 이벤트 1회 감지 (누르고 있어도 1발) | `isDown()` 폴링 방식은 매 프레임 발사되므로 부적합 |
| 작살 소멸 조건 | 천장 도달 또는 풍선 충돌 | 둘 중 하나라도 충족 시 즉시 제거 |
| 풍선 충돌 판정 | 원-선분 최근접 거리 계산 | 작살은 수직선분, 풍선은 원 — 중심에서 선분까지 거리 ≤ radius |
| 분열 방향 | 맞은 풍선의 `vx` 부호를 기준으로 좌(-1)·우(+1) 각 1개 생성 | 원작과 동일한 좌우 분산 패턴 |
| 분열 후 y 위치 | 부모 풍선의 `y` 그대로 상속 | 분열 즉시 위치 튐 방지 |
| 배열 변이 처리 | `update()` 중 배열 직접 변이 금지 — 추가/제거 대상을 별도로 모아 루프 종료 후 처리 | 순회 중 배열 변이로 인한 인덱스 오류 방지 |

---

## 발사 입력 처리 방식

`InputManager`에 `isPressed(key)` 메서드를 추가한다.
`isDown()`은 "지금 눌려 있는가"이고, `isPressed()`는 "이번 프레임에 새로 눌렸는가"이다.
매 프레임 끝에 `flush()`를 호출해 pressed 상태를 초기화한다.

```
InputManager (추가)
  - pressed: Set<string>        ← keydown 시 추가, flush() 시 전체 초기화
  + isPressed(key): boolean     ← 이번 프레임에 새로 눌렸는지
  + flush(): void               ← 프레임 끝에 GameEngine이 호출
```

---

## 파일 구조

```
src/
└── game/
    ├── constants.ts          # 작살 속도 상수 추가
    ├── InputManager.ts       # isPressed(), flush() 추가
    ├── GameEngine.ts         # Harpoon 관리, 충돌·분열 로직 추가
    └── entities/
        ├── Balloon.ts        # getSplitBalloons() 메서드 추가
        └── Harpoon.ts        # 신규 생성
```

---

## 각 모듈 설계

### `constants.ts` 추가 내용

```ts
export const HARPOON_SPEED = 10   // px/frame, 위 방향
```

---

### `InputManager.ts` 추가 내용

```ts
private pressed = new Set<string>()

private onKeyDown(e: KeyboardEvent) {
  this.keys.add(e.key)
  this.pressed.add(e.key)       // ← 추가
}

isPressed(key: string): boolean {
  return this.pressed.has(key)
}

flush() {
  this.pressed.clear()
}
```

---

### `Harpoon.ts` (신규)

```
Harpoon
  + x: number          ← 발사 위치 (플레이어 중앙)
  + top: number        ← 작살 끝 y 좌표 (매 프레임 위로 이동)
  + bottom: number     ← 작살 시작 y 좌표 (플레이어 위치, 고정)
  + active: boolean    ← false가 되면 GameEngine이 제거
  + update(): void     ← top을 HARPOON_SPEED만큼 위로 이동, 천장 도달 시 active = false
  + draw(ctx): void    ← top ~ bottom을 수직선으로 렌더
  + deactivate(): void ← 풍선 충돌 시 GameEngine이 호출
```

**생성자**
- `x`: 플레이어 중앙 x (`player.x + player.width / 2`)
- `bottom`: 플레이어 상단 y (`player.y`)
- `top`: `bottom`과 동일값으로 시작 (첫 프레임부터 위로 이동)

**update()**
```
top -= HARPOON_SPEED
if (top <= 0) → active = false
```

**draw()**
```
ctx.strokeStyle = '#ffffff'
ctx.lineWidth = 2
ctx.beginPath()
ctx.moveTo(x, bottom)
ctx.lineTo(x, top)
ctx.stroke()
```

---

### `Balloon.ts` 추가 내용 — `getSplitBalloons()`

분열 후 생성할 자식 풍선 2개를 반환한다. 호출 시점의 `x`, `y`를 기반으로 생성.

```ts
getSplitBalloons(): Balloon[] {
  const nextSize = NEXT_SIZE[this.size]   // 분열 크기 맵
  if (nextSize === null) return []        // Tiny → 소멸, 빈 배열 반환

  return [
    new Balloon(nextSize, this.x, this.y, -1),  // 왼쪽
    new Balloon(nextSize, this.x, this.y, +1),  // 오른쪽
  ]
}
```

`NEXT_SIZE` 맵 (`constants.ts`에 추가):

```ts
export const NEXT_SIZE: Record<BalloonSize, BalloonSize | null> = {
  large:  'medium',
  medium: 'small',
  small:  'tiny',
  tiny:   null,
}
```

분열된 자식 풍선은 부모의 `y` 위치에서 시작하고, `vy`는 `BALLOON_BOUNCE_VY[nextSize]`로 즉시 설정해 위로 튀어오르게 한다.

**Balloon 생성자 시그니처 변경**:
```ts
// 기존
constructor(size, x, vxDirection)

// 변경 — y를 선택적 인자로 추가 (분열 시 부모 y 상속)
constructor(size, x, vxDirection, startY?: number)
```
`startY`가 없으면 기존대로 `radius + 10`에서 시작.

---

### `GameEngine.ts` 수정 내용

**필드 추가**
```ts
private harpoon: Harpoon | null = null  // null = 현재 발사된 작살 없음
```

**update() 흐름 추가**

```
// 1. 작살 발사
if (input.isPressed('Space') && harpoon === null)
  → harpoon = new Harpoon(player 중앙 x, player 상단 y)

// 2. 작살 업데이트
if (harpoon) {
  harpoon.update()
  if (!harpoon.active) harpoon = null
}

// 3. 충돌 판정 & 분열 처리
if (harpoon) {
  for (each balloon) {
    if (harpoonHitsBalloon(harpoon, balloon)) {
      toAdd.push(...balloon.getSplitBalloons())
      toRemove.add(balloon)
      harpoon.deactivate()
      harpoon = null
      break   // 한 프레임에 1개 풍선만 처리
    }
  }
}

// 4. 배열 갱신 (루프 종료 후)
balloons = balloons.filter(b => !toRemove.has(b))
balloons.push(...toAdd)

// 5. flush
input.flush()
```

**충돌 판정 함수 — `harpoonHitsBalloon()`**

작살은 수직 선분 `(x, top) ~ (x, bottom)`, 풍선은 원 `(cx, cy, r)`.
선분 위의 최근접 점까지의 거리가 반지름 이하이면 충돌.

```ts
function harpoonHitsBalloon(harpoon: Harpoon, balloon: Balloon): boolean {
  if (harpoon.x < balloon.x - balloon.radius) return false
  if (harpoon.x > balloon.x + balloon.radius) return false

  const clampedY = Math.max(harpoon.top, Math.min(harpoon.bottom, balloon.y))
  const dy = balloon.y - clampedY
  const dx = balloon.x - harpoon.x
  return dx * dx + dy * dy <= balloon.radius * balloon.radius
}
```

**draw() 추가**
```ts
if (this.harpoon) this.harpoon.draw(this.ctx)
```

---

## 전체 흐름 요약

```
[Space 키 입력]
    ↓
harpoon === null 확인
    ↓
Harpoon 생성 (플레이어 위치 기준)
    ↓
매 프레임: harpoon.update() → top 위로 이동
    ↓
충돌 판정: harpoon.x가 balloon 범위 내 & 거리 ≤ radius
    ↓ 충돌
balloon.getSplitBalloons() → 자식 풍선 0~2개 반환
balloons 배열에서 부모 제거, 자식 추가
harpoon = null (작살 소멸)
    ↓ 미충돌
top <= 0 → harpoon.active = false → harpoon = null
```

---

## Phase 3 완료 기준

- [x] 스페이스바를 누르면 작살이 위로 발사된다
- [x] 작살이 화면에 있는 동안 추가 발사가 되지 않는다
- [x] 작살이 천장에 닿으면 사라진다
- [x] 작살이 풍선에 맞으면 작살이 사라지고 풍선이 분열된다
- [x] Large → Medium 2개 → Small 4개 → Tiny 8개 순으로 분열된다
- [x] Tiny 풍선을 맞히면 완전히 소멸한다
- [x] 분열된 풍선이 좌우로 퍼지며 정상적으로 바운스한다
