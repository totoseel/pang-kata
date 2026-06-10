import type { BlockData, BlockType } from '../stages'

export class Block {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly type: BlockType
  alive = true

  constructor(data: BlockData) {
    this.x = data.x
    this.y = data.y
    this.width = data.width
    this.height = data.height
    this.type = data.type
  }

  break() {
    if (this.type === 'breakable') this.alive = false
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.type === 'solid' ? '#6b7280' : '#92400e'
    ctx.fillRect(this.x, this.y, this.width, this.height)
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 1
    ctx.strokeRect(this.x, this.y, this.width, this.height)
  }
}
