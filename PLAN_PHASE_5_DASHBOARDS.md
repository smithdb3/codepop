# Phase 5: Enhanced Dashboards & Features (Weeks 12-13)

**Project**: CodePop P2P Distributed System
**Phase Duration**: 2 weeks
**Team Size**: 5 developers
**Dependencies**: All previous phases (0-4)

---

## Phase Overview

Polish and enhance the system with advanced features: improved dashboards with analytics, geolocation-based order timing (Golden Window), scheduled orders, AI recommendation improvements, and customer service chatbot. This phase focuses on user experience, business intelligence, and completing core feature set.

### Goals
- ✅ Enhanced manager dashboard with analytics and trends
- ✅ Enhanced admin dashboard with system-wide metrics
- ✅ Geolocation and proximity logic (Golden Window calculation)
- ✅ Scheduled order functionality
- ✅ AI drink recommendation improvements
- ✅ Customer service chatbot enhancements
- ✅ User preference AI improvements
- ✅ Frontend polish (animations, loading states, error handling)
- ✅ Performance optimizations
- ✅ Comprehensive testing

### Feature Priority

**MUST HAVE (M)**:
- Geolocation Golden Window
- Scheduled orders
- Enhanced manager dashboard

**SHOULD HAVE (S)**:
- AI recommendation improvements
- Admin system-wide metrics
- Customer service chatbot

**COULD HAVE (C)**:
- Advanced analytics visualizations
- Predictive order patterns
- Real-time notifications

---

## Task 5.1: Enhanced Manager Dashboard with Analytics

**Priority**: MUST HAVE (M)
**Estimated Effort**: 3-4 days
**Assigned To**: Backend Developer 1 + Frontend Developer 1

### Requirements
Managers need comprehensive analytics including revenue trends, inventory usage patterns, peak hours analysis, drink popularity metrics, and forecasting. Dashboard should provide actionable insights for business decisions.

---

### Test Specifications (Write First!)

Create `backend/tests/test_manager_analytics.py`:

```python
class ManagerAnalyticsTests(TestCase):
    def setUp(self):
        """Set up test data"""
        self.region = Region.objects.create(region_code='C', name='Logan, UT')
        self.hub = SupplyHub.objects.create(region=self.region, name='Logan Hub')

        self.store = Store.objects.create(
            store_number='LOGAN-001',
            name='Logan Main Street',
            region=self.region,
            supply_hub=self.hub,
            # ... other fields
        )

        self.manager = User.objects.create_user(
            username='manager1',
            password='test123'
        )
        UserRole.objects.create(
            user=self.manager,
            role_type='MANAGER',
            store=self.store
        )

        self.client.force_authenticate(user=self.manager)

        # Create historical data
        self.create_historical_data()

    def create_historical_data(self):
        """Create 30 days of historical order and revenue data"""
        for day in range(30):
            date = timezone.now().date() - timedelta(days=30-day)

            # Create 10-20 orders per day
            for i in range(random.randint(10, 20)):
                order = Order.objects.create(
                    store=self.store,
                    UserID=self.manager,
                    OrderStatus='completed',
                    PaymentStatus='paid',
                    PickupTime=timezone.make_aware(
                        datetime.combine(date, time(hour=random.randint(9, 20)))
                    ),
                    LockerCombo='1234'
                )

                # Create revenue
                Revenue.objects.create(
                    store=self.store,
                    order=order,
                    amount=Decimal(random.uniform(5.00, 15.00)),
                    transaction_date=timezone.make_aware(
                        datetime.combine(date, time(hour=12))
                    )
                )

    def test_manager_can_view_analytics(self):
        """Test manager can access analytics dashboard"""
        response = self.client.get(
            f'/backend/stores/{self.store.store_id}/analytics/'
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn('revenue_trends', response.data)
        self.assertIn('inventory_usage', response.data)
        self.assertIn('peak_hours', response.data)

    def test_revenue_trends_calculation(self):
        """Test revenue trends calculated correctly"""
        response = self.client.get(
            f'/backend/stores/{self.store.store_id}/analytics/?period=30'
        )

        trends = response.data['revenue_trends']

        # Should have daily revenue data
        self.assertGreater(len(trends['daily']), 0)

        # Should have totals
        self.assertIn('total_revenue', trends)
        self.assertIn('average_daily_revenue', trends)

    def test_peak_hours_identification(self):
        """Test system identifies peak hours correctly"""
        # Create more orders at specific hours
        for i in range(50):
            Order.objects.create(
                store=self.store,
                UserID=self.manager,
                OrderStatus='completed',
                PaymentStatus='paid',
                PickupTime=timezone.make_aware(
                    datetime.combine(
                        timezone.now().date(),
                        time(hour=14, minute=random.randint(0, 59))  # 2 PM peak
                    )
                )
            )

        response = self.client.get(
            f'/backend/stores/{self.store.store_id}/analytics/'
        )

        peak_hours = response.data['peak_hours']

        # Hour 14 (2 PM) should be in peak hours
        peak_hour_values = [h['hour'] for h in peak_hours[:3]]
        self.assertIn(14, peak_hour_values)

    def test_inventory_usage_patterns(self):
        """Test inventory usage analysis"""
        # Create inventory usage data
        for day in range(7):
            Inventory.objects.create(
                store=self.store,
                ItemName='Cherry Syrup',
                ItemType='Syrups',
                Quantity=100 - (day * 10)  # Decreasing
            )

        response = self.client.get(
            f'/backend/stores/{self.store.store_id}/analytics/'
        )

        inventory_usage = response.data['inventory_usage']

        # Should identify trending items
        self.assertIn('trending_items', inventory_usage)

    def test_drink_popularity_metrics(self):
        """Test drink popularity analysis"""
        # Create drinks
        drink1 = Drink.objects.create(
            Name='Popular Drink',
            SyrupsUsed=['Cherry'],
            SodaUsed=['Cola'],
            Price=5.00
        )
        drink2 = Drink.objects.create(
            Name='Less Popular',
            SyrupsUsed=['Vanilla'],
            SodaUsed=['Sprite'],
            Price=5.00
        )

        # Create orders with drink1 more frequently
        for i in range(20):
            order = Order.objects.create(
                store=self.store,
                UserID=self.manager,
                OrderStatus='completed'
            )
            order.Drinks.add(drink1)

        for i in range(5):
            order = Order.objects.create(
                store=self.store,
                UserID=self.manager,
                OrderStatus='completed'
            )
            order.Drinks.add(drink2)

        response = self.client.get(
            f'/backend/stores/{self.store.store_id}/analytics/'
        )

        drink_metrics = response.data['drink_popularity']

        # drink1 should be most popular
        self.assertEqual(drink_metrics[0]['drink_name'], 'Popular Drink')
        self.assertGreater(drink_metrics[0]['order_count'], drink_metrics[1]['order_count'])

    def test_manager_cannot_view_other_store_analytics(self):
        """Test manager denied access to other stores"""
        other_store = Store.objects.create(
            store_number='LOGAN-002',
            name='Logan Store 2',
            region=self.region,
            supply_hub=self.hub,
            # ... other fields
        )

        response = self.client.get(
            f'/backend/stores/{other_store.store_id}/analytics/'
        )

        self.assertEqual(response.status_code, 403)

    def test_forecasting_based_on_trends(self):
        """Test revenue forecasting"""
        response = self.client.get(
            f'/backend/stores/{self.store.store_id}/analytics/?forecast=7'
        )

        forecast = response.data.get('forecast')

        if forecast:
            self.assertEqual(len(forecast['predicted_revenue']), 7)
```

