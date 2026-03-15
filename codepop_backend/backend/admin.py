from django.contrib import admin
from .models import (
    Preference, Drink, Inventory, Notification, Order, Revenue,
    StoreNode, UserLocationCache, VisitingSession, EventQueue, SyncLog,
    Region, SupplyHub, Machine, Schedule, SupplyRequest,
    RepairStaffProfile, LogisticsManagerProfile
)

# Original Sprint 1-2 models
admin.site.register(Preference)
admin.site.register(Drink)
admin.site.register(Inventory)
admin.site.register(Notification)
admin.site.register(Order)
admin.site.register(Revenue)

# Distributed infrastructure models
admin.site.register(StoreNode)
admin.site.register(UserLocationCache)
admin.site.register(VisitingSession)
admin.site.register(EventQueue)
admin.site.register(SyncLog)

# Feature models
admin.site.register(Region)
admin.site.register(SupplyHub)
admin.site.register(Machine)
admin.site.register(Schedule)
admin.site.register(SupplyRequest)

# Staff role models
admin.site.register(RepairStaffProfile)
admin.site.register(LogisticsManagerProfile)
