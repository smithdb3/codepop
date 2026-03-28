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

### Demo Credentials

| Role | Email | Password |
|---|---|---|
| Super Admin | superadimin1@example.com | password |
| Admin | admin1@example.com | password |
| Manager | manager1@example.com | password |
| Logistics Manager | logistics1@example.com | password |
| Repair Staff | repair1@example.com | password |
