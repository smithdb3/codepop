from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model

User = get_user_model()


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """
    Auto-create UserProfile when a User is created.
    This ensures that views like UserDetailView which expect UserProfile
    to exist will not get 404 errors.
    """
    if created:
        from .models import UserProfile
        UserProfile.objects.get_or_create(user=instance)
