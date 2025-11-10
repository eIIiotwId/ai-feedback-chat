/**
 * Conversation event handlers
 */

import { state } from '../state'
import {
  renameConversation,
  deleteConversation,
  filterConversations,
} from '../services/conversations'
import { isMobileChatMode } from '../utils/mobile'
import { scrollChatToBottom } from '../utils'

export function attachConversationListeners(
  render: () => void,
  loadMessagesHandler: () => Promise<void>,
  loadFeedbackHandler: () => Promise<void>
): void {
  document.querySelectorAll('[data-cid]')?.forEach((el) => {
    let clickTimeout: number | null = null

    el.addEventListener('click', (e) => {
      e.stopPropagation()
      const cid = Number((el as HTMLElement).dataset.cid)

      if (clickTimeout) {
        clearTimeout(clickTimeout)
      }

      clickTimeout = setTimeout(() => {
        const c = state.conversations.find((x) => x.id === cid) || null
        if (!c) {
          return
        }

        state.current = c
        state.messages = []
        state.lastSeq = 0
        state.currentConversationFeedback = null

        if (isMobileChatMode(state.current)) {
          state.showMobileConversations = false
        }

        if (!state.isSearching) {
          render()
          loadMessagesHandler().then(() => {
            if (isMobileChatMode(state.current)) {
              setTimeout(() => {
                scrollChatToBottom()
              }, 100)
            }
          })
          loadFeedbackHandler()
        }
      }, 300)
    })

    el.addEventListener('dblclick', (e) => {
      e.stopPropagation()
      e.preventDefault()

      if (clickTimeout) {
        clearTimeout(clickTimeout)
        clickTimeout = null
      }

      const cid = Number((el as HTMLElement).dataset.cid)
      if (state.current?.id === cid) {
        startRenameConversation(cid, render)
      }
    })

    el.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      e.stopPropagation()
      const cid = Number((el as HTMLElement).dataset.cid)
      showContextMenu(e as MouseEvent, cid, render)
    })
  })
}

export function startRenameConversation(conversationId: number, render: () => void): void {
  const conversation = state.conversations.find((c) => c.id === conversationId)
  if (!conversation) {
    return
  }

  const titleElement = document.querySelector(`.conversation-title[data-cid="${conversationId}"]`)
  if (!titleElement) {
    return
  }

  state.isRenaming = true

  const currentTitle = conversation.title || 'Untitled'
  const input = document.createElement('input')
  input.type = 'text'
  input.value = currentTitle
  input.className = 'w-full px-1 py-1 border rounded text-sm rename-input'
  input.style.color = '#1f2937'
  input.style.backgroundColor = '#ffffff'

  input.addEventListener('keydown', async (e) => {
    e.stopPropagation()
    if (e.key === 'Enter') {
      const newTitle = input.value.trim()
      if (newTitle && newTitle !== currentTitle) {
        await renameConversation(conversationId, newTitle)
        const conv = state.conversations.find((c) => c.id === conversationId)
        if (conv) {
          conv.title = newTitle
        }
        state.isRenaming = false
        if (!state.isSearching) {
          render()
        }
      } else {
        state.isRenaming = false
        if (!state.isSearching) {
          render()
        }
      }
    } else if (e.key === 'Escape') {
      state.isRenaming = false
      if (!state.isSearching) {
        render()
      }
    }
  })

  input.addEventListener('blur', () => {
    state.isRenaming = false
    if (!state.isSearching) {
      render()
    }
  })

  input.addEventListener('click', (e) => {
    e.stopPropagation()
  })

  input.addEventListener('mousedown', (e) => {
    e.stopPropagation()
  })

  titleElement.innerHTML = ''
  titleElement.appendChild(input)
  input.focus()
  input.select()
}

