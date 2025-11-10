/**
 * Feedback event handlers
 */

import { state } from '../state'
import { submitMessageFeedback, submitConversationFeedback } from '../services/feedback'
import { isMobileChatMode } from '../utils/mobile'

export function selectRating(messageId: number, rating: number, render: () => void): void {
  const chatScroll = document.getElementById('chat-scroll')
  const scrollPosition = chatScroll ? chatScroll.scrollTop : 0

  const message = state.messages.find((m) => m.id === messageId)
  if (message) {
    ;(message as any).selectedRating = rating
  }

  const commentSection = document.getElementById(`comment-section-${messageId}`)
  if (commentSection) {
    commentSection.classList.remove('hidden')
    const commentInput = document.getElementById(`comment-${messageId}`) as HTMLInputElement
    if (commentInput) {
      commentInput.focus()
    }

    // Re-attach event listener to submit button after it becomes visible (mobile fix)
    const submitBtn = commentSection.querySelector('.submit-feedback-btn') as HTMLElement
    if (submitBtn) {
      // Remove any existing listeners by cloning the button
      const newSubmitBtn = submitBtn.cloneNode(true) as HTMLElement
      submitBtn.parentNode?.replaceChild(newSubmitBtn, submitBtn)

      // Attach fresh event listeners (both click and touch for mobile compatibility)
      const handleSubmit = (e: Event) => {
        e.preventDefault()
        e.stopPropagation()
        submitFeedbackWithComment(messageId, render)
      }

      newSubmitBtn.addEventListener('click', handleSubmit)
      newSubmitBtn.addEventListener(
        'touchend',
        (e) => {
          e.preventDefault()
          e.stopPropagation()
          handleSubmit(e)
        },
        { passive: false }
      )
    }
  }

  const feedbackDiv = document.getElementById(`feedback-${messageId}`)
  if (feedbackDiv) {
    const ratingButtons = feedbackDiv.querySelectorAll('.rating-btn')
    ratingButtons.forEach((btn) => {
      const btnRating = parseInt(btn.getAttribute('data-rating') || '0')
      if (btnRating === rating) {
        btn.classList.add('bg-blue-500', 'text-white')
        btn.classList.remove('border')
      } else {
        btn.classList.remove('bg-blue-500', 'text-white')
        btn.classList.add('border')
      }
    })
  }

  if (chatScroll && isMobileChatMode(state.current)) {
    setTimeout(() => {
      chatScroll.scrollTop = scrollPosition
    }, 0)
  }
}

export async function submitFeedbackWithComment(
  messageId: number,
  render: () => void
): Promise<void> {
  const chatScroll = document.getElementById('chat-scroll')
  if (chatScroll && isMobileChatMode(state.current)) {
    const isNearBottom =
      chatScroll.scrollHeight - chatScroll.scrollTop - chatScroll.clientHeight < 100
    if (!isNearBottom) {
      state.savedScrollPosition = chatScroll.scrollTop
    } else {
      state.savedScrollPosition = -1
    }
  }

  const message = state.messages.find((m) => m.id === messageId)
  if (!message) {
    return
  }

  const selectedRating = (message as any).selectedRating
  if (!selectedRating) {
    alert('Please select a rating first')
    return
  }

  const commentInput = document.getElementById(`comment-${messageId}`) as HTMLInputElement
  const comment = commentInput?.value || ''

  try {
    const result = await submitMessageFeedback(messageId, selectedRating, comment)

    if (message) {
      message.feedback = {
        id: result.id,
        rating: selectedRating,
        comment,
        created_at: result.created_at,
      }
      render()
    }
  } catch (err) {
    alert('Failed to submit feedback. Please try again.')
  }
}

export async function submitConversationFeedbackHandler(
  conversationId: number,
  overallRating: number,
  helpfulnessRating: number,
  accuracyRating: number,
  comment: string,
  render: () => void
): Promise<void> {
  try {
    const feedback = await submitConversationFeedback(
      conversationId,
      overallRating,
      helpfulnessRating,
      accuracyRating,
      comment
    )
    state.currentConversationFeedback = feedback
    alert('Thank you for your feedback!')
    if (!state.isSearching) {
      render()
    }
  } catch (err) {
    alert('Failed to submit feedback. Please try again.')
  }
}

