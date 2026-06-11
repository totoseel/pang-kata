import { useEffect } from 'react'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../game/constants'

type Props = {
  reason: 'gameover' | 'missioncomplete'
  score: number
  highScore: number
  onBack: () => void
}

export default function ResultScreen({ reason, score, highScore, onBack }: Props) {
  const isNewRecord = score >= highScore && score > 0

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Enter') onBack()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onBack])

  return (
    <div style={{
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      background: '#1a1a2e',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'monospace',
      color: '#ffffff',
    }}>
      <div style={{
        fontSize: reason === 'missioncomplete' ? 34 : 48,
        fontWeight: 'bold',
        color: reason === 'missioncomplete' ? '#facc15' : '#f87171',
        letterSpacing: 4,
        marginBottom: 48,
        textAlign: 'center',
        lineHeight: 1.3,
      }}>
        {reason === 'missioncomplete' ? (
          <>MISSION 1<br />COMPLETE!</>
        ) : 'GAME OVER'}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 40 }}>
        <div style={{ fontSize: 20, letterSpacing: 2 }}>
          <span style={{ color: '#888888' }}>SCORE&nbsp;&nbsp;</span>
          <span style={{ color: '#ffffff', fontWeight: 'bold' }}>
            {String(score).padStart(6, '0')}
          </span>
        </div>
        <div style={{ fontSize: 20, letterSpacing: 2 }}>
          <span style={{ color: '#888888' }}>HI&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
          <span style={{ color: '#facc15', fontWeight: 'bold' }}>
            {String(highScore).padStart(6, '0')}
          </span>
        </div>
      </div>

      {isNewRecord && (
        <div style={{
          fontSize: 20,
          fontWeight: 'bold',
          color: '#facc15',
          letterSpacing: 3,
          marginBottom: 40,
          textShadow: '0 0 12px #facc15',
        }}>
          NEW RECORD!
        </div>
      )}

      <div style={{
        fontSize: 14,
        color: '#555555',
        letterSpacing: 2,
        marginTop: isNewRecord ? 0 : 40,
      }}>
        Press ENTER
      </div>
    </div>
  )
}
