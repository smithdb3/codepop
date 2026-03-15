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
    Size = models.CharField(default="16oz")
    Ice = models.CharField(default="regular")
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
    StripeID = models.CharField(max_length=255, blank=True, default='')
    
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
    OrderID = models.ForeignKey(Order, on_delete=models.CASCADE, db_column='OrderID', null=True, blank=True)
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


# ============================================================================
# SPRINT 3: DISTRIBUTED SYSTEM & FEATURE MODELS
# ============================================================================

# Group 1: Distributed Architecture Models

class StoreRegistry(models.Model):
    """Each hub tracks all stores registered under it."""
    store_id = models.IntegerField(unique=True)
    store_name = models.CharField(max_length=255)
    region = models.CharField(max_length=100)
    latitude = models.FloatField()
    longitude = models.FloatField()
    api_endpoint = models.URLField()
    public_key = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    last_heartbeat = models.DateTimeField(null=True, blank=True)
    registered_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Store {self.store_id}: {self.store_name} ({self.region})"

    class Meta:
        verbose_name_plural = "Store Registries"


class HubRegistry(models.Model):
    """Each node tracks known regional hubs."""
    hub_id = models.IntegerField(unique=True)
    hub_name = models.CharField(max_length=255)
    region = models.CharField(max_length=100)
    api_endpoint = models.URLField()
    is_active = models.BooleanField(default=True)
    last_seen = models.DateTimeField(null=True, blank=True)
    registered_at = models.DateTimeField(auto_now_add=True)
    issued_secret = models.CharField(max_length=255, blank=True)  # Secret issued by this hub to us

    def __str__(self):
        return f"Hub {self.hub_id}: {self.hub_name}"

    class Meta:
        verbose_name_plural = "Hub Registries"


class NodeCertificate(models.Model):
    """Per-node shared secrets for inter-node authentication."""
    NODE_TYPES = [
        ('store', 'Store'),
        ('hub', 'Hub'),
    ]

    node_id = models.CharField(max_length=100, unique=True)
    node_type = models.CharField(max_length=20, choices=NODE_TYPES)
    shared_secret = models.CharField(max_length=255, db_index=True)  # Indexed for fast lookup in auth
    issued_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"NodeCert {self.node_id} ({self.get_node_type_display()})"


class UserCache(models.Model):
    """Routing table: maps user email to their home store endpoint. Lazy replication cache."""
    user_email = models.CharField(max_length=255, unique=True, db_index=True)
    user_id = models.IntegerField(null=True, db_index=True)  # Canonical pk at home store
    home_store_id = models.IntegerField()
    home_store_endpoint = models.CharField(max_length=500)
    cached_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(db_index=True)  # Indexed for expiry filtering

    def __str__(self):
        return f"UserCache {self.user_email} → store {self.home_store_id}"

    class Meta:
        verbose_name_plural = "User Caches"


class VisitingSession(models.Model):
    """
    Links a visiting user's local DRF token to their JWT-based home-store session.
    Created when a visiting user logs in. Expires with the JWT (24h).
    """
    token = models.OneToOneField(
        'authtoken.Token', on_delete=models.CASCADE, related_name='visiting_session'
    )
    canonical_user_id = models.IntegerField(db_index=True)   # user_id at home store
    home_store_id = models.IntegerField()
    home_store_endpoint = models.CharField(max_length=500)
    jwt_payload = models.JSONField()   # Decoded JWT: preferences, favorites, profile, etc.
    jwt_expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    def is_expired(self):
        return timezone.now() >= self.jwt_expires_at

    def __str__(self):
        return f"VisitingSession user_id={self.canonical_user_id} @ store {self.home_store_id}"


class SyncRecord(models.Model):
    """Audit trail for every replication event."""
    SYNC_TYPES = [
        ('user_pull', 'User Pull'),
        ('catalog_push', 'Catalog Push'),
        ('status_update', 'Status Update'),
        ('credential_check', 'Credential Check'),  # For inter-node verify-credentials audit
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('success', 'Success'),
        ('failed', 'Failed'),
    ]

    sync_type = models.CharField(max_length=50, choices=SYNC_TYPES)
    source_store_id = models.IntegerField()
    target_store_id = models.IntegerField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)

    def __str__(self):
        return f"SyncRecord {self.id}: {self.get_sync_type_display()} ({self.get_status_display()})"


