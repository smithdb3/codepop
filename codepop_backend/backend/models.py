from django.db import models
from django.contrib.auth.models import User
from django.contrib.postgres.fields import ArrayField
from django.utils import timezone

class Preference(models.Model):
    # Primary key will be automatically created as 'id' unless you specify otherwise
    # You can also explicitly declare PreferenceID if needed
    PreferenceID = models.AutoField(primary_key=True)

    # Foreign key referencing the User model
    UserID = models.ForeignKey(User, on_delete=models.CASCADE)

    # Preference field with a string data type
    Preference = models.CharField(max_length=100, blank=False, null=False)

    def __str__(self):
        return f'Preference {self.PreferenceID} for User {self.UserID}: {self.Preference}'
    
class Drink(models.Model):
    DrinkID = models.AutoField(primary_key=True)
    Name = models.CharField(max_length=255)
    SyrupsUsed = ArrayField(models.CharField(max_length=255), blank=True, null=True)
    SodaUsed = ArrayField(models.CharField(max_length=255))
    AddIns = ArrayField(models.CharField(max_length=255), blank=True, null=True)
    Rating = models.FloatField(null=True, blank=True)
    Price = models.FloatField()
    Size = models.CharField(default="m")
    Ice = models.CharField(default="normal")
    User_Created = models.BooleanField()
    Favorite = models.ManyToManyField('auth.User', blank=True)

    def addFavorite(self, userToAdd):
        self.Favorite.add(User.objects.filter(id = userToAdd))

    def removeFavorite(self, userToRemove):
        self.Favorite.remove(User.objects.filter(id = userToRemove))

    def __str__(self):
        return self.Name
    
class Inventory(models.Model):
    ITEM_TYPES = [
        ('Soda', 'Soda'),
        ('Syrup', 'Syrup'),
        ('Add In', 'Add In'),
        ('Physical', 'Physical'),
    ]

    InventoryID = models.AutoField(primary_key=True)
    ItemName = models.CharField(max_length=100)
    ItemType = models.CharField(max_length=50, choices=ITEM_TYPES)
    Quantity = models.PositiveIntegerField()
    ThresholdLevel = models.PositiveIntegerField()
    LastUpdated = models.DateTimeField(auto_now=True)

    def is_out_of_stock(self):
        """Check if the item is out of stock (Quantity <= 0)."""
        return self.Quantity <= 0

    def __str__(self):
        return f"{self.ItemName} - {self.ItemType} (Qty: {self.Quantity})"

class Notification(models.Model):
    NotificationID = models.AutoField(primary_key=True)
    UserID = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    Message = models.CharField(max_length=500)  # Adjust max_length as needed
    Timestamp = models.DateTimeField(default=timezone.now)  # Sets timestamp to the creation date/time
    Type = models.CharField(max_length=50)  # Adjust max_length as needed
    Global = models.BooleanField(default=False)

    def __str__(self):
        return f"Notification for {self.UserID.username}: {self.Message[:50]} at time {self.Timestamp}"
    
class Order(models.Model):
    ORDER_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
        ('remade', 'Remade')
    ]

    OrderID = models.AutoField(primary_key=True)
    UserID = models.ForeignKey(User, on_delete=models.CASCADE, null=True)
    Drinks = models.ManyToManyField(Drink)
    OrderStatus = models.CharField(max_length=50, choices=ORDER_STATUS_CHOICES, default='pending')
    PaymentStatus = models.CharField(max_length=50, choices=PAYMENT_STATUS_CHOICES, default='pending')
    PickupTime = models.DateTimeField(null=True, blank=True)
    CreationTime = models.DateTimeField(auto_now_add=True)
    LockerCombo = models.BigIntegerField(null=True)
    StripeID = models.CharField()
    
    def add_drinks(self, drink_ids):
        # Assuming you have a ManyToMany field for drinks in your Order model
        for drink_id in drink_ids:
            drink = Drink.objects.get(DrinkID=drink_id)  # Assuming you have a Drink model
            self.Drinks.add(drink)  # Add the drink to the order
        self.save()  # Save the changes to the order
            
    def remove_drinks(self, drink_ids):
        """Remove drinks from the order."""
        for drink_id in drink_ids:
            drink = Drink.objects.get(DrinkID=drink_id)
            self.Drinks.remove(drink)  # Remove the drink from the order
        self.save()
        
    def __str__(self):
        return f"Order {self.OrderID} by User {self.UserID}"

