# CLAUDE.md - CodePop Development Guidelines

## Project Overview

CodePop is a full-stack mobile application for ordering customizable soda drinks. The project consists of:
- **Frontend**: React Native/Expo mobile app
- **Backend**: Django REST API with PostgreSQL database
- **AI Features**: ML-powered drink recommendations and customer service chatbot

**Target Platform**: Android and iOS mobile devices

---

## Technology Stack

### Frontend (`codepop/`)
- React Native 0.74.5 with Expo 51.0.38
- React Navigation for screen routing
- AsyncStorage for local data persistence
- Axios for HTTP requests
- Stripe React Native SDK for payments
- Expo Location for geolocation features

### Backend (`codepop_backend/`)
- Django 5.1 with Django REST Framework 3.14
- PostgreSQL 15 database
- Token-based authentication
- Stripe API for payment processing
- scikit-learn, pandas, numpy for ML recommendations
- transformers + torch for NLP chatbot

### Infrastructure
- Docker & Docker Compose for containerized backend
- Makefile for orchestration
- PostgreSQL running in Docker container

---

## Code Organization

### Directory Structure
```
codepop/
├── src/
│   ├── pages/          # Screen components (14 pages)
│   └── components/     # Reusable UI components (9 components)
├── assets/             # Images, fonts, icons
├── App.js              # Root navigation setup
└── ip_address.js       # Backend API URL configuration

codepop_backend/
├── backend/
│   ├── models.py       # Database models (User, Drink, Order, Inventory, etc.)
│   ├── views.py        # API endpoints (28 viewsets)
│   ├── serializers.py  # DRF serializers
│   ├── urls.py         # URL routing (40+ endpoints)
│   ├── drinkAI.py      # ML drink recommendation engine
│   ├── customerAI.py   # NLP chatbot
│   └── tests.py        # Comprehensive test suite
└── codepop_backend/
    └── settings.py     # Django configuration
```

---

## Naming Conventions

### Backend (Python/Django)
- **Models**: PascalCase with descriptive suffixes
  - `DrinkID`, `UserID`, `OrderID` for ID fields
  - `User_Created`, `Ice_Amount` (underscores for multi-word)
  - `SyrupsUsed`, `AddIns` (plural for array fields)
- **API Endpoints**: snake_case in URLs
  - `/backend/auth/login/`
  - `/backend/users/<user_id>/preferences/`
- **Functions/Methods**: snake_case
  - `create_payment_intent()`, `generate_drink()`

### Frontend (JavaScript/React Native)
- **Components**: PascalCase
  - `AuthPage.js`, `AIAlert.js`, `NavBar.js`
- **Functions**: camelCase
  - `handleLogin()`, `fetchDrinks()`, `updateCart()`
- **Variables**: camelCase
  - `userToken`, `checkoutList`, `drinkData`

---

## Database Models (Core Schema)

### User
- Built-in Django User model extended with roles
- Roles: Regular User, Staff (Manager), Superuser (Admin)

### Preference
- Stores user flavor preferences (70+ options)
- FK: User → Preference (one-to-many)

### Drink
- Name, SyrupsUsed[], SodaUsed[], AddIns[], Price, Size, Ice, Rating
- `User_Created` flag distinguishes custom vs catalog drinks
- ManyToMany relationship with User (favorites)

### Inventory
- ItemName, ItemType, Quantity, ThresholdLevel
- Types: Sodas, Syrups, Add-ins, Physical items

### Order
- UserID (FK), Drinks (M2M), OrderStatus, PaymentStatus, PickupTime, LockerCombo, StripeID
- Status: pending, processing, completed, cancelled
- Payment: pending, paid, failed, remade

### Notification
- User notifications with timestamps and types (global/user-specific)

### Revenue
- Transaction tracking with auto-calculated totals
- Refund support

---

## API Architecture

**Base URL**: Configured in `codepop/ip_address.js` (currently `http://localhost:8000`)

### Authentication Pattern
All protected endpoints require:
```
Authorization: Token {userToken}
```

