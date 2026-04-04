from django.urls import path
from rest_framework.authtoken.views import obtain_auth_token
from .hub_views import (
    HubRegisterView, HubHeartbeatView, HubUserLookupView,
    HubUserBroadcastView, HubStoreRegistryView, HubRevenueView,
)
from .internode_views import (
    InterNodeUserExistsView, InterNodeUserSyncView,
    InterNodeProfileUpdateView, InterNodeHealthCheckView,
    InterNodeTokenVerifyView,
)
from .views import CreateUserAPIView, LogoutUserAPIView, CustomAuthToken, CheckEmailView, UserSelfUpdateView, AuthTokenExchangeView
from .views import StripePaymentIntentView, StripeConfigView
from .views import UserPreferenceLookup, PreferencesOperations
from .views import (
    DrinkOperations,
    UserDrinksLookup,
    UserFavoriteToggleView,
    SeasonalDrinkListView,
    IngredientsListView
)
from .views import InventoryListAPIView, InventoryReportAPIView, InventoryUpdateAPIView
from .views import NotificationOperations, UserNotificationLookup
from .views import OrderOperations, UserOrdersLookup
from .customerAI import Chatbot
from .views import GenerateAIDrink
from .views import RevenueViewSet, NationalRevenueView
from .views import UserOperations
from .views import emailAPI
from .views import (
    PermissionListView, RoleListCreateView, RoleDetailView,
    UserListView, UserCreateView, UserDetailView,
    UserDisableView, UserEnableView, AuditLogListView, AdminKPIView
)
from .views import MachineOperations
from .views import ScheduleOperations
from .views import (
    RegionListView, AdminStoreListCreateView, AdminStoreDetailView,
    AdminSupplyHubListCreateView, AdminSupplyHubDetailView, RegionalStatusView,
    LogisticsStoreListView, LogisticsStoreDetailView, LogisticsCriticalStoresView,
    LogisticsHubStatusView,
    AdminHubInventoryListView, AdminHubInventoryDetailView,
    AdminStoreInventoryListView, AdminStoreInventoryDetailView,
    LogisticsHubInventoryListView, LogisticsStoreInventoryListView,
    ManagerInventoryListView,
    LogisticsSupplyRequestListView, LogisticsSupplyRequestDetailView,
    ManagerSupplyRequestListCreateView, ManagerSupplyRequestDetailView,
    AdminSupplyRequestListView,
    LogisticsDeliveryListCreateView, LogisticsDeliveryDetailView,
    LogisticsDeliveryKPIView, LogisticsDriverListView
)

#this ensures that the url calls the right function from the views for each type of request
preferences_list = PreferencesOperations.as_view({
    'get': 'list',
    'post': 'create'
})
#same as above ^
preferences_detail = PreferencesOperations.as_view({
    'get': 'retrieve',
    'put': 'update',
    'delete': 'destroy'
})

drink_list = DrinkOperations.as_view({
    'get': 'list',
    'post': 'create'
})

drink_detail = DrinkOperations.as_view({
    'get': 'retrieve',
    'put': 'update',
    'delete': 'destroy'
})

notification_list = NotificationOperations.as_view({
    'get': 'list',
    'post': 'create'
})

notification_detail = NotificationOperations.as_view({
    'get': 'retrieve',
    'put': 'update',
    'delete': 'destroy'
})

notification_filter_by_time = NotificationOperations.as_view({'get': 'filter_by_time'})

order_list = OrderOperations.as_view({
    'get': 'list',
    'post': 'create'
})

order_detail = OrderOperations.as_view({
    'get': 'retrieve',
    'put': 'update',
    'delete': 'destroy'
})

revenue_list = RevenueViewSet.as_view({'get': 'list', 'post': 'create'})

revenue_details = RevenueViewSet.as_view({'get': 'retrieve', 'put': 'update', 'delete': 'destroy'})

machine_list = MachineOperations.as_view({'get': 'list', 'post': 'create'})

machine_detail = MachineOperations.as_view({'get': 'retrieve', 'put': 'update', 'delete': 'destroy'})

machine_update_status = MachineOperations.as_view({'patch': 'update_status'})

get_schedules = ScheduleOperations.as_view({'get': 'get_user_schedules'})