class Revenue(models.Model):
    RevenueID = models.AutoField(primary_key=True)
    OrderID = models.IntegerField(default=1)
    TotalAmount = models.FloatField(default=0.0)
    SaleDate = models.DateTimeField(default=timezone.now)
    Refunded = models.BooleanField(default= False)

    def calculate_total_amount(self):
        """Calculate the total revenue for the order by summing the price of each drink."""
        try:
            order = Order.objects.get(OrderID=self.OrderID)
            total = sum(drink.Price for drink in order.Drinks.all())
            self.TotalAmount = total
            return total
        except Order.DoesNotExist:
            self.TotalAmount = 0  # Handle the case where the order doesn't exist
            return 0

    def save(self, *args, **kwargs):
        """Override the save method to automatically calculate the total amount unless explicitly set to 0."""
        if self.TotalAmount is None:  # Only calculate if TotalAmount is not set
            self.calculate_total_amount()
        super(Revenue, self).save(*args, **kwargs)

    def __str__(self):
        """Return a human-readable string representation of the revenue."""
        try:
            return f"Revenue {self.RevenueID} for Order {self.OrderID}: ${self.TotalAmount:.2f}"
        except Order.DoesNotExist:
            return f"Revenue {self.RevenueID} for unknown Order {self.OrderID}: ${self.TotalAmount:.2f}"


# ─────────────────────────────────────────────
# DISTRIBUTED SYSTEM MODELS
# ─────────────────────────────────────────────

import uuid
from cryptography.fernet import Fernet


class Region(models.Model):
    """
    Represents one of the 7 regional supply hubs.
    Created by fixture/migration seed data; not user-created.
    """
    REGION_CHOICES = [
        ('logan',     'Logan, UT'),
        ('atlanta',   'Atlanta, GA'),
        ('chicago',   'Chicago, IL'),
        ('newjersey', 'New Jersey, NY'),
        ('dallas',    'Dallas, TX'),
        ('phoenix',   'Phoenix, AZ'),
        ('seattle',   'Seattle, WA'),
    ]
    name         = models.CharField(max_length=50, choices=REGION_CHOICES, unique=True)
    display_name = models.CharField(max_length=100)
    hub_api_endpoint = models.URLField(blank=True)  # e.g. http://10.0.0.1:8000

    def __str__(self):
        return self.display_name


class StoreRegistry(models.Model):
    """
    Used by hubs (IS_HUB=True) to track all registered stores in their region.
    Stores register on startup via POST /api/hub/register/.
    Status is updated by heartbeat and timeout logic.
    """
    STATUS_CHOICES = [
        ('active',       'Active'),
        ('unreachable',  'Unreachable'),  # missed 3 heartbeats
        ('deregistered', 'Deregistered'),
    ]
    store_id     = models.IntegerField(unique=True)
    store_name   = models.CharField(max_length=255)
    region       = models.CharField(max_length=50)
    api_endpoint = models.URLField()           # e.g. http://10.0.0.2:8000
    latitude     = models.FloatField(null=True, blank=True)
    longitude    = models.FloatField(null=True, blank=True)
    status       = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    registered_at    = models.DateTimeField(auto_now_add=True)
    last_heartbeat   = models.DateTimeField(null=True, blank=True)
    missed_heartbeats = models.IntegerField(default=0)

    def __str__(self):
        return f"Store {self.store_id} ({self.store_name}) — {self.status}"


