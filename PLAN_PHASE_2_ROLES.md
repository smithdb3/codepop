# Phase 2: Role System & Permissions (Weeks 5-6)

**Project**: CodePop P2P Distributed System
**Phase Duration**: 2 weeks
**Team Size**: 5 developers
**Dependencies**: Phase 0 (P2P Infrastructure), Phase 1 (Multi-Store Data Model)

---

## Phase Overview

Implement the complete role-based access control (RBAC) system to support nationwide operations with multiple user types. This phase creates three new specialized roles (`logistics_manager`, `repair_staff`, `super_admin`) and updates existing roles (`manager`, `admin`) to work with the multi-store architecture.

### Goals
- ✅ Create role models with store/region scope
- ✅ Implement permission system and middleware
- ✅ Build role assignment APIs
- ✅ Create logistics manager dashboard (web + mobile)
- ✅ Create repair staff dashboard (web + mobile)
- ✅ Update existing manager/admin dashboards for multi-store
- ✅ Implement cross-store permission propagation

### User Roles Summary

| Role | Scope | Access Level | Primary Function |
|------|-------|--------------|------------------|
| **Account User** | Global | Own data only | Order drinks, manage preferences |
| **General User** | Global | Guest access | One-time orders without account |
| **Manager** | Single Store | Store data | Manage inventory, orders, revenue for assigned store |
| **Admin** | Single Store | Store + users | User management, system settings for assigned store |
| **Logistics Manager** | Region + Hub | Regional stores | Supply coordination, delivery routing, inventory forecasting |
| **Repair Staff** | Region | Regional stores | Machine maintenance, repair scheduling, status tracking |
| **Super Admin** | System-wide | All data | User role assignment, system configuration, cross-region access |

---

## Task 2.1: Role Models & Permission System ✅

**Status**: COMPLETED IN MAIN PLAN.md
See main PLAN.md for:
- UserRole model implementation
- Permission helper functions (IsStoreManager, IsLogisticsManager, etc.)
- Role assignment API
- Serializers

---

## Task 2.2: Update Existing Dashboards ✅

**Status**: COMPLETED IN MAIN PLAN.md
See main PLAN.md for:
- Updated Manager Dashboard with store scope
- Updated Admin Dashboard with multi-store support

---

## Task 2.3: Logistics Manager Dashboard - Backend

**Priority**: MUST HAVE (M)
**Estimated Effort**: 3-4 days
**Assigned To**: Backend Developer 1 + Frontend Developer 1

### Requirements
Logistics managers need a comprehensive dashboard to:
- View all stores in their assigned region
- Monitor supply levels across stores
- Approve/deny supply requests
- Coordinate deliveries between hubs and stores
- View usage trends and forecasts

---

### Test Specifications (Write First!)

Create `backend/tests/test_logistics_dashboard.py`:
```python
class LogisticsManagerDashboardTests(TestCase):
    def setUp(self):
        """Set up test data"""
        # Create Region C
        self.region = Region.objects.create(
            region_code='C',
            name='Logan, UT',
            center_latitude=41.7370,
            center_longitude=-111.8338
        )

        # Create supply hub
        self.hub = SupplyHub.objects.create(
            region=self.region,
            name='Logan UT Supply Hub',
            # ... other fields
        )

        # Create 5 stores in region
        self.stores = [
            Store.objects.create(
                store_number=f'LOGAN-00{i}',
                name=f'Logan Store {i}',
                region=self.region,
                supply_hub=self.hub,
                # ... other fields
            )
            for i in range(1, 6)
        ]

        # Create logistics manager user
        self.logistics_user = User.objects.create_user(
            username='logistics1',
            password='test123'
        )

        # Assign logistics_manager role
        self.role = UserRole.objects.create(
            user=self.logistics_user,
            role_type='LOGISTICS_MANAGER',
            region=self.region,
            supply_hub=self.hub
        )

        self.client.force_authenticate(user=self.logistics_user)

    def test_logistics_manager_can_view_dashboard(self):
        """Test logistics manager can access their region dashboard"""
        response = self.client.get(f'/backend/logistics/regions/C/dashboard/')
        self.assertEqual(response.status_code, 200)

    def test_logistics_manager_sees_only_assigned_region(self):
        """Test logistics manager only sees stores in their region"""
        # Create store in different region
        other_region = Region.objects.create(region_code='D', name='Dallas, TX')
        other_store = Store.objects.create(
            store_number='DALLAS-001',
            region=other_region,
            # ...
        )

        response = self.client.get(f'/backend/logistics/regions/C/dashboard/')
        store_ids = [s['store_id'] for s in response.data['stores']]

        # Should include Region C stores
        for store in self.stores:
            self.assertIn(str(store.store_id), store_ids)

        # Should NOT include other region store
        self.assertNotIn(str(other_store.store_id), store_ids)

    def test_logistics_manager_cannot_access_other_region(self):
        """Test logistics manager denied access to other regions"""
        response = self.client.get(f'/backend/logistics/regions/D/dashboard/')
        self.assertEqual(response.status_code, 403)

    def test_super_admin_can_access_all_regions(self):
        """Test super admin has access to all region dashboards"""
        super_admin = User.objects.create_user(username='superadmin', password='test')
        UserRole.objects.create(user=super_admin, role_type='SUPER_ADMIN')

        self.client.force_authenticate(user=super_admin)
        response = self.client.get(f'/backend/logistics/regions/C/dashboard/')
        self.assertEqual(response.status_code, 200)

    def test_dashboard_includes_supply_metrics(self):
        """Test dashboard returns supply level metrics"""
        # Create inventory for stores
        for store in self.stores:
            Inventory.objects.create(
                store=store,
                ItemName='Cherry Syrup',
                ItemType='Syrups',
                Quantity=50,
                ThresholdLevel=20
            )

        response = self.client.get(f'/backend/logistics/regions/C/dashboard/')

        self.assertIn('supply_metrics', response.data)
        self.assertIn('low_stock_items', response.data['supply_metrics'])
        self.assertIn('total_inventory_value', response.data['supply_metrics'])

    def test_dashboard_includes_pending_requests(self):
        """Test dashboard shows pending supply requests"""
        # This will be implemented in Phase 3
        pass

    def test_non_logistics_user_denied_access(self):
        """Test regular users cannot access logistics dashboard"""
        regular_user = User.objects.create_user(username='regular', password='test')
        self.client.force_authenticate(user=regular_user)

        response = self.client.get(f'/backend/logistics/regions/C/dashboard/')
        self.assertEqual(response.status_code, 403)
```

