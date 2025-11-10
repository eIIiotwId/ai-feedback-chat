/**
 * Message event handlers
 */

import { state } from '../state'
import {
  sendMessage as sendMessageService,
  loadMessages as loadMessagesService,
} from '../services/messages'
import { generateConversationTitle, renameConversation } from '../services/conversations'
import { scrollChatToBottom } from '../utils'
import { formatMessageText } from '../utils'
import type { Message } from '../types'

export async function sendMessage(
  text: string,
  render: () => void,
  typeMessageHandler: (message: Message, fullText: string) => Promise<void>
): Promise<void> {
  if (!state.current) return

  state.isSendingMessage = true

  const tempId = `tmp-${Date.now()}`
  const optimistic: Message = {
    id: -1,
    conversation: state.current.id,
    role: 'user',
    text,
    created_at: new Date().toISOString(),
    sequence: 0,
    tempId,
    pending: true,
  }
  state.messages.push(optimistic)
  if (!state.isSearching) {
    render()
    scrollChatToBottom()
  }

  // Add thinking indicator after 2 seconds if response hasn't arrived
  let thinkingTimeout: number | null = setTimeout(() => {
    if (state.isSendingMessage) {
      const thinkingMessage: Message = {
        id: -1,
        conversation: state.current!.id,
        role: 'ai',
        text: 'thinking',
        created_at: new Date().toISOString(),
        sequence: 0,
        tempId: `thinking-${Date.now()}`,
        thinking: true,
      }
      state.messages.push(thinkingMessage)

      if (!state.isSearching) {
        render()
        scrollChatToBottom()
      }
    }
  }, 2000) as any

  try {
    const res = await sendMessageService(state.current.id, text)

    if (thinkingTimeout) {
      clearTimeout(thinkingTimeout)
      thinkingTimeout = null
    }

    const optimisticIndex = state.messages.findIndex((m) => m.tempId === tempId)
    if (optimisticIndex >= 0) {
      state.messages.splice(optimisticIndex, 1)
    }

    state.messages.push(res.user_message)

    const aiMessage = { ...res.ai_message, typing: true }
    state.messages.push(aiMessage)
    state.lastSeq = res.ai_message.sequence

    // Generate title if this is the first real user message
    const isFirstUserMessage =
      state.messages.filter((m) => m.role === 'user' && !m.tempId?.startsWith('welcome')).length ===
      1
    if (isFirstUserMessage) {
      try {
        const newTitle = await generateConversationTitle(text)
        await renameConversation(state.current.id, newTitle)
        const conv = state.conversations.find((c) => c.id === state.current!.id)
        if (conv) {
          conv.title = newTitle
        }
      } catch (err) {
        console.error('Failed to update conversation title:', err)
      }
    }

    if (!state.isSearching) {
      render()
      scrollChatToBottom()
    }

    await typeMessageHandler(aiMessage, res.ai_message.text)
  } catch (err) {
    if (thinkingTimeout) {
      clearTimeout(thinkingTimeout)
      thinkingTimeout = null
    }

    const optimisticIndex = state.messages.findIndex((m) => m.tempId === tempId)
    if (optimisticIndex >= 0) {
      state.messages.splice(optimisticIndex, 1)
    }

    await new Promise((resolve) => setTimeout(resolve, 50))

    const failedMessage: Message = {
      id: -1,
      conversation: state.current.id,
      role: 'user',
      text: text,
      created_at: new Date().toISOString(),
      sequence: 0,
      tempId: `failed-${Date.now()}`,
      failed: true,
      originalText: text,
    }
    state.messages.push(failedMessage)

    if (!state.isSearching) {
      render()
      scrollChatToBottom()
    }
  } finally {
    state.isSendingMessage = false
  }
}

export async function retryMessage(
  failedMessage: Message,
  render: () => void,
  sendMessageHandler: (text: string) => Promise<void>
): Promise<void> {
  if (!state.current || !failedMessage.originalText) return

  const originalText = failedMessage.originalText
  state.messages = state.messages.filter(
    (m) => !(m.role === 'user' && m.text === originalText && (m.failed || m.pending))
  )

  if (!state.isSearching) {
    render()
  }

  await new Promise((resolve) => setTimeout(resolve, 100))

  await sendMessageHandler(originalText)
}

