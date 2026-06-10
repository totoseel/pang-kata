# Phase 7 설계 — 아이템 드롭 시스템

## 목표 요약

풍선을 터뜨리면 확률적으로 아이템이 드롭된다.
아이템은 바닥을 향해 낙하하며, 플레이어가 밟으면 즉시 효과가 발동된다.
바닥에 닿거나 일정 시간이 지나면 소멸한다.

---

## 아이템 6종 효과 정의

| 아이템 | 이모지 | 효과 | 지속 방식 |
|--------|--------|------|----------|
| 시계 | 🕐 | 모든 풍선 이동 일시 정지 | 180프레임 후 해제 |
| 별 | ⭐ | 화면 내 모든 풍선 즉시 제거 (점수 없음) | 즉시 |
| 모래시계 | ⏳ | 풍선 이동 속도 50% 감소 | 180프레임 후 해제 |
| 실드 | 🛡 | 피격 1회 무효화 | 1회 피격 시 소멸 |
| 다이너마이트 | 💣 | 모든 풍선을 Tiny로 축소 (재분열 없음) | 즉시 |
| 보너스 과일 | 🍎 | 점수 +1,000 | 즉시 |

---

## 기술 결정

| 항목 | 결정 | 이유 |
|------|------|------|
| 드롭 확률 | 풍선 파괴 시 30% 확률 | 너무 자주 나오면 전략성 희석, 너무 적으면 존재감 없음 |
| 아이템 낙하 | 매 프레임 고정 속도(`ITEM_FALL_SPEED = 2`)로 y 증가 | 단순하고 예측 가능한 움직임 |
| 아이템 소멸 조건 | 바닥 도달 또는 600프레임(약 10초) 초과 | 무한 대기 방지 |
| 플레이어-아이템 충돌 | AABB (사각형 겹침) | 아이템도 사각형으로 표현 |
| 풍선 정지/감속 | `Balloon`의 `frozen`, `slowed` 상태 플래그 | `update()` 내부에서 상태에 따라 이동 skip 또는 속도 감소 적용 |
| 실드 상태 | `Player`에 `shielded: boolean` 필드 | 피격 시 목숨 차감 대신 실드 해제 |
| 다이너마이트 | 모든 풍선을 `new Balloon('tiny', x, dir, y)`로 교체 | 분열 없이 즉시 Tiny로 대체 |
| 별 | `balloons = []`로 초기화 → 클리어 판정 트리거 안 됨 주의 | 별 사용 시 점수·클리어 보너스 없이 단순 제거만 수행 |

> **별 처리 주의**: 별로 모든 풍선을 제거해도 `balloons.length === 0` 클리어 조건이 발동되면 안 된다. 별 사용 직후 플래그(`starUsed`)를 세워 해당 프레임의 클리어 판정을 건너뛴다.

---

## 파일 구조

```
src/
└── game/
    ├── constants.ts          # 아이템 관련 상수 추가
    ├── GameEngine.ts         # 아이템 드롭/충돌/효과 처리, 실드 피격 로직 수정
    ├── entities/
    │   ├── Balloon.ts        # frozen, slowed 상태, freeze(), slow(), resetSpeed() 추가
    │   ├── Player.ts         # shielded 필드, shield(), consumeShield() 추가
    │   └── Item.ts           # 신규 — 아이템 엔티티
```

---

## 각 모듈 설계

### `constants.ts` 추가 내용

```ts
export type ItemType = 'clock' | 'star' | 'hourglass' | 'shield' | 'dynamite' | 'fruit'

export const ITEM_FALL_SPEED = 2
export const ITEM_SIZE = 28               // 아이템 렌더 크기 (정사각형)
export const ITEM_LIFETIME_FRAMES = 600   // 바닥 미도달 시 최대 생존 프레임
export const ITEM_DROP_CHANCE = 0.3       // 풍선 파괴 시 드롭 확률
export const ITEM_EFFECT_FRAMES = 180     // 시계·모래시계 지속 프레임
export const ITEM_SCORE_BONUS = 1_000     // 보너스 과일 점수

export const ITEM_COLOR: Record<ItemType, string> = {
  clock:     '#facc15',
  star:      '#fbbf24',
  hourglass: '#60a5fa',
  shield:    '#34d399',
  dynamite:  '#f87171',
  fruit:     '#fb923c',
}

export const ITEM_LABEL: Record<ItemType, string> = {
  clock:     '⏰',
  star:      '⭐',
  hourglass: '⏳',
  shield:    '🛡',
  dynamite:  '💣',
  fruit:     '🍎',
}
```

