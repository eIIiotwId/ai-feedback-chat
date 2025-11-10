# Technical Decisions

This document outlines all key technical decisions made during the development of the AI Chat Application.

## Database Design

### Two Separate Feedback Models

**Decision**: Created separate `MessageFeedback` and `ConversationFeedback` models instead of a single unified feedback model.

**Rationale**:
- Message-level feedback provides granular insights into individual AI responses
- Conversation-level feedback captures overall user satisfaction with the entire conversation
- Different feedback types enable different analytical insights
- Conversation feedback allows for multi-dimensional ratings (overall, helpfulness, accuracy)
- Separation allows independent evolution of feedback types

**Implementation**: 
- `MessageFeedback`: OneToOne relationship with Message, single rating (1-5), optional comment
- `ConversationFeedback`: OneToOne relationship with Conversation, three ratings (overall, helpfulness, accuracy), optional comment

### 5-Point Rating Scale

**Decision**: Used a 1-5 rating scale for all feedback types.

**Rationale**:
- Standard and widely understood by users
- Provides sufficient granularity without complexity
- Consistent across all feedback types for easier analysis
- Industry standard (similar to star ratings)

**Implementation**: All rating fields use `PositiveIntegerField` with choices (1-5) and validation.

### Message Sequence Numbers

**Decision**: Implemented automatic sequence numbering for messages within conversations.

**Rationale**:
- Enables efficient polling with `since` parameter
- Prevents race conditions in concurrent message creation
- Provides natural ordering without relying on timestamps
- Atomic sequence assignment prevents duplicates

**Implementation**: Sequence auto-increments using database transactions with `select_for_update()` to ensure thread-safety.

### Conversation Timestamp Updates

**Decision**: Automatically update `updated_at` timestamp when messages are added.

**Rationale**:
- Enables proper conversation ordering (most recently active first)
- Provides accurate "last activity" tracking
- Automatic updates reduce manual maintenance

**Implementation**: Override `Message.save()` to update parent conversation's `updated_at` field.

## Frontend Architecture

### Modular Component-Based Structure

**Decision**: Organized frontend code into modular components, handlers, services, and utilities instead of a monolithic file.

**Rationale**:
- Improves maintainability and code organization
- Enables code reuse across components
- Clear separation of concerns (UI, business logic, API calls)
- Easier testing and debugging
- Follows single responsibility principle

**Structure**:
- `types/`: TypeScript type definitions
- `api/`: API client functions
- `services/`: Business logic organized by domain
- `handlers/`: Event handlers organized by feature
- `components/`: UI rendering functions
- `utils/`: Utility functions
- `state/`: Centralized state management

### Optimistic UI Updates

**Decision**: Show messages immediately in the UI before server confirmation, then replace with server data.

**Rationale**:
- Provides immediate user feedback
- Improves perceived performance
- Handles network delays gracefully
- Better user experience, especially on mobile

**Implementation**: 
- Create temporary message objects with `tempId`
- Display immediately in UI
- Replace with server response when received
- Handle failures by showing retry option

### Centralized State Management

**Decision**: Use a single centralized state object instead of distributed state or a state management library.

**Rationale**:
- Simple and sufficient for application scope
- No external dependencies
- Easy to understand and debug
- Full control over state updates

**Implementation**: Single `state` object in `state/index.ts` with all application state, updated through render function.

### No Frontend Framework

**Decision**: Use vanilla TypeScript without React, Vue, or other frameworks.

**Rationale**:
- Simpler build process and smaller bundle size
- Full control over DOM manipulation
- No framework learning curve
- Sufficient for application complexity
- Faster initial load time

### Mobile-First Responsive Design

**Decision**: Implement separate mobile and desktop rendering paths with mobile-optimized interactions.

**Rationale**:
- Mobile users have different interaction patterns (touch, swipe, keyboard)
- Mobile requires different layout (full-screen chat vs sidebar)
- Better performance with optimized code paths
- Improved user experience on mobile devices

**Implementation**:
- Separate `renderMobileChat()` and `renderDesktopLayout()` functions
- Mobile-specific event handlers (swipe gestures, keyboard handling)
- Touch-optimized UI elements (larger buttons, proper touch targets)

## API Design

### RESTful Endpoints

**Decision**: Use standard REST conventions for all API endpoints.

**Rationale**:
- Follows Django REST Framework conventions
- Easy to understand and maintain
- Standard HTTP methods (GET, POST, PATCH, DELETE)
- Predictable URL structure

**Endpoints**:
- `/api/conversations/` - List/create conversations
- `/api/conversations/{id}/` - Get/update/delete conversation
- `/api/conversations/{id}/messages/` - List/create messages
- `/api/messages/{id}/feedback/` - Create/update message feedback
- `/api/conversations/{id}/feedback/` - Create/update conversation feedback
- `/api/insights/` - Get analytics data

### Pagination and Filtering

**Decision**: Implement limit/offset pagination and `since` parameter for message polling.

**Rationale**:
- Efficient data loading
- Supports incremental updates
- Prevents loading entire conversation history at once
- Enables real-time updates via polling

**Implementation**:
- Conversations: `limit` and `offset` query parameters
- Messages: `since` (sequence number) and `limit` parameters
- Default limits prevent excessive data transfer

### Comprehensive Serializer Validation

**Decision**: Implement thorough validation in DRF serializers with clear error messages.