### Key Endpoint Groups
- `/backend/auth/*` - Login, register, logout
- `/backend/preferences/*` - User flavor preferences
- `/backend/drinks/*` - Drink catalog and favorites
- `/backend/inventory/*` - Stock management
- `/backend/orders/*` - Order management
- `/backend/notifications/*` - User notifications
- `/backend/generate/*` - AI drink recommendations
- `/backend/chatbot/` - Customer service AI
- `/backend/create-payment-intent/` - Stripe payments

---

## Development Workflow

### Starting the Backend
```bash
make setup        # First-time setup (migrate + seed database)
make up           # Start Docker containers
make migrate      # Run migrations after model changes
make seed         # Populate database with test data
```

### Starting the Frontend
```bash
cd codepop
npm install       # First-time setup
npm start         # Start Expo dev server
npm run android   # Run on Android emulator
```

Or use Makefile:
```bash
make frontend     # Start Expo dev server
make android      # Build and run Android app (requires Java 17)
```

### Database Management
- Use `docker-compose` commands directly or `make up/down`
- Reset database: `bash codepop_backend/clean_database.sh`
- Seed data: `python manage.py populate_db` (or `make seed`)

---

## Code Style Guidelines

### Frontend (React Native)

1. **Component Structure**
   - Use functional components with hooks
   - Import order: React → React Native → Third-party → Local components
   - Define styles at bottom of file using `StyleSheet.create()`

2. **State Management**
   - Use `useState` for local component state
   - Use `AsyncStorage` for persistent data:
     - `userToken` - Authentication token
     - `userId` - Current user ID
     - `first_name` - Display name
     - `userRole` - Access control (user/staff/admin)
     - `checkoutList` - Shopping cart as JSON string

3. **API Calls**
   - Always include error handling with try/catch
   - Check response.ok before parsing JSON
   - Include Authorization header for protected endpoints
   - Show user-friendly alerts for errors

4. **Navigation**
   - Use `navigation.navigate()` for screen transitions
   - Pass params via route.params
   - Access navigation via `useNavigation()` hook

5. **UI Patterns**
   - Use `ScrollView` for scrollable content
   - Use `TouchableOpacity` for buttons
   - Use `Modal` for dialogs and overlays
   - Follow existing color scheme:
     - Primary: `#C6C8EE` (light purple)
     - Accent: `#FFA686` (coral)
     - Actions: `#8df1d3` (teal), `#D30C7B` (pink)

### Backend (Django)

1. **View Structure**
   - Use DRF ViewSets for standard CRUD operations
   - Use APIView for custom logic
   - Define permission_classes explicitly
   - Return appropriate HTTP status codes (200, 201, 400, 404, etc.)

2. **Model Definitions**
   - Always include `__str__()` method
   - Use descriptive field names with PascalCase
   - Add help_text for complex fields
   - Define related_name for foreign keys

3. **Serializers**
   - Include validation logic in serializers
   - Use nested serializers for related objects when needed
   - Override `create()` and `update()` for complex logic

4. **URL Patterns**
   - Use descriptive path names
   - Include trailing slashes
   - Group related endpoints
   - Use angle brackets for path parameters: `<int:user_id>`

5. **Error Handling**
   - Return JSON error responses with descriptive messages
   - Use DRF's Response class
   - Catch DoesNotExist exceptions explicitly

---

## Common Tasks

### Adding a New Model
1. Define model in `backend/models.py`
2. Create serializer in `backend/serializers.py`
3. Create viewset in `backend/views.py`
4. Add URL patterns in `backend/urls.py`
5. Run migrations: `make migrate`
6. Update tests in `backend/tests.py`

### Adding a New Screen
1. Create component in `codepop/src/pages/`
2. Add screen to Stack.Navigator in `App.js`
3. Add navigation logic from existing screens
4. Follow existing layout patterns (ScrollView, styles, etc.)

### Modifying API Endpoints
1. Update view logic in `backend/views.py`
2. Update serializer if data structure changes
3. Test endpoint manually or via tests
4. Update frontend API calls if needed

### Database Seeding
- Edit `backend/management/commands/populate_db.py`
- Run `make seed` to populate database
- Creates test users, drinks, inventory, orders

---

## Authentication & Authorization

### User Roles
- **Regular User**: Browse drinks, place orders, manage preferences
- **Manager (Staff)**: View inventory, manage stock, view revenue reports
- **Admin (Superuser)**: User management, system-wide notifications

