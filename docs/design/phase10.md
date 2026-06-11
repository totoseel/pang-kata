# Phase 10 설계 — UI 완성도 & 전체 polish

## 목표 요약

게임의 시각적 완성도를 높인다.
스테이지 배경, 점수 팝업, 스테이지 번호 표시, 플레이어·풍선·블록의 시각 개선을
통해 "완성된 게임"처럼 보이고 플레이하기 좋은 상태를 만든다.

---

## 개선 항목 6가지

| # | 항목 | 대상 파일 |
|---|------|----------|
| 1 | 스테이지 배경 (하늘·구름 그라디언트) | `GameEngine.ts` |
| 2 | 풍선 시각 개선 (하이라이트·광택) | `Balloon.ts` |
| 3 | 플레이어 시각 개선 (사람 실루엣 형태) | `Player.ts` |
| 4 | 블록 시각 개선 (벽돌 패턴) | `Block.ts` |
| 5 | 점수 팝업 (풍선 터질 때 점수 숫자 표시) | `GameEngine.ts` |
| 6 | 스테이지 시작 전 번호 표시 | `GameEngine.ts` |

> 스프라이트 이미지 없이 Canvas API만으로 구현한다. 외부 에셋 추가 없음.

---

## 기술 결정

| 항목 | 결정 | 이유 |
|------|------|------|
| 배경 그라디언트 | `createLinearGradient`로 스테이지별 색상 적용 | 이미지 없이 분위기 차별화 |
| 스테이지별 배경 색상 | Stage 1: 아침(밝은 파랑), Stage 2: 오후(주황빛), Stage 3: 밤(진한 남색) | PLAN.md의 Morning/Afternoon/Night 테마 반영 |
| 풍선 광택 | `createRadialGradient`로 원 상단에 흰 하이라이트 | 입체감, 기존 `arc` 위에 덧그림 |
| 플레이어 시각 | 원(머리) + 직사각형(몸통) 조합 | 사람 실루엣, 기존 fillRect 대체 |
| 블록 벽돌 패턴 | `fillRect` 반복으로 벽돌 줄눈 그리기 | 이미지 없이 벽돌 느낌 |
| 점수 팝업 | `ScorePopup` 클래스 — 생성 위치에서 위로 떠오르며 페이드아웃 | 30프레임 동안 y 감소 + alpha 감소 |
| 스테이지 번호 표시 | `GameEngine`에 `stageIntroFrames` 카운터 — 스테이지 로드 직후 90프레임 동안 중앙에 표시 | 플레이어가 스테이지 전환을 인지할 수 있도록 |
| `index.css` 정리 | `#root` 레이아웃을 게임 캔버스 중앙 정렬로 단순화 | 현재 `#root`가 블로그 레이아웃(1126px)으로 설정되어 있어 게임 화면이 왼쪽으로 치우침 |

---

## 파일 구조

```
src/
├── index.css                      # #root 스타일 게임용으로 정리
└── game/
    ├── GameEngine.ts              # 배경·팝업·스테이지 인트로 추가
    ├── entities/
    │   ├── Balloon.ts             # 광택 하이라이트 추가
    │   ├── Player.ts              # 사람 실루엣 형태로 draw() 수정
    │   ├── Block.ts               # 벽돌 패턴 draw() 수정
    │   └── ScorePopup.ts          # 신규 — 점수 팝업 엔티티
```

---

## 각 모듈 설계

### `index.css` 수정

`#root`를 게임 캔버스를 화면 중앙에 배치하는 레이아웃으로 변경한다.

```css
#root {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100svh;
  background: #0d0d1a;
}

body {
  margin: 0;
  background: #0d0d1a;
}
```

---

### `ScorePopup.ts` (신규)

```
ScorePopup
  + x, y: number       ← 팝업 시작 위치 (풍선 중심)
  + active: boolean
  - frame: number      ← 0 → POPUP_FRAMES 카운트
  - text: string       ← "+400" 형태

  + update(): void     ← frame++, frame >= POPUP_FRAMES → active = false
  + draw(ctx): void    ← alpha = 1 - frame/POPUP_FRAMES, y -= 0.5/frame
```

**상수** (`constants.ts`에 추가)
```ts
export const POPUP_FRAMES = 50
```

**update()**
```ts
this.frame += 1
this.y -= 0.7
if (this.frame >= POPUP_FRAMES) this.active = false
```

