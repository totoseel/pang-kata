import {
  type BalloonSize,
  BALLOON_BOUNCE_VY,
  BALLOON_COLOR,
  BALLOON_RADIUS,
  BALLOON_VX,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  GRAVITY,
  NEXT_SIZE,
} from '../constants'

export class Balloon {
  readonly size: BalloonSize
  x: number
  y: number
  private vx: number
  private vy: number
  readonly radius: number
  frozen = false
  slowed = false
  private baseVx = 0
  private baseVy = 0

  constructor(size: BalloonSize, x: number, vxDirection: 1 | -1, startY?: number) {
    this.size = size
    this.radius = BALLOON_RADIUS[size]
    this.x = x
    this.y = startY ?? this.radius + 10
    this.vx = BALLOON_VX[size] * vxDirection
    this.vy = startY !== undefined ? BALLOON_BOUNCE_VY[size] : 0
  }

  get currentVx() { return this.vx }

  freeze() { this.frozen = true }
  unfreeze() { this.frozen = false }

  slowDown() {
    if (!this.slowed) {
      this.baseVx = this.vx
      this.baseVy = this.vy
      this.vx *= 0.5
      this.vy *= 0.5
      this.slowed = true
    }
  }

  resetSpeed() {
    if (this.slowed) {
      this.vx = this.baseVx
      this.vy = this.baseVy
      this.slowed = false
    }
  }

  update() {
    if (this.frozen) return
    this.vy += GRAVITY
    this.x += this.vx
    this.y += this.vy

    if (this.x - this.radius < 0) {
      this.x = this.radius
      this.vx = Math.abs(this.vx)
    }
    if (this.x + this.radius > CANVAS_WIDTH) {
      this.x = CANVAS_WIDTH - this.radius
      this.vx = -Math.abs(this.vx)
    }

    if (this.y + this.radius >= CANVAS_HEIGHT) {
      this.y = CANVAS_HEIGHT - this.radius
      this.vy = BALLOON_BOUNCE_VY[this.size]
    }

    if (this.y - this.radius < 0) {
      this.y = this.radius
      this.vy = Math.abs(this.vy)
    }
  }

  reflectX() { this.vx *= -1 }
  reflectY() { this.vy *= -1 }

  getSplitBalloons(): Balloon[] {
    const nextSize = NEXT_SIZE[this.size]
    if (nextSize === null) return []

    return [
      new Balloon(nextSize, this.x, -1, this.y),
      new Balloon(nextSize, this.x, 1, this.y),
    ]
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
    ctx.fillStyle = BALLOON_COLOR[this.size]
    ctx.fill()
    ctx.closePath()
  }
}
