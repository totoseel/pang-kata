import { CANVAS_WIDTH, PLAYER_HEIGHT, PLAYER_SPEED, PLAYER_WIDTH } from '../constants'
import type { InputManager } from '../InputManager'

export class Player {
  x: number
  y: number
  readonly width = PLAYER_WIDTH
  readonly height = PLAYER_HEIGHT

  constructor() {
    this.x = CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2
    this.y = 640 - PLAYER_HEIGHT - 16
  }

  update(input: InputManager) {
    if (input.isDown('ArrowLeft')) this.x -= PLAYER_SPEED
    if (input.isDown('ArrowRight')) this.x += PLAYER_SPEED

    this.x = Math.max(0, Math.min(this.x, CANVAS_WIDTH - this.width))
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#4ade80'
    ctx.fillRect(this.x, this.y, this.width, this.height)
  }
}
