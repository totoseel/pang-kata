# Phase 2 설계 — 풍선 물리 (바운스)

## 목표 요약

Large 풍선 1개가 화면 안에서 물리 법칙에 따라 튀어다닌다.
벽(좌·우)에서는 수평 방향이 반전되고, 바닥에서는 중력에 의해 다시 위로 튀어 오른다.
이 단계에서 풍선 크기별 물리 특성(바운스 높이, 이동 속도)의 기반을 잡는다.

---

## 기술 결정

| 항목 | 결정 | 이유 |
|------|------|------|
| 물리 방식 | 중력 누적 + 바닥 충돌 시 속도 반전 | 실제 팡의 "통통 튀는" 느낌 재현. 단순 사인파보다 자연스러움 |
| 중력 | 매 프레임 `vy += GRAVITY` 누적 | 포물선 궤적이 자연스럽게 표현됨 |
| 바닥 반사 | 바닥 충돌 시 `vy = -BOUNCE_VELOCITY[size]` (고정값 대입) | 매번 동일한 높이로 튀어 게임 예측성 확보. 에너지 감쇠 없음 |
| 벽 반사 | 좌·우 벽 충돌 시 `vx *= -1` | 수평 속도만 반전 |
| 천장 반사 | 천장 충돌 시 `vy = Math.abs(vy)` (아래 방향으로 전환) | 천장에 붙는 현상 방지 |

---

## 풍선 크기별 물리 상수

원작 팡의 느낌을 기준으로 설정한다. 크기가 클수록 높이 튀고, 작을수록 빠르고 낮게 움직인다.

| 크기 | 반지름 | 수평 속도(vx) | 바닥 반사 속도(vy) | 체감 |
|------|--------|-------------|-----------------|------|
| Large | 40px | ±2.0 | -16 | 느리고 높이 튐 |
| Medium | 28px | ±2.5 | -13 | 보통 |
| Small | 18px | ±3.0 | -10 | 빠르고 낮음 |
| Tiny | 10px | ±3.5 | -7 | 매우 빠르고 매우 낮음 |

> Phase 2에서는 Large만 등장. 나머지 크기는 Phase 3 분열 구현 시 사용.

---

## 파일 구조

Phase 1에서 추가되는 파일과 수정되는 파일:

```
src/
└── game/
    ├── constants.ts          # 풍선 물리 상수 추가
    ├── GameEngine.ts         # Balloon 인스턴스 추가, update/draw에 연결
    └── entities/
        └── Balloon.ts        # 신규 생성
```

---

## 각 모듈 설계

### `constants.ts` 추가 내용

```ts
export const GRAVITY = 0.3

export const BALLOON_RADIUS: Record<BalloonSize, number> = {
  large:  40,
  medium: 28,
  small:  18,
  tiny:   10,
}

export const BALLOON_VX: Record<BalloonSize, number> = {
  large:  2.0,
  medium: 2.5,
  small:  3.0,
  tiny:   3.5,
}

export const BALLOON_BOUNCE_VY: Record<BalloonSize, number> = {
  large:  -16,
  medium: -13,
  small:  -10,
  tiny:   -7,
}

export const BALLOON_COLOR: Record<BalloonSize, string> = {
  large:  '#ef4444',
  medium: '#f97316',
  small:  '#eab308',
  tiny:   '#a855f7',
}
```

---

### `BalloonSize` 타입

`constants.ts` 상단에 타입을 정의한다.

```ts
export type BalloonSize = 'large' | 'medium' | 'small' | 'tiny'
```

`enum` 대신 string union을 사용한다 (`erasableSyntaxOnly` 제약 대응).

---

### `Balloon.ts`

```
Balloon
  + size: BalloonSize
  - x, y: number          ← 중심 좌표
  - vx, vy: number        ← 현재 속도
  - radius: number        ← 크기별 반지름
  + update(): void        ← 중력 누적 → 위치 이동 → 경계 반사
  + draw(ctx): void       ← 원(arc) 렌더
```

**생성자**
- `size`, 초기 `x`, 초기 `vx` 방향(+1 또는 -1)을 인자로 받음
- `y`는 항상 화면 상단 근처에서 시작 (`radius + 10`)
- `vy`는 초기값 0 (중력이 누적되며 자연스럽게 아래로 이동)

**update() 흐름**
```
vy += GRAVITY
x += vx
y += vy

// 좌·우 벽 반사
if (x - radius < 0)             → x = radius,            vx = |vx|
if (x + radius > CANVAS_WIDTH)  → x = CANVAS_WIDTH - radius, vx = -|vx|

// 바닥 반사
if (y + radius >= CANVAS_HEIGHT) → y = CANVAS_HEIGHT - radius, vy = BALLOON_BOUNCE_VY[size]

// 천장 반사
if (y - radius < 0)             → y = radius, vy = |vy|
```

**draw()**
- `ctx.arc()`로 원 그리기
- 크기별 색상(`BALLOON_COLOR`) 적용

---

### `GameEngine.ts` 수정 내용

- `balloons: Balloon[]` 필드 추가
- 생성자에서 Large 풍선 1개 초기화 (화면 중앙 상단, 오른쪽 방향)
- `update()`에 `balloon.update()` 호출 추가
- `draw()`에 `balloon.draw(ctx)` 호출 추가

---

## 게임 루프 흐름 (Phase 2 기준)

```
loop()
  ├─ update()
  │   ├─ player.update(input)
  │   └─ balloon.update()        ← 신규
  │       ├─ vy += GRAVITY
  │       ├─ x += vx, y += vy
  │       └─ 벽·바닥·천장 반사 처리
  └─ draw()
      ├─ ctx.clearRect()
      ├─ player.draw(ctx)
      └─ balloon.draw(ctx)       ← 신규
```

---

## 바운스 시각화

```
천장 ─────────────────────────
         ↗         ↘
        ↗             ↘
       ↗                ↘
      ↗                    ↘
바닥 ────────────────────────── ← 여기서 vy = BOUNCE_VY 고정값으로 다시 튀어오름
```

중력이 누적되므로 올라갈 때는 점점 느려지고, 내려올 때는 점점 빨라진다.
바닥에서는 에너지 감쇠 없이 항상 동일한 높이로 튀어올라 게임 예측이 가능하다.

---

## Phase 2 완료 기준

- [x] Large 풍선 1개가 화면에 표시된다
- [x] 풍선이 좌·우 벽에서 수평 방향이 반전된다
- [x] 풍선이 바닥에서 튀어 올라 포물선 궤적을 그린다
- [x] 풍선이 항상 일정한 높이로 튀어오른다 (에너지 감쇠 없음)
- [x] 풍선이 화면 밖으로 이탈하지 않는다
- [x] 플레이어와 풍선이 동시에 화면에 존재한다 (충돌 판정은 Phase 4)