---

### Backend Implementation

**1. Create Analytics Service** (`backend/services/analytics.py`):

```python
from django.db.models import Sum, Count, Avg, F, Q
from django.utils import timezone
from datetime import timedelta, datetime, time
from decimal import Decimal
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression


class StoreAnalytics:
    """
    Comprehensive analytics for store managers

    Provides:
    - Revenue trends and forecasting
    - Inventory usage patterns
    - Peak hours analysis
    - Drink popularity metrics
    - Customer behavior insights
    """

    def __init__(self, store, period_days=30):
        """
        Initialize analytics for a store

        Args:
            store: Store model instance
            period_days: Number of days to analyze
        """
        self.store = store
        self.period_days = period_days
        self.start_date = timezone.now() - timedelta(days=period_days)

    def get_revenue_trends(self):
        """Calculate revenue trends and statistics"""
        # Get all revenue in period
        revenue_data = Revenue.objects.filter(
            store=self.store,
            transaction_date__gte=self.start_date,
            is_refund=False
        )

        # Daily revenue aggregation
        daily_revenue = revenue_data.extra(
            select={'date': 'DATE(transaction_date)'}
        ).values('date').annotate(
            total=Sum('amount'),
            order_count=Count('order')
        ).order_by('date')

        # Convert to list for JSON serialization
        daily_data = []
        for item in daily_revenue:
            daily_data.append({
                'date': str(item['date']),
                'revenue': float(item['total']),
                'orders': item['order_count'],
                'average_order_value': float(item['total'] / item['order_count']) if item['order_count'] > 0 else 0
            })

        # Calculate totals and averages
        total_revenue = revenue_data.aggregate(total=Sum('amount'))['total'] or 0
        total_orders = Order.objects.filter(
            store=self.store,
            PickupTime__gte=self.start_date,
            OrderStatus='completed'
        ).count()

        average_daily_revenue = float(total_revenue) / self.period_days if self.period_days > 0 else 0
        average_order_value = float(total_revenue) / total_orders if total_orders > 0 else 0

        # Identify trend (increasing/decreasing/stable)
        if len(daily_data) >= 7:
            recent_avg = sum(d['revenue'] for d in daily_data[-7:]) / 7
            older_avg = sum(d['revenue'] for d in daily_data[:7]) / 7

            if recent_avg > older_avg * 1.1:
                trend = 'increasing'
            elif recent_avg < older_avg * 0.9:
                trend = 'decreasing'
            else:
                trend = 'stable'
        else:
            trend = 'insufficient_data'

        return {
            'daily': daily_data,
            'total_revenue': float(total_revenue),
            'total_orders': total_orders,
            'average_daily_revenue': round(average_daily_revenue, 2),
            'average_order_value': round(average_order_value, 2),
            'trend': trend,
            'period_days': self.period_days
        }

    def get_peak_hours(self):
        """Identify peak hours for orders"""
        orders = Order.objects.filter(
            store=self.store,
            PickupTime__gte=self.start_date,
            OrderStatus__in=['completed', 'processing']
        )

        # Group by hour
        hourly_counts = {}
        for order in orders:
            hour = order.PickupTime.hour
            hourly_counts[hour] = hourly_counts.get(hour, 0) + 1

        # Sort by count
        peak_hours = [
            {
                'hour': hour,
                'hour_label': f"{hour}:00 - {hour+1}:00",
                'order_count': count,
                'percentage': round((count / len(orders)) * 100, 1) if len(orders) > 0 else 0
            }
            for hour, count in sorted(hourly_counts.items(), key=lambda x: x[1], reverse=True)
        ]

        return peak_hours

    def get_inventory_usage_patterns(self):
        """Analyze inventory usage patterns"""
        # Get current inventory
        current_inventory = Inventory.objects.filter(store=self.store)

        # Identify low stock items
        low_stock = current_inventory.filter(
            Quantity__lte=F('ThresholdLevel')
        )

        # Calculate usage rate for each item (rough estimate)
        usage_patterns = []
        for item in current_inventory:
            # Get historical data if available (Phase 3 integration)
            try:
                usage_data = UsageData.objects.filter(
                    store_number=self.store.store_number,
                    item_name=item.ItemName,
                    date__gte=self.start_date.date()
                )

                if usage_data.exists():
                    total_used = usage_data.aggregate(total=Sum('quantity_used'))['total']
                    avg_daily_usage = total_used / self.period_days if self.period_days > 0 else 0
                else:
                    # Estimate based on current quantity and threshold
                    avg_daily_usage = (item.ThresholdLevel / 7) if item.ThresholdLevel > 0 else 0

                # Calculate days until restock needed
                if avg_daily_usage > 0:
                    days_remaining = item.Quantity / avg_daily_usage
                else:
                    days_remaining = 999

                usage_patterns.append({
                    'item_name': item.ItemName,
                    'item_type': item.ItemType,
                    'current_quantity': item.Quantity,
                    'threshold': item.ThresholdLevel,
                    'average_daily_usage': round(avg_daily_usage, 1),
                    'days_until_restock': round(days_remaining, 1),
                    'status': 'critical' if days_remaining < 3 else 'low' if days_remaining < 7 else 'normal'
                })

            except Exception as e:
                continue

        # Sort by urgency
        usage_patterns.sort(key=lambda x: x['days_until_restock'])

        return {
            'items': usage_patterns,
            'low_stock_count': low_stock.count(),
            'critical_items': [p for p in usage_patterns if p['status'] == 'critical']
        }

    def get_drink_popularity(self):
        """Analyze drink popularity"""
        # Get orders in period
        orders = Order.objects.filter(
            store=self.store,
            PickupTime__gte=self.start_date,
            OrderStatus='completed'
        ).prefetch_related('Drinks')

        # Count drink occurrences
        drink_counts = {}
        for order in orders:
            for drink in order.Drinks.all():
                if drink.id not in drink_counts:
                    drink_counts[drink.id] = {
                        'drink': drink,
                        'count': 0,
                        'revenue': Decimal('0.00')
                    }
                drink_counts[drink.id]['count'] += 1
                drink_counts[drink.id]['revenue'] += drink.Price

        # Convert to list and sort
        popularity = [
            {
                'drink_id': drink_id,
                'drink_name': data['drink'].Name,
                'order_count': data['count'],
                'total_revenue': float(data['revenue']),
                'average_price': float(data['drink'].Price),
                'is_custom': data['drink'].User_Created
            }
            for drink_id, data in drink_counts.items()
        ]

        popularity.sort(key=lambda x: x['order_count'], reverse=True)

        return popularity[:20]  # Top 20

    def forecast_revenue(self, forecast_days=7):
        """
        Forecast future revenue using linear regression

        Args:
            forecast_days: Number of days to forecast

        Returns:
            Dictionary with forecast data
        """
        # Get historical revenue
        revenue_data = Revenue.objects.filter(
            store=self.store,
            transaction_date__gte=self.start_date,
            is_refund=False
        ).extra(
            select={'date': 'DATE(transaction_date)'}
        ).values('date').annotate(
            total=Sum('amount')
        ).order_by('date')

        if len(revenue_data) < 7:
            return {
                'error': 'Insufficient data for forecasting',
                'required_days': 7
            }

        # Prepare data for model
        dates = []
        revenues = []
        for item in revenue_data:
            dates.append(item['date'])
            revenues.append(float(item['total']))

        # Convert dates to numeric (days from start)
        X = np.array([(d - dates[0]).days for d in dates]).reshape(-1, 1)
        y = np.array(revenues)

        # Train model
        model = LinearRegression()
        model.fit(X, y)

        # Generate predictions
        last_day = (dates[-1] - dates[0]).days
        future_days = range(last_day + 1, last_day + forecast_days + 1)
        future_X = np.array(future_days).reshape(-1, 1)
        predictions = model.predict(future_X)

        # Calculate confidence (R² score)
        from sklearn.metrics import r2_score
        train_predictions = model.predict(X)
        confidence = r2_score(y, train_predictions)

        # Format predictions
        forecast = []
        for i, day in enumerate(future_days):
            forecast_date = dates[0] + timedelta(days=day)
            forecast.append({
                'date': str(forecast_date),
                'predicted_revenue': round(max(0, predictions[i]), 2),
                'confidence': round(confidence, 2)
            })

        return {
            'predicted_revenue': forecast,
            'model_confidence': round(confidence, 2),
            'trend_direction': 'increasing' if model.coef_[0] > 0 else 'decreasing',
            'daily_trend': round(model.coef_[0], 2)
        }

    def get_customer_insights(self):
        """Analyze customer behavior patterns"""
        # Get orders
        orders = Order.objects.filter(
            store=self.store,
            PickupTime__gte=self.start_date,
            OrderStatus='completed'
        )

        # Calculate metrics
        total_orders = orders.count()
        unique_customers = orders.values('UserID').distinct().count()

        # Average order frequency
        order_frequency = total_orders / unique_customers if unique_customers > 0 else 0

        # Day of week analysis
        day_counts = {}
        for order in orders:
            day = order.PickupTime.strftime('%A')
            day_counts[day] = day_counts.get(day, 0) + 1

        busiest_day = max(day_counts.items(), key=lambda x: x[1])[0] if day_counts else None

        return {
            'total_orders': total_orders,
            'unique_customers': unique_customers,
            'average_orders_per_customer': round(order_frequency, 1),
            'busiest_day': busiest_day,
            'day_distribution': day_counts
        }

    def get_comprehensive_analytics(self, include_forecast=False):
        """Get all analytics in one call"""
        analytics = {
            'revenue_trends': self.get_revenue_trends(),
            'peak_hours': self.get_peak_hours(),
            'inventory_usage': self.get_inventory_usage_patterns(),
            'drink_popularity': self.get_drink_popularity(),
            'customer_insights': self.get_customer_insights(),
        }

        if include_forecast:
            analytics['forecast'] = self.forecast_revenue()

        return analytics
```

