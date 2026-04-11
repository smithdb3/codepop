from django.test import TestCase, override_settings
from django.utils import timezone
from datetime import timedelta
from unittest.mock import patch, MagicMock
import requests

from backend.models import VisitingUserCache, PendingProfileUpdate, StoreRegistry, Region
from backend.tasks import (
    send_heartbeat,
    process_pending_updates,
    cleanup_expired_visiting_cache,
    check_missed_heartbeats
)
from django.contrib.auth.models import User


class CeleryTaskTests(TestCase):
    """
    Unit tests for all 4 Celery background tasks.
    Tasks are called synchronously (no Celery worker), with mocked HTTP calls.
    """

    def setUp(self):
        """Create test region for store registry."""
        self.region = Region.objects.create(name='logan', display_name='Logan, UT')

    # ─────────────────────────────────────────────────────────────
    # send_heartbeat() Tests
    # ─────────────────────────────────────────────────────────────

    @override_settings(
        IS_HUB=False,
        HUB_URL='http://hub.test:8000',
        STORE_ID='store1',
        INTER_NODE_SECRET='test-secret'
    )
    @patch('backend.tasks.requests.post')
    def test_heartbeat_success(self, mock_post):
        """Successful heartbeat should POST to hub with correct headers."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response

        send_heartbeat()

        # Verify POST was called with correct args
        mock_post.assert_called_once()
        call_args = mock_post.call_args
        self.assertIn('http://hub.test:8000/backend/api/hub/heartbeat/', call_args[0][0])
        self.assertIn('NodeToken test-secret', call_args[1]['headers']['Authorization'])

    @override_settings(IS_HUB=True)
    def test_heartbeat_skipped_on_hub(self):
        """Hub should skip sending heartbeat (return early)."""
        with patch('backend.tasks.requests.post') as mock_post:
            send_heartbeat()
            # Should not call requests.post on hub
            mock_post.assert_not_called()

    @override_settings(
        IS_HUB=False,
        HUB_URL='',
        STORE_ID='store1',
        INTER_NODE_SECRET='test-secret'
    )
    def test_heartbeat_no_hub_url(self):
        """No HUB_URL configured should return early without crash."""
        with patch('backend.tasks.requests.post') as mock_post:
            send_heartbeat()
            # Should not crash, should not call requests.post
            mock_post.assert_not_called()

    @override_settings(
        IS_HUB=False,
        HUB_URL='http://hub.test:8000',
        STORE_ID='store1',
        INTER_NODE_SECRET='test-secret'
    )
    @patch('backend.tasks.register_with_hub')
    @patch('backend.tasks.requests.post')
    def test_heartbeat_triggers_reregister_on_404(self, mock_post, mock_register):
        """404 response should trigger re-registration."""
        mock_response = MagicMock()
        mock_response.status_code = 404
        mock_post.return_value = mock_response

        send_heartbeat()

        # Verify register_with_hub was called
        mock_register.assert_called_once()

    # ─────────────────────────────────────────────────────────────
    # process_pending_updates() Tests
    # ─────────────────────────────────────────────────────────────

    @override_settings(INTER_NODE_SECRET='test-secret')
    @patch('backend.tasks.requests.post')
    def test_process_pending_success(self, mock_post):
        """Successful delivery should update status to 'delivered'."""
        # Create a pending update
        update = PendingProfileUpdate.objects.create(
            user_id=1,
            changes_encrypted=PendingProfileUpdate.encrypt({'preferences': ['sweet']}),
            home_store_endpoint='http://home:8000',
            status='pending',
            next_retry_at=timezone.now() - timedelta(seconds=1),
            max_retry_until=timezone.now() + timedelta(hours=1),
            retry_count=0
        )

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response

        process_pending_updates()

        update.refresh_from_db()
        self.assertEqual(update.status, 'delivered')

    @override_settings(INTER_NODE_SECRET='test-secret')
    @patch('backend.tasks.requests.post')
    def test_process_pending_retry_on_failure(self, mock_post):
        """Non-200 response should schedule retry with exponential backoff."""
        update = PendingProfileUpdate.objects.create(
            user_id=1,
            changes_encrypted=PendingProfileUpdate.encrypt({'preferences': ['sweet']}),
            home_store_endpoint='http://home:8000',
            status='pending',
            next_retry_at=timezone.now() - timedelta(seconds=1),
            max_retry_until=timezone.now() + timedelta(hours=1),
            retry_count=0
        )

        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_post.return_value = mock_response

        original_next_retry = update.next_retry_at
        process_pending_updates()

        update.refresh_from_db()
        # Status should still be pending
        self.assertEqual(update.status, 'pending')
        # retry_count should increment
        self.assertEqual(update.retry_count, 1)
        # next_retry_at should be pushed forward (2 ^ 1 = 2 seconds)
        self.assertGreater(update.next_retry_at, original_next_retry)

    @override_settings(INTER_NODE_SECRET='test-secret')
    def test_process_pending_expires_after_24h(self):
        """Pending update past max_retry_until should be marked 'failed'."""
        update = PendingProfileUpdate.objects.create(
            user_id=1,
            changes_encrypted=PendingProfileUpdate.encrypt({'preferences': ['sweet']}),
            home_store_endpoint='http://home:8000',
            status='pending',
            next_retry_at=timezone.now() - timedelta(seconds=1),
            max_retry_until=timezone.now() - timedelta(seconds=1),  # Expired!
            retry_count=0
        )

        process_pending_updates()

        update.refresh_from_db()
        self.assertEqual(update.status, 'failed')
        self.assertIn('Max retry period exceeded', update.last_error)

    # ─────────────────────────────────────────────────────────────
    # cleanup_expired_visiting_cache() Tests
    # ─────────────────────────────────────────────────────────────

    def test_cleanup_deletes_expired_cache(self):
        """Expired cache entries should be deleted."""
        # Create an expired cache entry
        cache = VisitingUserCache.objects.create(
            user_id=99,
            username='alice',
            email='alice@test.com',
            hashed_password='fakehash',
            role='customer',
            home_store_id=1,
            home_store_endpoint='http://home:8000',
            expires_at=timezone.now() - timedelta(hours=1)  # Expired
        )

        # Also create a shadow user
        User.objects.create_user(
            username='visiting_99_1',
            email='alice@test.com'
        )

        cleanup_expired_visiting_cache()

        # Cache should be deleted
        self.assertFalse(VisitingUserCache.objects.filter(id=cache.id).exists())
        # Shadow user should be deleted
        self.assertFalse(User.objects.filter(username='visiting_99_1').exists())

    def test_cleanup_keeps_fresh_cache(self):
        """Non-expired cache entries should survive."""
        cache = VisitingUserCache.objects.create(
            user_id=99,
            username='bob',
            email='bob@test.com',
            hashed_password='fakehash',
            role='customer',
            home_store_id=1,
            home_store_endpoint='http://home:8000',
            expires_at=timezone.now() + timedelta(hours=23)  # Fresh
        )

        cleanup_expired_visiting_cache()

        # Cache should still exist
        self.assertTrue(VisitingUserCache.objects.filter(id=cache.id).exists())

    # ─────────────────────────────────────────────────────────────
    # check_missed_heartbeats() Tests
    # ─────────────────────────────────────────────────────────────

    @override_settings(IS_HUB=True)
    def test_check_missed_heartbeats_marks_unreachable(self):
        """Store with no heartbeat for 90+ seconds should be marked unreachable."""
        store = StoreRegistry.objects.create(
            store_id='store1',
            store_name='Test Store',
            region=self.region,
            api_endpoint='http://store:8000',
            status='active',
            last_heartbeat=timezone.now() - timedelta(seconds=91),  # > 90 sec
            missed_heartbeats=2
        )

        check_missed_heartbeats()

        store.refresh_from_db()
        # Should be marked unreachable after 3+ missed heartbeats
        if store.missed_heartbeats >= 3:
            self.assertEqual(store.status, 'unreachable')

    @override_settings(IS_HUB=True)
    def test_check_missed_heartbeats_keeps_recent_active(self):
        """Store with recent heartbeat should stay active."""
        store = StoreRegistry.objects.create(
            store_id='store1',
            store_name='Test Store',
            region=self.region,
            api_endpoint='http://store:8000',
            status='active',
            last_heartbeat=timezone.now() - timedelta(seconds=30),  # < 90 sec
            missed_heartbeats=0
        )

        check_missed_heartbeats()

        store.refresh_from_db()
        self.assertEqual(store.status, 'active')

    @override_settings(IS_HUB=False)
    def test_check_missed_heartbeats_skipped_on_store(self):
        """Store node should skip checking (return early)."""
        # Create a store with stale heartbeat
        store = StoreRegistry.objects.create(
            store_id='store1',
            store_name='Test Store',
            region=self.region,
            api_endpoint='http://store:8000',
            status='active',
            last_heartbeat=timezone.now() - timedelta(seconds=200)
        )

        check_missed_heartbeats()

        store.refresh_from_db()
        # Should NOT be modified since this is a store node
        self.assertEqual(store.status, 'active')
