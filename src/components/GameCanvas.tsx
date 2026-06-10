import { useEffect, useRef } from 'react'
import { GameEngine } from '../game/GameEngine'
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../game/constants'

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const engine = new GameEngine(canvasRef.current!)
    engine.start()
    return () => engine.stop()
  }, [])

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
    />
  )
}
