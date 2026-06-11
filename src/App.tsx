import { useState } from 'react'
import GameCanvas from './components/GameCanvas'
import TitleScreen from './components/TitleScreen'
import ResultScreen from './components/ResultScreen'

type AppState =
  | { screen: 'title' }
  | { screen: 'playing' }
  | { screen: 'result'; reason: 'gameover' | 'missioncomplete'; score: number }

function App() {
  const [appState, setAppState] = useState<AppState>({ screen: 'title' })
  const [highScore, setHighScore] = useState(() =>
    Number(localStorage.getItem('pang_highscore') ?? 0)
  )

  function handleStart() {
    setAppState({ screen: 'playing' })
  }

  function handleEnd(reason: 'gameover' | 'missioncomplete', score: number) {
    if (score > highScore) {
      setHighScore(score)
      localStorage.setItem('pang_highscore', String(score))
    }
    setAppState({ screen: 'result', reason, score })
  }

  function handleBackToTitle() {
    setAppState({ screen: 'title' })
  }

  return (
    <>
      {appState.screen === 'title' && (
        <TitleScreen highScore={highScore} onStart={handleStart} />
      )}
      {appState.screen === 'playing' && (
        <GameCanvas
          onGameOver={score => handleEnd('gameover', score)}
          onMissionComplete={score => handleEnd('missioncomplete', score)}
        />
      )}
      {appState.screen === 'result' && (
        <ResultScreen
          reason={appState.reason}
          score={appState.score}
          highScore={highScore}
          onBack={handleBackToTitle}
        />
      )}
    </>
  )
}

export default App
