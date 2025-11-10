/**
 * Search input handlers
 */

import { state, setSearchInputFocused, setRenderDisabled } from '../state'
import { filterConversations } from '../services/conversations'

export function createIsolatedSearchInput(updateConversationListOnly: () => void): void {
  const existingInput = document.getElementById('isolated-search-input')
  if (existingInput) {
    existingInput.remove()
  }

  const searchInput = document.createElement('input')
  searchInput.type = 'text'
  searchInput.id = 'isolated-search-input'
  searchInput.placeholder = 'Search conversations...'
  searchInput.className = 'w-full px-2 py-1.5 border rounded text-xs'
  searchInput.value = state.searchQuery

  searchInput.style.position = 'static'
  searchInput.style.width = '100%'
  searchInput.style.marginBottom = '8px'

  searchInput.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement
    state.searchQuery = target.value
    state.filteredConversations = filterConversations(state.conversations, state.searchQuery)
    updateConversationListOnly()
  })

  searchInput.addEventListener('focus', () => {
    setSearchInputFocused(true)
    setRenderDisabled(true)
  })

  searchInput.addEventListener('blur', () => {
    setSearchInputFocused(false)
    setRenderDisabled(false)
  })

  const searchContainer =
    document.getElementById('search-container') ||
    document.getElementById('search-container-mobile')
  if (searchContainer) {
    searchContainer.appendChild(searchInput)
  } else {
    document.body.appendChild(searchInput)
  }
}

export function updateConversationListOnly(): void {
  const conversationList =
    document.querySelector('ul.border.rounded.divide-y.bg-white.mt-2') ||
    document.querySelector('ul.border.rounded.divide-y.bg-white')

  if (conversationList) {
    const isMobile = window.innerWidth < 768
    const itemPadding = isMobile ? 'p-3' : 'p-2'

    conversationList.innerHTML = `
      ${state.filteredConversations
        .map(
          (c) => `
        <li class="${itemPadding} ${state.current?.id === c.id ? 'bg-blue-50' : ''} cursor-pointer hover:bg-gray-50" data-cid="${c.id}">
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
    `
  }
}
