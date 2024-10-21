from django.urls import path
from rest_framework.authtoken.views import obtain_auth_token
from .views import CreateUserAPIView, LogoutUserAPIView, CustomAuthToken
from .views import UserPreferenceListAPIView, PreferenceListCreateAPIView, PreferenceRetrieveUpdateDestroyAPIView

urlpatterns = [
    #Authentication related urls
    path('auth/login/', CustomAuthToken.as_view(), name='auth_user_login'),
    path('auth/register/', CreateUserAPIView.as_view(), name='auth_user_create'),
    path('auth/logout/', LogoutUserAPIView.as_view(), name='auth_user_logout'),

    # Preference-related URLs
    path('preferences/', PreferenceListCreateAPIView.as_view(), name='preference_list_create'),  # List and create preferences
    path('preferences/<int:pk>/', PreferenceRetrieveUpdateDestroyAPIView.as_view(), name='preference_detail'),  # Retrieve, update, or delete a preference

    # Retrieve preferences by UserID
    path('users/<int:user_id>/preferences/', UserPreferenceListAPIView.as_view(), name='user_preferences_list'),
]