**draw()**
```ts
const alpha = 1 - this.frame / POPUP_FRAMES
ctx.save()
ctx.globalAlpha = alpha
ctx.fillStyle = '#facc15'
ctx.font = 'bold 16px monospace'
ctx.textAlign = 'center'
ctx.fillText(this.text, this.x, this.y)
ctx.restore()
```

---

### `Balloon.ts` — `draw()` 수정

기존 단색 원 위에 방사형 그라디언트로 광택 하이라이트를 추가한다.

```ts
draw(ctx: CanvasRenderingContext2D) {
  // 기존: 단색 원
  ctx.beginPath()
  ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
  ctx.fillStyle = BALLOON_COLOR[this.size]
  ctx.fill()
  ctx.closePath()

  // 추가: 광택 하이라이트
  const highlight = ctx.createRadialGradient(
    this.x - this.radius * 0.3, this.y - this.radius * 0.4, this.radius * 0.05,
    this.x, this.y, this.radius,
  )
  highlight.addColorStop(0, 'rgba(255,255,255,0.55)')
  highlight.addColorStop(0.5, 'rgba(255,255,255,0.0)')
  highlight.addColorStop(1, 'rgba(0,0,0,0.15)')
  ctx.beginPath()
  ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
  ctx.fillStyle = highlight
  ctx.fill()
  ctx.closePath()
}
```

---

### `Player.ts` — `draw()` 수정

기존 단일 `fillRect` 대신 원(머리) + 직사각형(몸통)으로 사람 실루엣을 표현한다.

```ts
draw(ctx: CanvasRenderingContext2D) {
  if (!this.shouldRender()) return

  const headR = 8
  const bodyX = this.x + 4
  const bodyW = this.width - 8
  const bodyY = this.y + headR * 2
  const bodyH = this.height - headR * 2

  // 몸통
  ctx.fillStyle = '#4ade80'
  ctx.fillRect(bodyX, bodyY, bodyW, bodyH)

  // 머리
  ctx.beginPath()
  ctx.arc(this.x + this.width / 2, this.y + headR, headR, 0, Math.PI * 2)
  ctx.fillStyle = '#fde68a'
  ctx.fill()
  ctx.closePath()
}
```

---

### `Block.ts` — `draw()` 수정

`solid` 블록은 회색 벽돌 패턴, `breakable` 블록은 갈색 벽돌 패턴으로 그린다.

```ts
draw(ctx: CanvasRenderingContext2D) {
  const base = this.type === 'solid' ? '#6b7280' : '#92400e'
  const line = this.type === 'solid' ? '#4b5563' : '#78350f'
  const brick = { w: 28, h: this.height }   // 벽돌 1칸 너비

  ctx.fillStyle = base
  ctx.fillRect(this.x, this.y, this.width, this.height)

  // 가로 줄눈
  ctx.strokeStyle = line
  ctx.lineWidth = 1
  for (let row = 0; row < this.height; row += 10) {
    ctx.beginPath()
    ctx.moveTo(this.x, this.y + row)
    ctx.lineTo(this.x + this.width, this.y + row)
    ctx.stroke()
  }

  // 세로 줄눈 (짝수 행·홀수 행 오프셋)
  for (let row = 0; row * 10 < this.height; row++) {
    const offset = (row % 2 === 0) ? 0 : brick.w / 2
    for (let cx = this.x + offset; cx < this.x + this.width; cx += brick.w) {
      ctx.beginPath()
      ctx.moveTo(cx, this.y + row * 10)
      ctx.lineTo(cx, this.y + (row + 1) * 10)
      ctx.stroke()
    }
  }
}
```

---

### `GameEngine.ts` 수정 내용

#### 필드 추가
```ts
private popups: ScorePopup[] = []
private stageIntroFrames = 0
```

#### 배경 — 스테이지별 그라디언트

`draw()` 내 `fillStyle = '#1a1a2e'` 단색 배경을 아래로 교체한다.

```ts
private drawBackground() {
  const gradients: Array<[string, string]> = [
    ['#1a6fa8', '#0d1b4a'],   // Stage 1: 아침 — 밝은 파랑 → 남색
    ['#c2610a', '#1a1a2e'],   // Stage 2: 오후 — 주황빛 → 남색
    ['#0d0d2e', '#000010'],   // Stage 3: 밤 — 진한 남색 → 검정
  ]
  const [top, bottom] = gradients[this.stageIndex] ?? ['#1a1a2e', '#0d0d1a']
  const grad = this.ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT)
  grad.addColorStop(0, top)
  grad.addColorStop(1, bottom)
  this.ctx.fillStyle = grad
  this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
}
```

