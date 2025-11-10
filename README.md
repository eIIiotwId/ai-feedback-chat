# AI Chat Application

A modern, full-stack chat application that enables users to interact with an AI assistant powered by Google Gemini. The application features comprehensive feedback collection, analytics dashboards, and a responsive design optimized for both desktop and mobile devices.

## Features

- **AI-Powered Conversations**: Chat with Google Gemini AI assistant with automatic conversation title generation
- **Feedback System**: Rate individual messages and entire conversations with optional comments
- **Analytics Dashboard**: View insights and statistics from user feedback with time-based filtering
- **Responsive Design**: Optimized mobile experience with swipe gestures and touch-friendly interactions
- **Real-time Updates**: Instant message delivery and feedback submission
- **Search Functionality**: Search conversations by title
- **Modern UI**: Clean, intuitive interface built with Tailwind CSS

## Tech Stack

### Backend
- **Django 5** - Web framework
- **Django REST Framework** - API development
- **SQLite** - Database (development)
- **Google Gemini API** - AI conversation engine
- **Python 3.11+** - Programming language

### Frontend
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Vanilla JavaScript** - No framework dependencies

## Prerequisites

- **Python 3.11+**
- **uv** - Fast Python package manager ([Installation Guide](https://docs.astral.sh/uv/))
- **Node.js 18+** (recommended 20+)
- **npm** - Node package manager
- **Google Gemini API Key** - Get one from [Google AI Studio](https://makersuite.google.com/app/apikey)

## Installation

1. **Clone the repository**
   ```bash
   git clone git@github.com:eIIiotwId/ai-feedback-chat.git
   cd new-engineering-test-main
   ```

2. **Install Python dependencies**
   ```bash
   make uv-sync
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

4. **Initialize the database**
   ```bash
   make migrate
   ```

5. **Build frontend assets**
   ```bash
   make build-frontend
   ```

## Usage

### Development Server

Start the development server:
```bash
make run
```

The application will be available at `http://127.0.0.1:8000`

**Note**: The server will automatically build frontend assets if they're missing.

### Mobile Testing

To test on mobile devices:

1. **Start the mobile-accessible server**
   ```bash
   make run-mobile
   ```

2. **Find your IP address** (displayed in terminal output)

3. **Access from your phone**
   - Ensure your phone is on the same Wi-Fi network
   - Navigate to `http://<your-ip-address>:8000` in your mobile browser

### Available Commands

Run `make help` to see all available commands:

- `make run` - Start development server (localhost)
- `make run-mobile` - Start server accessible from network
- `make run-clean` - Force kill processes and restart
- `make build-frontend` - Build frontend assets
- `make lint` - Run ESLint on frontend code
- `make format` - Format code with Prettier
- `make test` - Run pytest tests
- `make clean` - Remove build artifacts
- `make clean-db` - Reset database
- `make check-server` - Check server status and IP addresses

## Project Structure

```
.
├── ai_chat/              # Django project settings
│   ├── settings.py       # Application configuration
│   ├── urls.py           # Root URL routing
│   └── wsgi.py           # WSGI application
├── chat/                 # Main application
│   ├── models.py         # Database models
│   ├── views.py          # API endpoints
│   ├── serializers.py    # DRF serializers
│   ├── services/         # Business logic
│   │   └── gemini.py     # Gemini AI integration
│   └── utils/            # Utility functions
│       ├── insights.py   # Analytics aggregation
│       └── title_generation.py  # Conversation title generation
├── frontend/             # Frontend source code
│   └── src/
│       ├── api/          # API client
│       ├── components/  # UI components
│       ├── handlers/    # Event handlers
│       ├── services/    # Business logic
│       ├── state/       # State management
│       ├── types/       # TypeScript types
│       └── utils/       # Utility functions
├── templates/            # Django templates
│   ├── index.html       # Main chat interface
│   └── insights.html    # Analytics dashboard
├── static/app/           # Built frontend assets
└── tests/                # Test suite
```

## API Documentation

### Conversations

- `GET /api/conversations/` - List conversations (supports `offset` and `limit` query params)
- `POST /api/conversations/` - Create new conversation (optional `title` in body)
- `GET /api/conversations/{id}/` - Get conversation details
- `PATCH /api/conversations/{id}/` - Update conversation (e.g., rename)
- `DELETE /api/conversations/{id}/` - Delete conversation

### Messages

- `GET /api/conversations/{id}/messages/` - List messages (supports `since` and `limit` query params)
- `POST /api/conversations/{id}/messages/` - Send user message, returns both user and AI response

### Feedback

- `POST /api/messages/{id}/feedback/` - Submit message feedback (rating 1-5, optional comment)
- `POST /api/conversations/{id}/feedback/` - Submit conversation feedback (overall, helpfulness, accuracy ratings, optional comment)
- `GET /api/conversations/{id}/feedback/` - Get conversation feedback

### Insights

- `GET /insights/` - View analytics dashboard with feedback statistics

## Development

### Code Organization

The project follows a modular architecture:

- **Frontend**: Organized by feature (types, API, services, handlers, components)
- **Backend**: Domain-driven structure with separated concerns (models, views, services, utils)
- **Type Safety**: Full TypeScript coverage on frontend
- **Separation of Concerns**: Clear boundaries between UI, business logic, and data access

### Frontend Architecture

The frontend uses a component-based architecture without frameworks:

- **State Management**: Centralized state object in `state/index.ts`
- **Event Handlers**: Organized by feature area (conversations, messages, feedback, etc.)
- **Components**: Separate rendering functions for mobile and desktop layouts
- **Services**: Business logic separated from UI concerns

### Building Frontend

Frontend assets are built using Vite:

```bash
make build-frontend
```

This compiles TypeScript, processes Tailwind CSS, and outputs to `static/app/`.

### Code Quality

- **Linting**: `make lint` - Runs ESLint with TypeScript support
- **Formatting**: `make format` - Runs Prettier to format code
- **Type Checking**: TypeScript compiler validates types during build

## Testing

Run the test suite:

```bash
make test
```

Tests are located in the `tests/` directory and use pytest.

## Troubleshooting

### Server won't start

- Ensure `GEMINI_API_KEY` is set in `.env`
- Check if port 8000 is already in use: `make check-server`
- Try `make run-clean` to force kill existing processes

### Frontend not loading

- Ensure frontend is built: `make build-frontend`
- Clear browser cache and hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
- Check browser console for errors

### Mobile access issues

- Use `make run-mobile` (not `make run`) for mobile testing
- Ensure phone and computer are on the same Wi-Fi network
- Check firewall settings on macOS/Windows
- Verify server is listening on `0.0.0.0:8000` (not `127.0.0.1`)

## Author

**Elliot Waldvogel**

## License

Copyright (c) 2024 Elliot Waldvogel. All rights reserved.