schedule_list = ScheduleOperations.as_view({'get': 'list', 'post': 'create'})

schedule_detail = ScheduleOperations.as_view({'get': 'retrieve', 'put': 'update', 'delete': 'destroy'})

user_operations = UserOperations.as_view({
    'get': 'get',
    'post': 'edit',
    'delete': 'delete',
})


urlpatterns = [
    # Authentication related URLs
    # Endpoint for user login
    # - POST: Authenticates a user and returns an auth token.
    path('auth/login/', CustomAuthToken.as_view(), name='auth_user_login'),

    # Endpoint for user registration
    # - POST: Registers a new user and returns the user details.
    path('auth/register/', CreateUserAPIView.as_view(), name='auth_user_create'),

    # Endpoint for user logout
    # - POST: Logs out the user by invalidating the auth token.
    path('auth/logout/', LogoutUserAPIView.as_view(), name='auth_user_logout'),

    # Endpoint for token exchange (cross-store switching)
    # - POST: Exchanges a home-store token for a visiting shadow token at a new store
    path('auth/exchange/', AuthTokenExchangeView.as_view(), name='auth_token_exchange'),

    # Endpoint to check if email exists
    # - POST: Checks if an email is already registered.
    path('auth/check-email/', CheckEmailView.as_view(), name='auth_check_email'),

    # Preference-related URLs
    # Endpoint to list all preferences or create a new preference
    # - GET: Retrieve a list of all preferences.
    # - POST: Create a new preference. Requires authentication and preference details in the request body.
    path('preferences/', preferences_list, name='preference_list_create'),  # List and create preferences

    # Endpoint to retrieve, update, or delete a specific preference by its primary key (ID)
    # - GET: Retrieve details of a specific preference.
    # - PUT: Update the specific preference.
    # - DELETE: Remove the specific preference from the database.
    path('preferences/<int:pk>/', preferences_detail, name='preference_detail'),  # Retrieve, update, or delete a preference

    # Retrieve preferences by UserID
    # Endpoint to list all preferences for a specific user identified by their user ID.
    # - GET: Retrieve a list of preferences for the specified user.
    path('users/<int:user_id>/preferences/', UserPreferenceLookup.as_view(), name='user_preferences_list'),

    # Drink URLs
    # Endpoint to list all drinks or create a new drink
    # - GET: Retrieve a list of drinks that are not user-created.
    # - POST: Create a new drink. Requires authentication and drink details in the request body.
    path('drinks/', drink_list, name='drink list and create'),

    # Endpoint to retrieve, update, or delete a specific drink by its primary key (ID)
    # - GET: Retrieve details of a specific drink.
    # - PUT: Update the specific drink.
    # - DELETE: Remove the specific drink from the database.
    path('drinks/<int:pk>/', drink_detail, name='drink operations'),

    # Retrieve Drinks by UserID
    path('users/<int:user_id>/drinks/', UserDrinksLookup.as_view(), name='user drink list'),

    # Toggle favorite for a drink (int for home users, UUID for visiting users)
    path('users/<int:user_id>/favorites/<str:drink_id>/', UserFavoriteToggleView.as_view(), name='user_favorite_toggle'),

    # Seasonal Drinks
    # - GET: Retrieve all active seasonal drinks for the carousel
    path('seasonal-drinks/', SeasonalDrinkListView.as_view(), name='seasonal_drinks_list'),

    # Ingredients
    # - GET: Retrieve all ingredient names grouped by type (sodas, syrups, add_ins)
    path('ingredients/', IngredientsListView.as_view(), name='ingredients_list'),

    #inventory related URLs
    # Endpoint to list all drinks created by a specific user identified by their user ID.
    # - GET: Retrieve a list of drinks for the specified user.
    path('users/<int:user_id>/drinks/', UserDrinksLookup.as_view(), name='user_preferences_list'),

    # Stripe payment
    path('create-payment-intent/', StripePaymentIntentView.as_view(), name='create-payment-intent'),
    path('config/stripe/', StripeConfigView.as_view(), name='stripe-config'),

    # Inventory URLs
    # Endpoint to list all inventory items
    # - GET: Retrieve a list of all inventory items.
    # - POST: Create a new inventory item. Requires authentication and item details.
    path('inventory/', InventoryListAPIView.as_view(), name='inventory_list'),

    # Endpoint to generate an inventory report
    # - GET: Retrieve an inventory report.
    path('inventory/report/', InventoryReportAPIView.as_view(), name='inventory_report'),

    # Endpoint to retrieve, update, or delete a specific inventory item by its primary key (ID)
    # - GET: Retrieve details of a specific inventory item.
    # - PATCH: Update the quantity of the specific inventory item.
    # - DELETE: Remove the specific inventory item from the database.
    path('inventory/<int:pk>/', InventoryUpdateAPIView.as_view(), name='inventory_update'),

    # Notification related URLs
    path('notifications/', notification_list, name='notification list and create'),
    path('notifications/<int:pk>/', notification_detail, name='notification operations'),

    # Retrieve notifications by UserID
    path('users/<int:user_id>/notifications/', UserNotificationLookup.as_view(), name='user notifications list'),
    
     # Custom time-based notification filter
     # The request should have a start and end time specified in the params as follows
     # /backend/notifications/filter_by_time/?start=<start time in ISO 8601 format>&end=<end time in ISO 8601 format>
     # the date should be in ISO 8601 format
    path('notifications/filter_by_time/', notification_filter_by_time, name='notification filter by time'),

    #Order URLs

    # Endpoint to list all orders or create a new order.
    # - GET: Retrieve a list of all orders.
    # - POST: Create a new order. Requires authentication and order details in the request body.
    path('orders/', order_list, name='order_list_create'),

    # Endpoint to retrieve, update, or delete a specific order by its primary key (ID).
    # - GET: Retrieve details of a specific order.
    # - PATCH: Update the specific order (e.g., adding drinks).
    # - DELETE: Remove the specific order from the database.
    path('orders/<int:pk>/', order_detail, name='order_detail'),

    # Retrieve Orders by UserID

    # Endpoint to list all orders for a specific user identified by their user ID.
    # - GET: Retrieve a list of orders for the specified user.
    # - POST: Create a new order for the specified user. Requires authentication and order details.
    path('users/<int:user_id>/orders/', UserOrdersLookup.as_view(), name='user_orders_list_create'),

    # Endpoint to retrieve a specific order by its ID for a specific user.
    # - GET: Retrieve details of a specific order belonging to the specified user.
    # - DELETE: Remove the specific order from the database for the specified user.
    path('users/<int:user_id>/orders/<int:pk>/', order_detail, name='user_order_detail'),

    # Customer Service Chatbot
    # - POST: Send the User response and get back what the chatbot says
    path('chatbot/', Chatbot.as_view(), name='chatbot'),
    # Endpoint to call the drinkAI when the generate drink button is clicked
    # One for account users and one for general users
    # - GET: Retrive generated-drink information the AI sends back
    # For account users: expects a user_id to be provided
    path('generate/<int:user_id>/', GenerateAIDrink.as_view(), name='account_ai_drink'),
    
    # For general users: no user_id provided
    path('generate/', GenerateAIDrink.as_view(), name='general_ai_drink'),

    # Revenue related URLs
    # Endpoint to list all revenues or create a new revenue.
    # - GET: Retrieve a list of all revenues.
    # - POST: Create a new revenue. Requires authentication and revenue details in the request body.
    path('revenues/', revenue_list, name='revenue_list_create'),
    path('revenues/national/', NationalRevenueView.as_view(), name='revenue_national'),

    # Endpoint to retrieve, update, or delete a specific revenue by its primary key (ID).
    # - GET: Retrieve details of a specific revenue.
    # - PUT: Update the specific revenue.
    # - DELETE: Remove the specific revenue from the database.
    path('revenues/<int:pk>/', revenue_details, name='revenue_detail'),

    # Machine related URLs
    # Endpoint to list all machines or create a new machine
    # - GET: Retrieve a list of all machines
    # - POST: Create a new machine. Requires authentication and machine details in the request body.
    path('machines/', machine_list, name='machine_list_create'),

    # Endpoint to retrieve, update, or delete a specific machine by its primary key (ID).
    # - GET: Retrieve details of a specific machine.
    # - PUT: Update the specific machine.
    # - DELETE: Remove the specific machine from the database.
    path('machines/<int:pk>/', machine_detail, name='machine_detail'),

    # - PATCH: Updates a machines status
    path('machines/<int:pk>/update-status/', machine_update_status, name='machine_update_status'),

    # Schedule related URLs
    # Endpoint to list all schedules or create a new schedule
    # - GET: Retrieve a list of all schedules
    # - POST: Create a new schedule. Requires authentication and machine details in the request body.
    path('schedules/', schedule_list, name='schedule_list_create'),

    # Endpoint to retrieve, update, or delete a specific schedule by its primary key (ID).
    # - GET: Retrieve details of a specific schedule.
    # - PUT: Update the specific schedule.
    # - DELETE: Remove the specific schedule from the database.
    path('schedules/<int:pk>/', schedule_detail, name='schedule_detail'),

    # - GET: Returns the schedules associated with a user
    path('schedules/get_user_schedules/', get_schedules, name='get_schedules'),

    # Self-service user profile endpoint
    # - GET: Retrieve current user profile (username, email, first_name)
    # - POST: Update current user's username or password
    path('users/me/', UserSelfUpdateView.as_view(), name='user_self_update'),

    # Endpoint to do operations on user accounts for the Admin Dashboard
    # - GET: Retrieve a list of all users
    # - DELETE: Delete a user from the database
    # - PUT: Edit a user and update info in the database
    path('users/', user_operations, name='get_user_list'),
    path('users/delete/<int:user_id>/', user_operations, name='delete_user'),
    path('users/edit/<int:user_id>/', user_operations, name='edit_user'),

    path('email/<int:orderId>/', emailAPI.as_view(), name='Create Email'),

    # Admin Dashboard endpoints
    # Permissions
    path('api/admin/permissions/', PermissionListView.as_view(), name='admin_permissions_list'),

    # Roles
    path('api/admin/roles/', RoleListCreateView.as_view(), name='admin_roles_list_create'),
    path('api/admin/roles/<int:pk>/', RoleDetailView.as_view(), name='admin_role_detail'),

    # Users (admin dashboard)
    path('api/admin/users/', UserListView.as_view(), name='admin_users_list'),
    path('api/admin/users/create/', UserCreateView.as_view(), name='admin_user_create'),
    path('api/admin/users/<int:pk>/', UserDetailView.as_view(), name='admin_user_detail'),
    path('api/admin/users/<int:pk>/disable/', UserDisableView.as_view(), name='admin_user_disable'),
    path('api/admin/users/<int:pk>/enable/', UserEnableView.as_view(), name='admin_user_enable'),

    # Audit Logs
    path('api/admin/audit-logs/', AuditLogListView.as_view(), name='admin_audit_logs'),

    # KPIs
    path('api/admin/kpi/', AdminKPIView.as_view(), name='admin_kpi'),

    # Regions
    path('api/regions/', RegionListView.as_view(), name='region_list'),

    # Super Admin — Stores
    path('api/admin/stores/', AdminStoreListCreateView.as_view(), name='admin_stores_list_create'),
    path('api/admin/stores/<int:pk>/', AdminStoreDetailView.as_view(), name='admin_store_detail'),

    # Super Admin — Supply Hubs
    path('api/admin/hubs/', AdminSupplyHubListCreateView.as_view(), name='admin_hubs_list_create'),
    path('api/admin/hubs/<int:pk>/', AdminSupplyHubDetailView.as_view(), name='admin_hub_detail'),

    # Super Admin — Regional Status
    path('api/admin/regional-status/', RegionalStatusView.as_view(), name='admin_regional_status'),

    # Super Admin — Hub Inventory
    path('api/admin/hubs/<int:hub_pk>/inventory/', AdminHubInventoryListView.as_view(), name='admin_hub_inventory_list'),
    path('api/admin/hubs/<int:hub_pk>/inventory/<int:pk>/', AdminHubInventoryDetailView.as_view(), name='admin_hub_inventory_detail'),

    # Super Admin — Store Inventory
    path('api/admin/stores/<int:store_pk>/inventory/', AdminStoreInventoryListView.as_view(), name='admin_store_inventory_list'),
    path('api/admin/stores/<int:store_pk>/inventory/<int:pk>/', AdminStoreInventoryDetailView.as_view(), name='admin_store_inventory_detail'),

    # Logistics — Stores (critical endpoint must come before <int:pk>)
    path('api/logistics/stores/critical/', LogisticsCriticalStoresView.as_view(), name='logistics_critical_stores'),
    path('api/logistics/stores/', LogisticsStoreListView.as_view(), name='logistics_stores_list'),
    path('api/logistics/stores/<int:pk>/', LogisticsStoreDetailView.as_view(), name='logistics_store_detail'),

    # Logistics — Hub Status
    path('api/logistics/hub-status/', LogisticsHubStatusView.as_view(), name='logistics_hub_status'),

    # Logistics — Hub Inventory
    path('api/logistics/hubs/<int:hub_pk>/inventory/', LogisticsHubInventoryListView.as_view(), name='logistics_hub_inventory_list'),

    # Logistics — Store Inventory
    path('api/logistics/stores/<int:store_pk>/inventory/', LogisticsStoreInventoryListView.as_view(), name='logistics_store_inventory_list'),

    # Manager — Inventory
    path('api/manager/inventory/', ManagerInventoryListView.as_view(), name='manager_inventory_list'),

    # Logistics — Supply Requests
    path('api/logistics/supply-requests/', LogisticsSupplyRequestListView.as_view(), name='logistics_supply_request_list'),
    path('api/logistics/supply-requests/<int:pk>/', LogisticsSupplyRequestDetailView.as_view(), name='logistics_supply_request_detail'),

    # Manager — Supply Requests
    path('api/manager/supply-requests/', ManagerSupplyRequestListCreateView.as_view(), name='manager_supply_request_list'),
    path('api/manager/supply-requests/<int:pk>/', ManagerSupplyRequestDetailView.as_view(), name='manager_supply_request_detail'),

    # Admin — Supply Requests
    path('api/admin/supply-requests/', AdminSupplyRequestListView.as_view(), name='admin_supply_request_list'),

    # Logistics — Deliveries
    # NOTE: kpi/ MUST come before <int:pk>/ or Django will try to match "kpi" as an integer ID
    path('api/logistics/deliveries/kpi/', LogisticsDeliveryKPIView.as_view(), name='logistics_deliveries_kpi'),
    path('api/logistics/deliveries/', LogisticsDeliveryListCreateView.as_view(), name='logistics_deliveries_list_create'),
    path('api/logistics/deliveries/<int:pk>/', LogisticsDeliveryDetailView.as_view(), name='logistics_delivery_detail'),

    # Logistics — Drivers
    path('api/logistics/drivers/', LogisticsDriverListView.as_view(), name='logistics_drivers_list'),

    # Hub endpoints (only meaningful when IS_HUB=True, but available on all nodes)
    path('api/hub/register/',       HubRegisterView.as_view(),       name='hub_register'),
    path('api/hub/heartbeat/',      HubHeartbeatView.as_view(),      name='hub_heartbeat'),
    path('api/hub/user-lookup/',    HubUserLookupView.as_view(),     name='hub_user_lookup'),
    path('api/hub/user-broadcast/', HubUserBroadcastView.as_view(),  name='hub_user_broadcast'),
    path('api/hub/store-registry/', HubStoreRegistryView.as_view(),  name='hub_store_registry'),
    path('api/hub/revenue/',        HubRevenueView.as_view(),        name='hub_revenue'),

    # Inter-node endpoints (store-to-store and hub-to-store communication)
    path('api/inter-node/user-exists/',    InterNodeUserExistsView.as_view(),    name='internode_user_exists'),
    path('api/inter-node/user-sync/',      InterNodeUserSyncView.as_view(),      name='internode_user_sync'),
    path('api/inter-node/profile-update/', InterNodeProfileUpdateView.as_view(), name='internode_profile_update'),
    path('api/inter-node/token-verify/',   InterNodeTokenVerifyView.as_view(),   name='internode_token_verify'),
    path('api/inter-node/health-check/',   InterNodeHealthCheckView.as_view(),   name='internode_health_check'),
]
