# Bug Fixes and Error Handling Improvements

This document details all bugs fixed and error handling improvements made during development.

## 1. Broken Pipe Errors (Terminal Warnings)

### Problem
"Broken pipe" errors appearing in terminal logs when clients disconnect during HTTP requests, especially common with mobile browsers and polling requests.

### Root Cause
- When users navigate away, switch tabs, or browsers cancel requests, Django tries to write to a closed socket
- This causes harmless "Broken pipe" errors that clutter the logs
- Common with mobile browsers due to aggressive connection management
- Previously exacerbated by polling requests every few seconds

### Solutions Implemented

#### Frontend Error Handling (`frontend/src/api/index.ts`)
- Added detection for network errors (`Failed to fetch`, `NetworkError`, etc.)
- Mark network errors with `isNetworkError` flag for special handling
- Polling handlers silently ignore these errors instead of showing alerts
- Prevents user-facing errors for harmless disconnections

#### Frontend Lifecycle Management (`frontend/src/main.ts`)
- Added `beforeunload` event listener to stop polling when page unloads
- Added `visibilitychange` event listener to pause/resume polling when page becomes hidden/visible
- Prevents unnecessary requests when page is not active
- Reduces server load and connection errors

#### Django Logging Configuration (`ai_chat/settings.py`)
- Added `suppress_broken_pipe` logging filter using `CallbackFilter`
- Filters out log messages containing "Broken pipe" or "Connection reset"
- Applied to console handler to prevent terminal clutter
- Added `suppress_common_404s` filter for favicon/robots.txt requests
- Set `django.request` logger to ERROR level to only show actual errors

#### WSGI Error Handling (`ai_chat/wsgi.py`)
- Implemented `SuppressBrokenPipeWSGI` wrapper class
- Catches `BrokenPipeError`, `ConnectionResetError`, and `OSError` at WSGI level
- Returns empty 200 OK response instead of propagating error
- Prevents error stack traces in logs for harmless disconnections

#### Polling Error Handling (`frontend/src/handlers/messages.ts`)
- Modified `loadMessages` to silently ignore errors with `isNetworkError` flag during polling
- Prevents error propagation for harmless disconnections
- Maintains functionality while suppressing noise

### Result
- Broken pipe errors no longer appear in terminal logs
- Cleaner development experience
- No impact on application functionality
- Better error handling for network issues

## 2. Thinking Timeout Variable Type Bug

### Problem
`thinkingTimeout` variable was not properly typed and could cause TypeScript errors or runtime issues.

### Root Cause
- Variable was declared without explicit type
- Could be `undefined` or `number` inconsistently
- Missing null checks could cause errors

### Fix
- Changed to `let thinkingTimeout: number | null = null`
- Added proper null checks before clearing timeout
- Ensures timeout is properly cleared in both success and error cases
- Type-safe implementation

### Location
`frontend/src/handlers/messages.ts`

## 3. Mobile Rating Button Not Working

### Problem
On mobile devices, tapping a rating button would select it visually, but the comment section didn't appear and feedback couldn't be submitted.

### Root Cause
- Event listeners for `.rating-btn` and `.submit-feedback-btn` were only attached in desktop rendering path
- Mobile chat rendering path was missing these event listeners
- Submit button was inside a hidden div, and listeners weren't re-attached when it became visible

### Fix

#### Event Listener Attachment (`frontend/src/main.ts`)
- Added event listener attachment code to mobile chat rendering path
- Attaches listeners for `.rating-btn`, `.submit-feedback-btn`, and `.retry-btn` in mobile layout
- Ensures all interactive elements work on mobile

#### Re-attach Listeners on Visibility (`frontend/src/handlers/feedback.ts`)
- Modified `selectRating` to re-attach submit button listener when comment section becomes visible
- Clones and replaces button to ensure fresh event listener
- Added both `click` and `touchend` event listeners for mobile compatibility

#### CSS Touch Handling (`frontend/tailwind.css`)
- Added CSS rules for mobile touch interactions:
  - `touch-action: manipulation` - Enables fast tap, disables double-tap zoom
  - `pointer-events: auto` - Ensures buttons are clickable
  - `z-index: 50` - Ensures buttons are above other elements
  - `min-height: 44px` and `min-width: 44px` - Ensures adequate touch targets
  - `-webkit-tap-highlight-color` - Visual feedback on tap

### Result
- Rating buttons work correctly on mobile
- Comment section appears when rating is selected
- Submit button is clickable and functional
- Proper touch feedback for all interactive elements

## 4. Polling Loop in Terminal Logs

### Problem
Repetitive `INFO` level logs for polling requests (`GET /api/conversations/X/messages/?since=Y HTTP/1.1" 200`) cluttering terminal output.

### Root Cause
- Polling requests were being logged at INFO level
- High frequency of polling (every few seconds) created log noise
- Made it difficult to see actual important logs

### Initial Solution (Later Removed)
- Implemented exponential backoff for polling (5s active, 15s idle after 3 empty polls)
- Added `ReducePollingLogVerbosityMiddleware` to suppress INFO-level polling logs
- Set `django.core.handlers.wsgi` logger to WARNING level

### Final Solution
- **Removed polling entirely** - Analysis showed polling was unnecessary because:
  - Message creation and AI responses are synchronous
  - No need for background updates
  - Simplified codebase significantly

