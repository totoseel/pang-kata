import { InputManager } from './InputManager'
import { Player } from './entities/Player'
import { Balloon } from './entities/Balloon'
import { Harpoon } from './entities/Harpoon'
import { CANVAS_HEIGHT, CANVAS_WIDTH } from './constants'

function harpoonHitsBalloon(harpoon: Harpoon, balloon: Balloon): boolean {
  if (harpoon.x < balloon.x - balloon.radius) return false
  if (harpoon.x > balloon.x + balloon.radius) return false

  const clampedY = Math.max(harpoon.top, Math.min(harpoon.bottom, balloon.y))
  const dy = balloon.y - clampedY
  const dx = balloon.x - harpoon.x
  return dx * dx + dy * dy <= balloon.radius * balloon.radius
}

export class GameEngine {
  private ctx: CanvasRenderingContext2D
  private input: InputManager
  private player: Player
  private balloons: Balloon[]
  private harpoon: Harpoon | null = null
  private animFrameId = 0

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!
    this.input = new InputManager()
    this.player = new Player()
    this.balloons = [new Balloon('large', CANVAS_WIDTH / 2, 1)]
    this.loop = this.loop.bind(this)
  }

  start() {
    this.animFrameId = requestAnimationFrame(this.loop)
  }

  stop() {
    cancelAnimationFrame(this.animFrameId)
    this.input.destroy()
  }

  private loop() {
    this.update()
    this.draw()
    this.animFrameId = requestAnimationFrame(this.loop)
  }

  private update() {
    this.player.update(this.input)

    // 작살 발사
    if (this.input.isPressed(' ') && this.harpoon === null) {
      this.harpoon = new Harpoon(
        this.player.x + this.player.width / 2,
        this.player.y,
      )
    }

    // 작살 업데이트
    if (this.harpoon) {
      this.harpoon.update()
      if (!this.harpoon.active) this.harpoon = null
    }

    // 풍선 업데이트 + 충돌 판정
    const toRemove = new Set<Balloon>()
    const toAdd: Balloon[] = []

    for (const balloon of this.balloons) {
      balloon.update()
    }

    if (this.harpoon) {
      for (const balloon of this.balloons) {
        if (harpoonHitsBalloon(this.harpoon, balloon)) {
          toAdd.push(...balloon.getSplitBalloons())
          toRemove.add(balloon)
          this.harpoon.deactivate()
          this.harpoon = null
          break
        }
      }
    }

    if (toRemove.size > 0) {
      this.balloons = this.balloons.filter(b => !toRemove.has(b))
      this.balloons.push(...toAdd)
    }

    this.input.flush()
  }

  private draw() {
    this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    this.ctx.fillStyle = '#1a1a2e'
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    this.player.draw(this.ctx)
    if (this.harpoon) this.harpoon.draw(this.ctx)
    for (const balloon of this.balloons) {
      balloon.draw(this.ctx)
    }
  }
}