**2. Create Analytics API** (`backend/views.py`):

```python
from backend.services.analytics import StoreAnalytics


class StoreAnalyticsView(APIView):
    """Comprehensive analytics for store managers"""
    permission_classes = [IsAuthenticated, IsStoreManager | IsSuperAdmin]

    def get(self, request, store_id):
        """
        GET /backend/stores/<store_id>/analytics/?period=30&forecast=7

        Returns comprehensive store analytics

        Query parameters:
        - period: Number of days to analyze (default: 30)
        - forecast: Number of days to forecast (optional)
        """
        try:
            store = Store.objects.get(store_id=store_id)
        except Store.DoesNotExist:
            return Response(
                {'error': 'Store not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verify access
        if not is_super_admin(request.user):
            has_access = UserRole.objects.filter(
                user=request.user,
                role_type__in=['MANAGER', 'ADMIN'],
                store=store,
                is_active=True
            ).exists()

            if not has_access:
                return Response(
                    {'error': 'Access denied'},
                    status=status.HTTP_403_FORBIDDEN
                )

        # Get parameters
        period_days = int(request.query_params.get('period', 30))
        forecast_days = request.query_params.get('forecast')

        # Generate analytics
        analytics_service = StoreAnalytics(store, period_days=period_days)
        analytics = analytics_service.get_comprehensive_analytics(
            include_forecast=bool(forecast_days)
        )

        return Response(analytics)


class StoreRevenueExportView(APIView):
    """Export revenue data to CSV"""
    permission_classes = [IsAuthenticated, IsStoreManager | IsSuperAdmin]

    def get(self, request, store_id):
        """
        GET /backend/stores/<store_id>/revenue/export/?start_date=2026-01-01&end_date=2026-01-31

        Export revenue data as CSV
        """
        try:
            store = Store.objects.get(store_id=store_id)
        except Store.DoesNotExist:
            return Response(
                {'error': 'Store not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verify access
        if not is_super_admin(request.user):
            has_access = UserRole.objects.filter(
                user=request.user,
                role_type__in=['MANAGER', 'ADMIN'],
                store=store,
                is_active=True
            ).exists()

            if not has_access:
                return Response(
                    {'error': 'Access denied'},
                    status=status.HTTP_403_FORBIDDEN
                )

        # Get date range
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        # Query revenue
        revenue_data = Revenue.objects.filter(store=store)

        if start_date:
            revenue_data = revenue_data.filter(transaction_date__gte=start_date)
        if end_date:
            revenue_data = revenue_data.filter(transaction_date__lte=end_date)

        # Create CSV response
        import csv
        from django.http import HttpResponse

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="revenue_export_{store.store_number}.csv"'

        writer = csv.writer(response)
        writer.writerow([
            'Date', 'Order ID', 'Amount', 'Is Refund', 'Payment Status'
        ])

        for revenue in revenue_data:
            writer.writerow([
                revenue.transaction_date.strftime('%Y-%m-%d %H:%M:%S'),
                revenue.order_id,
                revenue.amount,
                'Yes' if revenue.is_refund else 'No',
                revenue.order.PaymentStatus if revenue.order else 'N/A'
            ])

        return response
```

