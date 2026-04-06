from django.contrib import admin
from django import forms
from .models import (
    # Existing models
    Preference, Drink, Inventory, Notification, Order, Revenue,
    # Distributed system models
    Region, StoreRegistry, SupplyHub, VisitingUserCache, PendingProfileUpdate,
    SyncAuditLog, SupplyRequest, Machine, Schedule, Delivery,
    RepairStaffProfile, LogisticsManagerProfile,
    # Inventory models
    HubInventoryItem, StoreInventoryItem,
    # Seasonal drinks
    SeasonalDrink,
)

admin.site.register(Preference)
admin.site.register(Drink)
admin.site.register(Inventory)
admin.site.register(Notification)
admin.site.register(Order)
admin.site.register(Revenue)
admin.site.register(Region)


class SeasonalDrinkAdminForm(forms.ModelForm):
    """Custom form for SeasonalDrink with ingredient validation."""

    class Meta:
        model = SeasonalDrink
        fields = '__all__'

    def clean_soda(self):
        soda = self.cleaned_data.get('soda', '').strip()
        if soda:
            valid_sodas = set(Inventory.objects.filter(ItemType='Soda').values_list('ItemName', flat=True))
            if soda not in valid_sodas:
                valid_list = ', '.join(sorted(valid_sodas))
                raise forms.ValidationError(
                    f'Invalid soda "{soda}". Valid options: {valid_list}'
                )
        return soda

    def clean_syrups(self):
        syrups = self.cleaned_data.get('syrups', [])
        if syrups:
            valid_syrups = set(Inventory.objects.filter(ItemType='Syrup').values_list('ItemName', flat=True))
            invalid = [s for s in syrups if s not in valid_syrups]
            if invalid:
                valid_list = ', '.join(sorted(valid_syrups))
                raise forms.ValidationError(
                    f'Invalid syrups: {", ".join(invalid)}. Valid options: {valid_list}'
                )
        return syrups

    def clean_add_ins(self):
        add_ins = self.cleaned_data.get('add_ins', [])
        if add_ins:
            valid_add_ins = set(Inventory.objects.filter(ItemType='Add In').values_list('ItemName', flat=True))
            invalid = [a for a in add_ins if a not in valid_add_ins]
            if invalid:
                valid_list = ', '.join(sorted(valid_add_ins))
                raise forms.ValidationError(
                    f'Invalid add-ins: {", ".join(invalid)}. Valid options: {valid_list}'
                )
        return add_ins


@admin.register(SeasonalDrink)
class SeasonalDrinkAdmin(admin.ModelAdmin):
    form = SeasonalDrinkAdminForm
    list_display  = ('name', 'season', 'price', 'is_active')
    list_filter   = ('season', 'is_active')
    list_editable = ('is_active',)
    search_fields = ('name',)

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
    list_display = ('id', 'store', 'status', 'urgency', 'created_at')
    list_filter  = ('status', 'urgency')

@admin.register(Delivery)
class DeliveryAdmin(admin.ModelAdmin):
    list_display  = ('id', 'hub', 'driver', 'status', 'delivery_date', 'eta', 'created_at')
    list_filter   = ('status', 'hub')
    filter_horizontal = ('stores',)

@admin.register(Machine)
class MachineAdmin(admin.ModelAdmin):
    list_display = ('machine_id', 'name', 'status', 'last_status_change')
    list_filter  = ('status',)

admin.site.register(Schedule)
admin.site.register(RepairStaffProfile)
admin.site.register(LogisticsManagerProfile)
admin.site.register(HubInventoryItem)
admin.site.register(StoreInventoryItem)
