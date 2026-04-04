from django.contrib.auth import get_user_model
from django.contrib.auth.models import User
from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from .models import Preference, Drink, Inventory, Order, Notification, Revenue, Permission, Role, UserProfile, AuditLog, Machine, Schedule, Region, StoreRegistry, SupplyHub, HubInventoryItem, StoreInventoryItem, SupplyRequest, Delivery, SeasonalDrink


class CreateUserSerializer(serializers.ModelSerializer):
    username = serializers.CharField(
        validators=[UniqueValidator(
            queryset=get_user_model().objects.all(),
            message='An account with this email already exists.'
        )]
    )
    password = serializers.CharField(write_only=True,
                                     style={'input_type': 'password'})

    class Meta:
        model = get_user_model()
        fields = ('username', 'email', 'password', 'first_name', 'last_name')
        write_only_fields = ('password')
        read_only_fields = ('is_staff', 'is_superuser', 'is_active',)

    def create(self, validated_data):
        user = super(CreateUserSerializer, self).create(validated_data)
        user.set_password(validated_data['password'])
        user.save()
        return user

class GetUserSerializer(serializers.ModelSerializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True,
                                     style={'input_type': 'password'})

    class Meta:
        model = get_user_model()
        fields = ('id', 'username', 'password', 'first_name', 'last_name', 'is_staff', 'is_superuser')
        write_only_fields = ('password')
        read_only_fields = ('is_staff', 'is_superuser', 'is_active',)


class PreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Preference
        fields = ['PreferenceID', 'UserID', 'Preference']

    # Custom validation for the Preference field
    def validate_Preference(self, value):
        # Convert the value to lowercase for consistent validation
        value = value.lower()

        # Define the allowed preference values (in lowercase for consistency)
        allowed_preferences = [
            "mtn. dew", "diet mtn. dew", "dr. pepper", "diet dr. pepper", "dr. pepper zero",
            "dr pepper cream soda", "sprite", "sprite zero", "coke", "diet coke", "coke zero",
            "pepsi", "diet pepsi", "rootbeer", "fanta", "big red", "powerade", "lemonade",
            "light lemonade", "coconut", "pineapple", "passion fruit", "mango", "guava", "banana",
            "strawberry", "raspberry", "blackberry", "pomegranate", "cranberry", "grape", "kiwi", 
            "huckleberry", "peach", "watermelon", "green apple", "pear", "cherry", "orange", 
            "blood orange", "grapefruit", "sweetened lime", "lemon", "lime", "vanilla", "cupcake",
            "salted caramel", "chocolate milano", "cinnamon", "choc chip cookie dough", 
            "brown sugar cinnamon", "hazelnut", "white chocolate", "butterscotch", "blue raspberry", 
            "sour", "blue curacao", "bubble gum", "cotton candy", "mojito", "cucumber", "lavender",
            "pumpkin spice", "peppermint", "irish cream", "gingerbread", "butterbrew mix", "cream", 
            "coconut cream", "whip", "lemon wedge", "lime wedge", "french vanilla creamer", "candy",
            "sprinkles", "strawberry puree", "peach puree", "mango puree", "raspberry puree", "candy sprinkles", "chocolate"
        ]

        # Check if the value is in the allowed preferences
        if value not in allowed_preferences:
            raise serializers.ValidationError(f"{value} is not a valid preference. Allowed preferences are: {allowed_preferences}.")

        # Return the lowercase value for saving
        return value
    
class DrinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = Drink
        fields = '__all__'

    def validate_Size(self, value):
        value = value.lower()

        allowed_size = ['16oz', '24oz','32oz']

        if value not in allowed_size:
            raise serializers.ValidationError(f"{value} is not a valid drink size. Allowed sizes are: {allowed_size}")
        
        return value
    
    def validate_Ice(self, value):
        value = value.lower()

        if value == "no ice":
            value = 'none'

        allowed_ice = ['none', 'light', 'regular', 'extra']

        if value not in allowed_ice:
            raise serializers.ValidationError(f"{value} is not a valid ice amount. Allowed amounts are: {allowed_ice}")

        return value

class InventorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Inventory
        fields = [
            'InventoryID', 'ItemName', 'ItemType', 
            'Quantity', 'ThresholdLevel', 'LastUpdated'
        ]

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'

