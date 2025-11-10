/**
 * Mobile detection and helper functions
 */

export function isMobileScreen(): boolean {
  return window.innerWidth < 768
}

export function isMobileChatMode(current: any): boolean {
  return window.innerWidth < 768 && current !== null
}
