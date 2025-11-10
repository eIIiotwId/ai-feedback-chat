/**
 * Utility functions
 */

export function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string
  )
}

export function formatMessageText(text: string): string {
  // First escape HTML to prevent XSS
  const escaped = escapeHtml(text)

  // Then convert **text** to <strong>text</strong>
  return escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
}

export function scrollChatToBottom(): void {
  const c = document.getElementById('chat-scroll')
  if (c) c.scrollTop = c.scrollHeight
}

export function autoResizeTextarea(textarea: HTMLTextAreaElement): void {
  // Set fixed height and allow scrolling
  const fixedHeight = 60 // Maximum height in pixels (reduced from 120px)
  textarea.style.height = `${fixedHeight}px`
  textarea.style.overflowY = 'auto'
  textarea.style.overflowX = 'hidden'

  // Auto-scroll to bottom when typing (so user sees what they're typing)
  // But only if they're at or near the bottom
  const isNearBottom = textarea.scrollHeight - textarea.scrollTop - textarea.clientHeight < 50
  if (isNearBottom) {
    setTimeout(() => {
      textarea.scrollTop = textarea.scrollHeight
    }, 0)
  }
}