class OrderSerializer(serializers.ModelSerializer):
    Drinks = serializers.PrimaryKeyRelatedField(many=True, queryset=Drink.objects.all())

    class Meta:
        model = Order
        fields = [
            'OrderID', 'UserID', 'Drinks', 
            'OrderStatus', 'PaymentStatus', 
            'PickupTime', 'CreationTime','LockerCombo',
            'StripeID'
        ]

    def create(self, validated_data):
            drinks = validated_data.pop('Drinks')
            order = Order.objects.create(**validated_data)  # Create the order without drinks
            order.Drinks.set(drinks)  # Set the ManyToMany relationship
            return order

    def validate_Drinks(self, value):
        if not value:
            raise serializers.ValidationError("At least one drink must be included in the order.")
        return value

class RevenueSerializer(serializers.ModelSerializer):
    class Meta:
        model = Revenue
        fields = ['RevenueID', 'OrderID', 'TotalAmount', 'SaleDate', 'Refunded']

    def create(self, validated_data):
        """Override the create method to ensure total amount calculation when a revenue instance is created."""
        revenue_instance = Revenue(**validated_data)
        # Ensure TotalAmount is calculated if not provided in the request data
        if 'TotalAmount' not in validated_data or not validated_data['TotalAmount']:
            revenue_instance.calculate_total_amount()
        revenue_instance.save()
        return revenue_instance
    
class MachineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Machine
        fields = ['machine_id', 'name', 'location', 'status', 'notes']

class ScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Schedule
        fields = ['machine','assigned_to', 'scheduled_at', 'completed_at', 'description']


# ─────────────────────────────────────────────
# ADMIN DASHBOARD SERIALIZERS
# ─────────────────────────────────────────────

class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ['id', 'codename', 'label', 'category']


class RoleSerializer(serializers.ModelSerializer):
    permissions = PermissionSerializer(many=True, read_only=True)
    permission_ids = serializers.PrimaryKeyRelatedField(
        queryset=Permission.objects.all(),
        source='permissions',
        many=True,
        write_only=True
    )
    user_count = serializers.SerializerMethodField()

    class Meta:
        model = Role
        fields = ['id', 'name', 'is_builtin', 'description', 'permissions', 'permission_ids', 'user_count']

    def get_user_count(self, obj):
        return obj.users.count()


class UserListSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    email = serializers.CharField(source='user.email')
    role = serializers.SerializerMethodField()
    location = serializers.SerializerMethodField()
    last_login = serializers.DateTimeField(source='user.last_login')
    status = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = ['id', 'name', 'email', 'role', 'location', 'last_login', 'status']

    def get_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip()

    def get_role(self, obj):
        return obj.role.name if obj.role else 'Unassigned'

    def get_location(self, obj):
        return obj.region.display_name if obj.region else 'N/A'

    def get_status(self, obj):
        if obj.is_deleted:
            return 'deleted'
        elif obj.user.is_active:
            return 'active'
        else:
            return 'disabled'


class UserCreateUpdateSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, required=False)
    role_id = serializers.PrimaryKeyRelatedField(queryset=Role.objects.all(), source='role')
    region_id = serializers.PrimaryKeyRelatedField(queryset=get_user_model().objects.none(), source='region', required=False)

    class Meta:
        model = UserProfile
        fields = ['first_name', 'last_name', 'email', 'password', 'role_id', 'region_id']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Fix the queryset for region (cannot import Region at module level due to circular imports)
        from .models import Region
        self.fields['region_id'].queryset = Region.objects.all()

    def create(self, validated_data):
        user_data = {
            'first_name': validated_data.get('first_name'),
            'last_name': validated_data.get('last_name'),
            'email': validated_data.get('email'),
            'username': validated_data.get('email'),  # use email as username
        }
        if 'password' in validated_data:
            user_data['password'] = validated_data['password']

        user = get_user_model().objects.create_user(**user_data)

        profile_data = {
            'user': user,
            'role': validated_data.get('role'),
            'region': validated_data.get('region'),
        }
        profile = UserProfile.objects.create(**profile_data)
        return profile

    def update(self, instance, validated_data):
        user = instance.user
        user.first_name = validated_data.get('first_name', user.first_name)
        user.last_name = validated_data.get('last_name', user.last_name)
        user.email = validated_data.get('email', user.email)
        if 'password' in validated_data:
            user.set_password(validated_data['password'])
        user.save()

        instance.role = validated_data.get('role', instance.role)
        instance.region = validated_data.get('region', instance.region)
        instance.save()
        return instance


