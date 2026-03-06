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

## 3. Start with Docker (Recommended)

```bash
cd codepop_backend
docker-compose up
```

The backend runs at `http://localhost:8000`.

## 4. Start the Frontend

```bash
cd codepop
npm install
npm start
```

> If you need the frontend to connect to a backend on a different machine or IP, update the URL in `codepop/ip_address.js`.

---

## Local Backend (Without Docker)

If you prefer to run the backend without Docker:

1. Create a PostgreSQL database named `codepop`
2. Update `DB_HOST=localhost` in your `.env`
3. From `codepop_backend/`, seed the database:
   ```bash
   ./clean_database.sh
   ```
4. Start the server:
   ```bash
   python manage.py runserver localhost:8000
   ```
