/**
 * Desktop layout components
 */

import { state } from '../state'
import { formatMessageText, escapeHtml } from '../utils'

export function renderDesktopLayout(): string {
  return `
    <div class="mx-auto max-w-8xl">
      <div class="text-center py-4 ${state.sidebarCollapsed ? 'text-left' : ''}">
        <h1 class="text-xl font-bold text-gray-800 ${state.sidebarCollapsed ? 'ml-16' : ''}">AI Chat Assistant</h1>
      </div>
      <div class="grid grid-cols-1 ${state.sidebarCollapsed ? 'md:grid-cols-12' : 'md:grid-cols-6'} gap-3 p-2">
        <aside class="${state.sidebarCollapsed ? 'hidden' : 'md:col-span-1'} space-y-2 max-w-xs">
        <div class="flex gap-1 items-center flex-wrap">
          <button id="new-conv" class="btn btn-primary text-xs px-1.5 py-0.5">New</button>
          ${
            state.currentConversationFeedback
              ? `
            <span class="btn btn-secondary text-xs px-1.5 py-0.5 text-green-600">✓ Rated ${state.currentConversationFeedback.overall_rating}/5</span>
          `
              : `
            <button id="feedback-btn" class="btn btn-secondary text-xs px-1.5 py-0.5">Rate</button>
          `
          }
          <a href="/insights/" class="btn btn-secondary text-xs px-1.5 py-0.5">Insights</a>
          <button id="toggle-sidebar" class="btn btn-secondary text-xs px-1.5 py-0.5">${state.sidebarCollapsed ? '☰' : '◀'}</button>
        </div>
        <div class="mt-4">
          <div id="search-container"></div>
        </div>
        <ul class="border rounded divide-y bg-white mt-2">
          ${state.filteredConversations
            .map(
              (c) => `
            <li class="p-2 ${state.current?.id === c.id ? 'bg-blue-50' : ''} cursor-pointer hover:bg-gray-50" data-cid="${c.id}">
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
      </aside>
      <main class="${state.sidebarCollapsed ? 'md:col-span-12' : 'md:col-span-5'} flex flex-col h-[calc(100vh-80px)] relative">
        ${
          state.sidebarCollapsed
            ? `
          <button id="expand-sidebar" class="fixed top-16 left-4 z-50 btn btn-secondary text-xs px-2 py-1">☰</button>
          <div class="h-12"></div>
        `
            : ''
        }
        <div id="chat-scroll" class="flex-1 overflow-auto border rounded bg-white p-3 space-y-3">
          ${state.messages.length === 0 ? renderWelcomeScreen() : renderMessages()}
        </div>
        ${
          state.messages.length > 0
            ? `
        <form id="composer" class="mt-2 relative">
          <textarea id="input" class="textarea w-full pr-20" rows="3" placeholder="Type a message (max 1000 chars)"></textarea>
          <button class="btn btn-primary absolute bottom-4 right-3 w-16 h-8 text-xs flex items-center justify-center" type="submit">Send</button>
        </form>
        `
            : ''
        }
      </main>
      </div>
    </div>
  `
}

function renderWelcomeScreen(): string {
  return `
    <div class="flex flex-col items-center justify-center h-full text-center py-8">
      <div class="max-w-2xl space-y-8">
        <div class="text-8xl mb-6">🤖</div>
        <h2 class="text-3xl font-bold text-gray-800 mb-4">Welcome to AI Chat Assistant</h2>
        <p class="text-lg text-gray-600 mb-8">Get started by creating a new conversation or explore the features below.</p>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div class="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <div class="flex items-center mb-3">
              <div class="w-10 h-10 bg-blue-500 text-white rounded flex items-center justify-center text-lg font-bold mr-4">N</div>
              <h3 class="font-semibold text-blue-800 text-lg">New Button</h3>
            </div>
            <p class="text-blue-700">Click to start a fresh conversation with Gemini AI. Each new chat begins with a welcome message.</p>
          </div>
          
          <div class="bg-green-50 p-6 rounded-lg border border-green-200">
            <div class="flex items-center mb-3">
              <div class="w-10 h-10 bg-green-500 text-white rounded flex items-center justify-center text-lg font-bold mr-4">R</div>
              <h3 class="font-semibold text-green-800 text-lg">Rate Button</h3>
            </div>
            <p class="text-green-700">Rate the overall conversation quality, helpfulness, and accuracy. Your feedback helps improve the AI.</p>
          </div>
          
          <div class="bg-purple-50 p-6 rounded-lg border border-purple-200">
            <div class="flex items-center mb-3">
              <div class="w-10 h-10 bg-purple-500 text-white rounded flex items-center justify-center text-lg font-bold mr-4">I</div>
              <h3 class="font-semibold text-purple-800 text-lg">Insights Button</h3>
            </div>
            <p class="text-purple-700">View analytics and feedback insights from your conversations. See rating distributions and trends.</p>
          </div>
        </div>
        
        <div class="mt-12 p-6 bg-gray-50 rounded-lg">
          <h4 class="font-semibold text-gray-800 mb-4 text-lg">💡 Pro Tips:</h4>
          <ul class="text-gray-600 space-y-2">
            <li>• Rate individual AI responses to help improve quality</li>
            <li>• Use the search bar to find specific conversations</li>
            <li>• Double-click conversation titles to rename them</li>
            <li>• Right-click conversations for more options</li>
          </ul>
        </div>
      </div>
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
