import { InputManager } from './InputManager'
import { Player } from './entities/Player'
import { Balloon } from './entities/Balloon'
import { Harpoon } from './entities/Harpoon'
import { Block } from './entities/Block'
import { Item } from './entities/Item'
import { ScorePopup } from './entities/ScorePopup'
import { MISSION1_STAGES } from './stages'
import {
  type ItemType,
  type WeaponType,
  BALLOON_SCORE,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  ITEM_DROP_CHANCE,
  ITEM_EFFECT_FRAMES,
  ITEM_SCORE_BONUS,
  ITEM_SIZE,
  PLAYER_LIVES,
  POWER_PIN_FRAMES,
  STAGE_CLEAR_BONUS,
  STAGE_CLEAR_FRAMES,
  VULCAN_FIRE_INTERVAL,
  WEAPON_DURATION_FRAMES,
  WEAPON_LABEL,
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

type GameCallbacks = {
  onGameOver?: (score: number) => void
  onMissionComplete?: (score: number) => void
}

export class GameEngine {
  private ctx: CanvasRenderingContext2D
  private input: InputManager
  private player: Player
  private balloons: Balloon[]
  private blocks: Block[]
  private harpoons: Harpoon[] = []
  private currentWeapon: WeaponType = 'basic'
  private weaponFrames = 0
  private vulcanCooldown = 0
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
  private popups: ScorePopup[] = []
  private stageIntroFrames = 0
  private callbacks: GameCallbacks
  private endCallbackFired = false

  constructor(canvas: HTMLCanvasElement, callbacks: GameCallbacks = {}) {
    this.ctx = canvas.getContext('2d')!
    this.input = new InputManager()
    this.player = new Player()
    this.balloons = []
    this.blocks = []
    this.callbacks = callbacks
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
    this.harpoons = []
    this.currentWeapon = 'basic'
    this.weaponFrames = 0
    this.vulcanCooldown = 0
    this.items = []
    this.frozenFrames = 0
    this.slowedFrames = 0
    this.starUsed = false
    this.popups = []
    this.player = new Player()
    this.stageIndex = index
    this.stageIntroFrames = 90
  }

  private advanceStage() {
    const next = this.stageIndex + 1
    if (next >= MISSION1_STAGES.length) {
      this.state = 'missioncomplete'
      if (!this.endCallbackFired) {
        this.endCallbackFired = true
        this.callbacks.onMissionComplete?.(this.score)
      }
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

    if (this.stageIntroFrames > 0) {
      this.stageIntroFrames -= 1
      this.input.flush()
      return
    }

    this.player.update(this.input)
    this.player.tickInvincible()

    // 무기 지속 시간 감소 (더블·발칸)
    if (this.weaponFrames > 0) {
      this.weaponFrames -= 1
      if (this.weaponFrames === 0 && this.currentWeapon !== 'power') {
        this.currentWeapon = 'basic'
      }
    }

    // 발칸 쿨다운 감소
    if (this.vulcanCooldown > 0) this.vulcanCooldown -= 1

    // 작살 발사
    const cx = this.player.x + this.player.width / 2
    const py = this.player.y
    switch (this.currentWeapon) {
      case 'basic':
        if (this.input.isPressed(' ') && this.harpoons.length === 0) {
          this.harpoons.push(new Harpoon(cx, py))
        }
        break
      case 'double':
        if (this.input.isPressed(' ') && this.harpoons.length === 0) {
          this.harpoons.push(new Harpoon(cx - 10, py))
          this.harpoons.push(new Harpoon(cx + 10, py))
        }
        break
      case 'power':
        if (this.input.isPressed(' ') && this.harpoons.every(h => !h.pinned)) {
          this.harpoons = []
          this.harpoons.push(new Harpoon(cx, py))
        }
        break
      case 'vulcan':
        if (this.input.isDown(' ') && this.vulcanCooldown === 0) {
          this.harpoons.push(new Harpoon(cx, py))
          this.vulcanCooldown = VULCAN_FIRE_INTERVAL
        }
        break
    }

    // 작살 업데이트 및 파워 작살 천장 도달 시 고정
    for (const h of this.harpoons) {
      const wasMoving = !h.pinned && h.top > 0
      h.update()
      if (this.currentWeapon === 'power' && wasMoving && h.top === 0 && !h.pinned && h.active) {
        h.pin(POWER_PIN_FRAMES)
      }
    }
    this.harpoons = this.harpoons.filter(h => h.active)

    // 파워 작살: 모든 작살 소멸 시 기본 복귀
    if (this.currentWeapon === 'power' && this.harpoons.length === 0) {
      this.currentWeapon = 'basic'
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

    for (const h of this.harpoons) {
      for (const balloon of this.balloons) {
        if (harpoonHitsBalloon(h, balloon)) {
          this.score += BALLOON_SCORE[balloon.size]
          this.popups.push(new ScorePopup(balloon.x, balloon.y, BALLOON_SCORE[balloon.size]))
          toAdd.push(...balloon.getSplitBalloons())
          toRemove.add(balloon)
          if (Math.random() < ITEM_DROP_CHANCE) {
            this.items.push(new Item(randomItemType(), balloon.x, balloon.y))
          }
          h.deactivate()
          break
        }
      }
    }
    this.harpoons = this.harpoons.filter(h => h.active)

    if (toRemove.size > 0) {
      this.balloons = this.balloons.filter(b => !toRemove.has(b))
      this.balloons.push(...toAdd)
    }

    // 작살-블록 충돌
    for (const h of this.harpoons) {
      for (const block of this.blocks) {
        if (harpoonHitsBlock(h, block)) {
          h.deactivate()
          if (this.currentWeapon !== 'vulcan') block.break()
          break
        }
      }
    }
    this.harpoons = this.harpoons.filter(h => h.active)
    this.blocks = this.blocks.filter(b => b.alive)

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

    // 점수 팝업 업데이트
    for (const p of this.popups) p.update()
    this.popups = this.popups.filter(p => p.active)

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
              if (!this.endCallbackFired) {
                this.endCallbackFired = true
                this.callbacks.onGameOver?.(this.score)
              }
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
      case 'weapon_double':
        this.currentWeapon = 'double'
        this.weaponFrames = WEAPON_DURATION_FRAMES
        break
      case 'weapon_power':
        this.currentWeapon = 'power'
        this.weaponFrames = 0
        break
      case 'weapon_vulcan':
        this.currentWeapon = 'vulcan'
        this.weaponFrames = WEAPON_DURATION_FRAMES
        break
    }
  }

  private drawBackground() {
    const gradients: Array<[string, string]> = [
      ['#1a6fa8', '#0d1b4a'],
      ['#c2610a', '#1a1a2e'],
      ['#0d0d2e', '#000010'],
    ]
    const [top, bottom] = gradients[this.stageIndex] ?? ['#1a1a2e', '#0d0d1a']
    const grad = this.ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT)
    grad.addColorStop(0, top)
    grad.addColorStop(1, bottom)
    this.ctx.fillStyle = grad
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  }

  private draw() {
    this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    this.drawBackground()
    for (const block of this.blocks) block.draw(this.ctx)
    this.player.draw(this.ctx)
    for (const h of this.harpoons) h.draw(this.ctx)
    for (const balloon of this.balloons) balloon.draw(this.ctx)
    for (const item of this.items) item.draw(this.ctx)
    for (const p of this.popups) p.draw(this.ctx)
    this.drawHUD(this.ctx)
    if (this.stageIntroFrames > 0) this.drawStageIntro(this.ctx)
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
    ctx.fillText(WEAPON_LABEL[this.currentWeapon], 12, 48)
    if (this.weaponFrames > 0) {
      const ratio = this.weaponFrames / WEAPON_DURATION_FRAMES
      ctx.fillStyle = '#818cf8'
      ctx.fillRect(12, 54, 60 * ratio, 4)
    }
  }

  private drawStageIntro(ctx: CanvasRenderingContext2D) {
    const alpha = Math.min(1, this.stageIntroFrames / 30)
    ctx.save()
    ctx.globalAlpha = alpha * 0.7
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    ctx.globalAlpha = alpha
    ctx.textAlign = 'center'
    ctx.fillStyle = '#facc15'
    ctx.font = 'bold 28px monospace'
    ctx.fillText(`STAGE ${this.stageIndex + 1}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 16)
    const names = ['MORNING', 'AFTERNOON', 'NIGHT']
    ctx.fillStyle = '#ffffff'
    ctx.font = '18px monospace'
    ctx.fillText(names[this.stageIndex] ?? '', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 16)
    ctx.restore()
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
