import { InputManager } from './InputManager'
import { Player } from './entities/Player'
import { Balloon } from './entities/Balloon'
import { Harpoon } from './entities/Harpoon'
import { Block } from './entities/Block'
import { Item } from './entities/Item'
import { MISSION1_STAGES } from './stages'
import {
  type ItemType,
  BALLOON_SCORE,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  ITEM_DROP_CHANCE,
  ITEM_EFFECT_FRAMES,
  ITEM_SCORE_BONUS,
  ITEM_SIZE,
  PLAYER_LIVES,
  STAGE_CLEAR_BONUS,
  STAGE_CLEAR_FRAMES,
} from './constants'

function harpoonHitsBalloon(harpoon: Harpoon, balloon: Balloon): boolean {
  if (harpoon.x < balloon.x - balloon.radius) return false
  if (harpoon.x > balloon.x + balloon.radius) return false
  const clampedY = Math.max(harpoon.top, Math.min(harpoon.bottom, balloon.y))
  const dy = balloon.y - clampedY
  const dx = balloon.x - harpoon.x
  return dx * dx + dy * dy <= balloon.radius * balloon.radius
}

function randomItemType(): ItemType {
  const types: ItemType[] = ['clock', 'star', 'hourglass', 'shield', 'dynamite', 'fruit']
  return types[Math.floor(Math.random() * types.length)]
}

function playerHitsItem(player: Player, item: Item): boolean {
  const half = ITEM_SIZE / 2
  return (
    player.x < item.x + half &&
    player.x + player.width > item.x - half &&
    player.y < item.y + half &&
    player.y + player.height > item.y - half
  )
}

function playerHitsBalloon(player: Player, balloon: Balloon): boolean {
  const nearestX = Math.max(player.x, Math.min(balloon.x, player.x + player.width))
  const nearestY = Math.max(player.y, Math.min(balloon.y, player.y + player.height))
  const dx = balloon.x - nearestX
  const dy = balloon.y - nearestY
  return dx * dx + dy * dy < balloon.radius * balloon.radius
}

function harpoonHitsBlock(harpoon: Harpoon, block: Block): boolean {
  if (harpoon.x < block.x || harpoon.x > block.x + block.width) return false
  return harpoon.top <= block.y + block.height && harpoon.bottom >= block.y
}

function balloonHitsBlock(balloon: Balloon, block: Block): boolean {
  return (
    balloon.x + balloon.radius > block.x &&
    balloon.x - balloon.radius < block.x + block.width &&
    balloon.y + balloon.radius > block.y &&
    balloon.y - balloon.radius < block.y + block.height
  )
}

function resolveBalloonBlock(balloon: Balloon, block: Block) {
  const overlapLeft   = (balloon.x + balloon.radius) - block.x
  const overlapRight  = (block.x + block.width) - (balloon.x - balloon.radius)
  const overlapTop    = (balloon.y + balloon.radius) - block.y
  const overlapBottom = (block.y + block.height) - (balloon.y - balloon.radius)

  const minH = Math.min(overlapLeft, overlapRight)
  const minV = Math.min(overlapTop, overlapBottom)

  if (minH < minV) {
    balloon.reflectX()
    if (overlapLeft < overlapRight) balloon.x -= overlapLeft
    else balloon.x += overlapRight
  } else {
    balloon.reflectY()
    if (overlapTop < overlapBottom) balloon.y -= overlapTop
    else balloon.y += overlapBottom
  }
}

