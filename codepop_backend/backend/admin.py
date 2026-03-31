from django.contrib import admin
from .models import (
    # Existing models
    Preference, Drink, Inventory, Notification, Order, Revenue,
    # Distributed system models
    Region, StoreRegistry, SupplyHub, VisitingUserCache, PendingProfileUpdate,
    SyncAuditLog, SupplyRequest, Machine, Schedule,
    RepairStaffProfile, LogisticsManagerProfile,
    # Inventory models
    HubInventoryItem, StoreInventoryItem,
)

admin.site.register(Preference)
admin.site.register(Drink)
admin.site.register(Inventory)
admin.site.register(Notification)
admin.site.register(Order)
admin.site.register(Revenue)
admin.site.register(Region)

@admin.register(StoreRegistry)
class StoreRegistryAdmin(admin.ModelAdmin):
    list_display = ('store_id', 'store_name', 'region', 'status', 'last_heartbeat', 'machine_count')
    list_filter  = ('status', 'region')

@admin.register(SupplyHub)
class SupplyHubAdmin(admin.ModelAdmin):
    list_display = ('name', 'region', 'inventory_pct', 'active_deliveries_count', 'pending_orders_count')
    list_filter  = ('region',)

@admin.register(VisitingUserCache)
class VisitingUserCacheAdmin(admin.ModelAdmin):
    list_display  = ('username', 'email', 'home_store_id', 'cached_at', 'expires_at')
    list_filter   = ('home_store_id',)
    search_fields = ('email', 'username')

@admin.register(PendingProfileUpdate)
class PendingProfileUpdateAdmin(admin.ModelAdmin):
    list_display = ('user_id', 'home_store_id', 'status', 'retry_count',
                    'created_at', 'next_retry_at')
    list_filter  = ('status',)

@admin.register(SyncAuditLog)
class SyncAuditLogAdmin(admin.ModelAdmin):
    list_display    = ('timestamp', 'event_type', 'requesting_node', 'success', 'user_email')
    list_filter     = ('event_type', 'success')
    search_fields   = ('requesting_node', 'user_email')
    readonly_fields = ('timestamp',)  # audit logs are immutable

@admin.register(SupplyRequest)
class SupplyRequestAdmin(admin.ModelAdmin):
    list_display = ('store_id', 'item_name', 'quantity', 'status', 'created_at')
    list_filter  = ('status', 'region')

@admin.register(Machine)
class MachineAdmin(admin.ModelAdmin):
    list_display = ('machine_id', 'name', 'status', 'last_status_change')
    list_filter  = ('status',)

admin.site.register(Schedule)
admin.site.register(RepairStaffProfile)
admin.site.register(LogisticsManagerProfile)
admin.site.register(HubInventoryItem)
admin.site.register(StoreInventoryItem)