**Rationale**:
- Ensures data integrity at API boundary
- Provides clear feedback to users
- Prevents invalid data from being stored
- Reduces need for validation in business logic

**Implementation**:
- Field-level validation (rating ranges, text length)
- Custom validators for complex rules
- Clear error messages returned to client

### Error Handling

**Decision**: Return appropriate HTTP status codes and error messages.

**Rationale**:
- Standard HTTP status codes for different error types
- Clear error messages help debugging
- Consistent error format across API

**Implementation**:
- 400: Validation errors
- 404: Resource not found
- 502: External service errors (Gemini API)
- 204: Successful deletion

## Backend Architecture

### Service Layer Pattern

**Decision**: Separate business logic into service modules (e.g., `chat/services/gemini.py`).

**Rationale**:
- Separates API integration from view logic
- Easier to test and mock
- Reusable across different views
- Clear error handling boundaries

**Implementation**: 
- `chat/services/gemini.py`: Gemini API integration
- Custom exception class `GeminiServiceError` for service errors

### Utility Functions

**Decision**: Extract reusable logic into utility modules.

**Rationale**:
- DRY (Don't Repeat Yourself) principle
- Easier to test in isolation
- Clear separation of concerns

**Implementation**:
- `chat/utils/insights.py`: Analytics aggregation functions
- `chat/utils/title_generation.py`: Title generation logic

### Automatic Title Generation

**Decision**: Generate conversation titles automatically using Gemini API with fallback.

**Rationale**:
- Improves user experience (no manual title entry)
- Better organization of conversations
- Fallback ensures titles always exist

**Implementation**:
- Primary: Use Gemini to generate descriptive title from first message
- Fallback: Simple truncation of first few words if Gemini fails

## Error Handling and Logging

### Suppress Harmless Errors

**Decision**: Suppress "Broken pipe" and connection reset errors in logs.

**Rationale**:
- These errors are harmless and common with mobile browsers
- Clutter logs without providing useful information
- Occur when clients disconnect during requests (normal behavior)

**Implementation**:
- Django logging filters to suppress specific error messages
- WSGI wrapper to catch and suppress at WSGI level
- Frontend error handling to silently ignore network errors during polling

### Logging Configuration

**Decision**: Configure logging to show only relevant information.

**Rationale**:
- Reduces log noise
- Focuses on actual errors and important events
- Better developer experience

**Implementation**:
- Suppress broken pipe errors
- Suppress common 404s (favicon, robots.txt)
- Set appropriate log levels for different loggers

## Code Quality

### TypeScript for Type Safety

**Decision**: Use TypeScript instead of plain JavaScript.

**Rationale**:
- Catch errors at compile time
- Better IDE support and autocomplete
- Self-documenting code with types
- Easier refactoring

### ESLint and Prettier

**Decision**: Use ESLint for linting and Prettier for code formatting.

**Rationale**:
- Enforces code quality standards
- Consistent code style across project
- Catches potential bugs early
- Zero warnings policy ensures clean codebase

### Makefile for Common Tasks

**Decision**: Use Makefile to standardize common development tasks.

**Rationale**:
- Single command for common operations
- Consistent workflow across team
- Reduces documentation needs
- Auto-builds frontend when needed

## Performance Optimizations

### No Polling (Removed)

**Decision**: Removed polling mechanism entirely.

**Rationale**:
- Message creation and AI responses are synchronous
- Polling was unnecessary overhead
- Reduced server load and log noise
- Simpler codebase

**Previous Implementation**: Had polling with exponential backoff, but removed after analysis showed it wasn't needed.

### Database Indexing

**Decision**: Add database indexes on frequently queried fields.

**Rationale**:
- Improves query performance
- Essential for large datasets
- Low overhead for small datasets

**Implementation**:
- Index on `(conversation, sequence)` for message queries
- Default ordering indexes

### Frontend Asset Caching

**Decision**: Use cache-busting version numbers in asset URLs.

**Rationale**:
- Ensures users get latest code after updates
- Allows browser caching for performance
- Simple version increment forces refresh

**Implementation**: Version query parameter in template (`?v=39`)

## Security

### Environment Variables

**Decision**: Store sensitive configuration in `.env` file.

**Rationale**:
- Keeps secrets out of version control
- Easy to configure per environment
- Standard practice for Django projects

**Implementation**: Use `python-dotenv` to load `.env` file, `.env` in `.gitignore`

### Input Validation

**Decision**: Validate all user input at API boundary.

**Rationale**:
- Prevents invalid data from entering system
- Protects against malicious input
- Clear error messages for users

**Implementation**: DRF serializer validation, max length limits, required fields

## Testing

### Pytest for Backend Tests

**Decision**: Use pytest instead of Django's default test runner.

**Rationale**:
- More powerful and flexible
- Better test discovery
- Cleaner test syntax
- Better fixture system

### Comprehensive Test Coverage

**Decision**: Write unit tests for models, views, serializers, services, and utilities.

**Rationale**:
- Ensures code correctness
- Prevents regressions
- Documents expected behavior
- Enables confident refactoring

**Test Structure**:
- `test_models.py`: Model behavior and relationships
- `test_api.py`: API endpoint functionality
- `test_serializers.py`: Serializer validation
- `test_services.py`: Service layer logic
- `test_utils.py`: Utility function behavior

