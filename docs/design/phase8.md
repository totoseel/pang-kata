# Phase 8 설계 — 무기 업그레이드 시스템

## 목표 요약

무기 아이템을 획득하면 기본 작살이 강화된 무기로 교체된다.
무기마다 발사 방식이 달라지며, 지속 시간이 끝나면 기본 작살로 복귀한다.
현재 장착 무기는 HUD에 표시된다.

---

## 무기 3종 정의

| 무기 | 이모지 | 발사 방식 | 블록 파괴 | 지속 방식 |
|------|--------|----------|----------|----------|
| 더블 작살 | 🔱 | 좌우 2발 동시 발사, 각각 독립 동작 | 가능 | 600프레임(약 10초) 후 기본 복귀 |
| 파워 작살 | ⚡ | 1발 발사, 천장에 닿으면 고정 후 일정 시간 유지 | 가능 | 천장 고정 후 120프레임 유지, 유지 중 재발사 가능 |
| 발칸 미사일 | 🚀 | 스페이스바를 누르는 동안 연사(6프레임 간격), 발사 수 무제한 | 불가 | 600프레임(약 10초) 후 기본 복귀 |

---

## 기술 결정

| 항목 | 결정 | 이유 |
|------|------|------|
| 무기 타입 표현 | `WeaponType = 'basic' \| 'double' \| 'power' \| 'vulcan'` | 상태를 명확히 구분, switch로 분기 가능 |
| 무기 획득 방법 | Phase 7 아이템 시스템 재활용 — `ItemType`에 `'weapon_double' \| 'weapon_power' \| 'weapon_vulcan'` 추가 | 드롭/낙하/충돌 로직을 그대로 사용 |
| 더블 작살 표현 | `Harpoon` 인스턴스 2개를 배열로 관리 (`harpoons: Harpoon[]`) | 기존 `Harpoon` 클래스 재사용 |
| 파워 작살 "천장 고정" | `Harpoon`에 `pinned: boolean` 상태 추가, pinned이면 `top = 0`으로 고정하고 `pinnedFrames` 카운트다운 | 별도 클래스 없이 기존 확장 |
| 발칸 미사일 연사 | `GameEngine`에서 `vulcanCooldown` 카운터로 6프레임마다 1발 생성 | 단순한 프레임 카운터로 구현 |
| 발칸 블록 미파괴 | 작살-블록 충돌 시 `currentWeapon === 'vulcan'`이면 작살만 소멸, 블록은 `break()` 호출 안 함 | 조건 분기 1줄 추가 |
| 무기 지속 시간 | `weaponFrames` 카운터로 매 프레임 감소, 0이 되면 `currentWeapon = 'basic'` 복귀 | Phase 7 효과 타이머 패턴 그대로 |
| 기존 `harpoon: Harpoon \| null` | `harpoons: Harpoon[]`으로 교체 — basic/power는 최대 1개, double은 최대 2개, vulcan은 무제한 | 단일 필드보다 배열이 더 일관적 |

---

## 파일 구조

```
src/
└── game/
    ├── constants.ts          # 무기 관련 상수 및 타입 추가
    ├── GameEngine.ts         # 무기 발사/업데이트/충돌/효과 처리
    └── entities/
        └── Harpoon.ts        # pinned 상태, pin() 추가
```

> `Item.ts`는 `ItemType`에 무기 3종만 추가하면 되므로 별도 파일 불필요.

---

## 각 모듈 설계

### `constants.ts` 추가 내용

```ts
export type WeaponType = 'basic' | 'double' | 'power' | 'vulcan'

export const WEAPON_DURATION_FRAMES = 600     // 더블·발칸 지속 프레임 (약 10초)
export const POWER_PIN_FRAMES = 120           // 파워 작살 천장 고정 유지 프레임 (약 2초)
export const VULCAN_FIRE_INTERVAL = 6         // 발칸 연사 간격 (프레임)

export const WEAPON_LABEL: Record<WeaponType, string> = {
  basic:  '🗡',
  double: '🔱',
  power:  '⚡',
  vulcan: '🚀',
}
```

`ItemType`에 무기 아이템 3종 추가:

```ts
export type ItemType =
  | 'clock' | 'star' | 'hourglass' | 'shield' | 'dynamite' | 'fruit'
  | 'weapon_double' | 'weapon_power' | 'weapon_vulcan'

// ITEM_COLOR, ITEM_LABEL에도 3종 추가
export const ITEM_COLOR: Record<ItemType, string> = {
  // ...기존...
  weapon_double: '#818cf8',
  weapon_power:  '#fde68a',
  weapon_vulcan: '#6ee7b7',
}

export const ITEM_LABEL: Record<ItemType, string> = {
  // ...기존...
  weapon_double: '🔱',
  weapon_power:  '⚡',
  weapon_vulcan: '🚀',
}
```