**3. Add URLs** (`backend/urls.py`):

```python
urlpatterns = [
    # ... existing patterns

    # Store Analytics
    path('stores/<uuid:store_id>/analytics/', StoreAnalyticsView.as_view()),
    path('stores/<uuid:store_id>/revenue/export/', StoreRevenueExportView.as_view()),
]
```

---

### Frontend Implementation

**Update Manager Dashboard** (`codepop/src/pages/ManagerDash.js`):

Add analytics tab to existing manager dashboard:

```javascript
// Add analytics state
const [analytics, setAnalytics] = useState(null);
const [analyticsLoading, setAnalyticsLoading] = useState(false);

// Load analytics function
const loadAnalytics = async () => {
  try {
    setAnalyticsLoading(true);
    const token = await AsyncStorage.getItem('userToken');
    const storeId = await AsyncStorage.getItem('storeId'); // Store ID from login

    const response = await fetch(
      `${BASE_URL}/backend/stores/${storeId}/analytics/?period=30&forecast=7`,
      {
        headers: {
          'Authorization': `Token ${token}`,
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      setAnalytics(data);
    }
  } catch (error) {
    console.error('Failed to load analytics:', error);
  } finally {
    setAnalyticsLoading(false);
  }
};

// Add to useEffect
useEffect(() => {
  loadAnalytics();
}, []);

// Add Analytics Tab to existing dashboard
// ... (Analytics visualization with charts would go here)
```

