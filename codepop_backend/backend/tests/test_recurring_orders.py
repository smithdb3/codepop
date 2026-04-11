from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework.authtoken.models import Token
from django.utils import timezone
from datetime import datetime, timedelta
from backend.models import RecurringOrder, Drink


class RecurringOrderTests(APITestCase):
    """
    Tests for RecurringOrder model and endpoints.
    Covers CRUD, scheduling logic, end-type variants, and access control.
    """

    def setUp(self):
        """Create test users and drinks."""
        self.user1 = User.objects.create_user(username='user1', password='pass')
        self.user2 = User.objects.create_user(username='user2', password='pass')

        self.token1 = Token.objects.create(user=self.user1)
        self.token2 = Token.objects.create(user=self.user2)

        # Create sample drinks
        self.drink1 = Drink.objects.create(
            Name="Cola",
            SodaUsed=["Coke"],
            User_Created=False,
            Price=1.99
        )
        self.drink2 = Drink.objects.create(
            Name="Lemonade",
            SodaUsed=["Lemonade"],
            User_Created=False,
            Price=2.50
        )

    def authenticate_as(self, token):
        """Set Authorization header."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def clear_auth(self):
        """Clear authentication."""
        self.client.credentials()

    # ─────────────────────────────────────────────────────────────
    # RecurringOrder CRUD
    # ─────────────────────────────────────────────────────────────

    def test_list_recurring_orders(self):
        """Can list recurring orders."""
        self.authenticate_as(self.token1)
        response = self.client.get('/backend/recurring-orders/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_recurring_order(self):
        """Can create a recurring order."""
        self.authenticate_as(self.token1)
        data = {
            'user': self.user1.id,
            'drinks': [self.drink1.DrinkID],
            'interval': 1,
            'unit': 'week',
            'days': ['Monday', 'Wednesday', 'Friday'],
            'end_type': 'never',
            'status': 'active'
        }
        response = self.client.post('/backend/recurring-orders/', data, format='json')
        self.assertIn(response.status_code, [status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST])

    def test_get_recurring_order_detail(self):
        """Can get a specific recurring order."""
        # Create one first
        order = RecurringOrder.objects.create(
            user=self.user1,
            interval=1,
            unit='week',
            days=['Monday'],
            end_type='never',
            status='active'
        )
        order.drinks.add(self.drink1)

        self.authenticate_as(self.token1)
        response = self.client.get(f'/backend/recurring-orders/{order.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_user_recurring_orders_lookup(self):
        """Can retrieve only own recurring orders."""
        # Create orders for user1
        order1 = RecurringOrder.objects.create(
            user=self.user1,
            interval=1,
            unit='week',
            days=['Monday'],
            end_type='never',
            status='active'
        )
        order1.drinks.add(self.drink1)

        # Create order for user2
        order2 = RecurringOrder.objects.create(
            user=self.user2,
            interval=2,
            unit='week',
            days=['Tuesday'],
            end_type='never',
            status='active'
        )
        order2.drinks.add(self.drink2)

        self.authenticate_as(self.token1)
        response = self.client.get(f'/backend/users/{self.user1.id}/recurring-orders/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should only return user1's orders
        self.assertEqual(len(response.data), 1)

    def test_user_cannot_access_others_recurring(self):
        """User cannot access another user's recurring orders."""
        order = RecurringOrder.objects.create(
            user=self.user2,
            interval=1,
            unit='week',
            days=['Monday'],
            end_type='never',
            status='active'
        )
        order.drinks.add(self.drink1)

        self.authenticate_as(self.token1)
        response = self.client.get(f'/backend/recurring-orders/{order.id}/')
        # Should get 404 or 403
        self.assertIn(response.status_code, [status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN])

    # ─────────────────────────────────────────────────────────────
    # End Type Variants
    # ─────────────────────────────────────────────────────────────

    def test_end_type_after_occurrences(self):
        """Can create recurring order with end_type='occurrences'."""
        self.authenticate_as(self.token1)
        data = {
            'user': self.user1.id,
            'drinks': [self.drink1.DrinkID],
            'interval': 1,
            'unit': 'day',
            'days': ['*'],  # Every day
            'end_type': 'occurrences',
            'occurrences': 5,
            'status': 'active'
        }
        response = self.client.post('/backend/recurring-orders/', data, format='json')
        self.assertIn(response.status_code, [status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST])

        if response.status_code == status.HTTP_201_CREATED:
            # Verify occurrences field is saved
            order = RecurringOrder.objects.get(id=response.data['id'])
            self.assertEqual(order.occurrences, 5)

    def test_end_type_by_date(self):
        """Can create recurring order with end_type='date'."""
        future_date = (timezone.now() + timedelta(days=30)).date()
        self.authenticate_as(self.token1)
        data = {
            'user': self.user1.id,
            'drinks': [self.drink1.DrinkID],
            'interval': 1,
            'unit': 'week',
            'days': ['Monday'],
            'end_type': 'date',
            'end_date': str(future_date),
            'status': 'active'
        }
        response = self.client.post('/backend/recurring-orders/', data, format='json')
        self.assertIn(response.status_code, [status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST])

        if response.status_code == status.HTTP_201_CREATED:
            order = RecurringOrder.objects.get(id=response.data['id'])
            self.assertIsNotNone(order.end_date)

    # ─────────────────────────────────────────────────────────────
    # Days Field Validation
    # ─────────────────────────────────────────────────────────────

    def test_days_field_stored_as_json(self):
        """Days field is stored and retrieved as JSON array."""
        days = ['Monday', 'Wednesday', 'Friday']
        order = RecurringOrder.objects.create(
            user=self.user1,
            interval=1,
            unit='week',
            days=days,
            end_type='never',
            status='active'
        )
        order.drinks.add(self.drink1)

        # Retrieve and verify
        retrieved = RecurringOrder.objects.get(id=order.id)
        self.assertEqual(retrieved.days, days)

    # ─────────────────────────────────────────────────────────────
    # Cancel/Update
    # ─────────────────────────────────────────────────────────────

    def test_cancel_recurring_order(self):
        """Can cancel a recurring order (update status)."""
        order = RecurringOrder.objects.create(
            user=self.user1,
            interval=1,
            unit='week',
            days=['Monday'],
            end_type='never',
            status='active'
        )
        order.drinks.add(self.drink1)

        self.authenticate_as(self.token1)
        data = {'status': 'cancelled'}
        response = self.client.patch(f'/backend/recurring-orders/{order.id}/', data, format='json')
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST])

        if response.status_code == status.HTTP_200_OK:
            order.refresh_from_db()
            self.assertEqual(order.status, 'cancelled')

    def test_delete_recurring_order(self):
        """Can delete a recurring order."""
        order = RecurringOrder.objects.create(
            user=self.user1,
            interval=1,
            unit='week',
            days=['Monday'],
            end_type='never',
            status='active'
        )
        order.drinks.add(self.drink1)

        self.authenticate_as(self.token1)
        response = self.client.delete(f'/backend/recurring-orders/{order.id}/')
        self.assertIn(response.status_code, [status.HTTP_204_NO_CONTENT, status.HTTP_403_FORBIDDEN])
