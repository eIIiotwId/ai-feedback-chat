/**
 * Mobile layout components
 */

import { state } from '../state'
import { formatMessageText, escapeHtml } from '../utils'

export function renderMobileConversationsList(): string {
  return `
    <div class="h-screen flex flex-col bg-gray-50 mobile-conversations-dark">
      <header class="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div class="w-16"></div>
        <h1 class="text-lg font-bold text-gray-800">Conversations</h1>
        <a href="/insights/" class="text-blue-600 font-medium">Insights</a>
      </header>
      <div class="flex-1 overflow-auto p-4">
        <div class="mb-4">
          <button id="new-conv-mobile" class="btn btn-primary text-sm px-3 py-2 w-full mb-2">New Conversation</button>
          <div id="search-container-mobile" class="mb-2"></div>
        </div>
        <ul class="border rounded divide-y bg-white">
          ${state.filteredConversations
            .map(
              (c) => `
            <li class="p-3 ${state.current?.id === c.id ? 'bg-blue-50' : ''} cursor-pointer hover:bg-gray-50 conversation-item" data-cid="${c.id}" style="user-select: none; -webkit-user-select: none;">
              <div class="w-full text-left">
                <div class="conversation-title" data-cid="${c.id}">
                  <span class="font-medium">${c.title ?? 'Untitled'}</span>
                  <br><span class="text-xs text-gray-500">${new Date(c.updated_at).toLocaleString()}</span>
                </div>
              </div>
            </li>
          `
            )
            .join('')}
          ${
            state.filteredConversations.length === 0 && state.searchQuery
              ? `
            <li class="p-4 text-center text-gray-500 text-sm">
              No conversations found matching "${state.searchQuery}"
            </li>
          `
              : ''
          }
        </ul>
      </div>
    </div>
  `
}

export function renderMobileChat(): string {
  const headerHeight = '56px'
  const inputHeight = '90px'

  return `
    <div class="flex flex-col bg-gray-50 mobile-chat-dark" style="height: 100dvh; max-height: 100dvh; overflow: hidden; position: fixed; top: 0; left: 0; right: 0; bottom: 0;">
      <header class="bg-white border-b px-4 py-3 flex items-center justify-between flex-shrink-0" style="position: fixed; top: 0; left: 0; right: 0; z-index: 30; height: ${headerHeight}; background-color: #212121 !important;">
        <button id="mobile-conversations-btn" class="text-blue-600 font-medium text-xl">☰</button>
        <h1 class="text-lg font-bold text-gray-800 flex-1 text-center px-2 truncate">${state.current?.title ?? 'AI Chat Assistant'}</h1>
        <div class="flex items-center gap-2">
          ${
            state.currentConversationFeedback
              ? `
            <span class="text-green-600 font-medium text-sm">✓ Rated ${state.currentConversationFeedback.overall_rating}/5</span>
          `
              : `
            <button id="mobile-feedback-btn" class="text-blue-600 font-medium text-sm">Rate</button>
          `
          }
          <a href="/insights/" class="text-blue-600 font-medium text-sm">Insights</a>
        </div>
      </header>
      <div id="chat-scroll" class="flex-1 overflow-y-auto bg-white p-3 space-y-3" style="overscroll-behavior: contain; -webkit-overflow-scrolling: touch; min-height: 0; padding-bottom: 0; margin-bottom: 0; position: absolute; top: ${headerHeight}; left: 0; right: 0; bottom: ${inputHeight};">
      ${
        state.messages.length === 0
          ? `
        <div class="flex flex-col items-center justify-center h-full text-center py-8">
          <div class="text-6xl mb-4">🤖</div>
          <h2 class="text-2xl font-bold text-gray-800 mb-2">Welcome</h2>
          <p class="text-gray-600">Start a conversation to begin</p>
        </div>
      `
          : renderMessages()
      }
      </div>
      <form id="composer" class="bg-white border-t flex-shrink-0" style="position: absolute; bottom: 0; left: 0; right: 0; z-index: 20; padding: 0.5rem; padding-bottom: max(0.5rem, env(safe-area-inset-bottom, 0.5rem)); background-color: #212121; border-top: 1px solid #3a3a3a;">
        <div class="flex items-end gap-2" style="margin: 0;">
          <textarea id="input" class="textarea flex-1" rows="1" placeholder="Type a message (max 1000 chars)" style="height: 60px; max-height: 60px; resize: none; font-size: 16px; line-height: 1.4; padding: 10px 14px; min-height: 44px; border-radius: 20px; overflow-y: auto; overflow-x: hidden;"></textarea>
          <button class="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 active:bg-blue-800" type="submit" style="margin-bottom: 2px;">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 4L10 16M10 4L4 10M10 4L16 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </form>
    </div>
  `
}

function renderMessages(): string {
  return state.messages
    .map((m) => {
      if (m.thinking) {
        return `
          <div class="flex items-center space-x-2 text-gray-500 text-sm mb-3">
            <span>Gemini is thinking</span>
            <div class="thinking-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        `
      }

      return `
        <div class="p-3 rounded ${m.role === 'user' ? 'msg-user' : 'msg-ai'} ${m.failed ? 'failed-message' : ''}" ${m.id ? `data-message-id="${m.id}"` : ''} ${m.typing ? 'data-typing="true"' : ''}>
          <div class="text-xs text-gray-500 mb-1">${m.role === 'user' ? 'USER' : 'GEMINI'} • ${new Date(m.created_at).toLocaleTimeString()}</div>
          <div class="whitespace-pre-wrap ${m.typing ? 'typing-message' : ''}" style="${m.typing ? 'position: relative;' : ''}">${m.typing ? m.text : formatMessageText(m.text)}</div>
          ${
            m.failed
              ? `
            <div class="mt-2 pt-2 border-t border-red-200">
              <div class="text-sm text-red-600 mb-2">
                ❌ Failed to send message
              </div>
              <button class="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 retry-btn" 
                      data-temp-id="${m.tempId}">
                Send Again
              </button>
            </div>
          `
              : ''
          }
          ${
            m.role === 'ai' && !m.typing && !m.thinking
              ? `
            <div class="mt-2 pt-2 border-t border-gray-200">
              ${
                m.feedback
                  ? `
                <div class="text-sm text-green-600">
                  ✓ Rated ${m.feedback.rating}/5
                  ${m.feedback.comment ? `<br><span class="text-gray-600 italic">"${escapeHtml(m.feedback.comment)}"</span>` : ''}
                </div>
              `
                  : `
                <div class="text-sm" id="feedback-${m.id}">
                  <span class="text-gray-600">Rate this response:</span>
                  <div class="flex gap-1 mt-1">
                    ${[1, 2, 3, 4, 5]
                      .map(
                        (rating) => `
                      <button class="px-2 py-1 text-xs rounded border hover:bg-gray-100 rating-btn" 
                              data-message-id="${m.id}" data-rating="${rating}">
                        ${rating}
                      </button>
                    `
                      )
                      .join('')}
                  </div>
                  <div class="mt-2 hidden" id="comment-section-${m.id}">
                    <input type="text" id="comment-${m.id}" placeholder="Optional comment..." 
                           class="w-full px-2 py-1 text-xs border rounded" style="font-size: 16px;">
                    <button class="mt-1 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 submit-feedback-btn" 
                            data-message-id="${m.id}">
                      Submit
                    </button>
                  </div>
                </div>
              `
              }
            </div>
          `
              : ''
          }
        </div>
      `
    })
    .join('')
}