---

### Success Criteria

✅ Manager can view comprehensive analytics
✅ Revenue trends calculated accurately
✅ Peak hours identified correctly
✅ Inventory usage patterns analyzed
✅ Drink popularity metrics provided
✅ Forecasting available with confidence scores
✅ CSV export functionality works
✅ Dashboard responsive and performant
✅ All tests pass with >80% coverage

---

## Task 5.2: Geolocation & Golden Window Calculation

**Priority**: MUST HAVE (M)
**Estimated Effort**: 3-4 days
**Assigned To**: Backend Developer 2 + Frontend Developer 2

### Requirements
Implement "just-in-time" preparation using geolocation. Calculate optimal drink preparation start time based on user's current location, velocity of approach, and estimated assembly time. This ensures drinks are fresh at pickup.

---

### Test Specifications (Write First!)

Create `backend/tests/test_golden_window.py`:

```python
class GoldenWindowTests(TestCase):
    def setUp(self):
        """Set up test data"""
        self.region = Region.objects.create(region_code='C', name='Logan, UT')
        self.hub = SupplyHub.objects.create(region=self.region, name='Logan Hub')

        self.store = Store.objects.create(
            store_number='LOGAN-001',
            name='Logan Main Street',
            region=self.region,
            supply_hub=self.hub,
            latitude=41.7370,
            longitude=-111.8338,
            # ... other fields
        )

        self.user = User.objects.create_user(
            username='user1',
            password='test123'
        )

        self.client.force_authenticate(user=self.user)

    def test_calculate_distance_to_store(self):
        """Test distance calculation"""
        response = self.client.post(
            f'/backend/orders/calculate-arrival/',
            {
                'store_id': str(self.store.store_id),
                'current_latitude': 41.7400,
                'current_longitude': -111.8300,
            }
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn('distance_miles', response.data)
        self.assertGreater(response.data['distance_miles'], 0)

    def test_golden_window_calculation(self):
        """Test Golden Window timing calculation"""
        # User is 5 miles away, moving at 30 mph
        response = self.client.post(
            f'/backend/orders/calculate-arrival/',
            {
                'store_id': str(self.store.store_id),
                'current_latitude': 41.7400,
                'current_longitude': -111.8300,
                'velocity_mph': 30,
                'drink_complexity': 'medium'  # 3-minute prep time
            }
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn('golden_window_start_distance', response.data)
        self.assertIn('start_preparation_in_minutes', response.data)

    def test_preparation_starts_at_correct_time(self):
        """Test preparation triggers at Golden Window"""
        # Create order
        order = Order.objects.create(
            store=self.store,
            UserID=self.user,
            OrderStatus='pending',
            PaymentStatus='paid',
            PickupTime=timezone.now() + timedelta(minutes=15)
        )

        # Calculate Golden Window
        response = self.client.post(
            f'/backend/orders/{order.id}/track-location/',
            {
                'current_latitude': 41.7400,
                'current_longitude': -111.8300,
                'velocity_mph': 30
            }
        )

        self.assertEqual(response.status_code, 200)

        # If at Golden Window, should start preparation
        if response.data.get('should_start_preparation'):
            self.assertEqual(order.OrderStatus, 'processing')

    def test_manual_start_button_available(self):
        """Test manual start option when GPS denied"""
        order = Order.objects.create(
            store=self.store,
            UserID=self.user,
            OrderStatus='pending',
            PaymentStatus='paid',
            PickupTime=timezone.now() + timedelta(minutes=15)
        )

        response = self.client.post(
            f'/backend/orders/{order.id}/start-preparation/',
            {}
        )

        self.assertEqual(response.status_code, 200)
        order.refresh_from_db()
        self.assertEqual(order.OrderStatus, 'processing')

    def test_estimated_arrival_time_provided(self):
        """Test system provides arrival time estimate"""
        response = self.client.post(
            f'/backend/orders/calculate-arrival/',
            {
                'store_id': str(self.store.store_id),
                'current_latitude': 41.7400,
                'current_longitude': -111.8300,
                'velocity_mph': 30
            }
        )

        self.assertIn('estimated_arrival_minutes', response.data)
        self.assertGreater(response.data['estimated_arrival_minutes'], 0)
```

