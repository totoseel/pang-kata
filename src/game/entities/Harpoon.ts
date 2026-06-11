import { HARPOON_SPEED } from '../constants'

export class Harpoon {
  readonly x: number
  top: number
  readonly bottom: number
  active = true
  pinned = false
  private pinnedFrames = 0

  constructor(x: number, bottom: number) {
    this.x = x
    this.bottom = bottom
    this.top = bottom
  }

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
      this.active = false
    }
  }

  deactivate() {
    this.active = false
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(this.x, this.bottom)
    ctx.lineTo(this.x, this.top)
    ctx.stroke()
  }
}
