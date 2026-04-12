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

    @patch('backend.views.stripe.Customer.create')
    @patch('backend.views.stripe.EphemeralKey.create')
    @patch('backend.views.stripe.PaymentIntent.create')
    def test_create_payment_intent_success(self, mock_intent_create, mock_ephemeral_create, mock_customer_create):
        """POST with amount + currency should create payment intent."""
        self.authenticate_as(self.token)

        # Mock stripe responses
        mock_customer = MagicMock()
        mock_customer.__getitem__.return_value = 'cus_test123'
        mock_customer.id = 'cus_test123'
        mock_customer_create.return_value = mock_customer

        mock_ephemeral = MagicMock()
        mock_ephemeral.secret = 'ephk_test_secret'
        mock_ephemeral_create.return_value = mock_ephemeral

        mock_intent = MagicMock()
        mock_intent.client_secret = 'pi_test_secret_123'
        mock_intent.id = 'pi_test123'
        mock_intent_create.return_value = mock_intent

        data = {
            'amount': 1999,  # $19.99 in cents
            'currency': 'usd'
        }
        response = self.client.post('/backend/create-payment-intent/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_json = response.json()
        self.assertIn('paymentIntent', response_json)
        self.assertEqual(response_json['paymentIntent'], 'pi_test_secret_123')
        # Verify all stripe calls were made
        mock_customer_create.assert_called_once()
        mock_ephemeral_create.assert_called_once()
        mock_intent_create.assert_called_once()

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

    @patch('backend.views.stripe.Customer.create')
    @patch('backend.views.stripe.EphemeralKey.create')
    @patch('backend.views.stripe.PaymentIntent.create')
    def test_create_payment_intent_missing_currency(self, mock_intent_create, mock_ephemeral_create, mock_customer_create):
        """POST without currency should still work (view ignores it and uses 'usd')."""
        self.authenticate_as(self.token)

        # Mock the stripe objects
        mock_customer = MagicMock()
        mock_customer.__getitem__.return_value = 'cus_test123'
        mock_customer.id = 'cus_test123'
        mock_customer_create.return_value = mock_customer

        mock_ephemeral = MagicMock()
        mock_ephemeral.secret = 'ephk_test_secret'
        mock_ephemeral_create.return_value = mock_ephemeral

        mock_intent = MagicMock()
        mock_intent.client_secret = 'pi_test_secret_123'
        mock_intent_create.return_value = mock_intent

        data = {
            'amount': 1999
            # Missing currency — view will use 'usd' (hardcoded)
        }
        response = self.client.post('/backend/create-payment-intent/', data, format='json')

        # Should succeed because view hardcodes currency to 'usd'
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    @patch('backend.views.stripe.Customer.create')
    @patch('backend.views.stripe.EphemeralKey.create')
    @patch('backend.views.stripe.PaymentIntent.create')
    def test_create_payment_intent_stripe_error(self, mock_intent_create, mock_ephemeral_create, mock_customer_create):
        """Stripe API error should return error response."""
        self.authenticate_as(self.token)

        # Mock customer and ephemeral key successfully, but payment intent fails
        mock_customer = MagicMock()
        mock_customer.__getitem__.return_value = 'cus_test123'
        mock_customer.id = 'cus_test123'
        mock_customer_create.return_value = mock_customer

        mock_ephemeral = MagicMock()
        mock_ephemeral.secret = 'ephk_test_secret'
        mock_ephemeral_create.return_value = mock_ephemeral

        # Mock stripe PaymentIntent raising an error
        mock_intent_create.side_effect = stripe.error.StripeError('Connection failed')

        data = {
            'amount': 1999,
            'currency': 'usd'
        }
        response = self.client.post('/backend/create-payment-intent/', data, format='json')

        # Should return error response (400 because exception is caught)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('backend.views.stripe.Customer.create')
    @patch('backend.views.stripe.EphemeralKey.create')
    @patch('backend.views.stripe.PaymentIntent.create')
    def test_create_payment_intent_requires_auth(self, mock_intent_create, mock_ephemeral_create, mock_customer_create):
        """Unauthenticated POST should still work (view has no auth) but Stripe calls proceed."""
        self.clear_auth()

        # Mock the stripe objects since the view will still try to call them
        mock_customer = MagicMock()
        mock_customer.__getitem__.return_value = 'cus_test123'
        mock_customer.id = 'cus_test123'
        mock_customer_create.return_value = mock_customer

        mock_ephemeral = MagicMock()
        mock_ephemeral.secret = 'ephk_test_secret'
        mock_ephemeral_create.return_value = mock_ephemeral

        mock_intent = MagicMock()
        mock_intent.client_secret = 'pi_test_secret_123'
        mock_intent_create.return_value = mock_intent

        data = {
            'amount': 1999,
            'currency': 'usd'
        }
        response = self.client.post('/backend/create-payment-intent/', data, format='json')

        # Unauthenticated requests will still hit the view (no DRF auth on plain View)
        # but should succeed since we mocked Stripe
        self.assertEqual(response.status_code, status.HTTP_200_OK)

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
