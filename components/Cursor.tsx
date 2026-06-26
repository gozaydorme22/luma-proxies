'use client'

import { useEffect, useRef } from 'react'

export function Cursor() {
  const cursorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = cursorRef.current
    if (!el) return

    let x = -100, y = -100

    const onMove = (e: MouseEvent) => {
      x = e.clientX
      y = e.clientY
      el.style.left = x + 'px'
      el.style.top = y + 'px'
    }

    const onEnter = () => el.classList.add('hovering')
    const onLeave = () => el.classList.remove('hovering')
    const onDown = () => el.classList.add('clicking')
    const onUp = () => el.classList.remove('clicking')

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('mouseup', onUp)

    const interactives = () =>
      document.querySelectorAll('a, button, [role="button"], input, textarea, select, label')

    let targets: NodeListOf<Element>

    const attachHover = () => {
      targets = interactives()
      targets.forEach(t => {
        t.addEventListener('mouseenter', onEnter)
        t.addEventListener('mouseleave', onLeave)
      })
    }

    attachHover()

    // re-attach when DOM changes (modais, etc)
    const obs = new MutationObserver(attachHover)
    obs.observe(document.body, { childList: true, subtree: true })

    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('mouseup', onUp)
      obs.disconnect()
      targets?.forEach(t => {
        t.removeEventListener('mouseenter', onEnter)
        t.removeEventListener('mouseleave', onLeave)
      })
    }
  }, [])

  return <div ref={cursorRef} className="luma-cursor" />
}
