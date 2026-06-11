import { useEffect, useRef } from 'react'
import { GameEngine } from '../game/GameEngine'
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../game/constants'

type Props = {
  onGameOver: (score: number) => void
  onMissionComplete: (score: number) => void
}

export default function GameCanvas({ onGameOver, onMissionComplete }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const engine = new GameEngine(canvasRef.current!, { onGameOver, onMissionComplete })
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
