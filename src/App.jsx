import { Header } from './ui/Header.jsx'
import { Stage } from './overlay/Stage.jsx'
import { Opening, CameraLabels } from './scenes/Opening.jsx'
import { Seeing } from './scenes/Seeing.jsx'
import { Contrast } from './scenes/Contrast.jsx'
import { Systems } from './scenes/System.jsx'
import { Outcomes } from './scenes/Outcomes.jsx'
import { Epilogue } from './epilogue/Epilogue.jsx'

export default function App() {
  return (
    <>
      <a className="skip" href="#after-close">
        Skip the dinner service
      </a>
      <Header />
      <Stage />
      <CameraLabels />
      <main id="top">
        <Opening />
        <Seeing />
        <Contrast />
        <Systems />
        <Outcomes />
      </main>
      <Epilogue />
    </>
  )
}
