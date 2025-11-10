/**
 * Application state management
 */

import type { Conversation, Message, ConversationFeedback } from '../types'

export interface AppState {
  conversations: Conversation[]
  current: Conversation | null
  messages: Message[]
  lastSeq: number
  searchQuery: string
  filteredConversations: Conversation[]
  isSendingMessage: boolean
  isRenaming: boolean
  isSearching: boolean
  sidebarCollapsed: boolean
  showMobileConversations: boolean
  currentConversationFeedback: ConversationFeedback | null
  savedScrollPosition: number
}

export const state: AppState = {
  conversations: [],
  current: null,
  messages: [],
  lastSeq: 0,
  searchQuery: '',
  filteredConversations: [],
  isSendingMessage: false,
  isRenaming: false,
  isSearching: false,
  sidebarCollapsed: false,
  showMobileConversations: false,
  currentConversationFeedback: null,
  savedScrollPosition: 0,
}

// Global flags to completely disable rendering during search
export let RENDER_DISABLED = false
export let SEARCH_INPUT_FOCUSED = false

export function setRenderDisabled(value: boolean): void {
  RENDER_DISABLED = value
}

export function setSearchInputFocused(value: boolean): void {
  SEARCH_INPUT_FOCUSED = value
}
