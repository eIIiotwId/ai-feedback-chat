export type Conversation = {
  id: number
  title: string | null
  created_at: string
  updated_at: string
}

export type Message = {
  id: number
  conversation: number
  role: 'user' | 'ai'
  text: string
  created_at: string
  sequence: number
  tempId?: string
  pending?: boolean
  typing?: boolean
  thinking?: boolean
  failed?: boolean
  originalText?: string
  feedback?: {
    id: number
    rating: number
    comment: string
    created_at: string
  }
}

export type MessageFeedback = {
  id: number
  message: number
  rating: number
  comment: string
  created_at: string
}

export type ConversationFeedback = {
  id: number
  conversation: number
  overall_rating: number
  helpfulness_rating: number
  accuracy_rating: number
  comment: string
  created_at: string
}
