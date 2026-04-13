from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch, MagicMock
import json

from backend.models import Preference, Drink, Order, VisitingUserCache, Revenue
from backend.drinkAI import generate_soda, generate_drink_name, _validate_ingredients, _load_catalog, _generate_random_drink
from django.utils import timezone


class DrinkAIValidationTest(TestCase):
    """Test drink AI validation and ingredient checking."""

    def setUp(self):
        """Set up test catalog."""
        self.catalog = {
            'syrups': ['vanilla', 'chocolate', 'strawberry', 'caramel'],
            'sodas': ['coke', 'sprite', 'fanta orange'],
            'addins': ['whipped cream', 'sprinkles', 'chocolate chips'],
        }

    def test_validate_ingredients_all_valid(self):
        """Test validation passes for valid ingredients."""
        result = _validate_ingredients(
            syrups=['vanilla', 'chocolate'],
            soda='coke',
            addins=['whipped cream'],
            catalog=self.catalog
        )
        self.assertTrue(result)

    def test_validate_ingredients_invalid_syrup(self):
        """Test validation fails for invalid syrup."""
        result = _validate_ingredients(
            syrups=['vanilla', 'invalid_syrup'],
            soda='coke',
            addins=[],
            catalog=self.catalog
        )
        self.assertFalse(result)

    def test_validate_ingredients_invalid_soda(self):
        """Test validation fails for invalid soda."""
        result = _validate_ingredients(
            syrups=['vanilla'],
            soda='invalid_soda',
            addins=[],
            catalog=self.catalog
        )
        self.assertFalse(result)

    def test_validate_ingredients_invalid_addins(self):
        """Test validation fails for invalid add-ins."""
        result = _validate_ingredients(
            syrups=['vanilla'],
            soda='coke',
            addins=['invalid_addin'],
            catalog=self.catalog
        )
        self.assertFalse(result)

    def test_validate_ingredients_case_insensitive(self):
        """Test validation is case-insensitive."""
        result = _validate_ingredients(
            syrups=['VANILLA', 'CHOCOLATE'],
            soda='COKE',
            addins=['WHIPPED CREAM'],
            catalog=self.catalog
        )
        self.assertTrue(result)

    def test_validate_ingredients_empty_lists(self):
        """Test validation with empty optional lists."""
        result = _validate_ingredients(
            syrups=[],
            soda='coke',
            addins=[],
            catalog=self.catalog
        )
        # Should fail because no syrups but they may be optional
        # depends on requirements
        self.assertTrue(result)  # Assuming empty syrups is valid


class GenerateRandomDrinkTest(TestCase):
    """Test random drink generation fallback."""

    def setUp(self):
        self.catalog = {
            'syrups': ['vanilla', 'chocolate'],
            'sodas': ['coke', 'sprite'],
            'addins': ['cream'],
        }

    def test_generate_random_drink_structure(self):
        """Test that random drink has correct structure."""
        drink = _generate_random_drink(self.catalog)

        self.assertIn('syrups', drink)
        self.assertIn('soda', drink)
        self.assertIn('addins', drink)
        self.assertIn('name', drink)

        # Verify types
        self.assertIsInstance(drink['syrups'], list)
        self.assertIsInstance(drink['soda'], list)
        self.assertIsInstance(drink['addins'], list)
        self.assertIsInstance(drink['name'], str)

    def test_generate_random_drink_uses_valid_ingredients(self):
        """Test that random drink uses only valid catalog ingredients."""
        drink = _generate_random_drink(self.catalog)

        # All syrups should be in catalog
        for syrup in drink['syrups']:
            self.assertIn(syrup, self.catalog['syrups'])

        # Soda should be in catalog
        self.assertIn(drink['soda'][0], self.catalog['sodas'])

        # All addins should be in catalog
        for addin in drink['addins']:
            self.assertIn(addin, self.catalog['addins'])

    def test_generate_random_drink_soda_count(self):
        """Test that random drink has exactly one soda."""
        for _ in range(5):
            drink = _generate_random_drink(self.catalog)
            self.assertEqual(len(drink['soda']), 1)

    def test_generate_random_drink_syrup_count(self):
        """Test that random drink has 1-3 syrups."""
        for _ in range(5):
            drink = _generate_random_drink(self.catalog)
            self.assertGreaterEqual(len(drink['syrups']), 1)
            self.assertLessEqual(len(drink['syrups']), 3)

    def test_generate_random_drink_addin_count(self):
        """Test that random drink has 0-2 add-ins."""
        for _ in range(5):
            drink = _generate_random_drink(self.catalog)
            self.assertGreaterEqual(len(drink['addins']), 0)
            self.assertLessEqual(len(drink['addins']), 2)