---

### `Item.ts` (신규)

```
Item
  + type: ItemType
  + x, y: number        ← 좌상단 기준
  + active: boolean     ← false가 되면 GameEngine이 제거
  - framesAlive: number ← 매 프레임 증가, ITEM_LIFETIME_FRAMES 초과 시 소멸
  + update(): void      ← y += ITEM_FALL_SPEED, 바닥/수명 초과 시 active = false
  + draw(ctx): void     ← 색상 사각형 + 이모지 텍스트
```

**생성자**: `type`, `x`(풍선 중심), `y`(풍선 중심) 를 받아 아이템 중심을 풍선 위치로 설정

**update()**
```ts
this.y += ITEM_FALL_SPEED
this.framesAlive += 1
if (this.y + ITEM_SIZE >= CANVAS_HEIGHT) this.active = false
if (this.framesAlive >= ITEM_LIFETIME_FRAMES) this.active = false
```

**draw()**
```ts
// 배경 사각형
ctx.fillStyle = ITEM_COLOR[this.type]
ctx.fillRect(this.x - ITEM_SIZE/2, this.y - ITEM_SIZE/2, ITEM_SIZE, ITEM_SIZE)
// 이모지
ctx.font = '18px serif'
ctx.textAlign = 'center'
ctx.textBaseline = 'middle'
ctx.fillText(ITEM_LABEL[this.type], this.x, this.y)
ctx.textBaseline = 'alphabetic'
```

---

### `Balloon.ts` 추가 내용

```ts
frozen = false        // 시계 효과: true이면 update() 이동 skip
slowed = false        // 모래시계 효과: true이면 속도 0.5배 적용
private baseVx: number  // 원래 vx 보관 (감속 해제 시 복원)
private baseVy: number  // 원래 vy 보관

freeze() { this.frozen = true }
unfreeze() { this.frozen = false }
slowDown() {
  if (!this.slowed) {
    this.baseVx = this.vx
    this.baseVy = this.vy
    this.vx *= 0.5
    this.vy *= 0.5
    this.slowed = true
  }
}
resetSpeed() {
  if (this.slowed) {
    this.vx = this.baseVx
    this.vy = this.baseVy
    this.slowed = false
  }
}
```

**update() 수정**
```ts
update() {
  if (this.frozen) return   // 시계 효과 중 이동 없음
  // 기존 물리 로직 그대로
}
```

---

### `Player.ts` 추가 내용

```ts
shielded = false

shield() { this.shielded = true }

consumeShield(): boolean {
  if (this.shielded) {
    this.shielded = false
    return true   // 실드로 피격 흡수
  }
  return false
}
```

---

### `GameEngine.ts` 수정 내용

**필드 추가**
```ts
private items: Item[] = []
private frozenFrames = 0      // 시계 효과 잔여 프레임
private slowedFrames = 0      // 모래시계 효과 잔여 프레임
```

**아이템 드롭 — 작살-풍선 충돌 처리 직후**
```ts
if (Math.random() < ITEM_DROP_CHANCE) {
  const type = randomItemType()   // 6종 균등 확률
  items.push(new Item(type, balloon.x, balloon.y))
}
```

**update() — 아이템 관련 처리 추가**
```ts
// 1. 시계/모래시계 효과 타이머 감소
if (frozenFrames > 0) {
  frozenFrames -= 1
  if (frozenFrames === 0) balloons.forEach(b => b.unfreeze())
}
if (slowedFrames > 0) {
  slowedFrames -= 1
  if (slowedFrames === 0) balloons.forEach(b => b.resetSpeed())
}

// 2. 아이템 낙하 업데이트
for (const item of items) item.update()
items = items.filter(i => i.active)

// 3. 플레이어-아이템 충돌 (AABB)
for (const item of items) {
  if (playerHitsItem(player, item)) {
    applyItem(item.type)
    item.active = false
  }
}
```

