from django.contrib import admin
from .models import (
    Preference, Drink, Inventory, Notification, Order, Revenue,
    StoreRegistry, HubRegistry, NodeCertificate, UserCache, SyncRecord, EventQueue, SupplyRequest,
    Region, SupplyHub, Machine, Schedule,
    RepairStaffProfile, LogisticsManagerProfile
)

# Original models
admin.site.register(Preference)
admin.site.register(Drink)
admin.site.register(Inventory)
admin.site.register(Notification)
admin.site.register(Order)
admin.site.register(Revenue)

# Distributed system models
admin.site.register(StoreRegistry)
admin.site.register(HubRegistry)
admin.site.register(NodeCertificate)
admin.site.register(UserCache)
admin.site.register(SyncRecord)
admin.site.register(EventQueue)
admin.site.register(SupplyRequest)

# Feature models
admin.site.register(Region)
admin.site.register(SupplyHub)
admin.site.register(Machine)
admin.site.register(Schedule)

# Staff role models
admin.site.register(RepairStaffProfile)
admin.site.register(LogisticsManagerProfile)
