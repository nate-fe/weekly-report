import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'

const POPUP_W = 280
const POPUP_H = 310

export default function PickerPopup({ open, anchorRef, onClose, children }) {
  const popupRef = useRef(null)
  const [pos, setPos] = useState(null)

  useEffect(() => {
    if (!open) {
      setPos(null)
      return
    }

    const place = () => {
      const el = anchorRef.current
      if (!el) return

      const r = el.getBoundingClientRect()
      let left = r.left
      if (left + POPUP_W > window.innerWidth - 8) left = window.innerWidth - POPUP_W - 8
      if (left < 8) left = 8

      const spaceBelow = window.innerHeight - r.bottom
      const top = spaceBelow >= POPUP_H || spaceBelow >= r.top
        ? r.bottom + 4
        : Math.max(8, r.top - POPUP_H - 4)

      setPos({ left, top })
    }

    place()

    const close = (e) => {
      if (anchorRef.current?.contains(e.target)) return
      if (popupRef.current?.contains(e.target)) return
      onClose()
    }

    document.addEventListener('mousedown', close)
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      document.removeEventListener('mousedown', close)
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [open, onClose, anchorRef])

  if (!open || !pos) return null

  return createPortal(
    <div
      ref={popupRef}
      className="picker-popup picker-popup-portal"
      style={{ left: pos.left, top: pos.top }}
    >
      {children}
    </div>,
    document.body,
  )
}