class VisitingUserCache(models.Model):
    """
    Stores a temporary copy of a user's profile when they visit this store.
    This is SEPARATE from auth.User — it is a cache only, NOT the source of truth.

    Why separate table:
    - Prevents home users and visiting users from ever being mixed in a query
    - Cache can be bulk-deleted by expiry without touching real user accounts
    - Clear audit boundary: visiting users can only do what their cache allows

    TTL: 24 hours from cached_at. Celery cleanup task deletes expired rows.
    On next login after expiry, store re-fetches from home store.
    """
    user_id       = models.IntegerField()          # ID from home store
    username      = models.CharField(max_length=150)
    email         = models.EmailField()
    hashed_password = models.CharField(max_length=255)  # PBKDF2 hash only, NEVER plaintext
    role          = models.CharField(max_length=50, default='customer')
    home_store_id = models.IntegerField()          # Which store owns this user
    home_store_endpoint = models.URLField()        # Where to send profile updates

    # Preferences and favorites stored as JSON for portability
    preferences   = models.JSONField(default=list)     # e.g. ["Fruity", "Sweet"]
    favorite_drink_ids = models.JSONField(default=list) # e.g. [42, 87, 105]

    cached_at     = models.DateTimeField(auto_now_add=True)
    expires_at    = models.DateTimeField()  # cached_at + 24h; set on create

    class Meta:
        unique_together = ('user_id', 'home_store_id')
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['expires_at']),  # for cleanup task
        ]

    def __str__(self):
        return f"VisitingUser {self.username} (home: store {self.home_store_id}, expires: {self.expires_at})"

    def is_expired(self):
        from django.utils import timezone
        return timezone.now() >= self.expires_at


