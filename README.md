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
