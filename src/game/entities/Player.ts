import { CANVAS_WIDTH, INVINCIBLE_FRAMES, PLAYER_HEIGHT, PLAYER_SPEED, PLAYER_WIDTH } from '../constants'
import type { InputManager } from '../InputManager'

export class Player {
  x: number
  y: number
  readonly width = PLAYER_WIDTH
  readonly height = PLAYER_HEIGHT
  private invincibleFrames = 0
  shielded = false

  constructor() {
    this.x = CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2
    this.y = 640 - PLAYER_HEIGHT - 16
  }

  update(input: InputManager) {
    if (input.isDown('ArrowLeft')) this.x -= PLAYER_SPEED
    if (input.isDown('ArrowRight')) this.x += PLAYER_SPEED

    this.x = Math.max(0, Math.min(this.x, CANVAS_WIDTH - this.width))
  }

  tickInvincible() {
    if (this.invincibleFrames > 0) this.invincibleFrames -= 1
  }

  isInvincible(): boolean {
    return this.invincibleFrames > 0
  }

  hit() {
    this.invincibleFrames = INVINCIBLE_FRAMES
  }

  shield() { this.shielded = true }

  consumeShield(): boolean {
    if (this.shielded) {
      this.shielded = false
      return true
    }
    return false
  }

  private shouldRender(): boolean {
    if (this.invincibleFrames <= 0) return true
    return Math.floor(this.invincibleFrames / 6) % 2 === 0
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (!this.shouldRender()) return

    const headR = 8
    const bodyX = this.x + 4
    const bodyW = this.width - 8
    const bodyY = this.y + headR * 2
    const bodyH = this.height - headR * 2

    ctx.fillStyle = '#4ade80'
    ctx.fillRect(bodyX, bodyY, bodyW, bodyH)

    ctx.beginPath()
    ctx.arc(this.x + this.width / 2, this.y + headR, headR, 0, Math.PI * 2)
    ctx.fillStyle = '#fde68a'
    ctx.fill()
    ctx.closePath()
  }
}