class AuditLogSerializer(serializers.ModelSerializer):
    actor = serializers.CharField(source='actor.username', read_only=True)
    actor_role = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = ['id', 'timestamp', 'actor', 'actor_role', 'action', 'target_type', 'target_repr', 'ip_address', 'result']

    def get_actor_role(self, obj):
        if obj.actor and hasattr(obj.actor, 'admin_profile') and obj.actor.admin_profile.role:
            return obj.actor.admin_profile.role.name
        return 'Unknown'


# ─────────────────────────────────────────────
# STORES & SUPPLY HUBS SERIALIZERS
# ─────────────────────────────────────────────

class RegionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Region
        fields = ['id', 'name', 'display_name', 'hub_api_endpoint', 'is_active']


class SupplyHubSerializer(serializers.ModelSerializer):
    region_name = serializers.CharField(source='region.display_name', read_only=True)
    status = serializers.SerializerMethodField()

    class Meta:
        model = SupplyHub
        fields = ['id', 'name', 'region', 'region_name', 'inventory_pct', 'active_deliveries_count', 'pending_orders_count', 'status']

    def get_status(self, obj):
        return 'online' if obj.inventory_pct > 0 else 'degraded'


class StoreRegistrySerializer(serializers.ModelSerializer):
    region_name = serializers.CharField(source='region.display_name', read_only=True)
    manager_name = serializers.SerializerMethodField()
    supply_health_status = serializers.SerializerMethodField()
    days_remaining = serializers.SerializerMethodField()
    restock_by_date = serializers.SerializerMethodField()
    active_requests = serializers.SerializerMethodField()
    ingredient_levels = serializers.SerializerMethodField()
    forecast_data = serializers.SerializerMethodField()
    requests = serializers.SerializerMethodField()
    history = serializers.SerializerMethodField()

    class Meta:
        model = StoreRegistry
        fields = [
            'id', 'store_id', 'store_name', 'location', 'region', 'region_name',
            'status', 'manager', 'manager_name', 'last_heartbeat', 'machine_count',
            'supply_health_status', 'days_remaining', 'restock_by_date', 'active_requests',
            'ingredient_levels', 'forecast_data', 'requests', 'history'
        ]

    def get_manager_name(self, obj):
        if obj.manager and obj.manager.user:
            return obj.manager.user.get_full_name() or obj.manager.user.username
        return None

    def get_supply_health_status(self, obj):
        from backend.models import StoreInventoryItem
        items = list(StoreInventoryItem.objects.filter(store=obj))
        if not items:
            return 'good'
        for item in items:
            if item.quantity < item.threshold or item.days_remaining <= 3:
                return 'critical'
        for item in items:
            if item.quantity < item.threshold * 2:
                return 'low'
        return 'good'

    def get_days_remaining(self, obj):
        from backend.models import StoreInventoryItem
        from django.db.models import Min
        result = StoreInventoryItem.objects.filter(store=obj).aggregate(Min('days_remaining'))
        return result.get('days_remaining__min') or 0

    def get_restock_by_date(self, obj):
        # Stub: Part 4 will populate this
        return None

    def get_active_requests(self, obj):
        return SupplyRequest.objects.filter(store=obj, status='pending').count()

    def get_ingredient_levels(self, obj):
        from backend.models import StoreInventoryItem
        items = StoreInventoryItem.objects.filter(store=obj)
        return StoreInventoryItemSerializer(items, many=True).data

    def get_forecast_data(self, obj):
        # Stub: Part 4/14 will populate this
        return []

    def get_requests(self, obj):
        qs = SupplyRequest.objects.filter(store=obj).order_by('-created_at')[:5]
        return SupplyRequestSerializer(qs, many=True).data

    def get_history(self, obj):
        qs = SupplyRequest.objects.filter(store=obj, status__in=['fulfilled', 'denied']).order_by('-updated_at')[:5]
        return SupplyRequestSerializer(qs, many=True).data


# ─────────────────────────────────────────────
# SUPPLY REQUEST SERIALIZER
# ─────────────────────────────────────────────

class SupplyRequestSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source='store.store_name', read_only=True)
    hub_name = serializers.CharField(source='hub.name', read_only=True, allow_null=True, default=None)
    created_by_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()

    class Meta:
        model = SupplyRequest
        fields = ['id', 'store', 'store_name', 'hub', 'hub_name', 'items', 'status', 'urgency',
                  'created_by', 'created_by_name', 'approved_by', 'approved_by_name',
                  'approved_at', 'fulfilled_at', 'notes', 'created_at', 'updated_at']
        read_only_fields = ['id', 'store', 'store_name', 'status', 'created_by', 'created_by_name',
                           'approved_by', 'approved_by_name', 'approved_at', 'fulfilled_at', 'created_at', 'updated_at']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return None

    def get_approved_by_name(self, obj):
        if obj.approved_by:
            return obj.approved_by.get_full_name() or obj.approved_by.username
        return None


# ─────────────────────────────────────────────
# INVENTORY SERIALIZERS
# ─────────────────────────────────────────────

class HubInventoryItemSerializer(serializers.ModelSerializer):
    health_status = serializers.SerializerMethodField()

    class Meta:
        model = HubInventoryItem
        fields = ['id', 'hub', 'item_name', 'category', 'quantity', 'threshold', 'unit', 'last_updated', 'health_status']

    def get_health_status(self, obj):
        if obj.quantity < obj.threshold:
            return 'critical'
        elif obj.quantity < obj.threshold * 2:
            return 'low'
        return 'in_stock'


class StoreInventoryItemSerializer(serializers.ModelSerializer):
    health_status = serializers.SerializerMethodField()
    level = serializers.IntegerField(source='quantity', read_only=True)
    capacity = serializers.IntegerField(source='max_capacity', read_only=True)
    current_level_pct = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    avg_daily_usage = serializers.SerializerMethodField()
    trend_direction = serializers.SerializerMethodField()
    trend_pct = serializers.SerializerMethodField()

    class Meta:
        model = StoreInventoryItem
        fields = [
            'id', 'store', 'item_name', 'category', 'quantity', 'max_capacity', 'threshold',
            'days_remaining', 'last_updated', 'health_status', 'level', 'capacity',
            'current_level_pct', 'status', 'avg_daily_usage', 'trend_direction', 'trend_pct'
        ]

    def get_health_status(self, obj):
        if obj.quantity < obj.threshold or obj.days_remaining <= 3:
            return 'critical'
        elif obj.quantity < obj.threshold * 2:
            return 'low'
        return 'in_stock'

    def get_current_level_pct(self, obj):
        if obj.max_capacity > 0:
            return round((obj.quantity / obj.max_capacity) * 100)
        return 0

    def get_status(self, obj):
        return self.get_health_status(obj)

    def get_avg_daily_usage(self, obj):
        # Stub: Phase 14 AI/analytics will populate this
        return 0

    def get_trend_direction(self, obj):
        # Stub: Phase 14 will populate this
        return 'flat'

    def get_trend_pct(self, obj):
        # Stub: Phase 14 will populate this
        return 0


