# Phase 6 설계 — Mission 1 스테이지 구성 (블록 포함)

## 목표 요약

Mission 1의 3개 스테이지(Morning → Afternoon → Night)를 순서대로 플레이할 수 있다.
스테이지마다 풍선 배치와 블록 구성이 다르며, 블록은 풍선·작살의 이동 경로에 실제로 영향을 준다.
Stage 3 클리어 시 Mission 1 완료 화면을 표시한다.

---

## 기술 결정

| 항목 | 결정 | 이유 |
|------|------|------|
| 스테이지 데이터 구조 | `StageData` 타입 배열로 선언적 정의 | 스테이지 추가·수정이 데이터 변경만으로 가능 |
| 블록 종류 | `'breakable' \| 'solid'` 두 종류 | Phase 6 범위. breakable은 작살에 파괴, solid는 파괴 불가 |
| 블록-풍선 충돌 | 상·하·좌·우 면 중 겹침이 가장 작은 방향으로 튕김 | AABB overlap 방식, 풍선(원)의 AABB로 근사 |
| 블록-작살 충돌 | 작살 x가 블록 범위 내이고 작살 top이 블록 하단 이상이면 충돌 | 수직 선분과 사각형의 교차 판정 |
| 스테이지 인덱스 | `GameEngine` 내부 `stageIndex: number` 필드 | 0→1→2 순서 진행, 3이 되면 Mission Complete |
| Mission Complete | `'missioncomplete'` 상태 추가 | STAGE CLEAR와 별도 화면으로 구분 |

---

## 스테이지 데이터 정의

### `StageData` 타입

```ts
type BlockType = 'breakable' | 'solid'

interface Block {
  x: number
  y: number
  width: number
  height: number
  type: BlockType
}

interface StageData {
  balloons: Array<{ size: BalloonSize; x: number; vxDir: 1 | -1 }>
  blocks: Block[]
}
```

### Mission 1 스테이지 데이터

```
STAGE 1 — Morning (480×640 캔버스 기준)
  풍선: Large 1개 (중앙, 오른쪽)
  블록: 없음

STAGE 2 — Afternoon
  풍선: Large 1개 (좌측, 오른쪽) + Medium 1개 (우측, 왼쪽)
  블록: 파괴 가능 블록 2개
    - (140, 400, 80, 20) breakable
    - (260, 400, 80, 20) breakable

STAGE 3 — Night
  풍선: Large 2개 (좌·우, 서로 반대 방향)
  블록: 파괴 가능 + 파괴 불가 혼합
    - (  0, 360, 100, 20) solid      ← 좌측 벽 돌출
    - (380, 360, 100, 20) solid      ← 우측 벽 돌출
    - (180, 460,  120, 20) breakable ← 중앙 발판
```

---

## 파일 구조

```
src/
└── game/
    ├── constants.ts          # BlockType 타입 추가
    ├── GameEngine.ts         # stageIndex, blocks 관리, 블록 충돌 처리, missioncomplete 상태
    ├── stages.ts             # 신규 — StageData 타입 + MISSION1_STAGES 배열
    └── entities/
        └── Block.ts          # 신규 — Block 엔티티 (update 없음, draw + 충돌 데이터만)
```

---

## 각 모듈 설계

### `stages.ts` (신규)

`StageData` 타입과 `MISSION1_STAGES` 배열을 정의한다.

```ts
import type { BalloonSize } from './constants'

export type BlockType = 'breakable' | 'solid'

export interface BlockData {
  x: number; y: number; width: number; height: number; type: BlockType
}

export interface StageData {
  balloons: Array<{ size: BalloonSize; x: number; vxDir: 1 | -1 }>
  blocks: BlockData[]
}

export const MISSION1_STAGES: StageData[] = [ ... ]  // 3개 스테이지
```

---

### `Block.ts` (신규)

```
Block
  + x, y: number
  + width, height: number
  + type: BlockType
  + alive: boolean          ← false가 되면 GameEngine이 제거
  + break(): void           ← breakable 블록이 작살에 맞을 때 호출
  + draw(ctx): void         ← breakable: 갈색, solid: 회색
```

**draw()**
```ts
draw(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = this.type === 'solid' ? '#6b7280' : '#92400e'
  ctx.fillRect(this.x, this.y, this.width, this.height)
  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 1
  ctx.strokeRect(this.x, this.y, this.width, this.height)
}
```

---

### `GameEngine.ts` 수정 내용

**필드 추가**
```ts
private stageIndex = 0
private blocks: Block[] = []
// state에 'missioncomplete' 추가
private state: 'playing' | 'stageclear' | 'missioncomplete' | 'gameover' = 'playing'
```

**생성자 수정**
```ts
// 기존 하드코딩 제거, loadStage(0)으로 초기화
constructor(canvas) {
  ...
  this.loadStage(0)
}
```