export async function typeMessage(
  message: Message,
  fullText: string,
  render: () => void
): Promise<void> {
  // Remove thinking indicator when AI starts typing
  const thinkingIndex = state.messages.findIndex((m) => m.thinking)
  if (thinkingIndex >= 0) {
    state.messages.splice(thinkingIndex, 1)
    if (!state.isSearching) {
      render()
    }
  }

  let messageElement: HTMLElement | null = null
  const words = fullText.split(' ')
  let currentText = ''

  for (let i = 0; i < words.length; i++) {
    currentText += (i > 0 ? ' ' : '') + words[i]
    message.text =
      currentText +
      '<span class="typing-cursor-wrapper"><span class="typing-cursor">●</span></span>'

    if (!state.isSearching) {
      if (!messageElement) {
        const chatScroll = document.getElementById('chat-scroll')
        if (chatScroll) {
          if (message.id && message.id > 0) {
            messageElement = chatScroll.querySelector(
              `[data-message-id="${message.id}"]`
            ) as HTMLElement
          }
          if (!messageElement) {
            const typingMessages = chatScroll.querySelectorAll('[data-typing="true"]')
            if (typingMessages.length > 0) {
              messageElement = typingMessages[typingMessages.length - 1] as HTMLElement
            } else {
              const allMessages = chatScroll.querySelectorAll('.msg-ai')
              if (allMessages.length > 0) {
                messageElement = allMessages[allMessages.length - 1] as HTMLElement
              }
            }
          }
        }
      }

      if (messageElement) {
        const textDiv = messageElement.querySelector('.whitespace-pre-wrap') as HTMLElement
        if (textDiv) {
          textDiv.innerHTML =
            currentText +
            '<span class="typing-cursor-wrapper"><span class="typing-cursor">●</span></span>'
        }
      } else {
        render()
      }

      const chatScroll = document.getElementById('chat-scroll')
      if (chatScroll) {
        const isNearBottom =
          chatScroll.scrollHeight - chatScroll.scrollTop - chatScroll.clientHeight < 100
        if (isNearBottom) {
          scrollChatToBottom()
        }
      }
    }

    await new Promise((resolve) => setTimeout(resolve, Math.random() * 30 + 20))
  }

  message.text = fullText
  message.typing = false

  if (messageElement && !state.isSearching) {
    const textDiv = messageElement.querySelector('.whitespace-pre-wrap') as HTMLElement
    if (textDiv) {
      textDiv.innerHTML = formatMessageText(fullText)
      textDiv.classList.remove('typing-message')
      textDiv.removeAttribute('style')
    }
  }

  if (!state.isSearching) {
    render()
    scrollChatToBottom()
  }
}

export async function loadMessages(render: () => void): Promise<void> {
  if (!state.current || state.isSendingMessage || state.isRenaming) {
    return
  }

  try {
    const data = await loadMessagesService(state.current.id, state.lastSeq)

    if (data.results.length) {
      const existingIds = new Set(state.messages.map((m) => m.id))
      const newMessages = data.results.filter((m) => !existingIds.has(m.id))
      if (newMessages.length > 0) {
        state.messages.push(...newMessages)
        state.lastSeq = data.lastSeq
        if (!state.isSearching) {
          render()
          scrollChatToBottom()
        }
      }
      data.results.forEach((apiMessage) => {
        const existingMessage = state.messages.find((m) => m.id === apiMessage.id)
        if (existingMessage && apiMessage.feedback) {
          existingMessage.feedback = apiMessage.feedback
        }
      })
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('404')) {
      const otherConversation = state.conversations.find((c) => c.id !== state.current?.id)
      if (otherConversation) {
        state.current = otherConversation
        state.messages = []
        state.lastSeq = 0
        state.currentConversationFeedback = null
        if (!state.isSearching) {
          render()
          await loadMessages(render)
        }
      }
    }
  }
}