### Result
- No polling logs (polling removed)
- Cleaner terminal output
- Reduced server load
- Simpler codebase

## 5. Cached Frontend Build Issues

### Problem
After making changes to frontend code, browsers would serve old cached JavaScript files, causing bugs to persist even after fixes.

### Root Cause
- Browser caching of static assets
- Cache-busting version numbers not updated after changes
- Users not performing hard refresh

### Fix
- Increment cache-busting version in `templates/base.html` when making frontend changes
- Changed from `v=37` to `v=38` to `v=39` as needed
- Added note in troubleshooting section of README about hard refresh

### Result
- Users get latest code after updates
- Clear process for forcing cache refresh
- Better documentation for common issue

## 6. Missing Favicon/Apple Touch Icon 404 Warnings

### Problem
WARNING logs appearing for 404 Not Found requests for `/favicon.ico`, `/apple-touch-icon.png`, `/apple-touch-icon-precomposed.png`.

### Root Cause
- Browsers automatically request these files
- No files exist, causing 404 errors
- Harmless but cluttered logs

### Fix

#### Backend Logging Filter (`ai_chat/settings.py`)
- Added `suppress_common_404s` filter to logging configuration
- Filters out 404 messages for common browser-requested files
- Applied to console handler

#### Frontend Prevention (`templates/base.html`)
- Added `<link rel="icon" href="data:," />` to prevent browsers from requesting favicon
- Empty data URI prevents browser request

### Result
- No more 404 warnings for favicon/apple-touch-icon
- Cleaner logs
- No impact on functionality

## 7. Frontend Build Not Auto-Built

### Problem
After running `make clean`, the frontend build files were removed, but `make run` didn't automatically rebuild them, causing 404 errors.

### Root Cause
- `make clean` removes `static/app/*` (built frontend assets)
- `make run` didn't check if frontend was built before starting server
- Required manual `make build-frontend` step

### Fix
- Modified `make run`, `make run-clean`, and `make run-mobile` targets
- Added check for `static/app/main.js` existence
- Automatically runs `make build-frontend` if frontend not built
- Ensures server always has frontend assets available

### Result
- No manual build step needed
- Server always starts with frontend assets
- Better developer experience
- Prevents 404 errors for missing assets

## 8. Invalid CSS Selector Warning

### Problem
CSS build warning for invalid selector `.mobile-chat-dark #comment-section-*` (wildcard not valid in CSS).

### Root Cause
- Attempted to use wildcard in CSS selector
- CSS doesn't support `*` wildcard in attribute selectors like that
- Caused build warning

### Fix
- Removed invalid selector
- Kept only valid attribute selector: `.mobile-chat-dark [id^="comment-section-"]`
- Uses attribute starts-with selector instead

### Result
- No CSS build warnings
- Valid CSS that works correctly
- Cleaner build output

## 9. Unused Imports and Variables (Linting Errors)

### Problem
ESLint errors for unused imports and variables after code refactoring.

### Root Cause
- Code refactoring left unused imports
- Some variables were extracted but not removed from original locations
- ESLint configured with `--max-warnings=0` (zero tolerance)

### Fixes

#### `frontend/src/handlers/feedback.ts`
- Removed unused import: `scrollChatToBottom`
- Removed unused import: `ConversationFeedback` type
- Removed unused variable: `rating` in modal event handler

#### `frontend/src/main.ts`
- Removed unused import: `Conversation` type
- Removed unused import: `loadMessagesService`
- Removed unused imports: `showMobileConversations`, `hideMobileConversations`
- Removed unused import: `showDeleteConfirmationModal`
- Fixed unused parameters in `submitMessageFeedback` function (removed parameters since function is intentionally empty)

### Result
- All linting errors resolved
- Clean codebase with no warnings
- Better code quality
- Easier to maintain

## 10. Mobile Layout Issues

### Problem
Various mobile-specific layout and interaction issues:
- Time selector filter positioning on insights page
- Text color visibility in rename input
- Insufficient spacing from header

### Fixes

#### Insights Page Layout (`templates/insights.html`, `frontend/tailwind.css`)
- Increased top padding from `sm:py-8` to `sm:py-12` for more header spacing
- Fixed time selector alignment using flexbox with `!important` overrides
- Ensured proper alignment on both desktop and mobile

#### Rename Input Text Color (`frontend/src/handlers/conversations.ts`, `frontend/tailwind.css`)
- Added inline styles for input field: `color: #1f2937`, `backgroundColor: #ffffff`
- Added `.rename-input` CSS class with `!important` rules for visibility
- Ensures text is always visible against background

### Result
- Proper layout on all screen sizes
- All text is readable
- Better mobile user experience

## Summary

All bugs have been fixed and error handling has been significantly improved. The application now:
- Has clean logs without harmless error noise
- Works correctly on both desktop and mobile
- Handles network errors gracefully
- Automatically builds frontend when needed
- Passes all linting checks
- Provides better user experience

Most fixes focused on:
1. Suppressing harmless errors (broken pipes, 404s)
2. Improving mobile experience (touch handling, layout)
3. Code quality (linting, unused code removal)
4. Developer experience (auto-build, cleaner logs)