export function showConversationFeedbackModal(render: () => void): void {
  if (!state.current) return

  if (state.currentConversationFeedback) {
    alert(
      `This conversation has already been rated (${state.currentConversationFeedback.overall_rating}/5 overall). You cannot rate it again.`
    )
    return
  }

  const modalElement = document.createElement('div')
  modalElement.className =
    'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
  modalElement.innerHTML = `
    <div class="bg-white p-6 rounded-lg max-w-md w-full mx-4">
      <h3 class="text-lg font-semibold mb-4">Rate this conversation</h3>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2">Overall Rating:</label>
          <div class="flex gap-2" id="overall-rating">
            ${[1, 2, 3, 4, 5]
              .map(
                (rating) => `
              <button class="rating-btn px-3 py-1 border rounded hover:bg-gray-100" data-rating="${rating}" data-type="overall">
                ${rating}
              </button>
            `
              )
              .join('')}
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium mb-2">Helpfulness:</label>
          <div class="flex gap-2" id="helpfulness-rating">
            ${[1, 2, 3, 4, 5]
              .map(
                (rating) => `
              <button class="rating-btn px-3 py-1 border rounded hover:bg-gray-100" data-rating="${rating}" data-type="helpfulness">
                ${rating}
              </button>
            `
              )
              .join('')}
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium mb-2">Accuracy:</label>
          <div class="flex gap-2" id="accuracy-rating">
            ${[1, 2, 3, 4, 5]
              .map(
                (rating) => `
              <button class="rating-btn px-3 py-1 border rounded hover:bg-gray-100" data-rating="${rating}" data-type="accuracy">
                ${rating}
              </button>
            `
              )
              .join('')}
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium mb-2">Comment (optional):</label>
          <textarea id="conversation-comment" class="w-full px-3 py-2 border rounded" rows="3" placeholder="Any additional feedback..."></textarea>
        </div>
      </div>
      <div class="flex gap-2 mt-6">
        <button id="submit-feedback" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Submit Feedback
        </button>
        <button id="cancel-feedback" class="px-4 py-2 border rounded hover:bg-gray-100">
          Cancel
        </button>
      </div>
    </div>
  `
  document.body.appendChild(modalElement)

  modalElement.querySelectorAll('.rating-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      const type = target.getAttribute('data-type')!

      modalElement.querySelectorAll(`[data-type="${type}"]`).forEach((b) => {
        b.classList.remove('bg-blue-500', 'text-white')
        b.classList.add('border')
      })

      target.classList.add('bg-blue-500', 'text-white')
      target.classList.remove('border')
    })
  })

  modalElement.querySelector('#submit-feedback')?.addEventListener('click', async () => {
    const overallRating = modalElement
      .querySelector('[data-type="overall"].bg-blue-500')
      ?.getAttribute('data-rating')
    const helpfulnessRating = modalElement
      .querySelector('[data-type="helpfulness"].bg-blue-500')
      ?.getAttribute('data-rating')
    const accuracyRating = modalElement
      .querySelector('[data-type="accuracy"].bg-blue-500')
      ?.getAttribute('data-rating')
    const comment =
      (modalElement.querySelector('#conversation-comment') as HTMLTextAreaElement)?.value || ''

    if (overallRating && helpfulnessRating && accuracyRating) {
      await submitConversationFeedbackHandler(
        state.current!.id,
        parseInt(overallRating),
        parseInt(helpfulnessRating),
        parseInt(accuracyRating),
        comment,
        render
      )
      modalElement.remove()
    } else {
      alert('Please rate all categories')
    }
  })

  modalElement.querySelector('#cancel-feedback')?.addEventListener('click', () => {
    modalElement.remove()
  })
}
