from django.db import models
from django.contrib.auth.models import User
from django.contrib.postgres.fields import ArrayField
from django.utils import timezone
from django.conf import settings

# ============================================================================
# ORIGINAL SPRINT 1-2 MODELS (Keep as-is)
# ============================================================================

class Preference(models.Model):
    PreferenceID = models.AutoField(primary_key=True)
    UserID = models.ForeignKey(User, on_delete=models.CASCADE)
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
        self.Favorite.add(User.objects.filter(id=userToAdd))

    def removeFavorite(self, userToRemove):
        self.Favorite.remove(User.objects.filter(id=userToRemove))

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
        return self.Quantity <= 0

    def __str__(self):
        return f"{self.ItemName} - {self.ItemType} (Qty: {self.Quantity})"

class Notification(models.Model):
    NotificationID = models.AutoField(primary_key=True)
    UserID = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    Message = models.CharField(max_length=500)
    Timestamp = models.DateTimeField(default=timezone.now)
    Type = models.CharField(max_length=50)
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
        for drink_id in drink_ids:
            drink = Drink.objects.get(DrinkID=drink_id)
            self.Drinks.add(drink)
        self.save()

    def remove_drinks(self, drink_ids):
        for drink_id in drink_ids:
            drink = Drink.objects.get(DrinkID=drink_id)
            self.Drinks.remove(drink)
        self.save()

    def __str__(self):
        return f"Order {self.OrderID} by User {self.UserID}"

class Revenue(models.Model):
    RevenueID = models.AutoField(primary_key=True)
    OrderID = models.ForeignKey(Order, on_delete=models.CASCADE, db_column='OrderID', null=True, blank=True)
    TotalAmount = models.FloatField(default=0.0)
    SaleDate = models.DateTimeField(default=timezone.now)
    Refunded = models.BooleanField(default=False)

    def calculate_total_amount(self):
        try:
            order = Order.objects.get(OrderID=self.OrderID)
            total = sum(drink.Price for drink in order.Drinks.all())
            self.TotalAmount = total
            return total
        except Order.DoesNotExist:
            self.TotalAmount = 0
            return 0

    def save(self, *args, **kwargs):
        if self.TotalAmount is None:
            self.calculate_total_amount()
        super(Revenue, self).save(*args, **kwargs)

    def __str__(self):
        try:
            return f"Revenue {self.RevenueID} for Order {self.OrderID}: ${self.TotalAmount:.2f}"
        except Order.DoesNotExist:
            return f"Revenue {self.RevenueID} for unknown Order {self.OrderID}: ${self.TotalAmount:.2f}"


# ============================================================================
# SPRINT 3: CLEAN DISTRIBUTED ARCHITECTURE MODELS
# ============================================================================

# Infrastructure Models (5)

class StoreNode(models.Model):
    """Peer store info, populated on hub registration and heartbeat."""
    store_id = models.IntegerField(unique=True)
    store_name = models.CharField(max_length=255)
    region = models.CharField(max_length=100)
    api_endpoint = models.URLField()
    is_active = models.BooleanField(default=True)
    last_heartbeat = models.DateTimeField(null=True, blank=True)
    registered_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Store {self.store_id}: {self.store_name} ({self.region})"

    class Meta:
        verbose_name_plural = "Store Nodes"


class UserLocationCache(models.Model):
    """Maps email → home store. 24h TTL for visiting users, 10yr for home users."""
    email = models.EmailField(unique=True, db_index=True)
    home_store_id = models.IntegerField()
    home_store_endpoint = models.URLField()
    expires_at = models.DateTimeField(db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    def is_expired(self):
        return timezone.now() > self.expires_at

    def __str__(self):
        return f"UserLocationCache {self.email} → store {self.home_store_id}"

    class Meta:
        verbose_name_plural = "User Location Caches"


class VisitingSession(models.Model):
    """Ties a local DRF Token to a JWT received from the user's home store."""
    token = models.OneToOneField('authtoken.Token', on_delete=models.CASCADE, related_name='visiting_session')
    home_store_id = models.IntegerField()
    home_store_endpoint = models.URLField()
    home_store_user_id = models.IntegerField()
    jwt_payload = models.JSONField()
    jwt_expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    def is_expired(self):
        return timezone.now() > self.jwt_expires_at

    def __str__(self):
        return f"VisitingSession user_id={self.home_store_user_id} @ store {self.home_store_id}"


class EventQueue(models.Model):
    """Outbound async events for Celery — ensures delivery despite transient failures."""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('done', 'Done'),
        ('failed', 'Failed'),
    ]
    EVENT_TYPES = [
        ('user_sync', 'User Sync'),
        ('heartbeat', 'Heartbeat'),
        ('status_update', 'Status Update'),
    ]

    event_type = models.CharField(max_length=50, choices=EVENT_TYPES)
    target_url = models.URLField()
    payload = models.JSONField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    attempts = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    next_attempt_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"EventQueue {self.id}: {self.event_type} to {self.target_url}"


