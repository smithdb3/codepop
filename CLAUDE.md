# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CodePop is a full-stack mobile application for ordering custom soda drinks. The system consists of:
- **Frontend**: React Native mobile app (Expo) targeting Android
- **Backend**: Django REST Framework API with PostgreSQL database
- **AI Components**: Drink recommendation engine (scikit-learn) and customer service chatbot (DialoGPT)

## Development Environment Setup

### Backend Setup (Django)

1. **Create and activate virtual environment:**
   ```bash
   # Windows (Git Bash)
   python -m venv codepop_virtual_enviroment
   source codepop_virtual_enviroment/Scripts/activate

   # Mac/Linux
   python -m venv codepop_virtual_enviroment
   source codepop_virtual_enviroment/bin/activate
   ```

2. **Install dependencies:**
   ```bash
   python -m pip install -r requirements.txt
   ```

3. **PostgreSQL setup:**
   - Install PostgreSQL with username `postgres` and password `password`
   - Create database:
     ```bash
     psql -U postgres
     CREATE DATABASE codepop_database;
     ```

4. **Database initialization:**
   ```bash
   cd codepop_backend
   ./clean_database.sh  # Windows Git Bash or Mac/Linux
   ```
   This script drops all tables, runs migrations, and populates the database with test data.

5. **Start the backend server:**
   ```bash
   python manage.py runserver <YOUR_IP_ADDRESS>:8000
   ```
   Note: Must use your actual IP address (not localhost) for Android emulator access.

### Frontend Setup (React Native)

1. **Install dependencies:**
   ```bash
   cd codepop
   npm install
   ```

2. **Configure backend URL:**
   - Edit `codepop/ip_address.js` to set your IP address:
     ```javascript
     const BASE_URL = 'http://<YOUR_IP>:8000';
     ```

3. **Start the app:**
   ```bash
   npm run android
   ```
   Requires Android Studio with a virtual device running.

## Common Development Commands

### Backend Commands (from `codepop_backend/` directory)

**Database Management:**
```bash
# Apply migrations
python manage.py migrate

# Create new migrations after model changes
python manage.py makemigrations

# Clean database and repopulate with test data
./clean_database.sh  # Windows/Mac/Linux

# Populate database (custom management command)
python manage.py populate_db
```

**Running Tests:**
```bash
# Run all backend tests
python manage.py test

# Run tests for specific app
python manage.py test backend

# Run specific test class
python manage.py test backend.tests.PreferenceTests
```

**Server:**
```bash
# Start development server
python manage.py runserver <YOUR_IP_ADDRESS>:8000
```

**Dependencies:**
```bash
# Add a new package
python -m pip install <package_name>

# Update requirements.txt
python -m pip freeze > requirements.txt
```

### Frontend Commands (from `codepop/` directory)

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on Android emulator
npm run android

# Run on iOS simulator
npm run ios

