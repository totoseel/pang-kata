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
    const base = this.type === 'solid' ? '#6b7280' : '#92400e'
    const line = this.type === 'solid' ? '#4b5563' : '#78350f'
    const brickW = 28

    ctx.fillStyle = base
    ctx.fillRect(this.x, this.y, this.width, this.height)

    ctx.strokeStyle = line
    ctx.lineWidth = 1

    for (let row = 0; row < this.height; row += 10) {
      ctx.beginPath()
      ctx.moveTo(this.x, this.y + row)
      ctx.lineTo(this.x + this.width, this.y + row)
      ctx.stroke()
    }

    for (let row = 0; row * 10 < this.height; row++) {
      const offset = (row % 2 === 0) ? 0 : brickW / 2
      for (let cx = this.x + offset; cx < this.x + this.width; cx += brickW) {
        ctx.beginPath()
        ctx.moveTo(cx, this.y + row * 10)
        ctx.lineTo(cx, this.y + (row + 1) * 10)
        ctx.stroke()
      }
    }
  }
}
