from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from .models import Preference, Drink, Inventory, Order, Notification, Revenue, Permission, Role, UserProfile, AuditLog


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
        user.username = validated_data.get('email', user.username)
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
# REPAIR STAFF DASHBOARD — MACHINE SERIALIZERS
# ─────────────────────────────────────────────

from .models import Machine, RepairRecord, MachinePart, MachineNote, MachinePhoto


class MachineNoteSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()

    class Meta:
        model = MachineNote
        fields = ['id', 'content', 'author', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_author(self, obj):
        if obj.author:
            name = f"{obj.author.first_name} {obj.author.last_name}".strip()
            return name or obj.author.username
        return 'Unknown'


class MachinePhotoSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()
    uploaded_by = serializers.SerializerMethodField()

    class Meta:
        model = MachinePhoto
        fields = ['id', 'url', 'uploaded_by', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_url(self, obj):
        request = self.context.get('request')
        if obj.photo and request:
            return request.build_absolute_uri(obj.photo.url)
        return None

    def get_uploaded_by(self, obj):
        if obj.uploaded_by:
            name = f"{obj.uploaded_by.first_name} {obj.uploaded_by.last_name}".strip()
            return name or obj.uploaded_by.username
        return 'Unknown'


class MachinePartSerializer(serializers.ModelSerializer):
    stock_status = serializers.SerializerMethodField()
    qty_available = serializers.IntegerField(source='stock_qty')
    eta = serializers.SerializerMethodField()

    class Meta:
        model = MachinePart
        fields = ['id', 'part_name', 'part_number', 'stock_status', 'qty_available', 'eta', 'is_compatible']

    def get_stock_status(self, obj):
        if obj.stock_qty > 0:
            return 'in_stock'
        elif obj.eta_days is not None:
            return 'order_pending'
        return 'back_order'

    def get_eta(self, obj):
        if obj.eta_days is None:
            return None
        from django.utils import timezone
        import datetime
        return (timezone.now().date() + datetime.timedelta(days=obj.eta_days)).isoformat()


class RepairRecordSerializer(serializers.ModelSerializer):
    date = serializers.DateTimeField(source='started_at', format='%Y-%m-%d')
    technician = serializers.SerializerMethodField()
    issue_type = serializers.CharField(source='repair_type')
    duration = serializers.SerializerMethodField()
    outcome = serializers.SerializerMethodField()
    diagnosis = serializers.CharField(source='notes')
    steps_text = serializers.SerializerMethodField()
    parts_replaced = serializers.SerializerMethodField()

    class Meta:
        model = RepairRecord
        fields = [
            'id', 'date', 'technician', 'issue_type',
            'duration', 'outcome', 'diagnosis', 'steps_text',
            'parts_replaced', 'status', 'started_at', 'completed_at'
        ]

    def get_technician(self, obj):
        if obj.technician:
            name = f"{obj.technician.first_name} {obj.technician.last_name}".strip()
            return name or obj.technician.username
        return 'Unknown'

    def get_duration(self, obj):
        if obj.completed_at and obj.started_at:
            delta = obj.completed_at - obj.started_at
            total_minutes = int(delta.total_seconds() / 60)
            hours, minutes = divmod(total_minutes, 60)
            if hours > 0:
                return f"{hours}h {minutes}m" if minutes else f"{hours}h"
            return f"{minutes}m"
        return None

    def get_outcome(self, obj):
        return 'resolved' if obj.status == 'completed' else 'unresolved'

    def get_steps_text(self, obj):
        return obj.notes or ''

    def get_parts_replaced(self, obj):
        return []


class MachineListSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='machine_id')
    store_id = serializers.IntegerField()
    store_name = serializers.SerializerMethodField()
    model = serializers.CharField(source='model_number')
    serial = serializers.CharField(source='serial_number')
    downtime_duration = serializers.SerializerMethodField()
    last_service = serializers.SerializerMethodField()
    priority_score = serializers.SerializerMethodField()
    revenue_impact = serializers.SerializerMethodField()
    install_date = serializers.DateField()
    warranty_status = serializers.SerializerMethodField()
    repair_state = serializers.SerializerMethodField()
    estimated_completion = serializers.DateTimeField(source='completion_estimate')
    assigned_tech = serializers.SerializerMethodField()

    class Meta:
        model = Machine
        fields = [
            'id', 'store_id', 'store_name', 'model', 'serial',
            'status', 'downtime_duration', 'last_service',
            'priority_score', 'revenue_impact', 'install_date',
            'warranty_status', 'repair_state', 'estimated_completion',
            'assigned_tech',
        ]

    def get_store_name(self, obj):
        from .models import StoreRegistry
        store = StoreRegistry.objects.filter(store_id=obj.store_id).first()
        return store.store_name if store else f'Store #{obj.store_id}'

    def get_downtime_duration(self, obj):
        if obj.status in ('NORMAL', 'SCHEDULE_SERVICE'):
            return None
        from django.utils import timezone
        delta = timezone.now() - obj.last_status_change
        total_minutes = int(delta.total_seconds() / 60)
        hours, minutes = divmod(total_minutes, 60)
        if hours > 0:
            return f"{hours}h {minutes}m"
        return f"{minutes}m"

    def get_last_service(self, obj):
        if obj.last_repair_date:
            return obj.last_repair_date.date().isoformat()
        return None

    def get_priority_score(self, obj):
        score_map = {
            'ERROR': 90, 'OUT_OF_ORDER': 85, 'REPAIR_START': 70,
            'WARNING': 50, 'SCHEDULE_SERVICE': 30, 'REPAIR_END': 20, 'NORMAL': 5
        }
        return score_map.get(obj.status, 0)

    def get_revenue_impact(self, obj):
        if obj.status == 'NORMAL':
            return 0
        return 250

    def get_warranty_status(self, obj):
        if not obj.warranty_expiry:
            return 'Unknown'
        from django.utils import timezone
        return 'Active' if obj.warranty_expiry >= timezone.now().date() else 'Expired'

    def get_repair_state(self, obj):
        label_map = {
            'NORMAL': 'Healthy', 'WARNING': 'Warning',
            'ERROR': 'Error', 'OUT_OF_ORDER': 'Out of Order',
            'SCHEDULE_SERVICE': 'Scheduled', 'REPAIR_START': 'In Progress',
            'REPAIR_END': 'Testing',
        }
        return label_map.get(obj.status, obj.status)

    def get_assigned_tech(self, obj):
        latest = obj.repair_records.filter(
            status__in=['in_progress', 'awaiting_parts']
        ).select_related('technician').first()
        if latest and latest.technician:
            name = f"{latest.technician.first_name} {latest.technician.last_name}".strip()
            return name or latest.technician.username
        return None


class MachineDetailSerializer(MachineListSerializer):
    last_note = serializers.SerializerMethodField()
    last_update_time = serializers.SerializerMethodField()

    class Meta(MachineListSerializer.Meta):
        fields = MachineListSerializer.Meta.fields + ['last_note', 'last_update_time', 'notes']

    def get_last_note(self, obj):
        note = MachineNote.objects.filter(machine=obj).order_by('-created_at').first()
        return note.content if note else obj.notes or None

    def get_last_update_time(self, obj):
        from django.utils import timezone
        delta = timezone.now() - obj.last_status_change
        minutes = int(delta.total_seconds() / 60)
        if minutes < 60:
            return f"{minutes} minutes ago"
        hours = minutes // 60
        if hours < 24:
            return f"{hours} hour{'s' if hours != 1 else ''} ago"
        days = hours // 24
        return f"{days} day{'s' if days != 1 else ''} ago"

