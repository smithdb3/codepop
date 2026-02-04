# CodePop — root Makefile
# Run from repo root. Backend: codepop_backend (Docker). Frontend: codepop (Expo).

BACKEND_DIR := codepop_backend
FRONTEND_DIR := codepop

.PHONY: up down migrate seed setup backend frontend frontend-setup android ios

# Start backend (Postgres + Django) in background
up:
	cd $(BACKEND_DIR) && docker compose up -d

# Stop backend containers
down:
	cd $(BACKEND_DIR) && docker compose down

# Create and run Django migrations
migrate:
	cd $(BACKEND_DIR) && docker compose exec web python manage.py makemigrations --noinput
	cd $(BACKEND_DIR) && docker compose exec web python manage.py migrate --noinput

# Seed database (populate_db). Requires backend to be up and migrated.
seed:
	cd $(BACKEND_DIR) && docker compose exec web python manage.py populate_db

# Full backend setup: start containers, migrate, seed
setup: up
	@echo "Waiting for web service..."
	@sleep 5
	$(MAKE) migrate
	$(MAKE) seed

# Run backend in foreground (logs in terminal)
backend:
	cd $(BACKEND_DIR) && docker compose up

# Frontend initial setup (install dependencies). Run once before first make frontend.
frontend-setup:
	cd $(FRONTEND_DIR) && npm install

# Run Expo dev server (frontend)
frontend:
	cd $(FRONTEND_DIR) && npm start

# Build and run Android app. Uses Java 17 for Gradle compatibility.
android:
	cd $(FRONTEND_DIR) && JAVA_HOME=$$(/usr/libexec/java_home -v 17) npx expo run:android

# Build and run iOS app
ios:
	cd $(FRONTEND_DIR) && npx expo run:ios