---

### Backend Implementation

**1. Create Golden Window Service** (`backend/services/golden_window.py`):

```python
from backend.utils import calculate_distance
from datetime import timedelta


class GoldenWindowCalculator:
    """
    Calculate optimal drink preparation timing based on user proximity

    The "Golden Window" is the ideal distance at which to start preparing
    the drink so it's fresh when the customer arrives.

    Algorithm:
    1. Calculate distance from user to store
    2. Estimate travel time based on velocity
    3. Estimate drink preparation time based on complexity
    4. Golden Window = (Prep Time) distance from store

    Example:
    - User is 5 miles away, traveling at 30 mph (10 min travel time)
    - Drink takes 3 minutes to prepare
    - Golden Window: Start prep when user is 1.5 miles away (3 min * 30 mph = 1.5 mi)
    """

    # Drink complexity prep times (minutes)
    PREP_TIMES = {
        'simple': 2,      # Basic soda + syrup
        'medium': 3,      # Multiple syrups + add-ins
        'complex': 5,     # Multiple components + special prep
    }

    # Average speeds (mph) for different contexts
    DEFAULT_SPEED_MPH = 30  # City driving
    WALKING_SPEED_MPH = 3

    def __init__(self, store_lat, store_lon, user_lat, user_lon, velocity_mph=None):
        """
        Initialize calculator

        Args:
            store_lat: Store latitude
            store_lon: Store longitude
            user_lat: User's current latitude
            user_lon: User's current longitude
            velocity_mph: User's velocity (optional, defaults to city speed)
        """
        self.store_lat = store_lat
        self.store_lon = store_lon
        self.user_lat = user_lat
        self.user_lon = user_lon
        self.velocity_mph = velocity_mph or self.DEFAULT_SPEED_MPH

        # Calculate current distance
        self.current_distance = calculate_distance(
            self.user_lat, self.user_lon,
            self.store_lat, self.store_lon
        )

    def calculate_golden_window(self, drink_complexity='medium'):
        """
        Calculate Golden Window parameters

        Args:
            drink_complexity: 'simple', 'medium', or 'complex'

        Returns:
            Dictionary with timing and distance information
        """
        prep_time_minutes = self.PREP_TIMES.get(drink_complexity, 3)

        # Calculate distance that can be covered during prep time
        # Distance = Speed × Time
        golden_window_distance = (self.velocity_mph / 60) * prep_time_minutes

        # Calculate when to start preparation
        if self.current_distance <= golden_window_distance:
            should_start_now = True
            start_in_minutes = 0
        else:
            # Time until user reaches Golden Window
            distance_to_window = self.current_distance - golden_window_distance
            start_in_minutes = (distance_to_window / self.velocity_mph) * 60
            should_start_now = False

        # Calculate estimated arrival time
        travel_time_minutes = (self.current_distance / self.velocity_mph) * 60

        return {
            'current_distance_miles': round(self.current_distance, 2),
            'velocity_mph': self.velocity_mph,
            'preparation_time_minutes': prep_time_minutes,
            'golden_window_distance_miles': round(golden_window_distance, 2),
            'should_start_preparation': should_start_now,
            'start_preparation_in_minutes': round(start_in_minutes, 1),
            'estimated_arrival_minutes': round(travel_time_minutes, 1),
            'estimated_pickup_time': (
                timezone.now() + timedelta(minutes=travel_time_minutes)
            ).isoformat()
        }

    def estimate_drink_complexity(self, order):
        """
        Estimate drink complexity based on order contents

        Args:
            order: Order model instance

        Returns:
            'simple', 'medium', or 'complex'
        """
        drink_count = order.Drinks.count()

        # Check complexity of drinks
        total_components = 0
        for drink in order.Drinks.all():
            components = (
                len(drink.SyrupsUsed or []) +
                len(drink.SodaUsed or []) +
                len(drink.AddIns or [])
            )
            total_components += components

        # Determine complexity
        if drink_count == 1 and total_components <= 3:
            return 'simple'
        elif drink_count <= 2 and total_components <= 6:
            return 'medium'
        else:
            return 'complex'

    @staticmethod
    def get_preparation_time(complexity):
        """Get preparation time for given complexity"""
        return GoldenWindowCalculator.PREP_TIMES.get(complexity, 3)
```

**2. Create Golden Window API** (`backend/views.py`):

