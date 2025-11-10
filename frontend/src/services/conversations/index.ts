/**
 * Conversation service - handles conversation-related business logic
 */

import { api } from '../../api'
import type { Conversation, ConversationFeedback } from '../../types'

export async function loadConversations(): Promise<{ results: Conversation[]; count: number }> {
  return api<{ results: Conversation[]; count: number }>(`conversations/?limit=50`)
}

export async function createConversation(title?: string): Promise<Conversation> {
  return api<Conversation>('conversations/', {
    method: 'POST',
    body: JSON.stringify({ title }),
  })
}

export async function renameConversation(
  conversationId: number,
  newTitle: string
): Promise<Conversation> {
  return api<Conversation>(`conversations/${conversationId}/`, {
    method: 'PATCH',
    body: JSON.stringify({ title: newTitle }),
  })
}

export async function deleteConversation(conversationId: number): Promise<void> {
  return api(`conversations/${conversationId}/`, {
    method: 'DELETE',
  })
}

export async function loadConversationFeedback(
  conversationId: number
): Promise<ConversationFeedback | null> {
  try {
    return await api<ConversationFeedback>(`conversations/${conversationId}/feedback/`)
  } catch (err) {
    // No feedback exists yet - this is fine
    return null
  }
}

export async function generateConversationTitle(userMessage: string): Promise<string> {
  try {
    const response = await api<{ title: string }>('conversations/generate-title/', {
      method: 'POST',
      body: JSON.stringify({ message: userMessage }),
    })
    return response.title
  } catch (err) {
    console.error('Failed to generate title:', err)
    // Fallback to a simple title based on first few words
    const words = userMessage.split(' ').slice(0, 2).join(' ')
    return words.length > 14 ? words.substring(0, 11) + '...' : words
  }
}

export function filterConversations(
  conversations: Conversation[],
  searchQuery: string
): Conversation[] {
  if (!searchQuery.trim()) {
    return conversations
  }
  const query = searchQuery.toLowerCase()
  return conversations.filter((conv) => (conv.title || 'Untitled').toLowerCase().includes(query))
}
