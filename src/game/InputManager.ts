export class InputManager {
  private keys = new Set<string>()
  private pressed = new Set<string>()

  constructor() {
    this.onKeyDown = this.onKeyDown.bind(this)
    this.onKeyUp = this.onKeyUp.bind(this)
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
  }

  private onKeyDown(e: KeyboardEvent) {
    this.keys.add(e.key)
    this.pressed.add(e.key)
  }

  private onKeyUp(e: KeyboardEvent) {
    this.keys.delete(e.key)
  }

  isDown(key: string): boolean {
    return this.keys.has(key)
  }

  isPressed(key: string): boolean {
    return this.pressed.has(key)
  }

  flush() {
    this.pressed.clear()
  }

  destroy() {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
  }
}