#### 점수 팝업 생성 — 작살-풍선 충돌 처리 직후

```ts
// 기존 score 누적 코드 바로 뒤
this.popups.push(new ScorePopup(balloon.x, balloon.y, BALLOON_SCORE[balloon.size]))
```

#### 팝업 업데이트 — `update()` 내 아이템 업데이트 근처

```ts
for (const p of this.popups) p.update()
this.popups = this.popups.filter(p => p.active)
```

#### 스테이지 인트로 — `loadStage()` 끝에 추가

```ts
this.stageIntroFrames = 90
```

#### 스테이지 인트로 타이머 감소 — `update()` 내

```ts
if (this.stageIntroFrames > 0) this.stageIntroFrames -= 1
```

#### 스테이지 인트로 중 플레이어·풍선 업데이트 중단

```ts
// update() 상단 상태 분기에 추가
if (this.stageIntroFrames > 0) {
  this.stageIntroFrames -= 1
  this.input.flush()
  return
}
```

#### `draw()` 수정

```ts
private draw() {
  this.drawBackground()                                    // 단색 → 그라디언트
  for (const block of this.blocks) block.draw(this.ctx)
  this.player.draw(this.ctx)
  for (const h of this.harpoons) h.draw(this.ctx)
  for (const balloon of this.balloons) balloon.draw(this.ctx)
  for (const item of this.items) item.draw(this.ctx)
  for (const p of this.popups) p.draw(this.ctx)           // 팝업 렌더
  this.drawHUD(this.ctx)
  if (this.stageIntroFrames > 0) this.drawStageIntro(this.ctx)   // 인트로 오버레이
  if (this.state === 'stageclear') this.drawStageClear(this.ctx)
  if (this.state === 'missioncomplete') this.drawMissionComplete(this.ctx)
  if (this.state === 'gameover') this.drawGameOver(this.ctx)
}
```

#### `drawStageIntro()` 신규 메서드

```ts
private drawStageIntro(ctx: CanvasRenderingContext2D) {
  const alpha = Math.min(1, this.stageIntroFrames / 30)   // 페이드인·아웃
  ctx.save()
  ctx.globalAlpha = alpha * 0.7
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  ctx.globalAlpha = alpha
  ctx.textAlign = 'center'
  ctx.fillStyle = '#facc15'
  ctx.font = 'bold 28px monospace'
  ctx.fillText(`STAGE ${this.stageIndex + 1}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 16)
  const names = ['MORNING', 'AFTERNOON', 'NIGHT']
  ctx.fillStyle = '#ffffff'
  ctx.font = '18px monospace'
  ctx.fillText(names[this.stageIndex] ?? '', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 16)
  ctx.restore()
}
```

---

## 전체 변경 범위 요약

| 파일 | 변경 유형 | 주요 내용 |
|------|----------|----------|
| `index.css` | 수정 | `#root` 중앙 정렬, 배경색 통일 |
| `constants.ts` | 수정 | `POPUP_FRAMES = 50` 추가 |
| `entities/ScorePopup.ts` | 신규 | 점수 팝업 엔티티 |
| `entities/Balloon.ts` | 수정 | `draw()`에 광택 그라디언트 추가 |
| `entities/Player.ts` | 수정 | `draw()`를 원+직사각형 실루엣으로 교체 |
| `entities/Block.ts` | 수정 | `draw()`를 벽돌 패턴으로 교체 |
| `GameEngine.ts` | 수정 | 그라디언트 배경, 팝업 관리, 스테이지 인트로 |

---

## Phase 10 완료 기준

- [ ] 스테이지별 배경 색상이 다르다 (Stage 1: 아침 파랑, Stage 2: 오후 주황, Stage 3: 밤 검정)
- [ ] 풍선에 광택 하이라이트가 보인다
- [ ] 플레이어가 사람 실루엣(머리+몸통) 형태로 표시된다
- [ ] 블록에 벽돌 패턴 줄눈이 보인다
- [ ] 풍선을 터뜨릴 때 점수 숫자 팝업이 위로 떠오른다
- [ ] 스테이지 시작 시 "STAGE N / MORNING·AFTERNOON·NIGHT" 텍스트가 잠깐 표시된다
- [ ] 게임 캔버스가 화면 중앙에 정렬된다