**`applyItem(type)` 메서드**
```ts
private applyItem(type: ItemType) {
  switch (type) {
    case 'clock':
      this.frozenFrames = ITEM_EFFECT_FRAMES
      this.balloons.forEach(b => b.freeze())
      break
    case 'star':
      this.starUsed = true       // 클리어 판정 방지 플래그
      this.balloons = []
      this.items = []
      break
    case 'hourglass':
      this.slowedFrames = ITEM_EFFECT_FRAMES
      this.balloons.forEach(b => b.slowDown())
      break
    case 'shield':
      this.player.shield()
      break
    case 'dynamite':
      this.balloons = this.balloons.map(b =>
        new Balloon('tiny', b.x, b.vx >= 0 ? 1 : -1, b.y)
      )
      break
    case 'fruit':
      this.score += ITEM_SCORE_BONUS
      break
  }
}
```

**피격 로직 수정 — 실드 우선 확인**
```ts
if (!this.player.isInvincible()) {
  for (const balloon of this.balloons) {
    if (playerHitsBalloon(this.player, balloon)) {
      if (!this.player.consumeShield()) {   // 실드 없으면 목숨 차감
        this.lives -= 1
        if (this.lives <= 0) this.state = 'gameover'
        else this.player.hit()
      }
      break
    }
  }
}
```

**별 사용 후 클리어 판정 방지**
```ts
// 스테이지 클리어 판정 직전
if (this.starUsed) {
  this.starUsed = false
  // 클리어 판정 건너뜀
} else if (this.balloons.length === 0) {
  // 기존 클리어 처리
}
```

**`playerHitsItem()` 충돌 함수**
```ts
function playerHitsItem(player: Player, item: Item): boolean {
  const half = ITEM_SIZE / 2
  return (
    player.x < item.x + half &&
    player.x + player.width > item.x - half &&
    player.y < item.y + half &&
    player.y + player.height > item.y - half
  )
}
```

**draw() — 아이템 렌더 추가**
```ts
for (const item of this.items) item.draw(this.ctx)
```

**HUD — 실드·시계·모래시계 상태 표시**
```ts
// 우상단 점수 아래에 활성 효과 표시
let effectY = 48
if (this.player.shielded) { ctx.fillText('🛡', CANVAS_WIDTH - 12, effectY); effectY += 22 }
if (this.frozenFrames > 0) { ctx.fillText('⏰', CANVAS_WIDTH - 12, effectY); effectY += 22 }
if (this.slowedFrames > 0) { ctx.fillText('⏳', CANVAS_WIDTH - 12, effectY) }
```

---

## 전체 흐름 요약

```
작살이 풍선에 명중
    ↓
30% 확률로 Item 생성 → balloons 제거 위치에 드롭
    ↓
Item: 매 프레임 y += 2 (낙하)
    ↓
플레이어가 Item 위를 밟음 (AABB 충돌)
    ↓
applyItem() 호출 → 효과 즉시 발동
    ↓
바닥 도달 or 600프레임 초과 → Item 소멸 (효과 없음)
```

---

## Phase 7 완료 기준

- [x] 풍선을 터뜨리면 약 30% 확률로 아이템이 드롭된다
- [x] 아이템이 바닥을 향해 낙하한다
- [x] 플레이어가 밟으면 효과가 즉시 발동된다
- [x] 시계: 풍선이 멈추고 약 3초 후 다시 움직인다
- [x] 별: 모든 풍선이 즉시 사라지고 스테이지 클리어가 발동되지 않는다
- [x] 모래시계: 풍선이 느려지고 약 3초 후 원래 속도로 복귀한다
- [x] 실드: 풍선에 한 번 닿아도 목숨이 줄지 않는다
- [x] 다이너마이트: 모든 풍선이 Tiny로 바뀐다
- [x] 보너스 과일: 점수 +1,000이 즉시 반영된다
- [x] 아이템을 밟지 않고 바닥에 닿으면 사라진다
