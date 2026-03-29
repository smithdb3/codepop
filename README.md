# CodePop

## 1. Clone the Repo

```bash
git clone <repo-url>
cd codepop
```

## 2. Set Up Environment Variables

```bash
cp codepop_backend/.env.example codepop_backend/.env
```

Open `codepop_backend/.env` and fill in:
- `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` — get from [Stripe Dashboard](https://dashboard.stripe.com/)
- `MAPBOX_ACCESS_TOKEN` — get from [Mapbox](https://account.mapbox.com/)
- `SECRET_KEY` — any long random string for Django

## 3. Start with Docker

```bash
cd codepop_backend
docker compose up
```

The backend runs at `http://localhost:8000`.

## 4. Start the Frontend

```bash
cd codepop
npm install
npm start
```

## 5. Open the Simulator

**Important:** Make sure your simulator is already running before launching the app.

When you run `npm start`, you'll see an interactive menu. Choose your platform:
- Press **`i`** to open iOS Simulator (macOS)
- Press **`a`** to open Android Emulator (Android Studio)
- Press **`w`** to open in web browser

Or skip the menu and use a platform-specific command:
```bash
npm run ios      # iOS Simulator
npm run android  # Android Emulator
npm run web      # Web browser
```

## 6. Optional: Run the Dashboards

**Important:** Make sure the backend is running (step 3) before starting the dashboards, as they require the API to be accessible for login and data.

```bash
cd dashboards_frontend
npm install
npm run dev
```

The dashboard runs at `http://localhost:5173` (Vite default).

### Test Users

When you start the backend with `docker compose up`, migrations automatically run and populate the database with test user accounts for each dashboard. **No manual setup needed.**

Use these credentials to log in:

| Role | Username | Email | Password |
|---|---|---|---|
| Super Admin | **superadmin** | superadmin@codepop.local | superadmin123 |
| Admin | **admin** | admin@codepop.local | admin123 |
| Manager | **manager** | manager@codepop.local | manager123 |
| Logistics Manager | **logistics** | logistics@codepop.local | logistics123 |
| Repair Staff | **repairstaff** | repair@codepop.local | repair123 |

Each account has the correct permissions and role assignments for its dashboard. Shared across the team — everyone gets the same test accounts when they pull and start Docker.