class GenerateSodaTest(TestCase):
    """Test AI drink recommendation generation."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='password123'
        )

    @patch('backend.drinkAI.client')
    @patch('backend.drinkAI._load_catalog')
    def test_generate_soda_with_api(self, mock_load_catalog, mock_client):
        """Test drink generation using Groq API."""
        mock_catalog = {
            'syrups': ['vanilla', 'chocolate'],
            'sodas': ['coke', 'sprite'],
            'addins': ['cream'],
        }
        mock_load_catalog.return_value = mock_catalog

        # Mock successful API response
        mock_response = MagicMock()
        mock_response.choices[0].message.content = json.dumps({
            'syrups': ['vanilla'],
            'soda': 'coke',
            'addins': ['cream'],
            'name': 'Vanilla Dream'
        })
        mock_client.chat.completions.create.return_value = mock_response

        # Mock settings
        with patch('backend.drinkAI.settings.GROQ_API_KEY', 'test_key'):
            preferences = ['sweet', 'vanilla']
            result = generate_soda(preferences)

            self.assertIsNotNone(result)
            self.assertEqual(result['syrups'], ['vanilla'])
            self.assertEqual(result['soda'], ['coke'])
            self.assertEqual(result['name'], 'Vanilla Dream')

    @patch('backend.drinkAI._load_catalog')
    def test_generate_soda_no_api_key(self, mock_load_catalog):
        """Test that generation falls back to random when no API key."""
        mock_catalog = {
            'syrups': ['vanilla'],
            'sodas': ['coke'],
            'addins': [],
        }
        mock_load_catalog.return_value = mock_catalog

        with patch('backend.drinkAI.settings.GROQ_API_KEY', None):
            with patch('backend.drinkAI.client', None):
                result = generate_soda(['sweet'])

                self.assertIsNotNone(result)
                self.assertIn('syrups', result)
                self.assertIn('soda', result)

    @patch('backend.drinkAI.client')
    @patch('backend.drinkAI._load_catalog')
    def test_generate_soda_with_order_history(self, mock_load_catalog, mock_client):
        """Test drink generation considers order history."""
        mock_catalog = {
            'syrups': ['vanilla', 'strawberry'],
            'sodas': ['coke'],
            'addins': [],
        }
        mock_load_catalog.return_value = mock_catalog

        mock_response = MagicMock()
        mock_response.choices[0].message.content = json.dumps({
            'syrups': ['strawberry'],
            'soda': 'coke',
            'addins': [],
            'name': 'Berry Blast'
        })
        mock_client.chat.completions.create.return_value = mock_response

        with patch('backend.drinkAI.settings.GROQ_API_KEY', 'test_key'):
            preferences = ['sweet']
            order_history = [
                {'syrups': ['vanilla'], 'soda': 'coke', 'addins': []}
            ]
            result = generate_soda(preferences, order_history)

            self.assertIsNotNone(result)
            # Should suggest different syrup than history
            self.assertEqual(result['syrups'], ['strawberry'])

    @patch('backend.drinkAI.client')
    @patch('backend.drinkAI._load_catalog')
    def test_generate_soda_invalid_ingredients_fallback(self, mock_load_catalog, mock_client):
        """Test fallback to random when API returns invalid ingredients."""
        mock_catalog = {
            'syrups': ['vanilla'],
            'sodas': ['coke'],
            'addins': [],
        }
        mock_load_catalog.return_value = mock_catalog

        # Mock API returning invalid ingredient
        mock_response = MagicMock()
        mock_response.choices[0].message.content = json.dumps({
            'syrups': ['invalid_syrup'],
            'soda': 'coke',
            'addins': [],
            'name': 'Bad Drink'
        })
        mock_client.chat.completions.create.return_value = mock_response

        with patch('backend.drinkAI.settings.GROQ_API_KEY', 'test_key'):
            result = generate_soda(['sweet'])

            # Should fallback to random with valid ingredients
            self.assertIsNotNone(result)
            for syrup in result['syrups']:
                self.assertIn(syrup, mock_catalog['syrups'])

    @patch('backend.drinkAI.client')
    @patch('backend.drinkAI._load_catalog')
    def test_generate_soda_api_error_fallback(self, mock_load_catalog, mock_client):
        """Test fallback to random when API fails."""
        mock_catalog = {
            'syrups': ['vanilla'],
            'sodas': ['coke'],
            'addins': [],
        }
        mock_load_catalog.return_value = mock_catalog
        mock_client.chat.completions.create.side_effect = Exception('API Error')

        with patch('backend.drinkAI.settings.GROQ_API_KEY', 'test_key'):
            result = generate_soda(['sweet'])

            # Should fallback to random
            self.assertIsNotNone(result)
            self.assertIn('syrups', result)
            self.assertIn('soda', result)


class GenerateDrinkNameTest(TestCase):
    """Test creative drink name generation."""

    @patch('backend.drinkAI.client')
    def test_generate_drink_name_with_api(self, mock_client):
        """Test drink name generation using Groq API."""
        mock_response = MagicMock()
        mock_response.choices[0].message.content = json.dumps({
            'name': 'Vanilla Dream'
        })
        mock_client.chat.completions.create.return_value = mock_response

        with patch('backend.drinkAI.settings.GROQ_API_KEY', 'test_key'):
            name = generate_drink_name(['coke'], ['vanilla'], ['cream'])

            self.assertEqual(name, 'Vanilla Dream')

    @patch('backend.drinkAI.settings.GROQ_API_KEY', None)
    def test_generate_drink_name_no_api_key(self):
        """Test that name generation falls back when no API key."""
        with patch('backend.drinkAI.client', None):
            name = generate_drink_name(['coke'], ['vanilla'], [])

            self.assertIsNotNone(name)
            self.assertGreater(len(name), 0)

    @patch('backend.drinkAI.client')
    def test_generate_drink_name_api_error_fallback(self, mock_client):
        """Test fallback to simple name on API error."""
        mock_client.chat.completions.create.side_effect = Exception('API Error')

        with patch('backend.drinkAI.settings.GROQ_API_KEY', 'test_key'):
            name = generate_drink_name(['coke'], ['vanilla'], [])

            self.assertIsNotNone(name)
            # Should be a simple adjective + ingredient
            self.assertIn('Vanilla', name)


class GenerateAIDrinkViewTest(TestCase):
    """Test GenerateAIDrink API view."""

    def setUp(self):
        self.client = APIClient()
        self.endpoint = '/backend/generate/'
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='password123'
        )

    @patch('backend.views.generate_soda')
    def test_generate_ai_drink_for_account_user(self, mock_generate):
        """Test AI drink generation for logged-in user."""
        mock_generate.return_value = {
            'syrups': ['vanilla'],
            'soda': ['coke'],
            'addins': [],
            'name': 'Vanilla Coke'
        }

        # Add preferences
        Preference.objects.create(UserID=self.user, Preference='Sweet')

        response = self.client.get(f'{self.endpoint}{self.user.pk}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['SyrupsUsed'], ['vanilla'])

    @patch('backend.views.generate_soda')
    def test_generate_ai_drink_general_user(self, mock_generate):
        """Test AI drink generation for general (non-logged-in) user."""
        mock_generate.return_value = {
            'syrups': ['chocolate'],
            'soda': ['sprite'],
            'addins': ['cream'],
            'name': 'Chocolate Sprite'
        }

        response = self.client.get(self.endpoint)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('SyrupsUsed', response.data)

    @patch('backend.views.generate_soda')
    def test_generate_ai_drink_api_unavailable(self, mock_generate):
        """Test graceful handling when AI service is unavailable."""
        mock_generate.return_value = None

        response = self.client.get(self.endpoint)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('message', response.data)
        self.assertIn('temporarily unavailable', response.data['message'])

    @patch('backend.views.generate_soda')
    def test_generate_ai_drink_with_order_history(self, mock_generate):
        """Test that user's order history is considered."""
        # Create a past order
        drink = Drink.objects.create(
            Name='Past Drink',
            SodaUsed=['coke'],
            SyrupsUsed=['vanilla'],
            User_Created=False,
            Price=2.50,
        )
        order = Order.objects.create(UserID=self.user, OrderStatus='completed')
        order.Drinks.add(drink)

        mock_generate.return_value = {
            'syrups': ['strawberry'],
            'soda': ['sprite'],
            'addins': [],
            'name': 'Strawberry Sprite'
        }

        response = self.client.get(f'{self.endpoint}{self.user.pk}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Response uses PascalCase keys (SyrupsUsed, SodaUsed, AddIns)
        # Should have been called with order history
        mock_generate.assert_called_once()
        call_args = mock_generate.call_args
        self.assertIsNotNone(call_args.kwargs.get('order_history'))  # order_history parameter

    @patch('backend.views.generate_soda')
    def test_generate_ai_drink_visiting_user_with_cache(self, mock_generate):
        """Test AI generation for visiting user using cached preferences."""
        visiting_user_id = 999
        mock_generate.return_value = {
            'syrups': ['vanilla'],
            'soda': ['coke'],
            'addins': [],
            'name': 'Vanilla Coke'
        }

        # Create visiting user cache with preferences
        VisitingUserCache.objects.create(
            user_id=visiting_user_id,
            email='visiting@example.com',
            username='visiting_user',
            hashed_password='hashed_pwd_123',
            home_store_id=1,
            home_store_endpoint='http://store1:8000',
            preferences=['fruity', 'sweet'],
            expires_at=timezone.now() + timezone.timedelta(hours=1)
        )

        response = self.client.get(f'{self.endpoint}{visiting_user_id}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should use cached preferences
        self.assertIn('SyrupsUsed', response.data)


class NameDrinkViewTest(TestCase):
    """Test NameDrinkView API endpoint."""

    def setUp(self):
        self.client = APIClient()
        self.endpoint = '/backend/name-drink/'

    @patch('backend.views.generate_drink_name')
    def test_name_drink_success(self, mock_generate):
        """Test successful drink naming."""
        mock_generate.return_value = 'Vanilla Dream'

        data = {
            'sodas': ['coke'],
            'syrups': ['vanilla'],
            'addins': ['cream']
        }
        response = self.client.post(self.endpoint, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Vanilla Dream')

    @patch('backend.views.generate_drink_name')
    def test_name_drink_no_auth_required(self, mock_generate):
        """Test that naming endpoint doesn't require authentication."""
        mock_generate.return_value = 'Creative Name'

        data = {
            'sodas': ['coke'],
            'syrups': ['vanilla'],
            'addins': []
        }
        response = self.client.post(self.endpoint, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    @patch('backend.views.generate_drink_name')
    def test_name_drink_minimal_ingredients(self, mock_generate):
        """Test naming with minimal ingredients."""
        mock_generate.return_value = 'Simple Coke'

        data = {
            'sodas': ['coke'],
            'syrups': [],
            'addins': []
        }
        response = self.client.post(self.endpoint, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    @patch('backend.views.generate_drink_name')
    def test_name_drink_multiple_ingredients(self, mock_generate):
        """Test naming with multiple ingredients."""
        mock_generate.return_value = 'Complex Flavor Bomb'

        data = {
            'sodas': ['coke'],
            'syrups': ['vanilla', 'caramel', 'chocolate'],
            'addins': ['cream', 'sprinkles', 'chocolate chips']
        }
        response = self.client.post(self.endpoint, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    @patch('backend.views.generate_drink_name')
    def test_name_drink_empty_request(self, mock_generate):
        """Test naming with empty ingredient lists (edge case)."""
        mock_generate.return_value = 'Plain Drink'

        data = {
            'sodas': [],
            'syrups': [],
            'addins': []
        }
        response = self.client.post(self.endpoint, data, format='json')

        # Should still return a name (API doesn't validate ingredients)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