class PendingProfileUpdate(models.Model):
    """
    Queue for profile updates that could not be delivered to the home store
    because it was unreachable at the time of the update.

    Security: `changes_encrypted` stores AES-256 encrypted JSON. Never store
    plaintext user data here — if the VM is compromised, this data must be
    unreadable without the encryption key.

    Retry logic: Celery `process_pending_updates` task retries with exponential
    backoff (1s, 2s, 4s, 8s, ...). Max retry period is 24 hours from created_at.
    After that, the record is marked `failed` and the user is notified.

    Encryption key: Stored in INTER_NODE_SECRET (derived, not raw). In production,
    use a dedicated ENCRYPTION_KEY env var.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('delivered', 'Delivered'),
        ('failed', 'Failed — max retries exceeded'),
    ]
    id               = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id          = models.IntegerField()
    home_store_id    = models.IntegerField()
    home_store_endpoint = models.URLField()
    changes_encrypted = models.TextField()  # AES-256 encrypted JSON blob
    status           = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at       = models.DateTimeField(auto_now_add=True)
    retry_count      = models.IntegerField(default=0)
    next_retry_at    = models.DateTimeField()    # when to attempt next delivery
    max_retry_until  = models.DateTimeField()    # created_at + 24h; give up after this
    last_error       = models.TextField(blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['status', 'next_retry_at']),
        ]

    def __str__(self):
        return f"PendingUpdate {self.id} for user {self.user_id} → store {self.home_store_id} ({self.status})"

    @staticmethod
    def encrypt(data_dict: dict) -> str:
        """Encrypt a dict to a base64 Fernet token."""
        from django.conf import settings
        import json, base64, hashlib
        key_bytes = hashlib.sha256(settings.INTER_NODE_SECRET.encode()).digest()
        f = Fernet(base64.urlsafe_b64encode(key_bytes))
        return f.encrypt(json.dumps(data_dict).encode()).decode()

    @staticmethod
    def decrypt(token: str) -> dict:
        """Decrypt a Fernet token back to a dict."""
        from django.conf import settings
        import json, base64, hashlib
        key_bytes = hashlib.sha256(settings.INTER_NODE_SECRET.encode()).digest()
        f = Fernet(base64.urlsafe_b64encode(key_bytes))
        return json.loads(f.decrypt(token.encode()).decode())


class SyncAuditLog(models.Model):
    """
    Immutable audit log of every inter-node data transfer.
    Retained for 30 days minimum. Used for security forensics.

    Written by:
    - hub_views.py when a hub receives a user-lookup or broadcast
    - internode_views.py when a store processes user-sync or profile-update
    """
    EVENT_CHOICES = [
        ('user_lookup',       'User Lookup (store → hub)'),
        ('hub_broadcast',     'Hub Broadcast (hub → hubs)'),
        ('user_sync',         'User Sync (visiting store ← home store)'),
        ('profile_update',    'Profile Update (visiting store → home store)'),
        ('store_register',    'Store Registration'),
        ('heartbeat',         'Heartbeat'),
    ]
    timestamp         = models.DateTimeField(auto_now_add=True)
    event_type        = models.CharField(max_length=30, choices=EVENT_CHOICES)
    requesting_node   = models.CharField(max_length=255)  # IP or node ID of requester
    target_node       = models.CharField(max_length=255)  # IP or endpoint of target
    user_email        = models.EmailField(blank=True)      # user involved (if any)
    data_types        = models.CharField(max_length=255)   # comma-separated: "email,preferences,role"
    success           = models.BooleanField()
    error_message     = models.TextField(blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['timestamp']),
            models.Index(fields=['event_type']),
        ]

    def __str__(self):
        status = 'OK' if self.success else 'FAIL'
        return f"[{status}] {self.event_type} by {self.requesting_node} at {self.timestamp}"


class SupplyRequest(models.Model):
    """
    A restocking request from a store to its regional hub.
    Submitted via POST /api/hub/supply-request/ (not yet implemented — Phase 10 extension).
    """
    STATUS_CHOICES = [
        ('pending',   'Pending'),
        ('approved',  'Approved'),
        ('denied',    'Denied'),
        ('fulfilled', 'Fulfilled'),
    ]
    store_id     = models.IntegerField()
    region       = models.CharField(max_length=50)
    item_name    = models.CharField(max_length=100)
    quantity     = models.PositiveIntegerField()
    status       = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)
    notes        = models.TextField(blank=True)

    def __str__(self):
        return f"SupplyRequest store {self.store_id}: {self.quantity}x {self.item_name} ({self.status})"


class Machine(models.Model):
    """
    Represents one robotic drink-dispensing machine at a store.
    Status follows a defined state machine (see Architecture docs).
    Machine status is LOCAL — it does not replicate to other stores.
    Repair staff and hub dashboards query this directly.
    """
    STATUS_CHOICES = [
        ('NORMAL',           'Normal'),
        ('WARNING',          'Warning'),
        ('ERROR',            'Error'),
        ('OUT_OF_ORDER',     'Out of Order'),
        ('SCHEDULE_SERVICE', 'Service Scheduled'),
        ('REPAIR_START',     'Repair In Progress'),
        ('REPAIR_END',       'Repair Complete — Testing'),
    ]
    machine_id   = models.CharField(max_length=50, unique=True)
    name         = models.CharField(max_length=100)
    location     = models.CharField(max_length=100, blank=True)  # e.g. "Bay 3"
    status       = models.CharField(max_length=20, choices=STATUS_CHOICES, default='NORMAL')
    last_status_change = models.DateTimeField(auto_now=True)
    notes        = models.TextField(blank=True)

    def __str__(self):
        return f"Machine {self.machine_id} ({self.name}) — {self.status}"


class Schedule(models.Model):
    """
    Repair staff schedule. Supports CSV upload by logistics managers.
    Tied to Machine and auth.User (repair staff member).
    """
    machine      = models.ForeignKey(Machine, on_delete=models.CASCADE, related_name='schedules')
    assigned_to  = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True) 
    scheduled_at = models.DateTimeField()
    completed_at = models.DateTimeField(null=True, blank=True)
    description  = models.TextField(blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Schedule for {self.machine} at {self.scheduled_at}"


class RepairStaffProfile(models.Model):
    """
    Extends auth.User for repair staff members.
    One-to-one with User. Created when admin assigns role='repair_staff'.
    """
    user             = models.OneToOneField('auth.User', on_delete=models.CASCADE,
                                            related_name='repair_profile')
    region           = models.ForeignKey(Region, on_delete=models.SET_NULL, null=True)
    assigned_store_id = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return f"RepairStaff: {self.user.username} (region: {self.region})"


class LogisticsManagerProfile(models.Model):
    """
    Extends auth.User for logistics managers.
    One-to-one with User. Created when admin assigns role='logistics_manager'.
    Logistics managers can view regional revenue, approve supply requests,
    and manage repair schedules for their region.
    """
    user   = models.OneToOneField('auth.User', on_delete=models.CASCADE,
                                  related_name='logistics_profile')
    region = models.ForeignKey(Region, on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return f"LogisticsManager: {self.user.username} (region: {self.region})"