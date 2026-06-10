import type { BalloonSize } from './constants'

export type BlockType = 'breakable' | 'solid'

export interface BlockData {
  x: number
  y: number
  width: number
  height: number
  type: BlockType
}

export interface StageData {
  balloons: Array<{ size: BalloonSize; x: number; vxDir: 1 | -1 }>
  blocks: BlockData[]
}

export const MISSION1_STAGES: StageData[] = [
  // Stage 1 — Morning
  {
    balloons: [
      { size: 'large', x: 240, vxDir: 1 },
    ],
    blocks: [],
  },
  // Stage 2 — Afternoon
  {
    balloons: [
      { size: 'large',  x: 100, vxDir:  1 },
      { size: 'medium', x: 380, vxDir: -1 },
    ],
    blocks: [
      { x: 140, y: 400, width: 80, height: 20, type: 'breakable' },
      { x: 260, y: 400, width: 80, height: 20, type: 'breakable' },
    ],
  },
  // Stage 3 — Night
  {
    balloons: [
      { size: 'large', x: 100, vxDir:  1 },
      { size: 'large', x: 380, vxDir: -1 },
    ],
    blocks: [
      { x:   0, y: 360, width: 100, height: 20, type: 'solid' },
      { x: 380, y: 360, width: 100, height: 20, type: 'solid' },
      { x: 180, y: 460, width: 120, height: 20, type: 'breakable' },
    ],
  },
]
