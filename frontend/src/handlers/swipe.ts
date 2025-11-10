/**
 * Swipe gesture handlers for mobile navigation
 */

import { state } from '../state'
import { isMobileScreen } from '../utils/mobile'
import { showMobileConversations, hideMobileConversations } from './mobile'

export function initSwipeGestures(render: () => void): void {
  if (!isMobileScreen()) return

  // Swipe left on conversation to show conversations list
  let chatTouchStartX = 0
  let chatTouchStartY = 0
  let chatTouchEndX = 0
  let chatTouchEndY = 0
  let chatIsScrolling = false
  let chatSwipeTarget: Element | null = null

  const handleChatTouchStart = (e: TouchEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('#chat-scroll') || target.closest('.mobile-chat-dark')) {
      chatSwipeTarget = target
      chatTouchStartX = e.touches[0].clientX
      chatTouchStartY = e.touches[0].clientY
      chatIsScrolling = false
    }
  }

  const handleChatTouchMove = (e: TouchEvent) => {
    if (!chatSwipeTarget) return
    const deltaY = Math.abs(e.touches[0].clientY - chatTouchStartY)
    const deltaX = Math.abs(e.touches[0].clientX - chatTouchStartX)
    if (deltaY > 20 && deltaY > deltaX * 1.5) {
      chatIsScrolling = true
    }
  }

  const handleChatTouchEnd = (e: TouchEvent) => {
    if (!chatSwipeTarget) return
    chatTouchEndX = e.changedTouches[0].clientX
    chatTouchEndY = e.changedTouches[0].clientY

    if (!chatIsScrolling) {
      const deltaX = chatTouchEndX - chatTouchStartX
      const deltaY = chatTouchEndY - chatTouchStartY
      const minSwipeDistance = 50

      // Swipe right (positive deltaX) to show conversations menu
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
        if (deltaX > 0 && !state.showMobileConversations) {
          showMobileConversations()
          render()
        }
      }
    }

    chatSwipeTarget = null
  }

  // Swipe right on conversations list to go back to chat
  let convTouchStartX = 0
  let convTouchStartY = 0
  let convTouchEndX = 0
  let convTouchEndY = 0
  let convIsScrolling = false
  let convSwipeTarget: Element | null = null

  const handleConvTouchStart = (e: TouchEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('.mobile-conversations-dark')) {
      convSwipeTarget = target
      convTouchStartX = e.touches[0].clientX
      convTouchStartY = e.touches[0].clientY
      convIsScrolling = false
    }
  }

  const handleConvTouchMove = (e: TouchEvent) => {
    if (!convSwipeTarget) return
    const deltaY = Math.abs(e.touches[0].clientY - convTouchStartY)
    const deltaX = Math.abs(e.touches[0].clientX - convTouchStartX)
    if (deltaY > 20 && deltaY > deltaX * 1.5) {
      convIsScrolling = true
    }
  }

  const handleConvTouchEnd = (e: TouchEvent) => {
    if (!convSwipeTarget) return
    convTouchEndX = e.changedTouches[0].clientX
    convTouchEndY = e.changedTouches[0].clientY

    if (!convIsScrolling) {
      const deltaX = convTouchEndX - convTouchStartX
      const deltaY = convTouchEndY - convTouchStartY
      const minSwipeDistance = 50

      // Swipe left (negative deltaX) to go back to conversation
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
        if (deltaX < 0 && state.showMobileConversations && state.current) {
          hideMobileConversations()
          render()
        }
      }
    }

    convSwipeTarget = null
  }

  // Attach both handlers to document (event delegation)
  document.addEventListener(
    'touchstart',
    (e: TouchEvent) => {
      handleChatTouchStart(e)
      handleConvTouchStart(e)
    },
    { passive: true }
  )

  document.addEventListener(
    'touchmove',
    (e: TouchEvent) => {
      handleChatTouchMove(e)
      handleConvTouchMove(e)
    },
    { passive: true }
  )

  document.addEventListener(
    'touchend',
    (e: TouchEvent) => {
      handleChatTouchEnd(e)
      handleConvTouchEnd(e)
    },
    { passive: true }
  )
}
