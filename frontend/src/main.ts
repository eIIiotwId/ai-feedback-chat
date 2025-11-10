/**
 * Main application entry point
 * Orchestrates all modules and handles application initialization
 */

import '../tailwind.css'

// Types
import type { Message } from './types'

// State
import { state, RENDER_DISABLED, SEARCH_INPUT_FOCUSED } from './state'

// Services
import {
  loadConversations as loadConversationsService,
  createConversation as createConversationService,
  filterConversations,
  loadConversationFeedback,
} from './services/conversations'

// Utils
import { scrollChatToBottom, autoResizeTextarea } from './utils'
import { isMobileScreen, isMobileChatMode } from './utils/mobile'

// Handlers
import { attachMobileChatListeners, attachMobileConversationsListeners } from './handlers/mobile'
import { initSwipeGestures } from './handlers/swipe'
import { attachConversationListeners, showMobileConversationMenu } from './handlers/conversations'
import {
  sendMessage as sendMessageHandler,
  retryMessage as retryMessageHandler,
  typeMessage as typeMessageHandler,
  loadMessages as loadMessagesHandler,
} from './handlers/messages'
import {
  selectRating,
  submitFeedbackWithComment,
  showConversationFeedbackModal,
} from './handlers/feedback'
import { createIsolatedSearchInput, updateConversationListOnly } from './handlers/search'

// Components
import { renderMobileConversationsList, renderMobileChat } from './components/mobile'
import { renderDesktopLayout } from './components/desktop'

const root = document.getElementById('root')!

// Initialize mobile conversation menu handler
;(window as any).__showMobileConversationMenu = (
  conversationId: number,
  event: TouchEvent | MouseEvent
) => {
  showMobileConversationMenu(conversationId, event, render)
}

// Expose functions to window for event handlers
// Note: submitMessageFeedback is intentionally unused - it's kept for potential future use
;(window as any).submitMessageFeedback = async () => {
  // This is handled by submitFeedbackWithComment
}
;(window as any).selectRating = (messageId: number, rating: number) => {
  selectRating(messageId, rating, render)
}
;(window as any).submitFeedbackWithComment = (messageId: number) => {
  submitFeedbackWithComment(messageId, render)
}
;(window as any).retryMessage = async (failedMessage: Message) => {
  const sendMsg = (text: string) =>
    sendMessageHandler(text, render, (msg: Message, txt: string) =>
      typeMessageHandler(msg, txt, render)
    )
  await retryMessageHandler(failedMessage, render, sendMsg)
}

// Application functions
async function loadConversations(): Promise<void> {
  const data = await loadConversationsService()
  state.conversations = data.results
  state.filteredConversations = filterConversations(state.conversations, state.searchQuery)

  if (!state.current && state.conversations.length) {
    state.current = state.conversations[0]
  }

  render()
}

async function createConversation(title?: string): Promise<void> {
  const data = await createConversationService(title)
  state.conversations.push(data)
  state.current = data
  state.messages = []
  state.lastSeq = 0
  state.currentConversationFeedback = null

  if (isMobileChatMode(state.current)) {
    state.showMobileConversations = false
  }

  // Add welcome message
  const welcomeMessage: Message = {
    id: -1,
    conversation: data.id,
    role: 'ai',
    text: 'Hi there! How may I help you?',
    created_at: new Date().toISOString(),
    sequence: 0,
    tempId: `welcome-${Date.now()}`,
  }
  state.messages.push(welcomeMessage)

  if (!state.isSearching) {
    render()
  }
}

function toggleSidebar(): void {
  state.sidebarCollapsed = !state.sidebarCollapsed
  render()
}

