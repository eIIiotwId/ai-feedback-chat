/**
 * Mobile-specific event handlers
 */

import { state } from '../state'
import { autoResizeTextarea, scrollChatToBottom } from '../utils'
import { isMobileScreen } from '../utils/mobile'

export function showMobileConversations(): void {
  state.showMobileConversations = true
  // render() will be called by the caller
}

export function hideMobileConversations(): void {
  state.showMobileConversations = false
  // render() will be called by the caller
}

export function attachMobileChatListeners(
  render: () => void,
  sendMessageHandler: (text: string) => Promise<void>
): void {
  document.getElementById('mobile-conversations-btn')?.addEventListener('click', () => {
    showMobileConversations()
    render()
  })

  const form = document.getElementById('composer') as HTMLFormElement
  form?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const input = document.getElementById('input') as HTMLTextAreaElement
    const text = input.value.trim()
    if (!text) return
    if (text.length > 1000) {
      alert('Message too long')
      return
    }
    input.value = ''
    autoResizeTextarea(input)
    await sendMessageHandler(text)
  })

  const input = document.getElementById('input') as HTMLTextAreaElement
  if (input) {
    input.addEventListener('input', () => {
      autoResizeTextarea(input)
    })

    input.addEventListener(
      'touchmove',
      (e) => {
        e.stopPropagation()
      },
      { passive: true }
    )

    input.addEventListener('scroll', (e) => {
      e.stopPropagation()
    })

    // Handle keyboard open/close with visual viewport API
    const adjustLayoutForKeyboard = () => {
      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0

      const container = document.querySelector('.mobile-chat-dark') as HTMLElement
      const chatScroll = document.getElementById('chat-scroll')
      const header = document.querySelector('.mobile-chat-dark header') as HTMLElement
      const composer = document.getElementById('composer') as HTMLElement
      const inputEl = document.getElementById('input') as HTMLElement

      if (!container || !chatScroll || !header || !composer) return

      const viewportHeight = window.visualViewport
        ? window.visualViewport.height
        : window.innerHeight
      const windowHeight = window.innerHeight
      const headerHeight = header.offsetHeight || 56
      const composerHeight = composer.offsetHeight || 90
      const keyboardHeight = windowHeight - viewportHeight
      const isKeyboardOpen = keyboardHeight > 150
      const isInputFocused = inputEl && document.activeElement === inputEl

      container.scrollTop = 0
      container.style.overflow = 'hidden'
      container.style.height = `${viewportHeight}px`
      container.style.maxHeight = `${viewportHeight}px`

      header.style.top = '0px'
      header.style.position = 'fixed'
      header.style.left = '0'
      header.style.right = '0'
      header.style.zIndex = '30'
      header.style.transform = 'translateZ(0)'

      composer.style.top = 'auto'
      composer.style.bottom = '0px'

      if (isKeyboardOpen && isInputFocused && window.visualViewport) {
        const visualViewport = window.visualViewport
        const viewportOffsetTop = visualViewport.offsetTop || 0
        const composerTop = viewportOffsetTop + viewportHeight - composerHeight

        composer.style.top = `${Math.max(headerHeight, composerTop)}px`
        composer.style.bottom = 'auto'
        composer.style.position = 'fixed'
        composer.style.left = '0'
        composer.style.right = '0'
        composer.style.zIndex = '30'
        composer.style.transform = 'translateZ(0)'

        const chatTop = headerHeight
        const finalComposerTop = Math.max(headerHeight, composerTop)
        const chatBottom = windowHeight - finalComposerTop
        chatScroll.style.top = `${chatTop}px`
        chatScroll.style.bottom = `${chatBottom}px`
        chatScroll.style.maxHeight = `${finalComposerTop - headerHeight}px`
      } else {
        composer.style.top = 'auto'
        composer.style.bottom = '0px'
        composer.style.position = 'fixed'
        composer.style.left = '0'
        composer.style.right = '0'
        composer.style.zIndex = '30'
        composer.style.transform = 'translateZ(0)'

        const chatTop = headerHeight
        const chatBottom = composerHeight
        chatScroll.style.top = `${chatTop}px`
        chatScroll.style.bottom = `${chatBottom}px`
        chatScroll.style.maxHeight = `${viewportHeight - headerHeight - composerHeight}px`
      }

      chatScroll.style.position = 'fixed'
      chatScroll.style.left = '0'
      chatScroll.style.right = '0'
      chatScroll.style.overflowY = 'auto'
      chatScroll.style.overflowX = 'hidden'
      chatScroll.style.transform = 'translateZ(0)'

      window.scrollTo(0, 0)

      if (isKeyboardOpen && inputEl && document.activeElement === inputEl) {
        setTimeout(() => {
          scrollChatToBottom()
        }, 50)
      }
    }

    input.addEventListener('focus', (e) => {
      e.preventDefault()
      const scrollY = window.scrollY

      document.body.classList.add('mobile-chat-active')
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
      document.body.style.height = '100%'
      document.body.style.top = `-${scrollY}px`
      document.documentElement.style.overflow = 'hidden'
      document.documentElement.style.position = 'fixed'
      document.documentElement.style.width = '100%'
      document.documentElement.style.height = '100%'

      window.scrollTo(0, 0)

      const container = document.querySelector('.mobile-chat-dark')
      if (container) {
        container.classList.add('keyboard-open')
      }

      const composer = document.getElementById('composer') as HTMLElement
      if (composer) {
        composer.style.top = 'auto'
        composer.style.bottom = '0px'
      }

      setTimeout(() => {
        adjustLayoutForKeyboard()
        window.scrollTo(0, 0)
        document.documentElement.scrollTop = 0
        document.body.scrollTop = 0
      }, 150)

      setTimeout(() => {
        adjustLayoutForKeyboard()
        window.scrollTo(0, 0)
        document.documentElement.scrollTop = 0
        document.body.scrollTop = 0
      }, 400)

      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', adjustLayoutForKeyboard)
        window.visualViewport.addEventListener('scroll', () => {
          window.scrollTo(0, 0)
        })
      }

      const originalScrollIntoView = input.scrollIntoView
      input.scrollIntoView = function () {}
      ;(input as any)._originalScrollIntoView = originalScrollIntoView

      const chatScrollEl = document.getElementById('chat-scroll')
      const containerEl = document.querySelector('.mobile-chat-dark') as HTMLElement

      const preventScrollBeyondBounds = (e?: Event) => {
        if (containerEl) {
          containerEl.scrollTop = 0
        }
        if (chatScrollEl) {
          const maxScroll = Math.max(0, chatScrollEl.scrollHeight - chatScrollEl.clientHeight)
          if (chatScrollEl.scrollTop > maxScroll + 1) {
            chatScrollEl.scrollTop = maxScroll
            if (e) e.preventDefault()
          }
          if (chatScrollEl.scrollTop < 0) {
            chatScrollEl.scrollTop = 0
            if (e) e.preventDefault()
          }
        }
      }

      if (chatScrollEl) {
        chatScrollEl.addEventListener('scroll', preventScrollBeyondBounds, { passive: false })
        chatScrollEl.addEventListener('touchmove', preventScrollBeyondBounds, { passive: false })
        ;(input as any)._scrollHandler = preventScrollBeyondBounds
      }

      if (containerEl) {
        const preventContainerScroll = (e: Event) => {
          containerEl.scrollTop = 0
          e.preventDefault()
        }
        containerEl.addEventListener('scroll', preventContainerScroll, { passive: false })
        containerEl.addEventListener(
          'touchmove',
          (e) => {
            if (containerEl.scrollTop > 0) {
              containerEl.scrollTop = 0
              e.preventDefault()
            }
          },
          { passive: false }
        )
        ;(input as any)._containerScrollHandler = preventContainerScroll
      }
    })

    input.addEventListener('blur', () => {
      if ((input as any)._originalScrollIntoView) {
        input.scrollIntoView = (input as any)._originalScrollIntoView
        delete (input as any)._originalScrollIntoView
      }

      const scrollY = document.body.style.top
      document.body.classList.remove('mobile-chat-active')
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
      document.body.style.height = ''
      document.body.style.top = ''
      document.documentElement.style.overflow = ''
      document.documentElement.style.position = ''
      document.documentElement.style.width = ''
      document.documentElement.style.height = ''

      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1)
      }

      const container = document.querySelector('.mobile-chat-dark')
      if (container) {
        container.classList.remove('keyboard-open')
      }

      setTimeout(() => {
        adjustLayoutForKeyboard()
        window.scrollTo(0, 0)
        document.documentElement.scrollTop = 0
        document.body.scrollTop = 0
      }, 200)

      const chatScrollEl = document.getElementById('chat-scroll')
      const containerEl = document.querySelector('.mobile-chat-dark') as HTMLElement

      if (chatScrollEl && (input as any)._scrollHandler) {
        chatScrollEl.removeEventListener('scroll', (input as any)._scrollHandler)
        chatScrollEl.removeEventListener('touchmove', (input as any)._scrollHandler)
        delete (input as any)._scrollHandler
      }

      if (containerEl && (input as any)._containerScrollHandler) {
        containerEl.removeEventListener('scroll', (input as any)._containerScrollHandler)
        delete (input as any)._containerScrollHandler
      }

      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', adjustLayoutForKeyboard)
      }

      setTimeout(() => {
        adjustLayoutForKeyboard()
      }, 100)
    })

    input.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        const text = input.value.trim()
        if (text && text.length <= 1000) {
          input.value = ''
          autoResizeTextarea(input)
          await sendMessageHandler(text)
        }
      }
    })
  }
}

