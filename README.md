# CodePop

CodePop includes:
- a Django backend (`codepop_backend`)
- a React Native app (`codepop`)
- an optional web dashboard (`dashboards_frontend`)

For full feature walkthroughs, open the user manual at `docs/user_manual.html`.

Backend: `http://localhost:8000`

## Prerequisites

Install these before setup:
- Docker Desktop (must be running)
- Node.js + npm

For mobile simulator testing, either:
- Xcode + iOS Simulator (macOS)
- Android Studio + Android Emulator

## Step-by-Step Setup

### 1) Clone the Repository

```bash
git clone <repo-url>
cd codepop
```

### 2) Configure Environment Variables

Create your backend `.env` file:

```bash
cp codepop_backend/.env.example codepop_backend/.env
```

Open `codepop_backend/.env` and provide values for:
- `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` from [Stripe Dashboard](https://dashboard.stripe.com/)
- `MAPBOX_ACCESS_TOKEN` from [Mapbox](https://account.mapbox.com/)
- `SECRET_KEY` as any long random string for Django

### 3) Start the Backend (Docker)

```bash
cd codepop_backend
docker compose up
```

The backend runs at `http://localhost:8000`.

### 4) Start the Mobile/Web App

Open a new terminal, go back to the repository root, then run:

```bash
cd codepop
npm install
npm start
```

When the interactive menu appears:
- press `i` for iOS Simulator (macOS)
- press `a` for Android Emulator
- press `w` for web browser

You can also run directly:

```bash
npm run ios
npm run android
npm run web
```

### 5) Optional: Start Dashboards

Keep the backend running first, then in another terminal:

```bash
cd dashboards_frontend
npm install
npm run dev
```

Dashboard URL: `http://localhost:5173`

## Dashboard Test Users

When backend containers start, migrations seed test users automatically. No manual setup is needed.

| Role | Username | Email | Password |
|---|---|---|---|
| Super Admin | **superadmin** | superadmin@codepop.local | superadmin123 |
| Admin | **admin** | admin@codepop.local | admin123 |
| Manager | **manager** | manager@codepop.local | manager123 |
| Logistics Manager | **logistics** | logistics@codepop.local | logistics123 |
| Repair Staff | **repairstaff** | repair@codepop.local | repair123 |

## Full Usage Documentation

For complete feature instructions and user workflows, open:
- `docs/user_manual.html`

## Troubleshooting

- If `docker compose up` fails, confirm Docker Desktop is running.
- If login or API calls fail, verify backend is still running on `http://localhost:8000`.
- If frontend commands fail, confirm Node and npm are installed (`node -v`, `npm -v`).
- If emulator launch fails, start iOS/Android simulator manually first, then run `npm start`.