---

### Backend Implementation

**1. Create Logistics Dashboard API** (`backend/views.py`):

```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Sum, Count, Avg, F, Q
from .permissions import IsLogisticsManager, IsSuperAdmin
from .models import Region, Store, Inventory, Order, SupplyRequest

class LogisticsRegionDashboardView(APIView):
    """
    Comprehensive dashboard for logistics managers
    Shows all data for their assigned region
    """
    permission_classes = [IsAuthenticated, IsLogisticsManager | IsSuperAdmin]

    def get(self, request, region_code):
        """
        GET /backend/logistics/regions/<region_code>/dashboard/

        Returns comprehensive logistics data for the region
        """
        try:
            region = Region.objects.get(region_code=region_code)
        except Region.DoesNotExist:
            return Response(
                {'error': 'Region not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verify user has access to this region
        if not is_super_admin(request.user):
            has_access = UserRole.objects.filter(
                user=request.user,
                role_type='LOGISTICS_MANAGER',
                region=region,
                is_active=True
            ).exists()

            if not has_access:
                return Response(
                    {'error': 'Access denied to this region'},
                    status=status.HTTP_403_FORBIDDEN
                )

        # Get all stores in region
        stores = Store.objects.filter(region=region)

        # Calculate supply metrics
        supply_metrics = self.calculate_supply_metrics(stores)

        # Get store statuses
        store_statuses = self.get_store_statuses(stores)

        # Get pending supply requests (Phase 3)
        pending_requests = self.get_pending_supply_requests(region)

        # Get recent activity
        recent_activity = self.get_recent_activity(stores)

        # Get usage trends
        usage_trends = self.calculate_usage_trends(stores)

        return Response({
            'region': RegionSerializer(region).data,
            'supply_hub': SupplyHubSerializer(region.supply_hub).data,
            'stores': StoreSerializer(stores, many=True).data,
            'store_count': stores.count(),
            'supply_metrics': supply_metrics,
            'store_statuses': store_statuses,
            'pending_requests': pending_requests,
            'recent_activity': recent_activity,
            'usage_trends': usage_trends,
        })

    def calculate_supply_metrics(self, stores):
        """Calculate aggregate supply metrics across stores"""
        all_inventory = Inventory.objects.filter(store__in=stores)

        # Low stock items (below threshold)
        low_stock = all_inventory.filter(
            Quantity__lte=F('ThresholdLevel')
        )

        # Out of stock items
        out_of_stock = all_inventory.filter(Quantity=0)

        # Calculate total inventory value (assuming $10 per unit)
        total_value = all_inventory.aggregate(
            total=Sum(F('Quantity') * 10)
        )['total'] or 0

        # Group by item type
        by_type = all_inventory.values('ItemType').annotate(
            total_items=Count('id'),
            total_quantity=Sum('Quantity'),
            low_stock_count=Count('id', filter=Q(Quantity__lte=F('ThresholdLevel')))
        )

        return {
            'total_items': all_inventory.count(),
            'low_stock_items': low_stock.count(),
            'out_of_stock_items': out_of_stock.count(),
            'total_inventory_value': float(total_value),
            'low_stock_details': InventorySerializer(low_stock, many=True).data,
            'by_type': list(by_type),
        }

    def get_store_statuses(self, stores):
        """Get operational status for each store"""
        statuses = []

        for store in stores:
            # Get store's inventory health
            inventory = Inventory.objects.filter(store=store)
            low_stock = inventory.filter(Quantity__lte=F('ThresholdLevel')).count()

            # Get pending orders
            pending_orders = Order.objects.filter(
                store=store,
                OrderStatus__in=['pending', 'processing']
            ).count()

            # Get machine status (Phase 4)
            machine_status = 'operational'  # Will be implemented in Phase 4

            statuses.append({
                'store_id': str(store.store_id),
                'store_name': store.name,
                'is_operational': store.is_operational,
                'is_accepting_orders': store.is_accepting_orders,
                'inventory_health': 'critical' if low_stock > 5 else 'warning' if low_stock > 0 else 'healthy',
                'low_stock_count': low_stock,
                'pending_orders': pending_orders,
                'machine_status': machine_status,
            })

        return statuses

    def get_pending_supply_requests(self, region):
        """Get pending supply requests for region (Phase 3 feature)"""
        # Placeholder for Phase 3
        return []

    def get_recent_activity(self, stores):
        """Get recent orders and transactions across stores"""
        recent_orders = Order.objects.filter(
            store__in=stores
        ).order_by('-PickupTime')[:20]

        return {
            'recent_orders': OrderSerializer(recent_orders, many=True).data,
        }

    def calculate_usage_trends(self, stores):
        """Calculate inventory usage trends"""
        from django.utils import timezone
        from datetime import timedelta

        # Get last 30 days of data
        thirty_days_ago = timezone.now() - timedelta(days=30)

        # This is a placeholder - real implementation would track inventory changes
        # For now, return empty structure that Phase 3 will populate
        return {
            'daily_usage': [],
            'popular_items': [],
            'seasonal_trends': [],
        }

class LogisticsStoreDetailView(APIView):
    """
    Detailed view of a specific store for logistics managers
    """
    permission_classes = [IsAuthenticated, IsLogisticsManager | IsSuperAdmin]

    def get(self, request, region_code, store_id):
        """
        GET /backend/logistics/regions/<region_code>/stores/<store_id>/

        Returns detailed store information for logistics planning
        """
        try:
            store = Store.objects.get(
                store_id=store_id,
                region__region_code=region_code
            )
        except Store.DoesNotExist:
            return Response(
                {'error': 'Store not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verify access
        if not is_super_admin(request.user):
            has_access = UserRole.objects.filter(
                user=request.user,
                role_type='LOGISTICS_MANAGER',
                region=store.region,
                is_active=True
            ).exists()

            if not has_access:
                return Response(
                    {'error': 'Access denied'},
                    status=status.HTTP_403_FORBIDDEN
                )

        # Get store inventory
        inventory = Inventory.objects.filter(store=store)

        # Get supply request history (Phase 3)
        supply_requests = []  # Placeholder

        # Get delivery schedule (Phase 3)
        delivery_schedule = []  # Placeholder

        return Response({
            'store': StoreSerializer(store).data,
            'inventory': InventorySerializer(inventory, many=True).data,
            'supply_requests': supply_requests,
            'delivery_schedule': delivery_schedule,
        })

class LogisticsRegionListView(APIView):
    """
    List all regions accessible to logistics manager
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        GET /backend/logistics/regions/

        Returns list of regions user can access
        """
        if is_super_admin(request.user):
            regions = Region.objects.all()
        else:
            # Get regions user has logistics_manager role for
            user_regions = UserRole.objects.filter(
                user=request.user,
                role_type='LOGISTICS_MANAGER',
                is_active=True
            ).values_list('region', flat=True)

            regions = Region.objects.filter(region_code__in=user_regions)

        serializer = RegionSerializer(regions, many=True)
        return Response(serializer.data)
```