class DeliverySerializer(serializers.ModelSerializer):
    """
    Serializer for Delivery model with computed fields for frontend compatibility.
    Produces fields matching the mockData shape.
    """
    hub_name        = serializers.CharField(source='hub.name', read_only=True)
    driver_name     = serializers.SerializerMethodField()
    driver          = serializers.SerializerMethodField()  # alias for driver_name
    driver_id       = serializers.PrimaryKeyRelatedField(
                          source='driver',
                          queryset=User.objects.all(),
                          allow_null=True, required=False)
    store_ids       = serializers.PrimaryKeyRelatedField(
                          source='stores',
                          queryset=StoreRegistry.objects.all(),
                          many=True, write_only=True, required=False)
    stores_detail   = serializers.SerializerMethodField()

    # Computed fields matching mockData shape
    storeName               = serializers.SerializerMethodField()
    storeAddress            = serializers.SerializerMethodField()
    currentSupplyPct        = serializers.SerializerMethodField()
    forecastedDepletionDate = serializers.SerializerMethodField()
    suggestedRestockWindow  = serializers.SerializerMethodField()
    lastDelivery            = serializers.SerializerMethodField()

    class Meta:
        model  = Delivery
        fields = [
            'id', 'hub', 'hub_name',
            'driver_id', 'driver_name', 'driver',
            'store_ids', 'stores_detail',
            'route', 'status', 'eta', 'delivery_date',
            'notes', 'created_by', 'created_at', 'updated_at',
            # Frontend-shape computed fields
            'storeName', 'storeAddress', 'currentSupplyPct',
            'forecastedDepletionDate', 'suggestedRestockWindow', 'lastDelivery',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at',
                            'hub_name', 'driver_name', 'driver', 'stores_detail',
                            'storeName', 'storeAddress', 'currentSupplyPct',
                            'forecastedDepletionDate', 'suggestedRestockWindow',
                            'lastDelivery']

    def get_driver_name(self, obj):
        if obj.driver:
            return obj.driver.get_full_name() or obj.driver.username
        return None

    def get_driver(self, obj):
        """Alias for driver_name for frontend compatibility."""
        if obj.driver:
            return obj.driver.get_full_name() or obj.driver.username
        return None

    def get_stores_detail(self, obj):
        stores = obj.stores.all()
        return [{'id': s.id, 'store_name': s.store_name, 'location': s.location}
                for s in stores]

    def _primary_store(self, obj):
        """Return first store in route order, or first M2M store."""
        if obj.route:
            store = obj.stores.filter(id=obj.route[0]).first()
            if store:
                return store
        return obj.stores.first()

    def get_storeName(self, obj):
        store = self._primary_store(obj)
        return store.store_name if store else ''

    def get_storeAddress(self, obj):
        store = self._primary_store(obj)
        return store.location if store else ''

    def get_currentSupplyPct(self, obj):
        """Average supply % across all stores in this delivery."""
        store_ids = list(obj.stores.values_list('id', flat=True))
        if not store_ids:
            return 0
        pcts = []
        for sid in store_ids:
            items = StoreInventoryItem.objects.filter(store_id=sid)
            if items.exists():
                total = sum(
                    round((i.quantity / i.max_capacity) * 100) if i.max_capacity > 0 else 0
                    for i in items
                )
                pcts.append(total // items.count())
        return round(sum(pcts) / len(pcts)) if pcts else 0

    def get_forecastedDepletionDate(self, obj):
        """Forecast depletion date based on min days_remaining."""
        from django.utils import timezone
        from datetime import timedelta
        store_ids = list(obj.stores.values_list('id', flat=True))
        if not store_ids:
            return None
        min_days = StoreInventoryItem.objects.filter(
            store_id__in=store_ids, days_remaining__gt=0
        ).order_by('days_remaining').values_list('days_remaining', flat=True).first()
        if min_days is None:
            return None
        return (timezone.now().date() + timedelta(days=min_days)).isoformat()

    def get_suggestedRestockWindow(self, obj):
        """Restock window recommendation."""
        store_ids = list(obj.stores.values_list('id', flat=True))
        if not store_ids:
            return 'ok'
        min_days = StoreInventoryItem.objects.filter(
            store_id__in=store_ids
        ).order_by('days_remaining').values_list('days_remaining', flat=True).first()
        if min_days is None:
            return 'ok'
        if min_days <= 1:
            return 'immediate'
        if min_days <= 7:
            return 'this_week'
        if min_days <= 14:
            return 'next_week'
        return 'ok'

    def get_lastDelivery(self, obj):
        """Most recent delivered delivery for the primary store."""
        store = self._primary_store(obj)
        if not store:
            return None
        last = Delivery.objects.filter(
            stores=store, status='delivered'
        ).order_by('-delivery_date').first()
        if last and last.delivery_date:
            return last.delivery_date.isoformat()
        return None

    def create(self, validated_data):
        """Create delivery, populate M2M stores and route."""
        stores = validated_data.pop('stores', [])
        instance = Delivery.objects.create(**validated_data)
        if stores:
            instance.stores.set(stores)
            # Populate route from stores order if not provided
            if not instance.route:
                instance.route = [s.id for s in stores]
                instance.save()
        return instance


class DriverSerializer(serializers.ModelSerializer):
    """Serializer for drivers (User objects used for delivery assignment)."""
    name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'name', 'username']

    def get_name(self, obj):
        return obj.get_full_name() or obj.username


class SeasonalDrinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = SeasonalDrink
        fields = ['id', 'name', 'description', 'image_url', 'season', 'price', 'soda', 'syrups', 'add_ins', 'is_active']
