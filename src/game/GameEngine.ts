import { InputManager } from './InputManager'
import { Player } from './entities/Player'
import { Balloon } from './entities/Balloon'
import { Harpoon } from './entities/Harpoon'
import { CANVAS_HEIGHT, CANVAS_WIDTH, PLAYER_LIVES } from './constants'

function harpoonHitsBalloon(harpoon: Harpoon, balloon: Balloon): boolean {
  if (harpoon.x < balloon.x - balloon.radius) return false
  if (harpoon.x > balloon.x + balloon.radius) return false

  const clampedY = Math.max(harpoon.top, Math.min(harpoon.bottom, balloon.y))
  const dy = balloon.y - clampedY
  const dx = balloon.x - harpoon.x
  return dx * dx + dy * dy <= balloon.radius * balloon.radius
}

function playerHitsBalloon(player: Player, balloon: Balloon): boolean {
  const nearestX = Math.max(player.x, Math.min(balloon.x, player.x + player.width))
  const nearestY = Math.max(player.y, Math.min(balloon.y, player.y + player.height))
  const dx = balloon.x - nearestX
  const dy = balloon.y - nearestY
  return dx * dx + dy * dy < balloon.radius * balloon.radius
}

export class GameEngine {
  private ctx: CanvasRenderingContext2D
  private input: InputManager
  private player: Player
  private balloons: Balloon[]
  private harpoon: Harpoon | null = null
  private lives = PLAYER_LIVES
  private state: 'playing' | 'gameover' = 'playing'
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
    if (this.state === 'gameover') return

    this.player.update(this.input)
    this.player.tickInvincible()

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

    // 풍선 업데이트
    for (const balloon of this.balloons) {
      balloon.update()
    }

    // 작살-풍선 충돌
    const toRemove = new Set<Balloon>()
    const toAdd: Balloon[] = []

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

    // 플레이어-풍선 충돌
    if (!this.player.isInvincible()) {
      for (const balloon of this.balloons) {
        if (playerHitsBalloon(this.player, balloon)) {
          this.lives -= 1
          if (this.lives <= 0) {
            this.state = 'gameover'
          } else {
            this.player.hit()
          }
          break
        }
      }
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
    this.drawHUD(this.ctx)
    if (this.state === 'gameover') this.drawGameOver(this.ctx)
  }

  private drawHUD(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 18px monospace'
    ctx.fillText(`♥ x${this.lives}`, 12, 24)
  }

  private drawGameOver(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 48px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2)
    ctx.textAlign = 'left'
  }
}
