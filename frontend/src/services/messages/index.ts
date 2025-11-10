/**
 * Message service - handles message-related business logic
 */

import { api } from '../../api'
import type { Message } from '../../types'

export async function loadMessages(
  conversationId: number,
  since: number = 0
): Promise<{ results: Message[]; lastSeq: number }> {
  return api<{ results: Message[]; lastSeq: number }>(
    `conversations/${conversationId}/messages/?since=${since}`
  )
}

export async function sendMessage(
  conversationId: number,
  text: string
): Promise<{ user_message: Message; ai_message: Message }> {
  return api<{ user_message: Message; ai_message: Message }>(
    `conversations/${conversationId}/messages/`,
    {
      method: 'POST',
      body: JSON.stringify({ text }),
    }
  )
}
