import { useEffect, useRef, useState } from 'react'
import {
  MEMO_TEXT_COLORS,
  MEMO_FONT_SIZES,
  applyMemoFontSize,
  createTodoListHtml,
  normalizeMemoContentHtml,
} from '../utils/memoEditor'

export default function MemoRichEditor({ pageId, value, onChange, placeholder }) {
  const editorRef = useRef(null)
  const syncingRef = useRef(false)
  const [showColors, setShowColors] = useState(false)
  const [showSizes, setShowSizes] = useState(false)

  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    syncingRef.current = true
    el.innerHTML = normalizeMemoContentHtml(value)
    syncingRef.current = false
  }, [pageId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!showColors && !showSizes) return undefined
    const close = () => {
      setShowColors(false)
      setShowSizes(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [showColors, showSizes])

  const emitChange = () => {
    onChange(editorRef.current?.innerHTML ?? '')
  }

  const focusEditor = () => {
    editorRef.current?.focus()
  }

  const runCommand = (command, commandValue = null) => {
    focusEditor()
    document.execCommand(command, false, commandValue)
    emitChange()
  }

  const insertTodoList = () => {
    focusEditor()
    document.execCommand('insertHTML', false, createTodoListHtml())
    emitChange()
  }

  const applyColor = (color) => {
    runCommand('foreColor', color)
    setShowColors(false)
  }

  const applyFontSize = (sizePx) => {
    applyMemoFontSize(editorRef.current, sizePx)
    emitChange()
    setShowSizes(false)
  }

  const handleInput = () => {
    if (syncingRef.current) return
    emitChange()
  }

  const handleEditorClick = (e) => {
    if (e.target.matches('.memo-todo-list input[type="checkbox"]')) {
      queueMicrotask(emitChange)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key !== 'Enter' || e.shiftKey) return
    if (!e.target.closest('.memo-todo-item')) return

    const item = e.target.closest('.memo-todo-item')
    if (!item) return

    e.preventDefault()
    const list = item.closest('.memo-todo-list')
    if (!list) return

    const next = document.createElement('li')
    next.className = 'memo-todo-item'
    next.innerHTML = [
      '<label contenteditable="false">',
      '<input type="checkbox">',
      '<span class="memo-todo-text" contenteditable="true"><br></span>',
      '</label>',
    ].join('')
    item.after(next)
    next.querySelector('.memo-todo-text')?.focus()
    emitChange()
  }

  return (
    <div className="memo-rich-editor">
      <div className="memo-editor-toolbar" role="toolbar" aria-label="메모 서식">
        <button
          type="button"
          className="memo-toolbar-btn"
          title="굵게"
          onMouseDown={e => e.preventDefault()}
          onClick={() => runCommand('bold')}
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          className="memo-toolbar-btn"
          title="기울임"
          onMouseDown={e => e.preventDefault()}
          onClick={() => runCommand('italic')}
        >
          <em>I</em>
        </button>

        <div className="memo-toolbar-divider" />

        <div className="memo-toolbar-color-wrap">
          <button
            type="button"
            className="memo-toolbar-btn"
            title="글자색"
            onMouseDown={e => e.preventDefault()}
            onClick={e => {
              e.stopPropagation()
              setShowSizes(false)
              setShowColors(v => !v)
            }}
          >
            A
          </button>
          {showColors && (
            <div className="memo-color-picker" onMouseDown={e => e.stopPropagation()}>
              {MEMO_TEXT_COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  className="memo-color-swatch-btn"
                  title={c.label}
                  style={{ color: c.value }}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => applyColor(c.value)}
                >
                  A
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="memo-toolbar-size-wrap">
          <button
            type="button"
            className="memo-toolbar-btn memo-toolbar-btn-wide"
            title="글자 크기"
            onMouseDown={e => e.preventDefault()}
            onClick={e => {
              e.stopPropagation()
              setShowColors(false)
              setShowSizes(v => !v)
            }}
          >
            Tt
          </button>
          {showSizes && (
            <div className="memo-size-picker" onMouseDown={e => e.stopPropagation()}>
              {MEMO_FONT_SIZES.map(s => (
                <button
                  key={s.value}
                  type="button"
                  className="memo-size-option"
                  style={{ fontSize: `${Math.min(s.value, 16)}px` }}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => applyFontSize(s.value)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="memo-toolbar-divider" />

        <button
          type="button"
          className="memo-toolbar-btn"
          title="글머리 기호 목록"
          onMouseDown={e => e.preventDefault()}
          onClick={() => runCommand('insertUnorderedList')}
        >
          •
        </button>
        <button
          type="button"
          className="memo-toolbar-btn"
          title="번호 목록"
          onMouseDown={e => e.preventDefault()}
          onClick={() => runCommand('insertOrderedList')}
        >
          1.
        </button>
        <button
          type="button"
          className="memo-toolbar-btn memo-toolbar-btn-wide"
          title="할 일 체크박스"
          onMouseDown={e => e.preventDefault()}
          onClick={insertTodoList}
        >
          ☑ 할 일
        </button>
      </div>

      <div
        ref={editorRef}
        className="memo-editor-body"
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label={placeholder}
        data-placeholder={placeholder}
        onInput={handleInput}
        onClick={handleEditorClick}
        onKeyDown={handleKeyDown}
        suppressContentEditableWarning
      />
    </div>
  )
}
