import {
  type ItemType,
  CANVAS_HEIGHT,
  ITEM_COLOR,
  ITEM_FALL_SPEED,
  ITEM_LABEL,
  ITEM_LIFETIME_FRAMES,
  ITEM_SIZE,
} from '../constants'

export class Item {
  type: ItemType
  x: number
  y: number
  active = true
  private framesAlive = 0

  constructor(type: ItemType, x: number, y: number) {
    this.type = type
    this.x = x
    this.y = y
  }

  update() {
    this.y += ITEM_FALL_SPEED
    this.framesAlive += 1
    if (this.y + ITEM_SIZE >= CANVAS_HEIGHT) this.active = false
    if (this.framesAlive >= ITEM_LIFETIME_FRAMES) this.active = false
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = ITEM_COLOR[this.type]
    ctx.fillRect(this.x - ITEM_SIZE / 2, this.y - ITEM_SIZE / 2, ITEM_SIZE, ITEM_SIZE)
    ctx.font = '18px serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(ITEM_LABEL[this.type], this.x, this.y)
    ctx.textBaseline = 'alphabetic'
  }
}
