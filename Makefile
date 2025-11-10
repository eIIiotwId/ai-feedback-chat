PY = uv run
UV_ENV = UV_CACHE_DIR=.uvcache

.PHONY: help uv-sync migrate makemigrations run run-clean run-mobile test build-frontend clean clean-db lint format check-server

help:
	@echo "Targets:"
	@echo "  uv-sync           Install Python deps via uv"
	@echo "  makemigrations    Create new Django migrations"
	@echo "  migrate           Apply database migrations"
	@echo "  run               Start Django dev server (auto-kills existing processes)"
	@echo "  run-clean         Force kill all processes and restart server"
	@echo "  run-mobile        Start Django dev server on 0.0.0.0:8000 for mobile testing"
	@echo "  check-server      Check if server is running and show IP addresses"
	@echo "  test              Run pytest"
	@echo "  build-frontend    Build Vite+Tailwind assets to static/app/"
	@echo "  lint              Run ESLint on frontend"
	@echo "  format            Run Prettier write formatting"
	@echo "  clean             Remove build artifacts"
	@echo "  clean-db          Delete database and reinitialize"

uv-sync:
	$(UV_ENV) uv sync

makemigrations:
	$(UV_ENV) $(PY) python manage.py makemigrations

migrate:
	$(UV_ENV) $(PY) python manage.py migrate

run:
	@echo "Checking for existing processes on port 8000..."
	@lsof -ti:8000 | xargs kill -9 2>/dev/null || true
	@if [ ! -f static/app/main.js ]; then \
		echo "Frontend not built. Building frontend assets..." ; \
		$(MAKE) build-frontend ; \
	fi
	@echo "Starting Django development server..."
	$(UV_ENV) $(PY) python manage.py runserver

run-clean:
	@echo "Force killing all Python/Django processes..."
	@pkill -f "python manage.py runserver" 2>/dev/null || true
	@pkill -f "uv run python manage.py runserver" 2>/dev/null || true
	@lsof -ti:8000 | xargs kill -9 2>/dev/null || true
	@if [ ! -f static/app/main.js ]; then \
		echo "Frontend not built. Building frontend assets..." ; \
		$(MAKE) build-frontend ; \
	fi
	@echo "Starting fresh Django development server..."
	$(UV_ENV) $(PY) python manage.py runserver

run-mobile:
	@echo "Starting Django development server on 0.0.0.0:8000 for mobile testing..."
	@if [ ! -f static/app/main.js ]; then \
		echo "Frontend not built. Building frontend assets..." ; \
		$(MAKE) build-frontend ; \
	fi
	@echo ""
	@if ipconfig getifaddr en0 >/dev/null 2>&1; then \
		echo "Your IP address: $$(ipconfig getifaddr en0)"; \
		echo "Access from phone: http://$$(ipconfig getifaddr en0):8000"; \
	elif ipconfig getifaddr en1 >/dev/null 2>&1; then \
		echo "Your IP address: $$(ipconfig getifaddr en1)"; \
		echo "Access from phone: http://$$(ipconfig getifaddr en1):8000"; \
	else \
		echo "Could not detect IP address. Find it with: ipconfig getifaddr en0"; \
	fi
	@echo ""
	$(UV_ENV) $(PY) python manage.py runserver 0.0.0.0:8000

test:
	$(UV_ENV) $(PY) pytest -q

build-frontend:
	npm install
	npm run build

lint:
	npm run lint

format:
	npm run format

clean:
	rm -rf static/app/* **/__pycache__ .pytest_cache

clean-db:
	rm -f db.sqlite3
	$(UV_ENV) $(PY) python manage.py migrate

check-server:
	@echo "Checking if server is running on port 8000..."
	@lsof -i :8000 || echo "No server found on port 8000"
	@echo ""
	@echo "Your IP address(es):"
	@if ipconfig getifaddr en0 >/dev/null 2>&1; then \
		echo "  Wi-Fi (en0): $$(ipconfig getifaddr en0)"; \
	else \
		echo "  Wi-Fi (en0): Not connected"; \
	fi
	@if ipconfig getifaddr en1 >/dev/null 2>&1; then \
		echo "  Ethernet (en1): $$(ipconfig getifaddr en1)"; \
	else \
		echo "  Ethernet (en1): Not connected"; \
	fi
	@echo ""
	@echo "Test locally with: curl http://127.0.0.1:8000"
