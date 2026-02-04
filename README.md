# CodePop

CodePop is a full-stack mobile app for ordering customizable sodas. It uses a React Native/Expo frontend and a Django REST API with a PostgreSQL backend.

## Prerequisites

- **Backend**: Docker and Docker Compose (the backend runs in containers; see `codepop_backend/docker-compose.yml`).
- **Frontend**: Node.js and npm (Expo/React Native; see `codepop/package.json`).
- **Optional**: Java 17 for building and running the Android app (`make android`).

## How to Run

All `make` commands must be run from the **repository root** (the directory that contains the Makefile).

### First Time

1. **Backend**: Run `make setup`. This starts the Docker containers, runs Django migrations, and seeds the database. Wait for it to finish.
2. **Frontend**: Run `make frontend-setup` once to install dependencies. Then run `make frontend` to start the Expo dev server.

### Later Runs

1. **Backend**: Run `make up` if the backend containers are stopped (for example, after `make down`).
2. **Frontend**: Run `make frontend`.

## Optional Commands

From the repository root:

- `make frontend-setup` — Install frontend dependencies (run once before first `make frontend`).
- `make down` — Stop backend containers.
- `make backend` — Run the backend in the foreground (logs in the terminal).
- `make migrate` — Run migrations only (after model changes).
- `make seed` — Re-run database seed (requires the backend to be up).
- `make android` — Build and run the Android app (requires Java 17).
- `make ios` — Build and run the iOS app (macOS only).

## Quick Reference

- **Backend API**: `http://localhost:8000` (configurable in `codepop/ip_address.js`).
- **Frontend**: The Expo dev server starts in `codepop/`. Use Expo Go on a device or an emulator to open the app.