```python
from backend.services.golden_window import GoldenWindowCalculator


class CalculateArrivalView(APIView):
    """Calculate arrival time and Golden Window"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        POST /backend/orders/calculate-arrival/
        {
            "store_id": "uuid",
            "current_latitude": 41.7400,
            "current_longitude": -111.8300,
            "velocity_mph": 30,  // Optional
            "drink_complexity": "medium"  // Optional
        }

        Calculate Golden Window and arrival time
        """
        store_id = request.data.get('store_id')
        user_lat = request.data.get('current_latitude')
        user_lon = request.data.get('current_longitude')
        velocity_mph = request.data.get('velocity_mph')
        complexity = request.data.get('drink_complexity', 'medium')

        if not all([store_id, user_lat, user_lon]):
            return Response(
                {'error': 'store_id, current_latitude, and current_longitude are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            store = Store.objects.get(store_id=store_id)
        except Store.DoesNotExist:
            return Response(
                {'error': 'Store not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Calculate Golden Window
        calculator = GoldenWindowCalculator(
            store.latitude,
            store.longitude,
            float(user_lat),
            float(user_lon),
            velocity_mph=float(velocity_mph) if velocity_mph else None
        )

        result = calculator.calculate_golden_window(drink_complexity=complexity)

        return Response(result)


class TrackOrderLocationView(APIView):
    """Track user location for active order"""
    permission_classes = [IsAuthenticated]

    def post(self, request, order_id):
        """
        POST /backend/orders/<order_id>/track-location/
        {
            "current_latitude": 41.7400,
            "current_longitude": -111.8300,
            "velocity_mph": 30  // Optional
        }

        Update order with user location and check if preparation should start
        """
        try:
            order = Order.objects.get(id=order_id, UserID=request.user)
        except Order.DoesNotExist:
            return Response(
                {'error': 'Order not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Can only track pending orders
        if order.OrderStatus != 'pending':
            return Response(
                {'error': 'Order is not in pending status'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user_lat = request.data.get('current_latitude')
        user_lon = request.data.get('current_longitude')
        velocity_mph = request.data.get('velocity_mph')

        if not all([user_lat, user_lon]):
            return Response(
                {'error': 'current_latitude and current_longitude are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Calculate Golden Window
        calculator = GoldenWindowCalculator(
            order.store.latitude,
            order.store.longitude,
            float(user_lat),
            float(user_lon),
            velocity_mph=float(velocity_mph) if velocity_mph else None
        )

        complexity = calculator.estimate_drink_complexity(order)
        result = calculator.calculate_golden_window(drink_complexity=complexity)

        # Start preparation if in Golden Window
        if result['should_start_preparation']:
            order.OrderStatus = 'processing'
            order.save()

            # Send notification to store
            send_event_to_peers.delay(
                event_type='ORDER_PREPARATION_STARTED',
                payload={
                    'order_id': order.id,
                    'store_name': order.store.name,
                    'triggered_by': 'golden_window'
                },
                target_node_id=order.store.node_id
            )

            result['preparation_started'] = True
        else:
            result['preparation_started'] = False

        return Response(result)


class ManualStartPreparationView(APIView):
    """Manual start button when GPS unavailable"""
    permission_classes = [IsAuthenticated]

    def post(self, request, order_id):
        """
        POST /backend/orders/<order_id>/start-preparation/

        Manually start order preparation
        """
        try:
            order = Order.objects.get(id=order_id, UserID=request.user)
        except Order.DoesNotExist:
            return Response(
                {'error': 'Order not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        if order.OrderStatus != 'pending':
            return Response(
                {'error': 'Order is not in pending status'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Start preparation
        order.OrderStatus = 'processing'
        order.save()

        # Send notification
        send_event_to_peers.delay(
            event_type='ORDER_PREPARATION_STARTED',
            payload={
                'order_id': order.id,
                'store_name': order.store.name,
                'triggered_by': 'manual_start'
            },
            target_node_id=order.store.node_id
        )

        # Estimate prep time
        calculator = GoldenWindowCalculator(
            order.store.latitude,
            order.store.longitude,
            order.store.latitude,  # Use store location as placeholder
            order.store.longitude
        )
        complexity = calculator.estimate_drink_complexity(order)
        prep_time = calculator.get_preparation_time(complexity)

        return Response({
            'message': 'Preparation started',
            'estimated_ready_time': (
                timezone.now() + timedelta(minutes=prep_time)
            ).isoformat(),
            'preparation_time_minutes': prep_time
        })
```

**3. Add URLs** (`backend/urls.py`):

```python
urlpatterns = [
    # ... existing patterns

    # Golden Window
    path('orders/calculate-arrival/', CalculateArrivalView.as_view()),
    path('orders/<int:order_id>/track-location/', TrackOrderLocationView.as_view()),
    path('orders/<int:order_id>/start-preparation/', ManualStartPreparationView.as_view()),
]
```

---

### Frontend Implementation

**Create Location Tracking Screen** (`codepop/src/pages/OrderTrackingScreen.js`):