### Frontend Role Checking
```javascript
const userRole = await AsyncStorage.getItem('userRole');
if (userRole === 'admin') {
  navigation.navigate('AdminDash');
} else if (userRole === 'staff') {
  navigation.navigate('ManagerDash');
}
```

### Backend Permissions
- `AllowAny`: Public endpoints (drinks list, registration)
- `IsAuthenticated`: Login required (preferences, orders)
- Custom: Admin-only operations check `request.user.is_superuser`

---

## AI Features

### Drink Recommendation Engine (`drinkAI.py`)
- Uses cosine similarity on syrup flavor profiles
- Recommends best soda pairings for selected syrups
- Reads from CSV files: Syrups.csv, Sodas.csv, AddIns.csv
- Returns top-ranked drink suggestions

### Customer Service Chatbot (`customerAI.py`)
- NLP-based responses using HuggingFace transformers
- Large model download required (not always active in dev)
- Handles customer questions and complaints

**Important**: AI features require ML dependencies (scikit-learn, torch, transformers). Ensure these are installed when deploying.

---

## Testing

### Backend Tests
- Located in `backend/tests.py` (1210 lines)
- Comprehensive coverage of all major endpoints
- Run tests: `python manage.py test backend`

### Test Data
- Use `populate_db.py` to create test fixtures
- Test users, drinks, and orders are seeded automatically

### Frontend Testing
- Currently minimal automated testing
- Manual testing via Expo dev tools
- Test on both Android and iOS when possible

---

## Environment Configuration

### Backend Environment Variables
Defined in `docker-compose.yml` or `.env` file:
- `POSTGRES_DB`: Database name
- `POSTGRES_USER`: Database user
- `POSTGRES_PASSWORD`: Database password
- `POSTGRES_HOST`: Database host (default: db)
- `STRIPE_SECRET_KEY`: Stripe API secret (TODO: configure)
- `STRIPE_PUBLISHABLE_KEY`: Stripe publishable key (TODO: configure)

### Frontend Configuration
- Backend URL: Edit `codepop/ip_address.js`
- Change `BASE_URL` for different environments (localhost, production, etc.)

---

## Security Considerations

### Current Development State
- DEBUG = True (development only)
- ALLOWED_HOSTS = ['*'] (tighten in production)
- SECRET_KEY is hardcoded (use environment variable)
- Stripe keys are placeholders (configure before payments)
- Token stored in AsyncStorage (vulnerable on rooted devices)

### Production Checklist
- [ ] Set DEBUG = False
- [ ] Configure proper ALLOWED_HOSTS
- [ ] Use environment variables for secrets
- [ ] Enable HTTPS for all API calls
- [ ] Configure proper CORS settings
- [ ] Implement rate limiting
- [ ] Add Stripe webhook verification
- [ ] Secure token storage (consider more secure methods)

---

## Things to AVOID

1. **Don't modify core Django files** unless necessary
   - Avoid changes to `manage.py`, `wsgi.py`, `asgi.py`

2. **Don't break existing naming conventions**
   - Backend models use PascalCase for fields
   - Frontend components use PascalCase for names
   - API endpoints use snake_case in URLs

3. **Don't add dependencies without justification**
   - Check if functionality exists in current stack first
   - Document why new dependencies are needed

4. **Don't skip migrations**
   - Always create and run migrations after model changes
   - Never manually edit the database schema

5. **Don't hardcode sensitive data**
   - Use environment variables for API keys, secrets
   - Never commit .env files to git

6. **Don't bypass authentication**
   - Always check permissions in backend views
   - Verify user role before granting access to sensitive operations

7. **Don't ignore error handling**
   - Always wrap API calls in try/catch blocks
   - Provide user-friendly error messages
   - Log errors for debugging

8. **Don't create duplicate state**
   - Use AsyncStorage as single source of truth for persistent data
   - Avoid conflicting state in multiple components

9. **Don't ignore existing UI patterns**
   - Follow color scheme and layout conventions
   - Reuse existing components when possible
   - Maintain consistent navigation patterns

10. **Don't delete test data CSV files**
    - Sodas.csv, Syrups.csv, AddIns.csv are required for AI features
    - These files are read dynamically by drinkAI.py

---

## File Locations Reference