---

### `Harpoon.ts` 추가 내용

```ts
pinned = false
private pinnedFrames = 0

pin(duration: number) {
  this.pinned = true
  this.pinnedFrames = duration
}

update() {
  if (this.pinned) {
    this.pinnedFrames -= 1
    if (this.pinnedFrames <= 0) this.active = false
    return
  }
  this.top -= HARPOON_SPEED
  if (this.top <= 0) {
    this.top = 0
    // 파워 작살: 천장 도달 시 고정 (GameEngine에서 pin() 호출)
    // 기본/더블/발칸: 소멸
    this.active = false
  }
}
```

> `pin()` 호출은 `GameEngine`에서 무기 타입에 따라 분기한다. `Harpoon`은 pinned 여부만 관리.

---

### `GameEngine.ts` 수정 내용

**필드 변경**
```ts
// 기존
private harpoon: Harpoon | null = null

// 변경
private harpoons: Harpoon[] = []
private currentWeapon: WeaponType = 'basic'
private weaponFrames = 0        // 더블·발칸 지속 잔여 프레임
private vulcanCooldown = 0      // 발칸 연사 쿨다운
```

**`loadStage()` 초기화 추가**
```ts
this.harpoons = []
this.currentWeapon = 'basic'
this.weaponFrames = 0
this.vulcanCooldown = 0
```

**`applyItem()` 무기 아이템 처리 추가**
```ts
case 'weapon_double':
  this.currentWeapon = 'double'
  this.weaponFrames = WEAPON_DURATION_FRAMES
  break
case 'weapon_power':
  this.currentWeapon = 'power'
  this.weaponFrames = 0   // 파워는 프레임 기반 만료 없음 — 천장 고정 후 자동 복귀
  break
case 'weapon_vulcan':
  this.currentWeapon = 'vulcan'
  this.weaponFrames = WEAPON_DURATION_FRAMES
  break
```

> 파워 작살은 발사한 작살이 천장 고정 → 소멸하면 기본으로 복귀한다 (`weaponFrames`로 관리하지 않음).

**`update()` — 작살 발사 분기**
```ts
// 무기 지속 시간 감소 (더블·발칸)
if (this.weaponFrames > 0) {
  this.weaponFrames -= 1
  if (this.weaponFrames === 0 && this.currentWeapon !== 'power') {
    this.currentWeapon = 'basic'
  }
}

// 발칸 쿨다운 감소
if (this.vulcanCooldown > 0) this.vulcanCooldown -= 1

// 작살 발사
const cx = this.player.x + this.player.width / 2
const py = this.player.y

switch (this.currentWeapon) {
  case 'basic':
    if (this.input.isPressed(' ') && this.harpoons.length === 0) {
      this.harpoons.push(new Harpoon(cx, py))
    }
    break
  case 'double':
    if (this.input.isPressed(' ') && this.harpoons.length === 0) {
      this.harpoons.push(new Harpoon(cx - 10, py))
      this.harpoons.push(new Harpoon(cx + 10, py))
    }
    break
  case 'power':
    if (this.input.isPressed(' ') && this.harpoons.every(h => !h.pinned)) {
      // pinned 작살이 없을 때만 새로 발사 가능
      this.harpoons = this.harpoons.filter(h => h.pinned)
      this.harpoons.push(new Harpoon(cx, py))
    }
    break
  case 'vulcan':
    if (this.input.isDown(' ') && this.vulcanCooldown === 0) {
      this.harpoons.push(new Harpoon(cx, py))
      this.vulcanCooldown = VULCAN_FIRE_INTERVAL
    }
    break
}
```

**`update()` — 작살 업데이트 및 천장 도달 처리**
```ts
for (const h of this.harpoons) {
  const wasAboveFloor = !h.pinned && h.top > 0
  h.update()
  // 파워 작살이 천장에 도달한 시점에 pin
  if (this.currentWeapon === 'power' && wasAboveFloor && h.top === 0 && !h.pinned && h.active) {
    h.pin(POWER_PIN_FRAMES)
  }
}
this.harpoons = this.harpoons.filter(h => h.active)

// 파워 작살: pinned 작살이 모두 소멸되면 기본 복귀
if (this.currentWeapon === 'power' && this.harpoons.length === 0) {
  this.currentWeapon = 'basic'
}
```

**`update()` — 작살-풍선 충돌 처리**

