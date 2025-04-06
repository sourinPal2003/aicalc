import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import AdvDrawingCanvas from './components/AdvDrawingCanvas'
function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <AdvDrawingCanvas />
    </>
  )
}

export default App
