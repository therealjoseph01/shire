import { useEffect, useRef } from 'react'
import { registerScene, onScene, story } from '../story/runtime.js'

// A scene is a tall, empty stretch of scroll (the timeline) plus a fixed layer for its copy and widgets.
// The copy lives in real DOM, in reading order, so it's indexable and screen-reader friendly.
export function Scene({ id, label, children, className = '' }) {
  const sec = useRef(null)
  const layer = useRef(null)
  const s = story.scenes.find((x) => x.id === id)
  useEffect(() => registerScene(id, sec.current, layer.current), [id])
  return (
    <section id={id} ref={sec} className={`scene scene-${id} ${className}`} style={{ '--len': s.len }} aria-label={label}>
      <div className="scene-layer" ref={layer}>
        {children}
      </div>
    </section>
  )
}

// A line of copy that fades in over [a,b] and out over [c,d] of the scene's progress.
export function Beat({ at, as: Tag = 'div', className = '', children, ...rest }) {
  return (
    <Tag data-beat={at} className={`beat ${className}`} {...rest}>
      {children}
    </Tag>
  )
}

export function useScene(id, fn, deps = []) {
  const ref = useRef(fn)
  ref.current = fn
  useEffect(() => onScene(id, (st) => ref.current(st)), [id, ...deps])
}
