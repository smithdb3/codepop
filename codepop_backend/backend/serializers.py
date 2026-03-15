from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import Preference, Drink, Inventory, Order, Notification, Revenue
from django.conf import settings
import requests
import logging

logger = logging.getLogger(__name__)


class CreateUserSerializer(serializers.ModelSerializer):
    username = serializers.CharField()
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True,
                                     style={'input_type': 'password'})

    class Meta:
        model = get_user_model()
        fields = ('username', 'email', 'password', 'first_name', 'last_name')
        read_only_fields = ('is_staff', 'is_superuser', 'is_active',)

    def validate_email(self, value):
        User = get_user_model()

        # Check local database first
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with that email already exists.")

        # Check if email exists on hub (for cross-region uniqueness)
        if settings.HUB_URL:
            try:
                hub_url = settings.HUB_URL.rstrip('/')

                # Use per-node secret from HubRegistry if available; fall back to global secret
                node_secret = settings.INTER_NODE_SECRET
                try:
                    from .models import HubRegistry
                    hub_reg = HubRegistry.objects.filter(is_active=True).first()
                    if hub_reg and hub_reg.issued_secret:
                        node_secret = hub_reg.issued_secret
                except Exception:
                    pass

                hub_resp = requests.get(
                    f"{hub_url}/backend/hub/store-location/",
                    params={"email": value},
                    headers={"Authorization": f"NodeToken {node_secret}"},
                    timeout=5,
                )
                if hub_resp.status_code == 200:
                    hub_data = hub_resp.json()
                    if hub_data.get("status") == "found":
                        raise serializers.ValidationError(
                            "A user with that email already exists in another store."
                        )
            except requests.exceptions.RequestException as e:
                logger.error("Failed to check email uniqueness at hub: %s", str(e))
                # Don't block registration if hub is unreachable — allow local registration

        return value

    def create(self, validated_data):
        User = get_user_model()
        return User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
        )

class GetUserSerializer(serializers.ModelSerializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True,
                                     style={'input_type': 'password'})

    class Meta:
        model = get_user_model()
        fields = ('id', 'username', 'email', 'password', 'first_name', 'last_name', 'is_staff', 'is_superuser')
        read_only_fields = ('is_staff', 'is_superuser', 'is_active',)


# Shared allowed preference values (lowercase); used by PreferenceSerializer and internode preference update
ALLOWED_PREFERENCES = [
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


class PreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Preference
        fields = ['PreferenceID', 'UserID', 'Preference']

    # Custom validation for the Preference field
    def validate_Preference(self, value):
        # Convert the value to lowercase for consistent validation
        value = value.lower()

        # Check if the value is in the allowed preferences
        if value not in ALLOWED_PREFERENCES:
            raise serializers.ValidationError(f"{value} is not a valid preference. Allowed preferences are: {ALLOWED_PREFERENCES}.")

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

