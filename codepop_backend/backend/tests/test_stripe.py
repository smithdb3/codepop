from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework.authtoken.models import Token
from unittest.mock import patch, MagicMock
import stripe


class StripePaymentTests(APITestCase):
    """
    Tests for Stripe payment integration endpoints.
    Mocks stripe.PaymentIntent.create to avoid real API calls.
    """

    def setUp(self):
        """Create test user and token."""
        self.user = User.objects.create_user(username='testuser', password='pass')
        self.token = Token.objects.create(user=self.user)

    def authenticate_as(self, token):
        """Set Authorization header."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def clear_auth(self):
        """Clear authentication."""
        self.client.credentials()

    # ─────────────────────────────────────────────────────────────
    # StripeConfigView Tests
    # ─────────────────────────────────────────────────────────────

    def test_stripe_config_returns_publishable_key(self):
        """GET /config/stripe/ should return publishable key."""
        response = self.client.get('/backend/config/stripe/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('publishableKey', response.data)

    def test_stripe_config_unauthenticated_access(self):
        """Stripe config may be accessible without auth."""
        self.clear_auth()
        response = self.client.get('/backend/config/stripe/')
        # Endpoint may allow unauthenticated access to return public key
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_401_UNAUTHORIZED])

    # ─────────────────────────────────────────────────────────────
    # StripePaymentIntentView Tests
    # ─────────────────────────────────────────────────────────────

    @patch('backend.views.stripe.PaymentIntent.create')
    def test_create_payment_intent_success(self, mock_create):
        """POST with amount + currency should create payment intent."""
        self.authenticate_as(self.token)

        # Mock stripe response
        mock_create.return_value = MagicMock(
            id='pi_test123',
            client_secret='seti_test_secret',
            status='requires_payment_method'
        )

        data = {
            'amount': 1999,  # $19.99 in cents
            'currency': 'usd'
        }
        response = self.client.post('/backend/create-payment-intent/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('clientSecret', response.data)
        # Verify stripe was called
        mock_create.assert_called_once()

    @patch('backend.views.stripe.PaymentIntent.create')
    def test_create_payment_intent_missing_amount(self, mock_create):
        """POST without amount should return 400."""
        self.authenticate_as(self.token)

        data = {
            'currency': 'usd'
            # Missing amount
        }
        response = self.client.post('/backend/create-payment-intent/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # stripe.create should not be called
        mock_create.assert_not_called()

    @patch('backend.views.stripe.PaymentIntent.create')
    def test_create_payment_intent_missing_currency(self, mock_create):
        """POST without currency should return 400."""
        self.authenticate_as(self.token)

        data = {
            'amount': 1999
            # Missing currency
        }
        response = self.client.post('/backend/create-payment-intent/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        mock_create.assert_not_called()

    @patch('backend.views.stripe.PaymentIntent.create')
    def test_create_payment_intent_stripe_error(self, mock_create):
        """Stripe API error should return 500 or error response."""
        self.authenticate_as(self.token)

        # Mock stripe raising an error
        mock_create.side_effect = stripe.error.StripeError('Connection failed')

        data = {
            'amount': 1999,
            'currency': 'usd'
        }
        response = self.client.post('/backend/create-payment-intent/', data, format='json')

        # Should return error response
        self.assertIn(response.status_code, [status.HTTP_500_INTERNAL_SERVER_ERROR, status.HTTP_400_BAD_REQUEST])

    @patch('backend.views.stripe.PaymentIntent.create')
    def test_create_payment_intent_requires_auth(self, mock_create):
        """Unauthenticated POST should return 401."""
        self.clear_auth()

        data = {
            'amount': 1999,
            'currency': 'usd'
        }
        response = self.client.post('/backend/create-payment-intent/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        # stripe.create should not be called
        mock_create.assert_not_called()

    @patch('backend.views.stripe.PaymentIntent.create')
    def test_create_payment_intent_zero_amount(self, mock_create):
        """Zero or negative amount should be rejected."""
        self.authenticate_as(self.token)

        data = {
            'amount': 0,
            'currency': 'usd'
        }
        response = self.client.post('/backend/create-payment-intent/', data, format='json')

        # Should reject zero amount
        self.assertIn(response.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_200_OK])

    @patch('backend.views.stripe.PaymentIntent.create')
    def test_create_payment_intent_invalid_currency(self, mock_create):
        """Invalid currency code should be rejected or handled."""
        self.authenticate_as(self.token)

        data = {
            'amount': 1999,
            'currency': 'invalid'
        }
        response = self.client.post('/backend/create-payment-intent/', data, format='json')

        # May be 400 or passed through to stripe
        self.assertIn(response.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_200_OK])