class EventQueue(models.Model):
    """Outbound async events queued for Celery delivery."""
    EVENT_TYPES = [
        ('status_update', 'Status Update'),
        ('supply_request', 'Supply Request'),
        ('heartbeat', 'Heartbeat'),
        ('user_sync', 'User Sync'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
    ]

    event_type = models.CharField(max_length=50, choices=EVENT_TYPES)
    payload = models.JSONField()
    target_node = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    last_attempt = models.DateTimeField(null=True, blank=True)
    attempts = models.IntegerField(default=0)

    def __str__(self):
        return f"EventQueue {self.id}: {self.get_event_type_display()} to {self.target_node}"


class SupplyRequest(models.Model):
    """Store → hub supply requests."""
    ITEM_TYPES = [
        ('Soda', 'Soda'),
        ('Syrup', 'Syrup'),
        ('Add In', 'Add In'),
        ('Physical', 'Physical'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('denied', 'Denied'),
        ('fulfilled', 'Fulfilled'),
    ]

    store_id = models.IntegerField()
    item_name = models.CharField(max_length=255)
    item_type = models.CharField(max_length=50, choices=ITEM_TYPES)
    quantity_requested = models.PositiveIntegerField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"SupplyRequest {self.id}: {self.quantity_requested}x {self.item_name} for store {self.store_id}"


# Group 2: Sprint 3 Feature Models

class Region(models.Model):
    """Regional metadata."""
    name = models.CharField(max_length=100, unique=True)
    hub_api_endpoint = models.URLField(blank=True)

    def __str__(self):
        return f"{self.name}"


class SupplyHub(models.Model):
    """Supply hub inventory and ops info."""
    region = models.ForeignKey(Region, on_delete=models.CASCADE)
    address = models.CharField(max_length=255)
    contact_email = models.EmailField()
    inventory_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"SupplyHub {self.id}: {self.address} ({self.region.name})"

    class Meta:
        verbose_name_plural = "Supply Hubs"


class Machine(models.Model):
    """Robotic machine tracking with state machine enforcement."""
    STATUS_CHOICES = [
        ('NORMAL', 'Normal'),
        ('WARNING', 'Warning'),
        ('ERROR', 'Error'),
        ('OUT_OF_ORDER', 'Out of Order'),
        ('SCHEDULE_SERVICE', 'Schedule Service'),
        ('REPAIR_START', 'Repair Start'),
        ('REPAIR_END', 'Repair End'),
    ]

    # State machine: valid transitions from each state
    VALID_TRANSITIONS = {
        'NORMAL': ['WARNING', 'SCHEDULE_SERVICE'],
        'WARNING': ['NORMAL', 'ERROR', 'SCHEDULE_SERVICE'],
        'ERROR': ['OUT_OF_ORDER', 'SCHEDULE_SERVICE'],
        'OUT_OF_ORDER': ['REPAIR_START'],
        'SCHEDULE_SERVICE': ['REPAIR_START'],
        'REPAIR_START': ['REPAIR_END'],
        'REPAIR_END': ['NORMAL'],
    }

    machine_id = models.CharField(max_length=100, unique=True)
    store_id = models.IntegerField()
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='NORMAL')
    last_status_change = models.DateTimeField(auto_now=True)
    repair_notes = models.TextField(blank=True)
    installed_at = models.DateTimeField(null=True, blank=True)

    def clean(self):
        """Validate state machine transition before save."""
        from django.core.exceptions import ValidationError
        if self.pk:  # Only validate if updating (not on creation)
            original = Machine.objects.get(pk=self.pk)
            current_status = original.status
            valid_next = self.VALID_TRANSITIONS.get(current_status, [])
            if self.status != current_status and self.status not in valid_next:
                raise ValidationError(
                    f"Invalid transition: {current_status} -> {self.status}. "
                    f"Valid transitions: {valid_next}"
                )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Machine {self.machine_id} (store {self.store_id}): {self.get_status_display()}"


class Schedule(models.Model):
    """Repair staff schedules (CSV upload support)."""
    staff_user = models.ForeignKey(User, on_delete=models.CASCADE)
    store_id = models.IntegerField()
    shift_start = models.DateTimeField()
    shift_end = models.DateTimeField()
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Schedule for {self.staff_user.username}: {self.shift_start.date()}"


# Group 3: Staff Role Profile Models

class RepairStaffProfile(models.Model):
    """Extends User for repair staff role."""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='repair_profile')
    region = models.CharField(max_length=100)
    assigned_store_id = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return f"RepairStaff {self.user.username} ({self.region})"

    class Meta:
        verbose_name_plural = "Repair Staff Profiles"


class LogisticsManagerProfile(models.Model):
    """Extends User for logistics manager role."""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='logistics_profile')
    region = models.ForeignKey(Region, on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return f"LogisticsManager {self.user.username} ({self.region.name if self.region else 'Unknown'})"

    class Meta:
        verbose_name_plural = "Logistics Manager Profiles"