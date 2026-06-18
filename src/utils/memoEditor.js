export const MEMO_FONT_SIZES = [
  { label: '작게', value: 12 },
  { label: '보통', value: 14 },
  { label: '크게', value: 18 },
  { label: '아주 크게', value: 24 },
]

export function applyMemoFontSize(editorEl, sizePx) {
  if (!editorEl) return

  editorEl.focus()
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return

  const range = selection.getRangeAt(0)
  const px = Number(sizePx)
  if (!px) return

  if (range.collapsed) {
    const span = document.createElement('span')
    span.style.fontSize = `${px}px`
    span.appendChild(document.createTextNode('\u200B'))
    range.insertNode(span)
    const cursor = document.createRange()
    cursor.setStart(span.firstChild, 1)
    cursor.collapse(true)
    selection.removeAllRanges()
    selection.addRange(cursor)
    return
  }

  try {
    const span = document.createElement('span')
    span.style.fontSize = `${px}px`
    range.surroundContents(span)
    selection.removeAllRanges()
    const next = document.createRange()
    next.selectNodeContents(span)
    selection.addRange(next)
  } catch {
    const text = range.toString()
    range.deleteContents()
    const span = document.createElement('span')
    span.style.fontSize = `${px}px`
    span.textContent = text
    range.insertNode(span)
    selection.removeAllRanges()
    const next = document.createRange()
    next.selectNodeContents(span)
    selection.addRange(next)
  }
}

export const MEMO_TEXT_COLORS = [
  { label: '기본', value: '#172b4d' },
  { label: '빨강', value: '#de350b' },
  { label: '주황', value: '#ff8b00' },
  { label: '초록', value: '#00875a' },
  { label: '파랑', value: '#0052cc' },
  { label: '보라', value: '#6554c0' },
  { label: '회색', value: '#6b778c' },
]

export function escapeHtml(text) {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function isMemoHtmlContent(content) {
  return /<[a-z][\s\S]*>/i.test((content || '').trim())
}

/** plain text → HTML (기존 메모 호환) */
export function normalizeMemoContentHtml(content) {
  const raw = content || ''
  if (!raw.trim()) return ''
  if (isMemoHtmlContent(raw)) return raw

  return raw
    .split('\n')
    .map(line => (line ? `<p>${escapeHtml(line)}</p>` : '<p><br></p>'))
    .join('')
}

export function memoContentPreview(content, maxLen = 40) {
  const html = normalizeMemoContentHtml(content)
  const text = html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!text) return ''
  return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text
}

export function createTodoListHtml() {
  return [
    '<ul class="memo-todo-list">',
    '<li class="memo-todo-item">',
    '<label contenteditable="false">',
    '<input type="checkbox">',
    '<span class="memo-todo-text" contenteditable="true">할 일</span>',
    '</label>',
    '</li>',
    '</ul>',
    '<p><br></p>',
  ].join('')
}
