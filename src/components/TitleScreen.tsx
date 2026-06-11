import { useEffect, useState } from 'react'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../game/constants'

type Props = {
  highScore: number
  onStart: () => void
}

const MENU_ITEMS = ['GAME START', 'HIGH SCORE'] as const

export default function TitleScreen({ highScore, onStart }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [showHighScore, setShowHighScore] = useState(false)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowUp') {
        setSelectedIndex(i => (i - 1 + MENU_ITEMS.length) % MENU_ITEMS.length)
        setShowHighScore(false)
      } else if (e.key === 'ArrowDown') {
        setSelectedIndex(i => (i + 1) % MENU_ITEMS.length)
        setShowHighScore(false)
      } else if (e.key === 'Enter') {
        if (selectedIndex === 0) {
          onStart()
        } else {
          setShowHighScore(s => !s)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedIndex, onStart])

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
      gap: 0,
    }}>
      <div style={{
        fontSize: 80,
        fontWeight: 'bold',
        color: '#facc15',
        letterSpacing: 12,
        marginBottom: 60,
        textShadow: '0 0 24px #facc15',
      }}>
        PANG
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 60 }}>
        {MENU_ITEMS.map((item, i) => (
          <div key={item} style={{
            fontSize: 22,
            fontWeight: 'bold',
            color: selectedIndex === i ? '#facc15' : '#aaaaaa',
            letterSpacing: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <span style={{ width: 20, display: 'inline-block' }}>
              {selectedIndex === i ? '▶' : ''}
            </span>
            {item}
          </div>
        ))}
      </div>

      <div style={{
        fontSize: 16,
        color: showHighScore ? '#facc15' : '#888888',
        letterSpacing: 2,
        fontWeight: 'bold',
      }}>
        HI&nbsp;&nbsp;{String(highScore).padStart(6, '0')}
      </div>

      <div style={{
        marginTop: 48,
        fontSize: 13,
        color: '#555555',
        letterSpacing: 1,
      }}>
        ↑↓ SELECT &nbsp;&nbsp; ENTER CONFIRM
      </div>
    </div>
  )
}