class SyncLog(models.Model):
    """Audit trail for inter-node events."""
    event_type = models.CharField(max_length=50)
    source = models.CharField(max_length=200)
    target = models.CharField(max_length=200)
    status = models.CharField(max_length=20)
    detail = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"SyncLog {self.id}: {self.event_type} {self.source}→{self.target} ({self.status})"


# Feature Models (7)

class Region(models.Model):
    """Regional metadata."""
    name = models.CharField(max_length=100, unique=True)
    hub_api_endpoint = models.URLField(blank=True)

    def __str__(self):
        return self.name


class SupplyHub(models.Model):
    """Supply hub inventory and ops info."""
    region = models.ForeignKey(Region, on_delete=models.SET_NULL, null=True)
    address = models.TextField()
    contact_email = models.EmailField()
    inventory_notes = models.TextField(blank=True)

    def __str__(self):
        return f"SupplyHub {self.id}: {self.address} ({self.region.name if self.region else 'Unknown'})"

    class Meta:
        verbose_name_plural = "Supply Hubs"


class Machine(models.Model):
    """Robotic machine with state machine enforcement."""
    STATES = ['NORMAL', 'WARNING', 'ERROR', 'OUT_OF_ORDER', 'SCHEDULE_SERVICE', 'REPAIR_START', 'REPAIR_END']
    STATUS_CHOICES = [(s, s) for s in STATES]
    VALID_TRANSITIONS = {
        'NORMAL': ['WARNING', 'SCHEDULE_SERVICE'],
        'WARNING': ['NORMAL', 'ERROR'],
        'ERROR': ['NORMAL', 'OUT_OF_ORDER'],
        'SCHEDULE_SERVICE': ['REPAIR_START'],
        'OUT_OF_ORDER': ['REPAIR_START'],
        'REPAIR_START': ['REPAIR_END'],
        'REPAIR_END': ['NORMAL', 'ERROR'],
    }

    name = models.CharField(max_length=100)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='NORMAL')
    location_description = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        """Validate state machine transition before save."""
        from django.core.exceptions import ValidationError
        if self.pk:
            original = Machine.objects.get(pk=self.pk)
            current_status = original.status
            valid_next = self.VALID_TRANSITIONS.get(current_status, [])
            if self.status != current_status and self.status not in valid_next:
                raise ValidationError(
                    f"Invalid transition: {current_status} → {self.status}. "
                    f"Valid: {valid_next}"
                )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Machine {self.id}: {self.status}"


class Schedule(models.Model):
    """Repair staff schedules."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    shift_start = models.DateTimeField()
    shift_end = models.DateTimeField()
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"Schedule {self.id}: {self.user.username} {self.shift_start.date()}"


class RepairStaffProfile(models.Model):
    """Extends User for repair staff role."""
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='repair_profile')
    region = models.CharField(max_length=100)
    assigned_store_id = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return f"RepairStaff {self.user.username} ({self.region})"

    class Meta:
        verbose_name_plural = "Repair Staff Profiles"


class LogisticsManagerProfile(models.Model):
    """Extends User for logistics manager role."""
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='logistics_profile')
    region = models.ForeignKey(Region, on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return f"LogisticsManager {self.user.username} ({self.region.name if self.region else 'Unknown'})"

    class Meta:
        verbose_name_plural = "Logistics Manager Profiles"


class SupplyRequest(models.Model):
    """Store → hub supply requests."""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('denied', 'Denied'),
        ('fulfilled', 'Fulfilled'),
    ]

    item_name = models.CharField(max_length=200)
    item_type = models.CharField(max_length=50)
    quantity = models.IntegerField()
    requesting_store_id = models.IntegerField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"SupplyRequest {self.id}: {self.quantity}x {self.item_name} (store {self.requesting_store_id})"