export function showContextMenu(
  event: MouseEvent,
  conversationId: number,
  render: () => void
): void {
  event.preventDefault()

  const existingMenu = document.querySelector('.context-menu')
  if (existingMenu) {
    existingMenu.remove()
  }

  const menuElement = document.createElement('div')
  menuElement.className = 'context-menu fixed bg-white border rounded shadow-lg z-50 py-1'
  menuElement.style.left = `${event.clientX}px`
  menuElement.style.top = `${event.clientY}px`
  menuElement.innerHTML = `
    <div class="px-4 py-2 hover:bg-gray-100 cursor-pointer" id="rename-option">Rename</div>
    <div class="px-4 py-2 hover:bg-gray-100 cursor-pointer text-red-600" id="delete-option">Delete</div>
  `

  document.body.appendChild(menuElement)

  menuElement.querySelector('#rename-option')?.addEventListener('click', () => {
    menuElement.remove()
    startRenameConversation(conversationId, render)
  })

  menuElement.querySelector('#delete-option')?.addEventListener('click', () => {
    menuElement.remove()
    showDeleteConfirmationModal(conversationId, render)
  })

  const closeMenu = (e: MouseEvent) => {
    if (!menuElement.contains(e.target as Node)) {
      menuElement.remove()
      document.removeEventListener('click', closeMenu)
    }
  }

  setTimeout(() => {
    document.addEventListener('click', closeMenu)
  }, 100)
}

export function showDeleteConfirmationModal(conversationId: number, render: () => void): void {
  const modalElement = document.createElement('div')
  modalElement.className =
    'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
  modalElement.innerHTML = `
    <div class="bg-white p-6 rounded-lg max-w-md w-full mx-4">
      <h3 class="text-lg font-semibold mb-4">Delete Conversation</h3>
      <p class="text-gray-600 mb-6">Are you sure you want to delete this conversation? This action cannot be undone.</p>
      <div class="flex gap-2">
        <button id="confirm-delete" class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
          Delete
        </button>
        <button id="cancel-delete" class="px-4 py-2 border rounded hover:bg-gray-100">
          Cancel
        </button>
      </div>
    </div>
  `
  document.body.appendChild(modalElement)

  modalElement.querySelector('#confirm-delete')?.addEventListener('click', async () => {
    await deleteConversation(conversationId)
    state.conversations = state.conversations.filter((c) => c.id !== conversationId)
    state.filteredConversations = filterConversations(state.conversations, state.searchQuery)

    if (state.current?.id === conversationId) {
      state.current = state.conversations[0] || null
      state.messages = []
      state.lastSeq = 0
      state.currentConversationFeedback = null
    }

    if (!state.isSearching) {
      render()
    }
    modalElement.remove()
  })

  modalElement.querySelector('#cancel-delete')?.addEventListener('click', () => {
    modalElement.remove()
  })
}

export function showMobileConversationMenu(
  conversationId: number,
  event: TouchEvent | MouseEvent,
  render: () => void
): void {
  const existingMenu = document.querySelector('.conversation-context-menu')
  if (existingMenu) {
    existingMenu.remove()
  }

  const menu = document.createElement('div')
  menu.className = 'conversation-context-menu'
  menu.innerHTML = `
    <div class="conversation-context-menu-content">
      <div class="conversation-context-menu-item" id="mobile-rename-${conversationId}">
        <span>✏️</span>
        <span>Rename</span>
      </div>
      <div class="conversation-context-menu-item delete" id="mobile-delete-${conversationId}">
        <span>🗑️</span>
        <span>Delete</span>
      </div>
    </div>
  `

  document.body.appendChild(menu)

  const closeMenu = (e: Event) => {
    if (!menu.contains(e.target as Node)) {
      menu.remove()
      document.removeEventListener('click', closeMenu)
      document.removeEventListener('touchstart', closeMenu)
    }
  }

  setTimeout(() => {
    document.addEventListener('click', closeMenu)
    document.addEventListener('touchstart', closeMenu)
  }, 100)

  document.getElementById(`mobile-rename-${conversationId}`)?.addEventListener('click', () => {
    menu.remove()
    startRenameConversation(conversationId, render)
  })

  document.getElementById(`mobile-delete-${conversationId}`)?.addEventListener('click', () => {
    menu.remove()
    showDeleteConfirmationModal(conversationId, render)
  })
}