### Key Configuration Files
- Backend API URL: `codepop/ip_address.js`
- Django settings: `codepop_backend/codepop_backend/settings.py`
- Expo config: `codepop/app.json`
- Docker setup: `codepop_backend/docker-compose.yml`
- Dependencies: `codepop/package.json`, `codepop_backend/requirements.txt`

### Core Logic Files
- Navigation: `codepop/App.js`
- Database models: `codepop_backend/backend/models.py`
- API views: `codepop_backend/backend/views.py`
- API URLs: `codepop_backend/backend/urls.py`
- ML recommendations: `codepop_backend/backend/drinkAI.py`
- Chatbot: `codepop_backend/backend/customerAI.py`
- Tests: `codepop_backend/backend/tests.py`

### Data Files
- Ingredient data: `codepop_backend/backend/*.csv`
- Database seed script: `codepop_backend/backend/management/commands/populate_db.py`

---

## Common Patterns and Idioms

### Frontend: Fetching User-Specific Data
```javascript
const userToken = await AsyncStorage.getItem('userToken');
const userId = await AsyncStorage.getItem('userId');

const response = await fetch(`${BASE_URL}/backend/users/${userId}/drinks/`, {
  headers: {
    'Authorization': `Token ${userToken}`,
  },
});
```

### Backend: Creating Custom ViewSet Actions
```python
class MyViewSet(viewsets.ModelViewSet):
    @action(detail=False, methods=['get'])
    def custom_action(self, request):
        # Custom logic here
        return Response(data)
```

### Frontend: Role-Based Conditional Rendering
```javascript
const userRole = await AsyncStorage.getItem('userRole');
{userRole === 'admin' && (
  <TouchableOpacity onPress={adminAction}>
    <Text>Admin Only Button</Text>
  </TouchableOpacity>
)}
```

### Backend: Permission-Based Access
```python
from rest_framework.permissions import IsAuthenticated

class ProtectedView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_superuser:
            return Response(
                {"error": "Admin access required"},
                status=status.HTTP_403_FORBIDDEN
            )
```

---

## Troubleshooting

### Backend won't start
- Check if PostgreSQL container is running: `docker ps`
- Check logs: `docker-compose logs db`
- Verify environment variables in docker-compose.yml
- Try: `make down && make up`

### Frontend can't connect to backend
- Verify `ip_address.js` has correct URL
- Check if backend is running: `curl http://localhost:8000/backend/drinks/`
- Try restarting Expo: Clear cache and restart

### Migrations failing
- Check for model definition errors
- Try: `docker-compose exec web python manage.py makemigrations`
- Reset database if needed: `bash clean_database.sh`

### Android build failing
- Ensure Java 17 is installed and in PATH
- Clear Gradle cache: `cd codepop/android && ./gradlew clean`
- Check `codepop/android/gradle.properties`

---

## Additional Notes

- This is a school project (CS3450 course)
- Recent focus on requirements documentation and testing
- Many design documents were removed from repo (in git history)
- Project uses Docker for backend to ensure consistent development environment
- Frontend designed for mobile-first experience
- AI features are optional but provide core value proposition

---

## When Making Changes

1. **Read existing code first** - Understand current implementation before modifying
2. **Follow existing patterns** - Match the style and structure already in place
3. **Test thoroughly** - Verify changes work on both frontend and backend
4. **Update tests** - Add or modify tests when changing logic
5. **Check migrations** - Run and commit migrations after model changes
6. **Document complex logic** - Add comments for non-obvious code
7. **Consider user roles** - Ensure proper authorization for new features
8. **Maintain backwards compatibility** - Don't break existing API contracts
9. **Keep it simple** - Don't over-engineer or add unnecessary abstractions
10. **Ask questions** - Clarify requirements before implementing features

---

## Questions Before Starting Work

When assigned a new task, consider asking:
- Which user role(s) should have access to this feature?
- Should this work offline or require network connection?
- Are there any specific error cases to handle?
- Should this integrate with existing AI features?
- Does this affect inventory or payment flows?
- What should happen if the user is not logged in?
- Are there specific UI/UX requirements?

---

**Last Updated**: 2026-02-02
**Project Status**: Active Development
**Primary Contact**: Braden Peterson