function render(): void {
  // Check global flags first
  if (SEARCH_INPUT_FOCUSED || RENDER_DISABLED) {
    return
  }

  // Check if search input is focused
  const searchInput = document.getElementById('isolated-search-input')
  const isSearchFocused = searchInput && document.activeElement === searchInput

  if (isSearchFocused) {
    return
  }

  // Store scroll position before render (mobile)
  const chatScroll = document.getElementById('chat-scroll')
  if (chatScroll && isMobileChatMode(state.current)) {
    const isNearBottom =
      chatScroll.scrollHeight - chatScroll.scrollTop - chatScroll.clientHeight < 100
    if (!isNearBottom) {
      state.savedScrollPosition = chatScroll.scrollTop
    } else {
      state.savedScrollPosition = -1
    }
  }

  // Mobile detection
  const isMobile = isMobileScreen()
  const isMobileChat = isMobileChatMode(state.current)

  // Mobile layout: show conversations list
  if (isMobile && (state.showMobileConversations || !state.current)) {
    root.innerHTML = renderMobileConversationsList()
    attachMobileConversationsListeners(render, createConversation)
    createIsolatedSearchInput(updateConversationListOnly)
    attachConversationListeners(render, loadMessagesHandler.bind(null, render), async () => {
      if (state.current) {
        const feedback = await loadConversationFeedback(state.current.id)
        state.currentConversationFeedback = feedback
        if (!state.isSearching) {
          render()
        }
      }
    })
    return
  }

  // Mobile layout: show full-screen chat
  if (isMobileChat && !state.showMobileConversations) {
    root.innerHTML = renderMobileChat()
    const sendMsg = (text: string) =>
      sendMessageHandler(text, render, (msg: Message, txt: string) =>
        typeMessageHandler(msg, txt, render)
      )
    attachMobileChatListeners(render, sendMsg)

    document.getElementById('mobile-feedback-btn')?.addEventListener('click', () => {
      showConversationFeedbackModal(render)
    })

    // Add event listeners for rating buttons (mobile)
    document.querySelectorAll('.rating-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        const messageId = parseInt(btn.getAttribute('data-message-id') || '0')
        const rating = parseInt(btn.getAttribute('data-rating') || '0')
        selectRating(messageId, rating, render)
      })
    })

    // Add event listeners for submit feedback buttons (mobile)
    document.querySelectorAll('.submit-feedback-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        const messageId = parseInt(btn.getAttribute('data-message-id') || '0')
        submitFeedbackWithComment(messageId, render)
      })
    })

    // Add event listeners for retry buttons (mobile)
    document.querySelectorAll('.retry-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault()
        e.stopPropagation()
        const tempId = btn.getAttribute('data-temp-id')
        if (tempId) {
          const failedMessage = state.messages.find((m) => m.tempId === tempId)
          if (failedMessage) {
            const sendMsg = (text: string) =>
              sendMessageHandler(text, render, (msg: Message, txt: string) =>
                typeMessageHandler(msg, txt, render)
              )
            await retryMessageHandler(failedMessage, render, sendMsg)
          }
        }
      })
    })

    // Restore scroll position
    setTimeout(() => {
      const chatScroll = document.getElementById('chat-scroll')
      if (chatScroll && isMobileChatMode(state.current)) {
        if (state.savedScrollPosition >= 0) {
          chatScroll.scrollTop = state.savedScrollPosition
        } else {
          scrollChatToBottom()
        }
      }
    }, 10)

    // Initial layout adjustment
    setTimeout(() => {
      const input = document.getElementById('input') as HTMLTextAreaElement
      if (input && window.visualViewport) {
        const adjustLayout = () => {
          const container = document.querySelector('.mobile-chat-dark') as HTMLElement
          const chatScroll = document.getElementById('chat-scroll')
          const header = document.querySelector('.mobile-chat-dark header') as HTMLElement
          const composer = document.getElementById('composer') as HTMLElement

          if (!container || !chatScroll || !header || !composer) return

          const viewportHeight = window.visualViewport
            ? window.visualViewport.height
            : window.innerHeight
          const headerHeight = header.offsetHeight
          const composerHeight = composer.offsetHeight

          container.style.height = `${viewportHeight}px`
          container.style.maxHeight = `${viewportHeight}px`
          header.style.top = '0'
          header.style.position = 'absolute'
          chatScroll.style.top = `${headerHeight}px`
          chatScroll.style.bottom = `${composerHeight}px`
          chatScroll.style.maxHeight = `${viewportHeight - headerHeight - composerHeight}px`
          composer.style.bottom = '0'
          composer.style.position = 'absolute'
        }
        adjustLayout()
        window.visualViewport.addEventListener('resize', adjustLayout)
      }
    }, 50)

    return
  }

  // Desktop layout
  root.innerHTML = renderDesktopLayout()

  // Attach desktop event listeners
  document.getElementById('new-conv')?.addEventListener('click', () => {
    createConversation()
  })

  document.getElementById('feedback-btn')?.addEventListener('click', () => {
    showConversationFeedbackModal(render)
  })

  document.getElementById('toggle-sidebar')?.addEventListener('click', () => {
    toggleSidebar()
  })

  document.getElementById('expand-sidebar')?.addEventListener('click', () => {
    toggleSidebar()
  })

  attachConversationListeners(render, loadMessagesHandler.bind(null, render), async () => {
    if (state.current) {
      const feedback = await loadConversationFeedback(state.current.id)
      state.currentConversationFeedback = feedback
      if (!state.isSearching) {
        render()
      }
    }
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
    await sendMessageHandler(text, render, (msg: Message, txt: string) =>
      typeMessageHandler(msg, txt, render)
    )
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

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        const text = input.value.trim()
        if (text && text.length <= 1000) {
          input.value = ''
          autoResizeTextarea(input)
          sendMessageHandler(text, render, (msg: Message, txt: string) =>
            typeMessageHandler(msg, txt, render)
          )
        }
      }
    })
  }

  createIsolatedSearchInput(updateConversationListOnly)

  // Add event listeners for rating buttons
  document.querySelectorAll('.rating-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      const messageId = parseInt(btn.getAttribute('data-message-id') || '0')
      const rating = parseInt(btn.getAttribute('data-rating') || '0')
      selectRating(messageId, rating, render)
    })
  })

  // Add event listeners for submit feedback buttons
  document.querySelectorAll('.submit-feedback-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      const messageId = parseInt(btn.getAttribute('data-message-id') || '0')
      submitFeedbackWithComment(messageId, render)
    })
  })

  // Add event listeners for retry buttons
  document.querySelectorAll('.retry-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault()
      e.stopPropagation()
      const tempId = btn.getAttribute('data-temp-id')
      if (tempId) {
        const failedMessage = state.messages.find((m) => m.tempId === tempId)
        if (failedMessage) {
          const sendMsg = (text: string) =>
            sendMessageHandler(text, render, (msg: Message, txt: string) =>
              typeMessageHandler(msg, txt, render)
            )
          await retryMessageHandler(failedMessage, render, sendMsg)
        }
      }
    })
  })
}

// Initialize application
;(async function init() {
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = '/static/app/style.css'
  document.head.appendChild(link)

  // Initialize swipe gestures globally
  initSwipeGestures(render)

  await loadConversations()
  await loadMessagesHandler(render)
  if (state.current) {
    const feedback = await loadConversationFeedback(state.current.id)
    state.currentConversationFeedback = feedback
  }

  // Create search input immediately
  createIsolatedSearchInput(updateConversationListOnly)

  // Add window resize listener
  let resizeTimeout: number | null = null
  window.addEventListener('resize', () => {
    if (resizeTimeout) {
      clearTimeout(resizeTimeout)
    }
    resizeTimeout = window.setTimeout(() => {
      const isNowMobile = isMobileScreen()
      if (!isNowMobile && state.showMobileConversations) {
        state.showMobileConversations = false
      }
      render()
    }, 150)
  })
})()