**`loadStage(index)` 신규 메서드**
```ts
private loadStage(index: number) {
  const data = MISSION1_STAGES[index]
  this.balloons = data.balloons.map(b => new Balloon(b.size, b.x, b.vxDir))
  this.blocks = data.blocks.map(b => new Block(b))
  this.harpoon = null
  this.player = new Player()
  this.stageIndex = index
}
```

**`resetStage()` → 스테이지 진행으로 교체**
```ts
private advanceStage() {
  const next = this.stageIndex + 1
  if (next >= MISSION1_STAGES.length) {
    this.state = 'missioncomplete'
  } else {
    this.loadStage(next)
    this.state = 'playing'
  }
}
```
> `stageclear` 카운트다운 종료 시 `resetStage()` 대신 `advanceStage()` 호출

**update() — 블록 충돌 추가**

풍선-블록 충돌:
```
for (each balloon) {
  for (each block) {
    if (balloonHitsBlock(balloon, block)) {
      반사 처리 (겹침 방향으로 튕김)
    }
  }
}
```

작살-블록 충돌:
```
if (harpoon) {
  for (each block) {
    if (harpoonHitsBlock(harpoon, block)) {
      harpoon.deactivate()
      if (block.type === 'breakable') block.break()
      break
    }
  }
  // 비활성 블록 제거
  blocks = blocks.filter(b => b.alive)
}
```

**충돌 함수 — 모듈 레벨**

```ts
// 작살-블록: 작살 x가 블록 x범위 안 && 작살 top이 블록 하단~상단 사이
function harpoonHitsBlock(harpoon: Harpoon, block: Block): boolean {
  if (harpoon.x < block.x || harpoon.x > block.x + block.width) return false
  return harpoon.top <= block.y + block.height && harpoon.bottom >= block.y
}

// 풍선-블록: 풍선 AABB와 블록 AABB 겹침 여부
function balloonHitsBlock(balloon: Balloon, block: Block): boolean {
  return (
    balloon.x + balloon.radius > block.x &&
    balloon.x - balloon.radius < block.x + block.width &&
    balloon.y + balloon.radius > block.y &&
    balloon.y - balloon.radius < block.y + block.height
  )
}
```

**풍선-블록 반사 처리**

겹침(overlap)이 가장 작은 축 방향으로 튕긴다.

```ts
// balloon의 vx, vy를 직접 조정 — Balloon에 reflectX(), reflectY() 메서드 추가
const overlapLeft   = (balloon.x + balloon.radius) - block.x
const overlapRight  = (block.x + block.width) - (balloon.x - balloon.radius)
const overlapTop    = (balloon.y + balloon.radius) - block.y
const overlapBottom = (block.y + block.height) - (balloon.y - balloon.radius)

const minH = Math.min(overlapLeft, overlapRight)
const minV = Math.min(overlapTop, overlapBottom)

if (minH < minV) {
  balloon.reflectX()
  // 위치 보정: 겹침 해소
  if (overlapLeft < overlapRight) balloon.x -= overlapLeft
  else balloon.x += overlapRight
} else {
  balloon.reflectY()
  if (overlapTop < overlapBottom) balloon.y -= overlapTop
  else balloon.y += overlapBottom
}
```

**`Balloon.ts` — `reflectX()`, `reflectY()` 추가**
```ts
reflectX() { this.vx *= -1 }
reflectY() { this.vy *= -1 }
```

**draw() — 블록 렌더 추가**
```ts
for (const block of this.blocks) block.draw(this.ctx)
```

**`drawMissionComplete()` 신규**
```ts
private drawMissionComplete(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  ctx.textAlign = 'center'
  ctx.fillStyle = '#facc15'
  ctx.font = 'bold 36px monospace'
  ctx.fillText('MISSION 1', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 24)
  ctx.fillText('COMPLETE!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 24)
  ctx.textAlign = 'left'
}
```

---

## 스테이지 진행 흐름

```
loadStage(0) — Stage 1: Morning
    │ balloons.length === 0
    ▼
stageclear (3초)
    │
    ▼
advanceStage() → loadStage(1) — Stage 2: Afternoon
    │ balloons.length === 0
    ▼
stageclear (3초)
    │
    ▼
advanceStage() → loadStage(2) — Stage 3: Night
    │ balloons.length === 0
    ▼
stageclear (3초)
    │
    ▼
advanceStage() → stageIndex(3) >= MISSION1_STAGES.length
    │
    ▼
state = 'missioncomplete' (루프 유지, update skip)
```

---

## Phase 6 완료 기준

- [x] Stage 1(Large 1개, 블록 없음) → Stage 2(Large+Medium, breakable 블록) → Stage 3(Large 2개, 혼합 블록) 순서로 진행된다
- [x] 파괴 가능 블록(갈색)은 작살에 맞으면 사라진다
- [x] 파괴 불가 블록(회색)은 작살에 맞아도 사라지지 않고 작살만 소멸한다
- [x] 풍선이 블록에 닿으면 방향이 바뀐다 (통과하지 않는다)
- [x] Stage 3 클리어 후 "MISSION 1 COMPLETE!" 화면이 표시된다
- [x] 목숨과 점수는 스테이지 간 이월된다
