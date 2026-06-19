import { useCallback, useEffect, useRef, useState } from 'react'

export function useDraggable(resetKey) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const draggingRef = useRef(false)
  const startRef = useRef({ x: 0, y: 0, ox: 0, oy: 0 })

  useEffect(() => {
    setOffset({ x: 0, y: 0 })
  }, [resetKey])

  useEffect(() => {
    const onMove = (e) => {
      if (!draggingRef.current) return
      setOffset({
        x: startRef.current.ox + e.clientX - startRef.current.x,
        y: startRef.current.oy + e.clientY - startRef.current.y,
      })
    }

    const onUp = () => {
      if (!draggingRef.current) return
      draggingRef.current = false
      document.body.classList.remove('modal-dragging')
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      document.body.classList.remove('modal-dragging')
    }
  }, [])

  const onDragStart = useCallback((e) => {
    if (e.button !== 0) return
    e.preventDefault()
    draggingRef.current = true
    startRef.current = {
      x: e.clientX,
      y: e.clientY,
      ox: offset.x,
      oy: offset.y,
    }
    document.body.classList.add('modal-dragging')
  }, [offset.x, offset.y])

  return { offset, onDragStart }
}