export class GameEngine {
  private ctx: CanvasRenderingContext2D
  private input: InputManager
  private player: Player
  private balloons: Balloon[]
  private blocks: Block[]
  private harpoon: Harpoon | null = null
  private items: Item[] = []
  private lives = PLAYER_LIVES
  private score = 0
  private stageIndex = 0
  private state: 'playing' | 'stageclear' | 'missioncomplete' | 'gameover' = 'playing'
  private stageClearFrames = 0
  private animFrameId = 0
  private frozenFrames = 0
  private slowedFrames = 0
  private starUsed = false

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!
    this.input = new InputManager()
    this.player = new Player()
    this.balloons = []
    this.blocks = []
    this.loop = this.loop.bind(this)
    this.loadStage(0)
  }

  start() {
    this.animFrameId = requestAnimationFrame(this.loop)
  }

  stop() {
    cancelAnimationFrame(this.animFrameId)
    this.input.destroy()
  }

  private loadStage(index: number) {
    const data = MISSION1_STAGES[index]
    this.balloons = data.balloons.map(b => new Balloon(b.size, b.x, b.vxDir))
    this.blocks = data.blocks.map(b => new Block(b))
    this.harpoon = null
    this.items = []
    this.frozenFrames = 0
    this.slowedFrames = 0
    this.starUsed = false
    this.player = new Player()
    this.stageIndex = index
  }

  private advanceStage() {
    const next = this.stageIndex + 1
    if (next >= MISSION1_STAGES.length) {
      this.state = 'missioncomplete'
    } else {
      this.loadStage(next)
      this.state = 'playing'
    }
  }

  private loop() {
    this.update()
    this.draw()
    this.animFrameId = requestAnimationFrame(this.loop)
  }

  private update() {
    if (this.state === 'gameover' || this.state === 'missioncomplete') return

    if (this.state === 'stageclear') {
      this.stageClearFrames -= 1
      if (this.stageClearFrames <= 0) this.advanceStage()
      return
    }

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

    // 풍선-블록 충돌
    for (const balloon of this.balloons) {
      for (const block of this.blocks) {
        if (balloonHitsBlock(balloon, block)) {
          resolveBalloonBlock(balloon, block)
        }
      }
    }

    // 작살-풍선 충돌
    const toRemove = new Set<Balloon>()
    const toAdd: Balloon[] = []

    if (this.harpoon) {
      for (const balloon of this.balloons) {
        if (harpoonHitsBalloon(this.harpoon, balloon)) {
          this.score += BALLOON_SCORE[balloon.size]
          toAdd.push(...balloon.getSplitBalloons())
          toRemove.add(balloon)
          if (Math.random() < ITEM_DROP_CHANCE) {
            this.items.push(new Item(randomItemType(), balloon.x, balloon.y))
          }
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

    // 작살-블록 충돌
    if (this.harpoon) {
      for (const block of this.blocks) {
        if (harpoonHitsBlock(this.harpoon, block)) {
          this.harpoon.deactivate()
          this.harpoon = null
          block.break()
          break
        }
      }
      this.blocks = this.blocks.filter(b => b.alive)
    }

    // 시계/모래시계 효과 타이머 감소
    if (this.frozenFrames > 0) {
      this.frozenFrames -= 1
      if (this.frozenFrames === 0) this.balloons.forEach(b => b.unfreeze())
    }
    if (this.slowedFrames > 0) {
      this.slowedFrames -= 1
      if (this.slowedFrames === 0) this.balloons.forEach(b => b.resetSpeed())
    }

    // 아이템 낙하 업데이트
    for (const item of this.items) item.update()
    this.items = this.items.filter(i => i.active)

    // 플레이어-아이템 충돌
    for (const item of this.items) {
      if (playerHitsItem(this.player, item)) {
        this.applyItem(item.type)
        item.active = false
      }
    }

    // 스테이지 클리어 판정
    if (this.starUsed) {
      this.starUsed = false
    } else if (this.balloons.length === 0) {
      this.score += STAGE_CLEAR_BONUS
      this.state = 'stageclear'
      this.stageClearFrames = STAGE_CLEAR_FRAMES
      this.input.flush()
      return
    }

    // 플레이어-풍선 충돌
    if (!this.player.isInvincible()) {
      for (const balloon of this.balloons) {
        if (playerHitsBalloon(this.player, balloon)) {
          if (!this.player.consumeShield()) {
            this.lives -= 1
            if (this.lives <= 0) {
              this.state = 'gameover'
            } else {
              this.player.hit()
            }
          }
          break
        }
      }
    }

    this.input.flush()
  }

  private applyItem(type: ItemType) {
    switch (type) {
      case 'clock':
        this.frozenFrames = ITEM_EFFECT_FRAMES
        this.balloons.forEach(b => b.freeze())
        break
      case 'star':
        this.starUsed = true
        this.balloons = []
        this.items = []
        break
      case 'hourglass':
        this.slowedFrames = ITEM_EFFECT_FRAMES
        this.balloons.forEach(b => b.slowDown())
        break
      case 'shield':
        this.player.shield()
        break
      case 'dynamite':
        this.balloons = this.balloons.map(b =>
          new Balloon('tiny', b.x, b.currentVx >= 0 ? 1 : -1, b.y)
        )
        break
      case 'fruit':
        this.score += ITEM_SCORE_BONUS
        break
    }
  }

  private draw() {
    this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    this.ctx.fillStyle = '#1a1a2e'
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    for (const block of this.blocks) block.draw(this.ctx)
    this.player.draw(this.ctx)
    if (this.harpoon) this.harpoon.draw(this.ctx)
    for (const balloon of this.balloons) balloon.draw(this.ctx)
    for (const item of this.items) item.draw(this.ctx)
    this.drawHUD(this.ctx)
    if (this.state === 'stageclear') this.drawStageClear(this.ctx)
    if (this.state === 'missioncomplete') this.drawMissionComplete(this.ctx)
    if (this.state === 'gameover') this.drawGameOver(this.ctx)
  }

  private drawHUD(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 18px monospace'
    ctx.textAlign = 'left'
    ctx.fillText(`♥ x${this.lives}`, 12, 24)
    ctx.textAlign = 'right'
    ctx.fillText(`${this.score}`, CANVAS_WIDTH - 12, 24)
    let effectY = 48
    ctx.font = '18px serif'
    if (this.player.shielded) { ctx.fillText('🛡', CANVAS_WIDTH - 12, effectY); effectY += 22 }
    if (this.frozenFrames > 0) { ctx.fillText('⏰', CANVAS_WIDTH - 12, effectY); effectY += 22 }
    if (this.slowedFrames > 0) { ctx.fillText('⏳', CANVAS_WIDTH - 12, effectY) }
    ctx.textAlign = 'left'
  }

  private drawStageClear(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    ctx.textAlign = 'center'
    ctx.fillStyle = '#facc15'
    ctx.font = 'bold 40px monospace'
    ctx.fillText('STAGE CLEAR!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 24px monospace'
    ctx.fillText(`+${STAGE_CLEAR_BONUS.toLocaleString()}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 24)
    ctx.textAlign = 'left'
  }

  private drawMissionComplete(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    ctx.textAlign = 'center'
    ctx.fillStyle = '#facc15'
    ctx.font = 'bold 36px monospace'
    ctx.fillText('MISSION 1', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 24)
    ctx.fillText('COMPLETE!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 24)
    ctx.textAlign = 'left'
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
