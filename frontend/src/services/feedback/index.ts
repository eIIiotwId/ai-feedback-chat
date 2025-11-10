/**
 * Feedback service - handles feedback-related business logic
 */

import { api } from '../../api'
import type { MessageFeedback, ConversationFeedback } from '../../types'

export async function submitMessageFeedback(
  messageId: number,
  rating: number,
  comment: string = ''
): Promise<MessageFeedback> {
  return api<MessageFeedback>(`messages/${messageId}/feedback/`, {
    method: 'POST',
    body: JSON.stringify({ rating, comment }),
  })
}

export async function submitConversationFeedback(
  conversationId: number,
  overallRating: number,
  helpfulnessRating: number,
  accuracyRating: number,
  comment: string = ''
): Promise<ConversationFeedback> {
  return api<ConversationFeedback>(`conversations/${conversationId}/feedback/`, {
    method: 'POST',
    body: JSON.stringify({
      overall_rating: overallRating,
      helpfulness_rating: helpfulnessRating,
      accuracy_rating: accuracyRating,
      comment,
    }),
  })
}
