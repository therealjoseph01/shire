import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import '@fontsource-variable/plus-jakarta-sans/wght.css'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import './styles.css'
import App from './App.jsx'
import { grainDataURL } from './ui/grain.js'

const root = document.getElementById('root')
const app = (
  <StrictMode>
    <App />
  </StrictMode>
)
if (root.firstElementChild) hydrateRoot(root, app)
else createRoot(root).render(app)

// film grain (generated, 3 KB)
requestAnimationFrame(() => {
  const g = document.querySelector('.stage-grain')
  if (g) g.style.backgroundImage = `url(${grainDataURL()})`
})
