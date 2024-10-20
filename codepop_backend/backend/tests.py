from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token  # Import for token authentication
from .models import Preference

class PreferenceTests(TestCase):
    def setUp(self):
        # Create two test users
        self.user1 = User.objects.create_user(username='user1', password='password123')
        self.user2 = User.objects.create_user(username='user2', password='password123')

        # Create tokens for both users
        self.token1 = Token.objects.create(user=self.user1)
        self.token2 = Token.objects.create(user=self.user2)

        # Create preferences for both users
        Preference.objects.create(UserID=self.user1, Preference="Mango")
        Preference.objects.create(UserID=self.user2, Preference="Peach")

        # Set up the API client
        self.client = APIClient()

    def authenticate(self, token):
        """Helper method to set up token authentication"""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token)

    def test_get_preferences_for_user1(self):
        # Use token authentication for user1
        self.authenticate(self.token1.key)

        # Make a request to retrieve preferences for user1
        response = self.client.get(f'/backend/users/{self.user1.id}/preferences/')

        # Check that the response status code is 200 OK
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check that the returned data contains one preference
        self.assertEqual(len(response.data), 1)

        # Check that the preference belongs to user1 and is "Mango"
        self.assertEqual(response.data[0]['UserID'], self.user1.id)
        self.assertEqual(response.data[0]['Preference'], "Mango")

    def test_get_preferences_for_user2(self):
        # Use token authentication for user2
        self.authenticate(self.token2.key)

        # Make a request to retrieve preferences for user2
        response = self.client.get(f'/backend/users/{self.user2.id}/preferences/')

        # Check that the response status code is 200 OK
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check that the returned data contains one preference
        self.assertEqual(len(response.data), 1)

        # Check that the preference belongs to user2 and is "Peach"
        self.assertEqual(response.data[0]['UserID'], self.user2.id)
        self.assertEqual(response.data[0]['Preference'], "Peach")

    def test_get_preferences_for_non_existent_user(self):
        # Use token authentication for user1
        self.authenticate(self.token1.key)

        # Attempt to retrieve preferences for a non-existent user
        response = self.client.get('/backend/users/999/preferences/')

        # Check that the response status code is 404 Not Found
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_create_preference(self):
        # Use token authentication for user1
        self.authenticate(self.token1.key)

        # Send a POST request to create a new preference for user1
        data = {'UserID': self.user1.id, 'Preference': "Strawberry"}
        response = self.client.post('/backend/preferences/', data, format='json')

        # Check that the response status code is 201 Created
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Check that the preference was created with the correct values
        self.assertEqual(Preference.objects.count(), 3)  # There should now be 3 preferences in total
        self.assertEqual(Preference.objects.filter(UserID=self.user1).count(), 2)  # Two preferences for user1
        self.assertEqual(
            list(Preference.objects.filter(UserID=self.user1).values_list('Preference', flat=True)),
            ["Mango", "Strawberry"]
        )

    def test_delete_preference(self):
        # Authenticate the user (user1 in this case)
        self.authenticate(self.token1.key)

        # Send a POST request to create a new preference for user1
        data = {'UserID': self.user1.id, 'Preference': "Strawberry"}
        response = self.client.post('/backend/preferences/', data, format='json')

        # Check that the response status code is 201 Created
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # Get the preference object for user1 that we want to delete
        preference = Preference.objects.filter(UserID=self.user1).first()

        # Send a DELETE request to delete the preference
        response = self.client.delete(f'/backend/preferences/{preference.PreferenceID}/')

        # Check that the response status code is 204 No Content, indicating successful deletion
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # Verify that the preference has been deleted from the database using the correct field name (PreferenceID)
        self.assertEqual(Preference.objects.filter(PreferenceID=preference.PreferenceID).count(), 0)

        # Confirm that only Strawberry is left in the User1 preference database
        self.assertEqual(
            list(Preference.objects.filter(UserID=self.user1).values_list('Preference', flat=True)),
            ["Strawberry"]
        )