# Run in web browser
npm run web
```

## Architecture Overview

### Backend Architecture (Django)

**Django Apps:**
- `backend/` - Main application containing all models, views, and business logic
- `codepop_backend/` - Project configuration and main URL routing

**Key Models (backend/models.py):**
- `User` (Django built-in) - Authentication with custom fields for role (staff/manager/super)
- `Preference` - User flavor preferences (many-to-one with User)
- `Drink` - Drink recipes with arrays of syrups, sodas, add-ins
- `Inventory` - Stock management for syrups, sodas, add-ins, and physical items
- `Order` - Customer orders with ManyToMany relationship to Drinks
- `Notification` - User notifications with global broadcast capability
- `Revenue` - Financial tracking linked to orders

**API Endpoints (backend/urls.py):**
All endpoints are prefixed with `/backend/`:
- Authentication: `/auth/login/`, `/auth/register/`, `/auth/logout/`
- Preferences: `/preferences/`, `/users/<user_id>/preferences/`
- Drinks: `/drinks/`, `/drinks/<id>/`, `/users/<user_id>/drinks/`
- Inventory: `/inventory/`, `/inventory/report/`, `/inventory/<id>/`
- Orders: `/orders/`, `/orders/<id>/`, `/users/<user_id>/orders/`
- Notifications: `/notifications/`, `/users/<user_id>/notifications/`, `/notifications/filter_by_time/`
- Revenue: `/revenues/`, `/revenues/<id>/`
- User Management: `/users/`, `/users/delete/<user_id>/`, `/users/edit/<user_id>/`
- AI Features: `/chatbot/`, `/generate/`, `/generate/<user_id>/`
- Payments: `/create-payment-intent/`
- Email: `/email/<orderId>/`

**AI Components:**
- `drinkAI.py` - Uses scikit-learn with cosine similarity to recommend drinks based on user preferences. Analyzes CSV files (Syrups.csv, Sodas.csv, AddIns.csv) containing ingredient types.
- `customerAI.py` - Customer service chatbot using Microsoft DialoGPT-medium model. Handles complaints, refunds, and remakes with state machine logic.

**Authentication:**
- Token-based authentication using Django REST Framework's Token Authentication
- Tokens stored in AsyncStorage on frontend and sent in Authorization header
- User roles stored in AsyncStorage: 'staff', 'manager', 'super'

### Frontend Architecture (React Native)

**Navigation:**
- React Navigation with Stack Navigator
- Main routes defined in `App.js`
- Key screens: GeneralHome (entry point), Auth, CreateAccount, Cart, CreateDrink, Preferences, ManagerDash, AdminDash

**State Management:**
- AsyncStorage for persistent data (cart, auth token, user info)
- Local component state for UI
- Cart data structure: checkoutList stored as JSON array in AsyncStorage

**Key Components (src/components/):**
- `AIAlert.js` - AI-related notifications
- `DropDown.js` - Custom dropdown component
- `Ingredients.js` - Ingredient selection UI
- `NavBar.js` - Navigation bar component
- `RatingCarousel.js` - Drink rating display
- `SeasonalCarousel.js` - Featured drinks carousel
- `StarRating.js` - Rating input component
- `map.js` - Location mapping

**Key Pages (src/pages/):**
- `GeneralHomePage.js` - Landing page with drink browsing
- `AuthPage.js` - Login screen
- `CreateAccountPage.js` - Registration
- `CartPage.js` - Shopping cart
- `CreateDrinkPage.js` - Custom drink builder
- `PreferencesPage.js` - User profile and preferences
- `PaymentPage.js`, `CheckoutForm.js` - Payment flow with Stripe
- `PostCheckout.js` - Order confirmation
- `ManagerDash.js` - Manager dashboard (inventory, orders)
- `AdminDash.js` - Admin dashboard (user management, analytics)
- `ComplaintsPage.js` - Customer service interface

**API Communication:**
- BASE_URL configured in `ip_address.js`
- All requests use fetch API with token authentication
- Response handling includes token validation and logout on 401

### Database Schema

**PostgreSQL is required** - the backend uses Django's PostgreSQL-specific `ArrayField` for storing lists of ingredients in Drink model.

**Key Relationships:**
- User → Preferences (one-to-many)
- User → Orders (one-to-many)
- Order ↔ Drinks (many-to-many)
- Drink ↔ User via Favorite (many-to-many for favorites)

**Default Test Data:**
The `populate_db` management command creates:
- Test users: super/staff/test/test2 (all password: "password")
- 6 seasonal drinks with ratings
- Full inventory of syrups/sodas/add-ins with random quantities (50-100) and thresholds (1-10)
- User preferences for each test user

## Important Development Notes

### IP Address Configuration
- Backend must run on network IP (not localhost) for Android emulator
- Update `codepop/ip_address.js` whenever backend IP changes
- Use `ipconfig` (Windows) or `ifconfig` (Mac/Linux) to find IP

### Database State Management
- Run `./clean_database.sh` when pulling changes that modify models
- This script **wipes all data** but repopulates with test data
- Always run from `codepop_backend/` directory

### Virtual Environment
- Always activate before running backend commands
- The `codepop_virtual_enviroment/` folder is gitignored
- After adding packages, update `requirements.txt` with `pip freeze > requirements.txt`

### Authentication Flow
- Frontend stores: userToken, userId, first_name, userRole in AsyncStorage
- Logout clears AsyncStorage and sends POST to `/backend/auth/logout/`
- Manager/Admin dashboards check userRole and display appropriate UI

### Model Arrays
Drink model uses PostgreSQL ArrayFields for:
- `SyrupsUsed` - list of syrup names
- `SodaUsed` - list of soda names
- `AddIns` - list of add-in names

These are stored as actual arrays in PostgreSQL, not JSON strings.

### Testing Approach
Backend tests use Django TestCase and APITestCase with:
- Token authentication setup in setUp()
- Separate test users for isolation
- Full CRUD operation coverage
Tests are located in `backend/tests.py`.