**2. Add URL Patterns** (`backend/urls.py`):

```python
urlpatterns = [
    # ... existing patterns

    # Logistics Manager Dashboard
    path('logistics/regions/', LogisticsRegionListView.as_view()),
    path('logistics/regions/<str:region_code>/dashboard/', LogisticsRegionDashboardView.as_view()),
    path('logistics/regions/<str:region_code>/stores/<uuid:store_id>/', LogisticsStoreDetailView.as_view()),
]
```

---

### Frontend Implementation

#### Mobile App (React Native)

**1. Create Logistics Dashboard Screen** (`codepop/src/pages/LogisticsDashboard.js`):

```javascript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../ip_address';

export default function LogisticsDashboard({ navigation, route }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [regions, setRegions] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    loadRegions();
  }, []);

  useEffect(() => {
    if (selectedRegion) {
      loadDashboard(selectedRegion);
    }
  }, [selectedRegion]);

  const loadRegions = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');

      const response = await fetch(`${BASE_URL}/backend/logistics/regions/`, {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRegions(data);

        // Auto-select first region
        if (data.length > 0) {
          setSelectedRegion(data[0].region_code);
        }
      }
    } catch (error) {
      console.error('Failed to load regions:', error);
    }
  };

  const loadDashboard = async (regionCode) => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');

      const response = await fetch(
        `${BASE_URL}/backend/logistics/regions/${regionCode}/dashboard/`,
        {
          headers: {
            'Authorization': `Token ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard(selectedRegion);
  };

  if (loading && !dashboardData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#C6C8EE" />
        <Text style={styles.loadingText}>Loading logistics data...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Region Selector */}
      <View style={styles.regionSelector}>
        <Text style={styles.sectionTitle}>Region</Text>
        <View style={styles.regionButtons}>
          {regions.map((region) => (
            <TouchableOpacity
              key={region.region_code}
              style={[
                styles.regionButton,
                selectedRegion === region.region_code && styles.regionButtonActive,
              ]}
              onPress={() => setSelectedRegion(region.region_code)}
            >
              <Text
                style={[
                  styles.regionButtonText,
                  selectedRegion === region.region_code && styles.regionButtonTextActive,
                ]}
              >
                {region.region_code}: {region.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {dashboardData && (
        <>
          {/* Supply Metrics */}
          <View style={styles.metricsCard}>
            <Text style={styles.cardTitle}>Supply Overview</Text>
            <View style={styles.metricsGrid}>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>
                  {dashboardData.store_count}
                </Text>
                <Text style={styles.metricLabel}>Stores</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>
                  {dashboardData.supply_metrics.total_items}
                </Text>
                <Text style={styles.metricLabel}>Total Items</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={[styles.metricValue, styles.warningText]}>
                  {dashboardData.supply_metrics.low_stock_items}
                </Text>
                <Text style={styles.metricLabel}>Low Stock</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={[styles.metricValue, styles.errorText]}>
                  {dashboardData.supply_metrics.out_of_stock_items}
                </Text>
                <Text style={styles.metricLabel}>Out of Stock</Text>
              </View>
            </View>
          </View>

          {/* Store Statuses */}
          <View style={styles.storesCard}>
            <Text style={styles.cardTitle}>Store Status</Text>
            {dashboardData.store_statuses.map((store) => (
              <TouchableOpacity
                key={store.store_id}
                style={styles.storeItem}
                onPress={() =>
                  navigation.navigate('LogisticsStoreDetail', {
                    regionCode: selectedRegion,
                    storeId: store.store_id,
                  })
                }
              >
                <View style={styles.storeHeader}>
                  <Text style={styles.storeName}>{store.store_name}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getHealthColor(store.inventory_health) },
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {store.inventory_health.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <View style={styles.storeMetrics}>
                  <Text style={styles.storeMetricText}>
                    🔴 Low Stock: {store.low_stock_count}
                  </Text>
                  <Text style={styles.storeMetricText}>
                    📦 Pending Orders: {store.pending_orders}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Low Stock Items */}
          {dashboardData.supply_metrics.low_stock_details.length > 0 && (
            <View style={styles.lowStockCard}>
              <Text style={styles.cardTitle}>⚠️ Low Stock Items</Text>
              {dashboardData.supply_metrics.low_stock_details.map((item) => (
                <View key={item.id} style={styles.lowStockItem}>
                  <Text style={styles.itemName}>{item.ItemName}</Text>
                  <Text style={styles.itemQuantity}>
                    {item.Quantity} / {item.ThresholdLevel}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

function getHealthColor(health) {
  switch (health) {
    case 'healthy':
      return '#8df1d3';
    case 'warning':
      return '#FFA686';
    case 'critical':
      return '#D30C7B';
    default:
      return '#C6C8EE';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  regionSelector: {
    padding: 15,
    backgroundColor: '#f5f5f5',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  regionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  regionButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#C6C8EE',
  },
  regionButtonActive: {
    backgroundColor: '#C6C8EE',
  },
  regionButtonText: {
    color: '#666',
  },
  regionButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  metricsCard: {
    margin: 15,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricItem: {
    width: '48%',
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  warningText: {
    color: '#FFA686',
  },
  errorText: {
    color: '#D30C7B',
  },
  storesCard: {
    margin: 15,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  storeItem: {
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 10,
  },
  storeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  storeName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  storeMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  storeMetricText: {
    fontSize: 12,
    color: '#666',
  },
  lowStockCard: {
    margin: 15,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lowStockItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#D30C7B',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
  },
  itemQuantity: {
    fontSize: 14,
    color: '#D30C7B',
    fontWeight: 'bold',
  },
});
```

**2. Add Screen to Navigation** (`codepop/App.js`):

```javascript
// Add import
import LogisticsDashboard from './src/pages/LogisticsDashboard';

// Add to Stack.Navigator
<Stack.Screen
  name="LogisticsDash"
  component={LogisticsDashboard}
  options={{ title: 'Logistics Dashboard' }}
/>
```

**3. Update Role-Based Navigation** (`codepop/src/pages/AuthPage.js`):

```javascript
// After successful login, check role and navigate appropriately
const userRole = await AsyncStorage.getItem('userRole');

if (userRole === 'super_admin') {
  navigation.navigate('AdminDash');
} else if (userRole === 'logistics_manager') {
  navigation.navigate('LogisticsDash');
} else if (userRole === 'repair_staff') {
  navigation.navigate('RepairDash');
} else if (userRole === 'staff' || userRole === 'admin') {
  navigation.navigate('ManagerDash');
} else {
  navigation.navigate('Home');
}
```

---

### Testing Strategy

**Backend Tests**:
```bash
python manage.py test backend.tests.test_logistics_dashboard
```

**Manual Testing**:
- [ ] Create logistics_manager user for Region C
- [ ] Log in and verify dashboard loads
- [ ] Check metrics display correctly
- [ ] Verify store list shows only Region C stores
- [ ] Test access denied for other regions
- [ ] Test super_admin can access all regions
- [ ] Verify refresh updates data
- [ ] Test navigation to store detail

**Mobile App Testing**:
- [ ] Install app and log in as logistics_manager
- [ ] Verify LogisticsDash screen appears
- [ ] Test region selector
- [ ] Test pull-to-refresh
- [ ] Verify metrics display correctly
- [ ] Test store status color coding
- [ ] Test navigation to store detail

---

### Documentation Required

**Create `docs/LOGISTICS_DASHBOARD.md`**:
```markdown
# Logistics Manager Dashboard

## Overview
The logistics dashboard provides regional supply oversight for logistics managers.

## API Endpoints

### List Accessible Regions
GET /backend/logistics/regions/

### Region Dashboard
GET /backend/logistics/regions/<region_code>/dashboard/

### Store Detail
GET /backend/logistics/regions/<region_code>/stores/<store_id>/

## Permissions
- Requires `logistics_manager` role with region assignment
- Super admins have access to all regions

## Mobile App Usage
1. Log in as logistics_manager
2. Select region from top bar
3. View supply metrics and store statuses
4. Tap store to see details
5. Pull down to refresh data
```

---

### Success Criteria

✅ Logistics manager can view dashboard for assigned region
✅ Dashboard shows accurate supply metrics
✅ Store statuses display with correct health indicators
✅ Low stock items highlighted prominently
✅ Permission checks prevent unauthorized access
✅ Mobile app provides good overview for field work
✅ Data refreshes correctly
✅ All tests pass with >80% coverage

---

## Task 2.4: Repair Staff Dashboard - Backend & Frontend

**Priority**: MUST HAVE (M)
**Estimated Effort**: 3-4 days
**Assigned To**: Backend Developer 2 + Frontend Developer 2

### Requirements
Repair staff need a dashboard to:
- View machines requiring maintenance in their region
- Access repair schedules
- Update machine status
- Log repair actions
- Optimize repair routes

**Note**: Full machine tracking implemented in Phase 4. This task creates the dashboard infrastructure.

---

### Test Specifications (Write First!)

Create `backend/tests/test_repair_dashboard.py`:
```python
class RepairStaffDashboardTests(TestCase):
    def setUp(self):
        """Set up test data"""
        # Create Region C
        self.region = Region.objects.create(
            region_code='C',
            name='Logan, UT'
        )

        # Create stores
        self.stores = [
            Store.objects.create(
                store_number=f'LOGAN-00{i}',
                name=f'Logan Store {i}',
                region=self.region,
                # ...
            )
            for i in range(1, 6)
        ]

        # Create repair staff user
        self.repair_user = User.objects.create_user(
            username='repair1',
            password='test123'
        )

        # Assign repair_staff role
        UserRole.objects.create(
            user=self.repair_user,
            role_type='REPAIR_STAFF',
            region=self.region
        )

        self.client.force_authenticate(user=self.repair_user)

    def test_repair_staff_can_view_dashboard(self):
        """Test repair staff can access their region dashboard"""
        response = self.client.get(f'/backend/repair/regions/C/dashboard/')
        self.assertEqual(response.status_code, 200)

    def test_repair_staff_sees_only_assigned_region(self):
        """Test repair staff only sees stores in their region"""
        other_region = Region.objects.create(region_code='D', name='Dallas, TX')

        response = self.client.get(f'/backend/repair/regions/C/dashboard/')
        store_ids = [s['store_id'] for s in response.data['stores']]

        for store in self.stores:
            self.assertIn(str(store.store_id), store_ids)

    def test_repair_staff_cannot_access_other_region(self):
        """Test repair staff denied access to other regions"""
        response = self.client.get(f'/backend/repair/regions/D/dashboard/')
        self.assertEqual(response.status_code, 403)

    def test_dashboard_includes_machine_list(self):
        """Test dashboard returns list of machines (Phase 4 feature)"""
        response = self.client.get(f'/backend/repair/regions/C/dashboard/')
        self.assertIn('machines', response.data)

    def test_non_repair_staff_denied_access(self):
        """Test regular users cannot access repair dashboard"""
        regular_user = User.objects.create_user(username='regular', password='test')
        self.client.force_authenticate(user=regular_user)

        response = self.client.get(f'/backend/repair/regions/C/dashboard/')
        self.assertEqual(response.status_code, 403)
```

---

### Backend Implementation

**1. Create Repair Dashboard API** (`backend/views.py`):

```python
class RepairRegionDashboardView(APIView):
    """
    Dashboard for repair staff showing machines in their region
    """
    permission_classes = [IsAuthenticated, IsRepairStaff | IsSuperAdmin]

    def get(self, request, region_code):
        """
        GET /backend/repair/regions/<region_code>/dashboard/

        Returns repair staff dashboard data
        """
        try:
            region = Region.objects.get(region_code=region_code)
        except Region.DoesNotExist:
            return Response(
                {'error': 'Region not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verify access
        if not is_super_admin(request.user):
            has_access = UserRole.objects.filter(
                user=request.user,
                role_type='REPAIR_STAFF',
                region=region,
                is_active=True
            ).exists()

            if not has_access:
                return Response(
                    {'error': 'Access denied to this region'},
                    status=status.HTTP_403_FORBIDDEN
                )

        # Get all stores in region
        stores = Store.objects.filter(region=region)

        # Get machines (Phase 4 will populate this)
        machines = self.get_machines_for_stores(stores)

        # Get repair schedule (Phase 4)
        repair_schedule = self.get_repair_schedule(request.user, region)

        # Get recent repair history (Phase 4)
        repair_history = self.get_recent_repairs(region)

        return Response({
            'region': RegionSerializer(region).data,
            'stores': StoreSerializer(stores, many=True).data,
            'machines': machines,
            'repair_schedule': repair_schedule,
            'repair_history': repair_history,
            'summary': {
                'total_machines': len(machines),
                'needs_repair': len([m for m in machines if m['status'] in ['error', 'warning', 'out-of-order']]),
                'scheduled_repairs': len(repair_schedule),
            }
        })

    def get_machines_for_stores(self, stores):
        """
        Get machine list for stores
        Placeholder - will be implemented in Phase 4
        """
        # Phase 4 will implement Machine model
        # For now, return structure that Phase 4 will populate
        machines = []

        for store in stores:
            # Each store has one soda-making robot
            machines.append({
                'machine_id': f'ROBOT-{store.store_number}',
                'store_id': str(store.store_id),
                'store_name': store.name,
                'machine_type': 'Soda Robot',
                'serial_number': f'SR-{store.store_number}',
                'status': 'normal',  # Phase 4 will track real status
                'last_maintenance': None,
                'next_maintenance': None,
            })

        return machines

    def get_repair_schedule(self, user, region):
        """Get repair schedule for user (Phase 4 feature)"""
        return []

    def get_recent_repairs(self, region):
        """Get recent repair history (Phase 4 feature)"""
        return []

class RepairRegionListView(APIView):
    """List regions accessible to repair staff"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        GET /backend/repair/regions/

        Returns list of regions user can access
        """
        if is_super_admin(request.user):
            regions = Region.objects.all()
        else:
            user_regions = UserRole.objects.filter(
                user=request.user,
                role_type='REPAIR_STAFF',
                is_active=True
            ).values_list('region', flat=True)

            regions = Region.objects.filter(region_code__in=user_regions)

        serializer = RegionSerializer(regions, many=True)
        return Response(serializer.data)

class MachineStatusUpdateView(APIView):
    """
    Update machine status (Phase 4 feature)
    Placeholder for now
    """
    permission_classes = [IsAuthenticated, IsRepairStaff | IsSuperAdmin]

    def patch(self, request, machine_id):
        """
        PATCH /backend/repair/machines/<machine_id>/status/
        {
            "status": "repair-start",
            "notes": "Starting compressor repair"
        }
        """
        # Phase 4 will implement this
        return Response({
            'message': 'Machine status update will be implemented in Phase 4'
        })
```

**2. Add URL Patterns** (`backend/urls.py`):

```python
urlpatterns = [
    # ... existing patterns

    # Repair Staff Dashboard
    path('repair/regions/', RepairRegionListView.as_view()),
    path('repair/regions/<str:region_code>/dashboard/', RepairRegionDashboardView.as_view()),
    path('repair/machines/<str:machine_id>/status/', MachineStatusUpdateView.as_view()),
]
```

---

### Frontend Implementation

**Create Repair Dashboard Screen** (`codepop/src/pages/RepairDashboard.js`):

```javascript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../ip_address';

export default function RepairDashboard({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [regions, setRegions] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    loadRegions();
  }, []);

  useEffect(() => {
    if (selectedRegion) {
      loadDashboard(selectedRegion);
    }
  }, [selectedRegion]);

  const loadRegions = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');

      const response = await fetch(`${BASE_URL}/backend/repair/regions/`, {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRegions(data);

        if (data.length > 0) {
          setSelectedRegion(data[0].region_code);
        }
      }
    } catch (error) {
      console.error('Failed to load regions:', error);
    }
  };

  const loadDashboard = async (regionCode) => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');

      const response = await fetch(
        `${BASE_URL}/backend/repair/regions/${regionCode}/dashboard/`,
        {
          headers: {
            'Authorization': `Token ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard(selectedRegion);
  };

  const getMachineStatusColor = (status) => {
    const colors = {
      'normal': '#8df1d3',
      'warning': '#FFA686',
      'error': '#D30C7B',
      'out-of-order': '#333',
      'repair-start': '#C6C8EE',
      'repair-end': '#8df1d3',
      'schedule-service': '#FFA686',
    };
    return colors[status] || '#C6C8EE';
  };

  const getMachineStatusIcon = (status) => {
    const icons = {
      'normal': '✅',
      'warning': '⚠️',
      'error': '❌',
      'out-of-order': '🚫',
      'repair-start': '🔧',
      'repair-end': '✅',
      'schedule-service': '📅',
    };
    return icons[status] || '❓';
  };

  if (loading && !dashboardData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#C6C8EE" />
        <Text style={styles.loadingText}>Loading repair data...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Region Selector */}
      <View style={styles.regionSelector}>
        <Text style={styles.sectionTitle}>Service Region</Text>
        <View style={styles.regionButtons}>
          {regions.map((region) => (
            <TouchableOpacity
              key={region.region_code}
              style={[
                styles.regionButton,
                selectedRegion === region.region_code && styles.regionButtonActive,
              ]}
              onPress={() => setSelectedRegion(region.region_code)}
            >
              <Text
                style={[
                  styles.regionButtonText,
                  selectedRegion === region.region_code && styles.regionButtonTextActive,
                ]}
              >
                {region.region_code}: {region.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {dashboardData && (
        <>
          {/* Summary Cards */}
          <View style={styles.summaryContainer}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>
                {dashboardData.summary.total_machines}
              </Text>
              <Text style={styles.summaryLabel}>Total Machines</Text>
            </View>
            <View style={[styles.summaryCard, styles.warningCard]}>
              <Text style={[styles.summaryValue, styles.warningText]}>
                {dashboardData.summary.needs_repair}
              </Text>
              <Text style={styles.summaryLabel}>Needs Attention</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>
                {dashboardData.summary.scheduled_repairs}
              </Text>
              <Text style={styles.summaryLabel}>Scheduled</Text>
            </View>
          </View>

          {/* Machine List */}
          <View style={styles.machinesCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Machines</Text>
              <TouchableOpacity style={styles.optimizeButton}>
                <Text style={styles.optimizeButtonText}>🗺️ Optimize Route</Text>
              </TouchableOpacity>
            </View>

            {dashboardData.machines.map((machine) => (
              <TouchableOpacity
                key={machine.machine_id}
                style={styles.machineItem}
                onPress={() => {
                  // Navigate to machine detail (Phase 4)
                  console.log('Machine detail:', machine.machine_id);
                }}
              >
                <View style={styles.machineHeader}>
                  <Text style={styles.machineIcon}>
                    {getMachineStatusIcon(machine.status)}
                  </Text>
                  <View style={styles.machineInfo}>
                    <Text style={styles.machineName}>
                      {machine.store_name}
                    </Text>
                    <Text style={styles.machineSerial}>
                      SN: {machine.serial_number}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getMachineStatusColor(machine.status) },
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {machine.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Repair Schedule */}
          {dashboardData.repair_schedule.length > 0 && (
            <View style={styles.scheduleCard}>
              <Text style={styles.cardTitle}>📅 Upcoming Repairs</Text>
              {dashboardData.repair_schedule.map((repair, index) => (
                <View key={index} style={styles.scheduleItem}>
                  <Text style={styles.scheduleDate}>{repair.date}</Text>
                  <Text style={styles.scheduleLocation}>{repair.location}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Quick Actions */}
          <View style={styles.actionsCard}>
            <Text style={styles.cardTitle}>Quick Actions</Text>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                // Phase 4: Upload schedule CSV
                console.log('Upload schedule');
              }}
            >
              <Text style={styles.actionButtonText}>📤 Upload Schedule</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                // Phase 4: View repair history
                console.log('View history');
              }}
            >
              <Text style={styles.actionButtonText}>📋 View History</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  regionSelector: {
    padding: 15,
    backgroundColor: '#f5f5f5',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  regionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  regionButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#C6C8EE',
  },
  regionButtonActive: {
    backgroundColor: '#C6C8EE',
  },
  regionButtonText: {
    color: '#666',
  },
  regionButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
  },
  summaryCard: {
    flex: 1,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginHorizontal: 5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  warningCard: {
    backgroundColor: '#fff5f5',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  warningText: {
    color: '#D30C7B',
  },
  machinesCard: {
    margin: 15,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  optimizeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#C6C8EE',
    borderRadius: 20,
  },
  optimizeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  machineItem: {
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 10,
  },
  machineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  machineIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  machineInfo: {
    flex: 1,
  },
  machineName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  machineSerial: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  scheduleCard: {
    margin: 15,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scheduleItem: {
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
  },
  scheduleDate: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  scheduleLocation: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  actionsCard: {
    margin: 15,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButton: {
    padding: 15,
    backgroundColor: '#C6C8EE',
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
```

**Add to Navigation** (`codepop/App.js`):

```javascript
import RepairDashboard from './src/pages/RepairDashboard';

<Stack.Screen
  name="RepairDash"
  component={RepairDashboard}
  options={{ title: 'Repair Dashboard' }}
/>
```

---

### Documentation Required

**Create `docs/REPAIR_DASHBOARD.md`**:
```markdown
# Repair Staff Dashboard

## Overview
Dashboard for repair staff to monitor and manage machine maintenance across their assigned region.

## API Endpoints

### List Accessible Regions
GET /backend/repair/regions/

### Region Dashboard
GET /backend/repair/regions/<region_code>/dashboard/

### Update Machine Status (Phase 4)
PATCH /backend/repair/machines/<machine_id>/status/

## Permissions
- Requires `repair_staff` role with region assignment
- Super admins have access to all regions

## Machine Statuses
- `normal`: Operating normally
- `warning`: Non-critical issue, needs attention soon
- `error`: Critical issue, requires repair within a week
- `out-of-order`: Not operational
- `repair-start`: Servicing in progress
- `repair-end`: Servicing completed
- `schedule-service`: Needs scheduled maintenance within a month

## Mobile App Features
- View all machines in assigned region
- See machine status at a glance
- Filter by status
- Optimize repair routes (Phase 4)
- Upload repair schedules (Phase 4)
```

---

### Success Criteria

✅ Repair staff can view dashboard for assigned region
✅ Dashboard shows all machines in region (one per store)
✅ Machine status displays with correct color coding
✅ Permission checks prevent unauthorized access
✅ Mobile app provides clear overview for field work
✅ Route optimization button present (functionality in Phase 4)
✅ CSV upload button present (functionality in Phase 4)
✅ All tests pass with >80% coverage

---

## Phase 2 Integration Testing

### Test Scenarios

**1. Role Assignment Flow**:
```bash
# Create test users
python manage.py shell
>>> from django.contrib.auth.models import User
>>> from backend.models import UserRole, Region, Store, SupplyHub

# Create super admin
>>> super_admin = User.objects.create_user(username='superadmin', password='admin123')
>>> UserRole.objects.create(user=super_admin, role_type='SUPER_ADMIN')

# Create logistics manager
>>> logistics_user = User.objects.create_user(username='logistics1', password='test123')
>>> region_c = Region.objects.get(region_code='C')
>>> hub_c = SupplyHub.objects.get(region=region_c)
>>> UserRole.objects.create(
...     user=logistics_user,
...     role_type='LOGISTICS_MANAGER',
...     region=region_c,
...     supply_hub=hub_c
... )

# Create repair staff
>>> repair_user = User.objects.create_user(username='repair1', password='test123')
>>> UserRole.objects.create(
...     user=repair_user,
...     role_type='REPAIR_STAFF',
...     region=region_c
... )

# Test role checks
>>> from backend.permissions import is_super_admin, get_user_stores, get_user_regions
>>> is_super_admin(super_admin)  # Should be True
>>> is_super_admin(logistics_user)  # Should be False
>>> get_user_regions(logistics_user)  # Should return Region C
```

**2. Cross-Role Permission Testing**:
- [ ] Logistics manager can view Region C dashboard
- [ ] Logistics manager denied access to Region D
- [ ] Repair staff can view Region C dashboard
- [ ] Repair staff denied access to Region D
- [ ] Super admin can view all regions
- [ ] Regular user denied access to all dashboards

**3. Mobile App Role Navigation**:
- [ ] Log in as logistics_manager → goes to LogisticsDash
- [ ] Log in as repair_staff → goes to RepairDash
- [ ] Log in as super_admin → goes to AdminDash
- [ ] Log in as manager → goes to ManagerDash
- [ ] Log in as regular user → goes to Home

**4. Dashboard Data Accuracy**:
- [ ] Logistics dashboard shows correct store count
- [ ] Logistics dashboard shows accurate inventory metrics
- [ ] Repair dashboard shows all machines in region
- [ ] Dashboards refresh correctly
- [ ] Pull-to-refresh updates data

---

## Phase 2 Documentation Deliverables

- [x] `docs/ROLES_PERMISSIONS.md` - Role system architecture
- [x] `docs/LOGISTICS_DASHBOARD.md` - Logistics manager documentation
- [x] `docs/REPAIR_DASHBOARD.md` - Repair staff documentation
- [ ] Update `docs/API.md` with new endpoints
- [ ] Update `CLAUDE.md` with role system details

---

## Phase 2 Success Criteria

✅ All 7 user roles implemented and testable
✅ Permission system enforces store/region scoping
✅ Logistics manager dashboard functional (web + mobile)
✅ Repair staff dashboard functional (web + mobile)
✅ Role assignment API works correctly
✅ Cross-role permission checks pass all tests
✅ Mobile app navigation respects user roles
✅ Dashboard data accurate and performant
✅ All tests pass with >80% coverage
✅ Documentation complete and accurate

---

## Next Phase Preview

**Phase 3: Supply Hub & Logistics System**
- Supply request workflow (store → hub)
- Supply hub inventory management
- Delivery routing and scheduling
- CSV data import for pattern analysis
- AI-powered usage forecasting
- Inter-region supply coordination

**Dependencies for Phase 3**:
- ✅ Role system (Phase 2)
- ✅ Multi-store data model (Phase 1)
- ✅ P2P communication (Phase 0)

---

**Phase 2 Complete!** 🎉

Continue to `PLAN_PHASE_3_SUPPLY_HUB.md` for the next phase.