```javascript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../ip_address';

export default function OrderTrackingScreen({ route, navigation }) {
  const { orderId, storeId } = route.params;

  const [locationPermission, setLocationPermission] = useState(null);
  const [tracking, setTracking] = useState(false);
  const [arrivalInfo, setArrivalInfo] = useState(null);
  const [locationSubscription, setLocationSubscription] = useState(null);

  useEffect(() => {
    requestLocationPermission();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setLocationPermission(status === 'granted');

    if (status === 'granted') {
      startTracking();
    }
  };

  const startTracking = async () => {
    setTracking(true);

    // Start location updates
    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 10000, // Update every 10 seconds
        distanceInterval: 100, // Or when moved 100 meters
      },
      async (location) => {
        await updateLocation(location);
      }
    );

    setLocationSubscription(subscription);
  };

  const updateLocation = async (location) => {
    try {
      const token = await AsyncStorage.getItem('userToken');

      // Calculate velocity (if available)
      const velocity = location.coords.speed
        ? location.coords.speed * 2.237 // Convert m/s to mph
        : null;

      const response = await fetch(
        `${BASE_URL}/backend/orders/${orderId}/track-location/`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            current_latitude: location.coords.latitude,
            current_longitude: location.coords.longitude,
            velocity_mph: velocity,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setArrivalInfo(data);

        // If preparation started, navigate to order status
        if (data.preparation_started) {
          Alert.alert(
            'Preparation Started!',
            'Your drink is being prepared now.',
            [
              {
                text: 'OK',
                onPress: () => navigation.navigate('OrderStatus', { orderId }),
              },
            ]
          );

          // Stop tracking
          if (locationSubscription) {
            locationSubscription.remove();
          }
        }
      }
    } catch (error) {
      console.error('Failed to update location:', error);
    }
  };

  const manualStart = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');

      const response = await fetch(
        `${BASE_URL}/backend/orders/${orderId}/start-preparation/`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Token ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        Alert.alert('Success', data.message);
        navigation.navigate('OrderStatus', { orderId });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to start preparation');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Order Tracking</Text>

      {locationPermission === false && (
        <View style={styles.permissionDenied}>
          <Text style={styles.permissionText}>
            Location permission denied. Use manual start button below.
          </Text>
        </View>
      )}

      {arrivalInfo && (
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Distance to Store:</Text>
            <Text style={styles.value}>
              {arrivalInfo.current_distance_miles} miles
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Estimated Arrival:</Text>
            <Text style={styles.value}>
              {Math.round(arrivalInfo.estimated_arrival_minutes)} minutes
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Preparation Time:</Text>
            <Text style={styles.value}>
              {arrivalInfo.preparation_time_minutes} minutes
            </Text>
          </View>

          {!arrivalInfo.should_start_preparation && (
            <View style={styles.goldenWindowInfo}>
              <Text style={styles.goldenWindowText}>
                Preparation will start when you're{' '}
                {arrivalInfo.golden_window_distance_miles} miles away
              </Text>
              <Text style={styles.goldenWindowSubtext}>
                (in {Math.round(arrivalInfo.start_preparation_in_minutes)} minutes)
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>
          {tracking ? '📍 Tracking Your Location' : '⏸️ Tracking Paused'}
        </Text>
        <Text style={styles.statusText}>
          {tracking
            ? 'We\'ll start preparing your drink at the perfect time'
            : 'Location tracking is not active'}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.manualButton}
        onPress={manualStart}
      >
        <Text style={styles.manualButtonText}>
          Start Preparation Now (Manual)
        </Text>
      </TouchableOpacity>

      <Text style={styles.helpText}>
        Use this button if you're heading to the store now and want your drink
        prepared immediately.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  permissionDenied: {
    padding: 15,
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#D30C7B',
    marginBottom: 20,
  },
  permissionText: {
    color: '#D30C7B',
    fontSize: 14,
  },
  infoCard: {
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  label: {
    fontSize: 14,
    color: '#666',
  },
  value: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  goldenWindowInfo: {
    marginTop: 15,
    padding: 12,
    backgroundColor: '#C6C8EE',
    borderRadius: 8,
  },
  goldenWindowText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  goldenWindowSubtext: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  statusCard: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  manualButton: {
    padding: 18,
    backgroundColor: '#C6C8EE',
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  manualButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  helpText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
```

---

### Success Criteria

✅ Golden Window calculation accurate
✅ Location tracking works on mobile
✅ Preparation starts at optimal time
✅ Manual start button available
✅ Arrival time estimates provided
✅ Velocity-based calculations work
✅ Permission handling correct
✅ All tests pass with >80% coverage

---

## Task 5.3: Scheduled Orders

**Priority**: MUST HAVE (M)
**Estimated Effort**: 2-3 days
**Assigned To**: Backend Developer 3 + Frontend Developer 1

### Requirements
Users can schedule drink orders for future pickup at specific times. System queues orders and begins preparation at appropriate time to ensure freshness.

---

*(Implementation for scheduled orders, AI improvements, chatbot, and remaining Phase 5 tasks would continue here)*

---

## Phase 5 Documentation Deliverables

- [ ] `docs/ANALYTICS.md` - Analytics methodology
- [ ] `docs/GOLDEN_WINDOW.md` - Geolocation algorithm
- [ ] `docs/SCHEDULED_ORDERS.md` - Scheduling system
- [ ] Update `docs/API.md` with Phase 5 endpoints
- [ ] Update `CLAUDE.md` with Phase 5 features

---

## Phase 5 Success Criteria

✅ Manager analytics dashboard comprehensive
✅ Golden Window calculation accurate
✅ Scheduled orders functional
✅ AI recommendations improved
✅ Customer service chatbot enhanced
✅ Frontend polished and responsive
✅ Performance optimized
✅ All tests pass with >80% coverage
✅ Documentation complete

---

**Phase 5 Complete!** 🎉

Continue to `PLAN_PHASE_6_TEST_DATA.md` for comprehensive test data generation.
