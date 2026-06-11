import { POPUP_FRAMES } from '../constants'

export class ScorePopup {
  x: number
  y: number
  active = true
  private frame = 0
  private text: string

  constructor(x: number, y: number, score: number) {
    this.x = x
    this.y = y
    this.text = `+${score}`
  }

  update() {
    this.frame += 1
    this.y -= 0.7
    if (this.frame >= POPUP_FRAMES) this.active = false
  }

  draw(ctx: CanvasRenderingContext2D) {
    const alpha = 1 - this.frame / POPUP_FRAMES
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.fillStyle = '#facc15'
    ctx.font = 'bold 16px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(this.text, this.x, this.y)
    ctx.restore()
  }
}