export function attachMobileConversationsListeners(
  render: () => void,
  createConversationHandler: () => Promise<void>
): void {
  document.getElementById('new-conv-mobile')?.addEventListener('click', async () => {
    await createConversationHandler()
    hideMobileConversations()
    render()
  })

  // Long-press support for mobile conversations
  if (isMobileScreen()) {
    document.querySelectorAll('[data-cid]').forEach((el) => {
      let longPressTimer: number | null = null

      const handleTouchStart = (e: Event) => {
        const touchEvent = e as TouchEvent
        if (touchEvent.touches && touchEvent.touches.length > 0) {
          const target = touchEvent.target as HTMLElement
          target.style.webkitUserSelect = 'none'
          target.style.userSelect = 'none'
        }
        longPressTimer = window.setTimeout(() => {
          touchEvent.preventDefault()
          const cid = Number((el as HTMLElement).dataset.cid)
          // showMobileConversationMenu will be handled by conversation handlers
          ;(window as any).__showMobileConversationMenu?.(cid, touchEvent)
        }, 500)
      }

      const handleTouchEnd = () => {
        if (longPressTimer) {
          clearTimeout(longPressTimer)
          longPressTimer = null
        }
      }

      const handleTouchMove = () => {
        if (longPressTimer) {
          clearTimeout(longPressTimer)
          longPressTimer = null
        }
      }

      el.addEventListener('touchstart', handleTouchStart, { passive: false })
      el.addEventListener('touchend', handleTouchEnd)
      el.addEventListener('touchmove', handleTouchMove)
    })
  }
}
