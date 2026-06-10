# AGENTS.md

AI 에이전트(Claude Code 등)가 이 프로젝트에서 작업할 때 참조해야 할 문서 구조와 맥락을 정리한 파일이다.

---

## 프로젝트 개요

PANG 아케이드 게임을 React + Vite + TypeScript로 구현하는 프로젝트.
기술 스택 및 명령어는 `CLAUDE.md` 참조.

---

## 문서 구조

### 기획 문서 (`docs/`)

| 파일 | 내용 |
|------|------|
| `docs/PRD.md` | 게임 전체 개요, 핵심 메커니즘, UI 레이아웃, 점수 체계 |
| `docs/features/main.md` | 메인화면 레이아웃, 메뉴 구성, 화면 전환 흐름 |
| `docs/features/game_rule.md` | 게임 전체 룰 (풍선 메커니즘, 무기, 아이템, 스테이지 요소, 점수) |
| `docs/features/mission1.md` | Mission 1 스테이지별 구성, 난이도 설계, 클리어 조건, 공략 포인트 |
| `docs/PLAN.md` | Phase 별 구현 목표를 세운 파일 |

---

## 작업 시 참조 순서

1. `CLAUDE.md` — 기술 스택, 빌드/실행 명령어
2. `docs/PRD.md` — 게임 전체 방향성 확인
3. `docs/features/game_rule.md` — 구현할 룰의 상세 스펙
4. `docs/features/mission1.md` — Mission 1 구현 시 스테이지 데이터 참조
5. `docs/features/main.md` — 메인화면 구현 시 참조

---

## 구현 시 주의사항

- 풍선 분열 로직(`Large → Medium → Small → Tiny → 소멸`)은 `game_rule.md` 기준으로 구현
- 스테이지별 초기 풍선 배치 데이터는 `mission1.md`의 스테이지 구성 참조
- 무기 교체는 기존 무기를 덮어쓰는 방식 (중첩 없음)
- 점수 체계는 `PRD.md` § 8 참조