기존 단일 `harpoon` 대신 `harpoons` 배열 순회:

```ts
const toRemove = new Set<Balloon>()
const toAdd: Balloon[] = []

for (const h of this.harpoons) {
  for (const balloon of this.balloons) {
    if (harpoonHitsBalloon(h, balloon)) {
      this.score += BALLOON_SCORE[balloon.size]
      toAdd.push(...balloon.getSplitBalloons())
      toRemove.add(balloon)
      if (Math.random() < ITEM_DROP_CHANCE) {
        this.items.push(new Item(randomItemType(), balloon.x, balloon.y))
      }
      h.deactivate()
      break   // 이 작살은 처리 완료
    }
  }
}
this.harpoons = this.harpoons.filter(h => h.active)
```

**`update()` — 작살-블록 충돌 처리**

```ts
for (const h of this.harpoons) {
  for (const block of this.blocks) {
    if (harpoonHitsBlock(h, block)) {
      h.deactivate()
      if (this.currentWeapon !== 'vulcan') block.break()  // 발칸은 블록 파괴 불가
      break
    }
  }
}
this.harpoons = this.harpoons.filter(h => h.active)
this.blocks = this.blocks.filter(b => b.alive)
```

**`draw()` — 작살 렌더 변경**
```ts
// 기존: if (this.harpoon) this.harpoon.draw(this.ctx)
for (const h of this.harpoons) h.draw(this.ctx)
```

**HUD — 현재 무기 표시**
```ts
// 좌하단 or 좌상단 목숨 옆에 표시
ctx.font = '18px serif'
ctx.textAlign = 'left'
ctx.fillText(WEAPON_LABEL[this.currentWeapon], 12, 48)

// 더블·발칸은 잔여 시간 바 표시 (선택)
if (this.weaponFrames > 0) {
  const ratio = this.weaponFrames / WEAPON_DURATION_FRAMES
  ctx.fillStyle = '#818cf8'
  ctx.fillRect(12, 54, 60 * ratio, 4)
}
```

---

## 전체 흐름 요약

```
아이템 드롭 → weapon_double / weapon_power / weapon_vulcan 중 하나
    ↓
플레이어가 밟음 → applyItem() → currentWeapon 변경
    ↓
스페이스바 입력 → currentWeapon에 따라 발사 분기
    ├─ basic/double: isPressed, harpoons 비어있을 때만 발사
    ├─ power: isPressed, pinned 작살 없을 때 발사 → 천장 도달 시 pin → 120프레임 후 소멸 → basic 복귀
    └─ vulcan: isDown, 6프레임마다 1발 연사, 블록 파괴 불가
    ↓
weaponFrames 0 도달 (더블·발칸) → currentWeapon = 'basic'
```

---

## 고려 사항 (검토 요청)

1. **무기 아이템 드롭 확률**: 현재 Phase 7에서 `randomItemType()`이 9종 중 균등 확률로 선택된다. 무기 3종을 추가하면 전체 9종이 된다. 무기 드롭 빈도가 너무 높거나 낮을 경우 가중치 조정이 필요할 수 있다.

2. **파워 작살 복귀 조건**: "천장 고정 후 소멸 → basic 복귀"로 설계했는데, 발사 후 풍선에 맞아 소멸된 경우에도 basic으로 복귀하는 것이 자연스럽다. 단, 풍선에 맞아 소멸 시 바로 복귀하면 파워 작살을 얻어도 1발에 그칠 수 있다는 점을 감안해야 한다.

3. **더블 작살 발사 조건**: `harpoons.length === 0`일 때만 발사 가능으로 설계했다. 두 발 중 하나가 먼저 소멸해도 나머지 1발이 남아 있으면 재발사 불가 — 이 동작이 맞는지 확인 필요.

---

## Phase 8 완료 기준

- [ ] 무기 아이템(🔱·⚡·🚀)이 드롭되고 밟으면 무기가 교체된다
- [ ] 더블 작살: 좌우 2발이 동시에 발사되고 각각 독립적으로 동작한다
- [ ] 파워 작살: 천장에 닿으면 고정되어 일정 시간 유지되다 사라진다
- [ ] 발칸 미사일: 스페이스바를 누르는 동안 연사된다
- [ ] 발칸 미사일은 블록을 파괴하지 못한다
- [ ] 더블·발칸은 지속 시간이 끝나면 기본 작살로 복귀한다
- [ ] 파워 작살은 고정 작살이 소멸되면 기본 작살로 복귀한다
- [ ] HUD에 현재 장착 무기 아이콘이 표시된다
