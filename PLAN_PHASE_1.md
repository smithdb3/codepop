# CodePop P2P Distributed System - Implementation Plan

**Project Duration**: One Semester (12-16 weeks)
**Team Size**: 5 Developers
**Architecture**: True Peer-to-Peer Distributed System
**Last Updated**: 2026-02-02

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Phase 0: P2P Infrastructure Foundation](#phase-0-p2p-infrastructure-foundation-weeks-1-2)
4. [Phase 1: Multi-Store Data Model & Basic P2P](#phase-1-multi-store-data-model--basic-p2p-weeks-3-4)
5. [Phase 2: Role System & Permissions](#phase-2-role-system--permissions-weeks-5-6)
6. [Phase 3: Supply Hub & Logistics System](#phase-3-supply-hub--logistics-system-weeks-7-9)
7. [Phase 4: Machine Maintenance Tracking](#phase-4-machine-maintenance-tracking-weeks-10-11)
8. [Phase 5: Enhanced Dashboards & Features](#phase-5-enhanced-dashboards--features-weeks-12-13)
9. [Phase 6: Test Data & Documentation](#phase-6-test-data--documentation-week-14)
10. [Phase 7: Integration Testing & Polish](#phase-7-integration-testing--polish-weeks-15-16)
11. [Team Assignments](#team-assignments)
12. [Risk Management](#risk-management)
13. [Success Criteria](#success-criteria)

---

## Executive Summary

### Current State
CodePop is a single-location beverage ordering application with:
- Centralized Django backend with PostgreSQL database
- React Native mobile app (iOS/Android)
- Single-store operations
- Basic user roles (User, Manager, Admin)

### Target State
Transform CodePop into a **true peer-to-peer distributed system** where:
- Each physical store location runs its own independent backend server
- Stores operate autonomously without requiring a central authority
- Stores can communicate and share data with other stores in their region
- 7 regional supply hubs coordinate logistics across multiple stores
- System continues functioning even if individual stores/hubs go offline
- New roles support nationwide operations (logistics_manager, repair_staff, super_admin)

### Key Challenges
1. **Service Discovery**: Stores must find and connect to nearby peers
2. **Data Synchronization**: Shared data must sync across autonomous nodes
3. **Conflict Resolution**: Handle conflicting updates from different stores
4. **Network Partitions**: Gracefully handle communication failures
5. **Eventual Consistency**: Accept that data may be temporarily inconsistent

---

## Architecture Overview

### Peer-to-Peer Network Topology

```
┌─────────────────────────────────────────────────────────────────┐
│                     Supply Hub Network (7 Hubs)                  │
│  Chicago IL │ New Jersey NY │ Logan UT │ Dallas TX │ etc.       │
└────────────┬────────────────────────────────┬───────────────────┘
             │                                │
             │         P2P Communication      │
             │         (REST APIs + Events)   │
             │                                │
    ┌────────▼────────┐              ┌───────▼────────┐
    │  Store Node A   │◄────────────►│  Store Node B  │
    │  - Django API   │  Direct P2P  │  - Django API  │
    │  - PostgreSQL   │              │  - PostgreSQL  │
    │  - Local Data   │              │  - Local Data  │
    └────────┬────────┘              └───────┬────────┘
             │                                │
             │                                │
    ┌────────▼────────┐              ┌───────▼────────┐
    │  Mobile Client  │              │  Mobile Client │
    │  (Customer App) │              │  (Customer App)│
    └─────────────────┘              └────────────────┘
```

### Core Components

#### 1. Store Node (Peer)
Each store is an independent peer with:
- **Django Backend**: Full REST API implementation
- **PostgreSQL Database**: Complete local data storage
- **P2P Communication Layer**: API endpoints for inter-store communication
- **Event Queue**: Asynchronous message processing
- **Service Registry**: Knowledge of nearby peers and supply hubs

#### 2. Supply Hub Node
Specialized peer nodes that:
- Manage regional inventory
- Coordinate deliveries to multiple stores
- Track supply requests and fulfillment
- Communicate with stores in their service region (1000 mile radius)

#### 3. Mobile Client
React Native app that:
- Discovers nearby stores using geolocation
- Connects to the closest available store node
- Handles store failover (switches to another store if primary is unavailable)

### Data Distribution Strategy

#### Local-First Data (Store-Specific)
Each store maintains its own:
- **Orders**: Customer orders for that location
- **Inventory**: Stock levels for that specific store
- **Revenue**: Financial data for that location
- **Machines**: Equipment status and maintenance logs

#### Replicated Data (Synchronized Across Peers)
Some data must be shared:
- **User Accounts**: User can log in from any store
- **User Preferences**: Drink preferences follow the user
- **Favorite Drinks**: Available across all locations
- **Supply Requests**: Visible to relevant supply hubs

#### Hub-Managed Data
Supply hubs coordinate:
- **Regional Inventory**: Aggregate supply levels
- **Delivery Schedules**: Supply routes and timing
- **Store Locations**: Registry of stores in service region

### Communication Protocols

#### Synchronous Communication (REST APIs)
For immediate operations:
- User authentication (check if user exists elsewhere)
- Supply requests (store → supply hub)
- Store discovery (find nearby stores)

#### Asynchronous Communication (Event Queue)
For eventual consistency:
- User profile updates
- Favorite drink synchronization
- Supply level notifications
- Machine status updates

#### Peer Discovery Protocol
Stores find each other via:
1. **Static Configuration**: Pre-configured list of supply hubs
2. **Supply Hub Registry**: Hubs maintain list of stores in their region
3. **Heartbeat Protocol**: Stores periodically ping known peers to check availability

---

## Phase 0: P2P Infrastructure Foundation (Weeks 1-2)

### Overview
Build the foundational peer-to-peer communication layer that all future features will depend on. This phase establishes service discovery, node-to-node communication, and basic synchronization primitives.

### Goals
- Each Django instance can identify itself as a unique peer node
- Nodes can discover and register with supply hubs
- Basic P2P API endpoints for health checks and node communication
- Event queue system for asynchronous inter-node messaging

---

### Task 0.1: Node Identity & Configuration System

**Priority**: MUST HAVE (M)
**Estimated Effort**: 2-3 days
**Assigned To**: Backend Developer 1

#### Requirements
Each store node must have a unique identity and know its role in the network.

#### Implementation Steps

**Backend Changes**:

1. **Create Node Configuration Model** (`backend/models.py`):
```python
class NodeConfig(models.Model):
    """Represents this node's identity in the P2P network"""
    node_id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    node_type = models.CharField(max_length=20, choices=[
        ('STORE', 'Store Node'),
        ('SUPPLY_HUB', 'Supply Hub Node'),
    ])
    display_name = models.CharField(max_length=200)  # e.g., "Logan UT - Store 1"
    api_base_url = models.URLField()  # e.g., "http://192.168.1.100:8000"
    is_active = models.BooleanField(default=True)
    last_heartbeat = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # Geographic location
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)

    def __str__(self):
        return f"{self.display_name} ({self.node_id})"
```

2. **Create Environment Configuration** (`.env` file):
```bash
# Node Identity
NODE_ID=store-logan-001
NODE_TYPE=STORE
NODE_DISPLAY_NAME=Logan UT - Main Street Store
NODE_API_URL=http://192.168.1.100:8001
NODE_LATITUDE=41.7370
NODE_LONGITUDE=-111.8338

# Supply Hub Connection
SUPPLY_HUB_URL=http://192.168.1.100:8000
SUPPLY_HUB_REGION=C
```

3. **Create Node Initialization Management Command**:
```bash
python manage.py init_node --type=STORE --name="Logan UT Store 1"
```

4. **Update Django Settings** (`codepop_backend/settings.py`):
```python
# P2P Network Configuration
NODE_ID = os.environ.get('NODE_ID', 'default-node')
NODE_TYPE = os.environ.get('NODE_TYPE', 'STORE')
NODE_API_URL = os.environ.get('NODE_API_URL', 'http://localhost:8000')
SUPPLY_HUB_URL = os.environ.get('SUPPLY_HUB_URL', None)
```

#### Testing Strategy
- [ ] Create node with unique ID
- [ ] Verify node configuration persists in database
- [ ] Confirm environment variables load correctly
- [ ] Test management command creates valid node config

#### Documentation Required
- `docs/P2P_ARCHITECTURE.md`: Overview of node identity system
- `docs/DEPLOYMENT.md`: How to configure a new node
- `.env.example`: Template for node configuration

#### Success Criteria
✅ Each backend instance has unique, persistent identity
✅ Node configuration loads from environment variables
✅ Management command can initialize new nodes
✅ Documentation explains node setup process

---

### Task 0.2: Peer Registry & Service Discovery

**Priority**: MUST HAVE (M)
**Estimated Effort**: 3-4 days
**Assigned To**: Backend Developer 2

#### Requirements
Nodes must discover and maintain knowledge of other nodes in the network (especially supply hubs and nearby stores).

#### Implementation Steps

**Backend Changes**:

1. **Create Peer Registry Model** (`backend/models.py`):
```python
class PeerNode(models.Model):
    """Registry of known peer nodes in the network"""
    peer_id = models.UUIDField(unique=True)
    node_type = models.CharField(max_length=20, choices=[
        ('STORE', 'Store Node'),
        ('SUPPLY_HUB', 'Supply Hub Node'),
    ])
    display_name = models.CharField(max_length=200)
    api_base_url = models.URLField()

    # Network health
    is_reachable = models.BooleanField(default=True)
    last_seen = models.DateTimeField(auto_now=True)
    response_time_ms = models.IntegerField(null=True)  # API latency

    # Geographic proximity
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    distance_miles = models.FloatField(null=True)  # Distance from this node

    # Relationship
    region = models.CharField(max_length=10, blank=True)  # e.g., "C" for Logan UT
    is_supply_hub = models.BooleanField(default=False)

    class Meta:
        ordering = ['distance_miles', 'display_name']

    def __str__(self):
        return f"{self.display_name} ({'reachable' if self.is_reachable else 'offline'})"
```

2. **Create Service Discovery API** (`backend/views.py`):
```python
class NodeRegistrationView(APIView):
    """Allow nodes to register themselves with this node"""
    permission_classes = [AllowAny]  # P2P communication

    def post(self, request):
        """
        Register a peer node with this node

        POST /backend/p2p/register/
        {
            "peer_id": "uuid",
            "node_type": "STORE" or "SUPPLY_HUB",
            "display_name": "Logan UT Store 1",
            "api_base_url": "http://192.168.1.101:8001",
            "latitude": 41.7370,
            "longitude": -111.8338,
            "region": "C"
        }
        """
        peer_id = request.data.get('peer_id')

        # Calculate distance if coordinates provided
        distance = None
        if request.data.get('latitude') and request.data.get('longitude'):
            distance = calculate_distance(
                NodeConfig.objects.first().latitude,
                NodeConfig.objects.first().longitude,
                request.data['latitude'],
                request.data['longitude']
            )

        # Create or update peer record
        peer, created = PeerNode.objects.update_or_create(
            peer_id=peer_id,
            defaults={
                'node_type': request.data['node_type'],
                'display_name': request.data['display_name'],
                'api_base_url': request.data['api_base_url'],
                'latitude': request.data.get('latitude'),
                'longitude': request.data.get('longitude'),
                'region': request.data.get('region', ''),
                'is_supply_hub': request.data['node_type'] == 'SUPPLY_HUB',
                'is_reachable': True,
                'distance_miles': distance,
            }
        )

        return Response({
            'status': 'registered',
            'peer_id': str(peer.peer_id),
            'created': created
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

class PeerDiscoveryView(APIView):
    """Discover nearby peers and supply hubs"""
    permission_classes = [AllowAny]

    def get(self, request):
        """
        GET /backend/p2p/discover/?type=STORE&max_distance=200

        Returns list of nearby reachable peers
        """
        node_type = request.query_params.get('type', None)
        max_distance = float(request.query_params.get('max_distance', 1000))

        peers = PeerNode.objects.filter(is_reachable=True)

        if node_type:
            peers = peers.filter(node_type=node_type)

        if max_distance:
            peers = peers.filter(distance_miles__lte=max_distance)

        serializer = PeerNodeSerializer(peers, many=True)
        return Response(serializer.data)
```

3. **Create Heartbeat System** (`backend/management/commands/heartbeat.py`):
```python
class Command(BaseCommand):
    """
    Periodically ping known peers to check availability

    Usage: python manage.py heartbeat --interval=60
    """

    def handle(self, *args, **options):
        while True:
            peers = PeerNode.objects.all()

            for peer in peers:
                try:
                    start_time = time.time()
                    response = requests.get(
                        f"{peer.api_base_url}/backend/p2p/health/",
                        timeout=5
                    )
                    response_time = (time.time() - start_time) * 1000

                    peer.is_reachable = response.status_code == 200
                    peer.response_time_ms = int(response_time)
                    peer.save()

                except requests.exceptions.RequestException:
                    peer.is_reachable = False
                    peer.save()

            time.sleep(60)  # Check every 60 seconds
```

4. **Create Discovery Management Command** (`backend/management/commands/discover_peers.py`):
```python
class Command(BaseCommand):
    """
    Discover and register with supply hub

    Usage: python manage.py discover_peers
    """

    def handle(self, *args, **options):
        # Get this node's config
        node_config = NodeConfig.objects.first()
        hub_url = settings.SUPPLY_HUB_URL

        if not hub_url:
            self.stdout.write(self.style.ERROR('No SUPPLY_HUB_URL configured'))
            return

        # Register with supply hub
        try:
            response = requests.post(
                f"{hub_url}/backend/p2p/register/",
                json={
                    'peer_id': str(node_config.node_id),
                    'node_type': node_config.node_type,
                    'display_name': node_config.display_name,
                    'api_base_url': node_config.api_base_url,
                    'latitude': node_config.latitude,
                    'longitude': node_config.longitude,
                    'region': settings.NODE_REGION if hasattr(settings, 'NODE_REGION') else '',
                }
            )

            if response.status_code in [200, 201]:
                self.stdout.write(self.style.SUCCESS('Registered with supply hub'))

                # Ask hub for list of nearby peers
                response = requests.get(
                    f"{hub_url}/backend/p2p/discover/?type=STORE&max_distance=200"
                )

                peers = response.json()
                for peer_data in peers:
                    # Register each peer locally
                    PeerNode.objects.update_or_create(
                        peer_id=peer_data['peer_id'],
                        defaults=peer_data
                    )

                self.stdout.write(self.style.SUCCESS(f'Discovered {len(peers)} peers'))

        except requests.exceptions.RequestException as e:
            self.stdout.write(self.style.ERROR(f'Failed to contact supply hub: {e}'))
```

#### Testing Strategy
- [ ] Node can register with supply hub
- [ ] Node can discover nearby store peers
- [ ] Heartbeat correctly updates peer reachability status
- [ ] Distance calculation works correctly
- [ ] Offline peers are marked as unreachable

#### Documentation Required
- `docs/SERVICE_DISCOVERY.md`: How peer discovery works
- `docs/API_P2P.md`: P2P API endpoints documentation

#### Success Criteria
✅ Nodes can register with supply hubs
✅ Nodes can discover nearby peers
✅ Heartbeat monitors peer health
✅ Distance-based peer filtering works
✅ Offline nodes detected within 2 minutes

---

### Task 0.3: Event Queue for Asynchronous Communication

**Priority**: MUST HAVE (M)
**Estimated Effort**: 3-4 days
**Assigned To**: Backend Developer 3

#### Requirements
Inter-node communication should be non-blocking for non-critical operations. Implement an event queue system for asynchronous message passing between nodes.

#### Implementation Steps

**Backend Changes**:

1. **Install Celery for Task Queue**:
```bash
pip install celery redis
```

2. **Create Event Models** (`backend/models.py`):
```python
class P2PEvent(models.Model):
    """Event to be propagated to peer nodes"""
    event_id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    event_type = models.CharField(max_length=50, choices=[
        ('USER_CREATED', 'User Account Created'),
        ('USER_UPDATED', 'User Profile Updated'),
        ('FAVORITE_ADDED', 'Favorite Drink Added'),
        ('SUPPLY_REQUEST', 'Supply Request Submitted'),
        ('MACHINE_STATUS', 'Machine Status Changed'),
    ])

    # Source and destination
    source_node_id = models.UUIDField()
    target_node_id = models.UUIDField(null=True, blank=True)  # None = broadcast

    # Payload
    payload = models.JSONField()

    # Status tracking
    status = models.CharField(max_length=20, choices=[
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('DELIVERED', 'Delivered'),
        ('FAILED', 'Failed'),
    ], default='PENDING')

    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    retry_count = models.IntegerField(default=0)
    max_retries = models.IntegerField(default=3)
    error_message = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['target_node_id', 'status']),
        ]
```

3. **Configure Celery** (`codepop_backend/celery.py`):
```python
import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'codepop_backend.settings')

app = Celery('codepop')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# Configure periodic tasks
from celery.schedules import crontab

app.conf.beat_schedule = {
    'process-pending-events': {
        'task': 'backend.tasks.process_pending_events',
        'schedule': 10.0,  # Every 10 seconds
    },
    'heartbeat-peers': {
        'task': 'backend.tasks.heartbeat_peers',
        'schedule': 60.0,  # Every 60 seconds
    },
}
```

4. **Create Celery Tasks** (`backend/tasks.py`):
```python
from celery import shared_task
import requests
from .models import P2PEvent, PeerNode, NodeConfig

@shared_task
def process_pending_events():
    """Process pending P2P events"""
    events = P2PEvent.objects.filter(status='PENDING')[:100]

    for event in events:
        try:
            event.status = 'PROCESSING'
            event.save()

            # Determine target nodes
            if event.target_node_id:
                targets = [PeerNode.objects.get(peer_id=event.target_node_id)]
            else:
                # Broadcast to all reachable peers
                targets = PeerNode.objects.filter(is_reachable=True)

            # Send to each target
            for peer in targets:
                try:
                    response = requests.post(
                        f"{peer.api_base_url}/backend/p2p/events/",
                        json={
                            'event_id': str(event.event_id),
                            'event_type': event.event_type,
                            'source_node_id': str(event.source_node_id),
                            'payload': event.payload,
                        },
                        timeout=5
                    )

                    if response.status_code == 200:
                        event.status = 'DELIVERED'
                        event.processed_at = timezone.now()
                    else:
                        raise Exception(f"HTTP {response.status_code}")

                except Exception as e:
                    event.retry_count += 1
                    if event.retry_count >= event.max_retries:
                        event.status = 'FAILED'
                        event.error_message = str(e)
                    else:
                        event.status = 'PENDING'

                event.save()

        except Exception as e:
            event.status = 'FAILED'
            event.error_message = str(e)
            event.save()

@shared_task
def send_event_to_peers(event_type, payload, target_node_id=None):
    """Create and queue a new P2P event"""
    node_config = NodeConfig.objects.first()

    P2PEvent.objects.create(
        event_type=event_type,
        source_node_id=node_config.node_id,
        target_node_id=target_node_id,
        payload=payload
    )
```

5. **Create Event Receiver API** (`backend/views.py`):
```python
class P2PEventReceiverView(APIView):
    """Receive events from peer nodes"""
    permission_classes = [AllowAny]  # TODO: Add peer authentication

    def post(self, request):
        """
        POST /backend/p2p/events/
        {
            "event_id": "uuid",
            "event_type": "USER_UPDATED",
            "source_node_id": "uuid",
            "payload": {...}
        }
        """
        event_type = request.data.get('event_type')
        payload = request.data.get('payload')

        # Process event based on type
        if event_type == 'USER_UPDATED':
            handle_user_updated(payload)
        elif event_type == 'FAVORITE_ADDED':
            handle_favorite_added(payload)
        # ... more handlers

        return Response({'status': 'received'}, status=status.HTTP_200_OK)

def handle_user_updated(payload):
    """Handle USER_UPDATED event from peer"""
    user_id = payload.get('user_id')
    updates = payload.get('updates', {})

    try:
        user = User.objects.get(id=user_id)

        # Apply updates
        for field, value in updates.items():
            if hasattr(user, field):
                setattr(user, field, value)

        user.save()

    except User.DoesNotExist:
        # User doesn't exist locally - this is expected in P2P
        pass
```

6. **Update Docker Compose** (`docker-compose.yml`):
```yaml
services:
  redis:
    image: redis:7
    ports:
      - "6379:6379"

  celery:
    build: .
    command: celery -A codepop_backend worker -l info
    volumes:
      - .:/app
    depends_on:
      - db
      - redis
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-codepop_database}
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-password}
      POSTGRES_HOST: db
      CELERY_BROKER_URL: redis://redis:6379/0

  celery-beat:
    build: .
    command: celery -A codepop_backend beat -l info
    volumes:
      - .:/app
    depends_on:
      - db
      - redis
    environment:
      CELERY_BROKER_URL: redis://redis:6379/0
```

#### Testing Strategy
- [ ] Event can be created and queued
- [ ] Celery worker processes events
- [ ] Events delivered to target peers
- [ ] Failed events retry correctly
- [ ] Event receiver API processes incoming events

#### Documentation Required
- `docs/EVENT_QUEUE.md`: Event system architecture
- `docs/CELERY_SETUP.md`: How to run Celery workers

#### Success Criteria
✅ Events queue and process asynchronously
✅ Failed events retry with exponential backoff
✅ Events delivered to peer nodes successfully
✅ Celery workers run reliably
✅ Event processing monitored via Django admin

---

### Task 0.4: Basic Health & Status APIs

**Priority**: MUST HAVE (M)
**Estimated Effort**: 1-2 days
**Assigned To**: Backend Developer 1

#### Requirements
Each node needs health check and status endpoints for monitoring and debugging.

#### Implementation Steps

**Backend Changes**:

1. **Create Health Check API** (`backend/views.py`):
```python
class HealthCheckView(APIView):
    """Health check endpoint for peer monitoring"""
    permission_classes = [AllowAny]

    def get(self, request):
        """
        GET /backend/p2p/health/

        Returns node health status
        """
        node_config = NodeConfig.objects.first()

        # Check database connectivity
        db_healthy = True
        try:
            User.objects.count()
        except Exception:
            db_healthy = False

        # Check peer connectivity
        reachable_peers = PeerNode.objects.filter(is_reachable=True).count()
        total_peers = PeerNode.objects.count()

        return Response({
            'status': 'healthy' if db_healthy else 'degraded',
            'node_id': str(node_config.node_id),
            'node_type': node_config.node_type,
            'display_name': node_config.display_name,
            'timestamp': timezone.now().isoformat(),
            'database': 'connected' if db_healthy else 'disconnected',
            'peers': {
                'reachable': reachable_peers,
                'total': total_peers,
            }
        })

class NodeStatusView(APIView):
    """Detailed node status for debugging"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        GET /backend/p2p/status/

        Returns detailed node status (admin only)
        """
        if not request.user.is_staff:
            return Response(
                {'error': 'Admin access required'},
                status=status.HTTP_403_FORBIDDEN
            )

        node_config = NodeConfig.objects.first()
        peers = PeerNode.objects.all()
        events = P2PEvent.objects.all()[:50]

        return Response({
            'node': NodeConfigSerializer(node_config).data,
            'peers': PeerNodeSerializer(peers, many=True).data,
            'events': {
                'pending': events.filter(status='PENDING').count(),
                'processing': events.filter(status='PROCESSING').count(),
                'delivered': events.filter(status='DELIVERED').count(),
                'failed': events.filter(status='FAILED').count(),
                'recent': P2PEventSerializer(events, many=True).data,
            }
        })
```

2. **Add URLs** (`backend/urls.py`):
```python
urlpatterns = [
    # ... existing patterns

    # P2P Infrastructure
    path('p2p/health/', HealthCheckView.as_view()),
    path('p2p/status/', NodeStatusView.as_view()),
    path('p2p/register/', NodeRegistrationView.as_view()),
    path('p2p/discover/', PeerDiscoveryView.as_view()),
    path('p2p/events/', P2PEventReceiverView.as_view()),
]
```

#### Testing Strategy
- [ ] Health check returns 200 OK
- [ ] Health check shows database status
- [ ] Status endpoint requires authentication
- [ ] Status endpoint shows peer list
- [ ] Status endpoint shows event queue metrics

#### Documentation Required
- `docs/MONITORING.md`: How to monitor node health

#### Success Criteria
✅ Health check API responds in <100ms
✅ Status API shows comprehensive node state
✅ APIs documented with example responses

---

### Phase 0 Testing & Verification

#### Integration Tests
Create `backend/tests/test_p2p_infrastructure.py`:
```python
class P2PInfrastructureTests(TestCase):
    def test_node_initialization(self):
        """Test node can be initialized with unique ID"""
        pass

    def test_peer_registration(self):
        """Test nodes can register with each other"""
        pass

    def test_service_discovery(self):
        """Test nodes can discover nearby peers"""
        pass

    def test_event_queueing(self):
        """Test events queue and process"""
        pass

    def test_health_check(self):
        """Test health check API"""
        pass
```

#### Manual Testing Checklist
- [ ] Start two Django instances on different ports (8000, 8001)
- [ ] Configure one as supply hub, one as store
- [ ] Store registers with supply hub
- [ ] Store discovers other stores via hub
- [ ] Create event on store A
- [ ] Verify event received by store B
- [ ] Verify heartbeat updates peer status
- [ ] Verify health check shows correct status

#### Documentation Deliverables
- [ ] `docs/P2P_ARCHITECTURE.md` - Architecture overview
- [ ] `docs/SERVICE_DISCOVERY.md` - Peer discovery protocol
- [ ] `docs/EVENT_QUEUE.md` - Event system design
- [ ] `docs/DEPLOYMENT.md` - Node deployment guide
- [ ] `docs/API_P2P.md` - P2P API reference
- [ ] `docs/MONITORING.md` - Monitoring and debugging

#### Phase 0 Success Criteria
✅ Two nodes can discover and communicate with each other
✅ Events propagate reliably between nodes
✅ Heartbeat maintains accurate peer health status
✅ All APIs documented with examples
✅ Docker Compose runs all services (web, celery, redis, postgres)
✅ Test suite passes with >80% coverage

---

## Phase 1: Multi-Store Data Model & Basic P2P (Weeks 3-4)

### Overview
Extend the database schema to support multiple store locations. Each store maintains its own data while supporting cross-store operations like user authentication and favorites synchronization.

### Goals
- Store model to represent physical locations
- Region and SupplyHub models for logistics
- Update all existing models to be store-aware
- User accounts work across all stores
- Basic cross-store data synchronization

---

### Task 1.1: Core Multi-Store Data Models

**Priority**: MUST HAVE (M)
**Estimated Effort**: 3-4 days
**Assigned To**: Backend Developer 2

#### Requirements
Create database models to represent stores, regions, and the relationships between them.

#### Implementation Steps

**Backend Changes**:

1. **Create Region Model** (`backend/models.py`):
```python
class Region(models.Model):
    """Geographic region containing multiple stores"""
    region_code = models.CharField(max_length=10, unique=True)  # A, B, C, etc.
    name = models.CharField(max_length=100)  # e.g., "Logan, UT"

    # Geographic center point
    center_latitude = models.FloatField()
    center_longitude = models.FloatField()

    # Radius in miles
    service_radius_miles = models.IntegerField(default=200)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Region {self.region_code}: {self.name}"

    class Meta:
        ordering = ['region_code']
```

2. **Create SupplyHub Model** (`backend/models.py`):
```python
class SupplyHub(models.Model):
    """Regional supply hub that services multiple stores"""
    hub_id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    node_id = models.UUIDField(unique=True)  # Links to NodeConfig

    region = models.OneToOneField(Region, on_delete=models.PROTECT, related_name='supply_hub')
    name = models.CharField(max_length=200)  # e.g., "Logan UT Supply Hub"

    # Address
    street_address = models.CharField(max_length=200)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=2)
    zip_code = models.CharField(max_length=10)

    # Geographic location
    latitude = models.FloatField()
    longitude = models.FloatField()

    # Contact
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)

    # API endpoint
    api_base_url = models.URLField()

    # Operational status
    is_operational = models.BooleanField(default=True)

    # Delivery capability
    max_delivery_distance_miles = models.IntegerField(default=1000)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} (Region {self.region.region_code})"

    class Meta:
        ordering = ['region__region_code']
```

3. **Create Store Model** (`backend/models.py`):
```python
class Store(models.Model):
    """Physical store location"""
    store_id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    node_id = models.UUIDField(unique=True)  # Links to NodeConfig

    # Store identification
    store_number = models.CharField(max_length=50, unique=True)  # e.g., "LOGAN-001"
    name = models.CharField(max_length=200)  # e.g., "Logan Main Street"

    # Region assignment
    region = models.ForeignKey(Region, on_delete=models.PROTECT, related_name='stores')
    supply_hub = models.ForeignKey(SupplyHub, on_delete=models.PROTECT, related_name='stores')

    # Address
    street_address = models.CharField(max_length=200)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=2)
    zip_code = models.CharField(max_length=10)

    # Geographic location
    latitude = models.FloatField()
    longitude = models.FloatField()

    # Contact
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)

    # API endpoint
    api_base_url = models.URLField()

    # Operational status
    is_operational = models.BooleanField(default=True)
    is_accepting_orders = models.BooleanField(default=True)

    # Hours (stored as JSON for flexibility)
    hours_of_operation = models.JSONField(default=dict, blank=True)
    # Example: {"monday": {"open": "06:00", "close": "22:00"}, ...}

    created_at = models.DateTimeField(auto_now_add=True)
    last_online = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.store_number}: {self.name}"

    def distance_to(self, latitude, longitude):
        """Calculate distance to given coordinates"""
        return calculate_distance(
            self.latitude, self.longitude,
            latitude, longitude
        )

    def is_open_now(self):
        """Check if store is currently open"""
        now = timezone.now()
        day = now.strftime('%A').lower()

        if day not in self.hours_of_operation:
            return False

        hours = self.hours_of_operation[day]
        # Parse hours and compare with current time
        # Implementation details omitted for brevity
        return True

    class Meta:
        ordering = ['store_number']
        indexes = [
            models.Index(fields=['region', 'is_operational']),
            models.Index(fields=['latitude', 'longitude']),
        ]
```

4. **Create Distance Calculation Utility** (`backend/utils.py`):
```python
from math import radians, sin, cos, sqrt, atan2

def calculate_distance(lat1, lon1, lat2, lon2):
    """
    Calculate distance between two coordinates using Haversine formula
    Returns distance in miles
    """
    R = 3959  # Earth's radius in miles

    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))

    distance = R * c
    return round(distance, 2)
```

#### Testing Strategy
- [ ] Create regions A-G
- [ ] Create 7 supply hubs (one per region)
- [ ] Create 20+ stores in Region C
- [ ] Verify store-to-hub relationships
- [ ] Test distance calculations
- [ ] Verify store hours logic

#### Documentation Required
- `docs/DATA_MODEL.md`: Multi-store data model documentation
- Database schema diagram

#### Success Criteria
✅ All models migrate successfully
✅ Can create stores and assign to regions
✅ Distance calculations accurate within 1%
✅ Store hours logic works correctly

---

### Task 1.2: Update Existing Models for Multi-Store

**Priority**: MUST HAVE (M)
**Estimated Effort**: 4-5 days
**Assigned To**: Backend Developer 3

#### Requirements
Update all existing models to include store foreign keys. This ensures all data is scoped to specific store locations.

#### Implementation Steps

**Backend Changes**:

1. **Update Inventory Model** (`backend/models.py`):
```python
class Inventory(models.Model):
    # ADD THIS
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='inventory')

    # Existing fields
    ItemName = models.CharField(max_length=100)
    ItemType = models.CharField(max_length=50)
    Quantity = models.IntegerField()
    ThresholdLevel = models.IntegerField(default=10)

    class Meta:
        unique_together = ['store', 'ItemName', 'ItemType']
        ordering = ['store', 'ItemType', 'ItemName']
```

2. **Update Order Model** (`backend/models.py`):
```python
class Order(models.Model):
    # ADD THIS
    store = models.ForeignKey(Store, on_delete=models.PROTECT, related_name='orders')

    # Existing fields
    UserID = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    Drinks = models.ManyToManyField('Drink')
    OrderStatus = models.CharField(max_length=20)
    PaymentStatus = models.CharField(max_length=20)
    PickupTime = models.DateTimeField()
    LockerCombo = models.CharField(max_length=10)
    StripeID = models.CharField(max_length=100)

    class Meta:
        ordering = ['-PickupTime']
        indexes = [
            models.Index(fields=['store', 'OrderStatus']),
            models.Index(fields=['store', 'PickupTime']),
        ]
```

3. **Update Revenue Model** (`backend/models.py`):
```python
class Revenue(models.Model):
    # ADD THIS
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='revenue')

    # Existing fields
    order = models.ForeignKey(Order, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    transaction_date = models.DateTimeField(auto_now_add=True)
    is_refund = models.BooleanField(default=False)

    class Meta:
        ordering = ['-transaction_date']
        indexes = [
            models.Index(fields=['store', 'transaction_date']),
        ]
```

4. **Update Notification Model** (`backend/models.py`):
```python
class Notification(models.Model):
    # ADD THIS
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='notifications', null=True, blank=True)
    # null=True allows global notifications not tied to a store

    # Existing fields
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    message = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    is_global = models.BooleanField(default=False)

    class Meta:
        ordering = ['-timestamp']
```

5. **User Model Remains Global** (NO CHANGES):
```python
# User model is intentionally NOT store-specific
# Users can log in from any store location
# This is a key P2P requirement
```

6. **Preference Model Remains Global** (NO CHANGES):
```python
# Preference is tied to User, not Store
# User preferences follow them across all locations
```

7. **Drink Model: Add User-Created Flag Logic**:
```python
class Drink(models.Model):
    # Catalog drinks are global (no store FK)
    # User-created drinks are personal (no store FK)
    # Orders link drinks to stores via the Order model

    # NO STORE FK NEEDED - drinks are shared across all stores

    # Existing fields...
    User_Created = models.BooleanField(default=False)
```

#### Data Migration Strategy

**Create Migration** (`backend/migrations/0002_add_store_support.py`):
```python
def create_default_store(apps, schema_editor):
    """
    For existing data, create a default "Legacy Store" and assign all existing records to it
    """
    Store = apps.get_model('backend', 'Store')
    Region = apps.get_model('backend', 'Region')
    SupplyHub = apps.get_model('backend', 'SupplyHub')

    # Create default region
    default_region = Region.objects.create(
        region_code='LEGACY',
        name='Legacy Data',
        center_latitude=41.7370,
        center_longitude=-111.8338,
        service_radius_miles=200
    )

    # Create default supply hub
    default_hub = SupplyHub.objects.create(
        region=default_region,
        name='Legacy Supply Hub',
        # ... other fields
    )

    # Create default store
    default_store = Store.objects.create(
        store_number='LEGACY-001',
        name='Legacy Store',
        region=default_region,
        supply_hub=default_hub,
        # ... other fields
    )

    # Assign all existing inventory to default store
    Inventory = apps.get_model('backend', 'Inventory')
    Inventory.objects.update(store=default_store)

    # Assign all existing orders to default store
    Order = apps.get_model('backend', 'Order')
    Order.objects.update(store=default_store)

    # Assign all existing revenue to default store
    Revenue = apps.get_model('backend', 'Revenue')
    Revenue.objects.update(store=default_store)

class Migration(migrations.Migration):
    dependencies = [
        ('backend', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='inventory',
            name='store',
            field=models.ForeignKey(..., null=True),  # Temporarily nullable
        ),
        # ... add other store fields

        migrations.RunPython(create_default_store),

        # Make store fields non-nullable
        migrations.AlterField(
            model_name='inventory',
            name='store',
            field=models.ForeignKey(..., null=False),
        ),
    ]
```

#### Testing Strategy
- [ ] Existing data migrates to legacy store
- [ ] Can create new inventory for specific store
- [ ] Orders correctly scoped to stores
- [ ] Revenue tracked per store
- [ ] Users remain global across stores

#### Documentation Required
- `docs/MIGRATION_GUIDE.md`: How to migrate existing data

#### Success Criteria
✅ All existing data migrates successfully
✅ New data correctly scoped to stores
✅ No data loss during migration
✅ Tests pass for all updated models

---

### Task 1.3: Store Discovery & Selection API

**Priority**: MUST HAVE (M)
**Estimated Effort**: 2-3 days
**Assigned To**: Backend Developer 1

#### Requirements
Mobile clients need to discover nearby stores and select one for ordering.

#### Implementation Steps

**Backend Changes**:

1. **Create Store Discovery API** (`backend/views.py`):
```python
class StoreDiscoveryView(APIView):
    """Discover nearby stores based on user location"""
    permission_classes = [AllowAny]

    def get(self, request):
        """
        GET /backend/stores/discover/?lat=41.7370&lon=-111.8338&radius=50

        Returns list of nearby operational stores
        """
        latitude = float(request.query_params.get('lat'))
        longitude = float(request.query_params.get('lon'))
        radius = float(request.query_params.get('radius', 50))  # miles

        # Get all operational stores
        stores = Store.objects.filter(
            is_operational=True,
            is_accepting_orders=True
        )

        # Calculate distances and filter
        nearby_stores = []
        for store in stores:
            distance = store.distance_to(latitude, longitude)
            if distance <= radius:
                nearby_stores.append({
                    'store': store,
                    'distance': distance
                })

        # Sort by distance
        nearby_stores.sort(key=lambda x: x['distance'])

        # Serialize results
        results = []
        for item in nearby_stores:
            store_data = StoreSerializer(item['store']).data
            store_data['distance_miles'] = item['distance']
            store_data['is_open'] = item['store'].is_open_now()
            results.append(store_data)

        return Response(results)

class StoreDetailView(APIView):
    """Get details about a specific store"""
    permission_classes = [AllowAny]

    def get(self, request, store_id):
        """
        GET /backend/stores/<store_id>/

        Returns detailed store information
        """
        try:
            store = Store.objects.get(store_id=store_id)
        except Store.DoesNotExist:
            return Response(
                {'error': 'Store not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get current status
        data = StoreSerializer(store).data
        data['is_open'] = store.is_open_now()
        data['current_wait_time'] = calculate_current_wait_time(store)
        data['inventory_status'] = get_inventory_status(store)

        return Response(data)

class StoreInventoryCheckView(APIView):
    """Check if store has ingredients in stock"""
    permission_classes = [AllowAny]

    def post(self, request, store_id):
        """
        POST /backend/stores/<store_id>/check-inventory/
        {
            "drinks": [drink_id_1, drink_id_2, ...]
        }

        Returns availability status for each drink
        """
        try:
            store = Store.objects.get(store_id=store_id)
        except Store.DoesNotExist:
            return Response(
                {'error': 'Store not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        drink_ids = request.data.get('drinks', [])
        drinks = Drink.objects.filter(id__in=drink_ids)

        results = []
        for drink in drinks:
            available, missing = check_drink_availability(store, drink)
            results.append({
                'drink_id': drink.id,
                'drink_name': drink.Name,
                'available': available,
                'missing_ingredients': missing
            })

        return Response(results)

def calculate_current_wait_time(store):
    """Calculate estimated wait time based on current orders"""
    pending_orders = Order.objects.filter(
        store=store,
        OrderStatus__in=['pending', 'processing']
    ).count()

    # Rough estimate: 2 minutes per drink in queue
    wait_minutes = pending_orders * 2
    return max(wait_minutes, 5)  # Minimum 5 minutes

def get_inventory_status(store):
    """Get summary of store inventory status"""
    total_items = Inventory.objects.filter(store=store).count()
    low_stock = Inventory.objects.filter(
        store=store,
        Quantity__lte=models.F('ThresholdLevel')
    ).count()

    return {
        'total_items': total_items,
        'low_stock_items': low_stock,
        'status': 'healthy' if low_stock == 0 else 'low_stock'
    }

def check_drink_availability(store, drink):
    """Check if store has all ingredients for a drink"""
    missing = []

    # Check syrups
    for syrup in drink.SyrupsUsed:
        try:
            inventory = Inventory.objects.get(
                store=store,
                ItemName=syrup,
                ItemType='Syrups'
            )
            if inventory.Quantity <= 0:
                missing.append(syrup)
        except Inventory.DoesNotExist:
            missing.append(syrup)

    # Check sodas
    for soda in drink.SodaUsed:
        try:
            inventory = Inventory.objects.get(
                store=store,
                ItemName=soda,
                ItemType='Sodas'
            )
            if inventory.Quantity <= 0:
                missing.append(soda)
        except Inventory.DoesNotExist:
            missing.append(soda)

    # Check add-ins
    for addin in drink.AddIns:
        try:
            inventory = Inventory.objects.get(
                store=store,
                ItemName=addin,
                ItemType='Add-ins'
            )
            if inventory.Quantity <= 0:
                missing.append(addin)
        except Inventory.DoesNotExist:
            missing.append(addin)

    return (len(missing) == 0, missing)
```

2. **Create Serializers** (`backend/serializers.py`):
```python
class RegionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Region
        fields = '__all__'

class SupplyHubSerializer(serializers.ModelSerializer):
    region = RegionSerializer(read_only=True)

    class Meta:
        model = SupplyHub
        fields = '__all__'

class StoreSerializer(serializers.ModelSerializer):
    region = RegionSerializer(read_only=True)
    supply_hub = SupplyHubSerializer(read_only=True)

    class Meta:
        model = Store
        fields = '__all__'
```

3. **Add URLs** (`backend/urls.py`):
```python
urlpatterns = [
    # ... existing patterns

    # Store Discovery
    path('stores/discover/', StoreDiscoveryView.as_view()),
    path('stores/<uuid:store_id>/', StoreDetailView.as_view()),
    path('stores/<uuid:store_id>/check-inventory/', StoreInventoryCheckView.as_view()),
]
```

#### Testing Strategy
- [ ] Discover stores within 50 mile radius
- [ ] Stores sorted by distance
- [ ] Store detail shows correct information
- [ ] Inventory check returns accurate availability
- [ ] Wait time calculation reasonable

#### Documentation Required
- `docs/API_STORES.md`: Store discovery API documentation

#### Success Criteria
✅ Mobile app can find nearby stores
✅ Distance calculations accurate
✅ Inventory availability checks work
✅ API responses include all needed data

---

### Task 1.4: Cross-Store User Authentication

**Priority**: MUST HAVE (M)
**Estimated Effort**: 3-4 days
**Assigned To**: Backend Developer 2

#### Requirements
Users should be able to log in from any store location. User accounts are global across the P2P network.

#### Implementation Steps

**Backend Changes**:

1. **Update Authentication Flow** (`backend/views.py`):
```python
class LoginView(APIView):
    """
    Enhanced login that works across all store nodes
    """
    permission_classes = [AllowAny]

    def post(self, request):
        """
        POST /backend/auth/login/
        {
            "username": "user@example.com",
            "password": "password123"
        }
        """
        username = request.data.get('username')
        password = request.data.get('password')

        # Try local authentication first
        user = authenticate(username=username, password=password)

        if user is None:
            # User not found locally - check peer nodes
            user = check_user_on_peers(username, password)

            if user is not None:
                # User exists on peer - replicate locally
                user = replicate_user_locally(user)

        if user is None:
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Generate or retrieve token
        token, created = Token.objects.get_or_create(user=user)

        return Response({
            'token': token.key,
            'user_id': user.id,
            'username': user.username,
            'first_name': user.first_name,
            'user_role': get_user_role(user)
        })

def check_user_on_peers(username, password):
    """
    Check if user exists on peer nodes
    Returns user data if found, None otherwise
    """
    peers = PeerNode.objects.filter(
        is_reachable=True,
        node_type='STORE'
    )[:5]  # Check up to 5 peers

    for peer in peers:
        try:
            response = requests.post(
                f"{peer.api_base_url}/backend/p2p/auth/verify/",
                json={'username': username, 'password': password},
                timeout=2
            )

            if response.status_code == 200:
                return response.json()

        except requests.exceptions.RequestException:
            continue

    return None

def replicate_user_locally(user_data):
    """
    Create local copy of user from peer node
    """
    user = User.objects.create_user(
        username=user_data['username'],
        email=user_data['email'],
        password=None,  # Will use peer authentication
        first_name=user_data.get('first_name', ''),
        last_name=user_data.get('last_name', ''),
        is_staff=user_data.get('is_staff', False),
        is_superuser=user_data.get('is_superuser', False),
    )

    # Mark as replicated from peer
    user.profile.is_replicated = True
    user.profile.source_node_id = user_data.get('source_node_id')
    user.profile.save()

    # Queue event to notify other peers
    send_event_to_peers.delay(
        event_type='USER_REPLICATED',
        payload={'user_id': user.id, 'username': user.username}
    )

    return user

class P2PAuthVerifyView(APIView):
    """
    P2P endpoint for peer nodes to verify user credentials
    """
    permission_classes = [AllowAny]

    def post(self, request):
        """
        POST /backend/p2p/auth/verify/
        {
            "username": "user@example.com",
            "password": "password123"
        }
        """
        username = request.data.get('username')
        password = request.data.get('password')

        user = authenticate(username=username, password=password)

        if user is None:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        node_config = NodeConfig.objects.first()

        return Response({
            'user_id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'is_staff': user.is_staff,
            'is_superuser': user.is_superuser,
            'source_node_id': str(node_config.node_id),
        })
```

2. **Extend User Model with P2P Metadata** (`backend/models.py`):
```python
class UserProfile(models.Model):
    """Extended user profile for P2P metadata"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')

    # P2P tracking
    is_replicated = models.BooleanField(default=False)  # True if replicated from peer
    source_node_id = models.UUIDField(null=True, blank=True)  # Origin node
    last_synced = models.DateTimeField(auto_now=True)

    # Store preference
    preferred_store = models.ForeignKey(Store, null=True, blank=True, on_delete=models.SET_NULL)

    def __str__(self):
        return f"Profile for {self.user.username}"

# Auto-create profile for new users
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)
```

3. **Update Registration to Propagate to Peers** (`backend/views.py`):
```python
class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        """
        POST /backend/auth/register/
        """
        # ... existing registration logic

        # After user created locally
        user = User.objects.create_user(...)

        # Propagate to peers asynchronously
        node_config = NodeConfig.objects.first()
        send_event_to_peers.delay(
            event_type='USER_CREATED',
            payload={
                'user_id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'source_node_id': str(node_config.node_id),
            }
        )

        return Response({...})
```

4. **Add Event Handler for User Events** (`backend/views.py`):
```python
def handle_user_created(payload):
    """Handle USER_CREATED event from peer"""
    user_id = payload['user_id']

    # Check if user already exists
    if User.objects.filter(id=user_id).exists():
        return

    # Create local replica
    user = User.objects.create_user(
        id=user_id,  # Use same ID as source
        username=payload['username'],
        email=payload['email'],
        password=None,  # No password for replicated users
        first_name=payload.get('first_name', ''),
        last_name=payload.get('last_name', ''),
    )

    user.profile.is_replicated = True
    user.profile.source_node_id = payload['source_node_id']
    user.profile.save()

# Register handler in P2PEventReceiverView
def handle_event(event_type, payload):
    if event_type == 'USER_CREATED':
        handle_user_created(payload)
    elif event_type == 'USER_UPDATED':
        handle_user_updated(payload)
    # ... more handlers
```

#### Testing Strategy
- [ ] User creates account on Store A
- [ ] User logs in on Store B (account replicates)
- [ ] User updates profile on Store B
- [ ] Changes sync to Store A
- [ ] Token works across all stores

#### Documentation Required
- `docs/AUTHENTICATION_P2P.md`: Cross-store authentication design

#### Success Criteria
✅ Users can log in from any store
✅ New user accounts replicate to peers
✅ Profile updates propagate across network
✅ Authentication <500ms on local, <2s on peer lookup

---

### Task 1.5: Favorites Synchronization

**Priority**: MUST HAVE (M)
**Estimated Effort**: 2-3 days
**Assigned To**: Backend Developer 3

#### Requirements
User favorite drinks should be accessible from any store location.

#### Implementation Steps

**Backend Changes**:

1. **Update Favorite Drinks Logic** (`backend/views.py`):
```python
class UserFavoriteDrinksView(APIView):
    """Manage user's favorite drinks across all stores"""
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        """
        GET /backend/users/<user_id>/favorites/

        Returns user's favorite drinks (may be from peer nodes)
        """
        if request.user.id != int(user_id) and not request.user.is_staff:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get local favorites
        user = User.objects.get(id=user_id)
        favorites = user.favorite_drinks.all()

        # If user is replicated, fetch favorites from source node
        if user.profile.is_replicated:
            peer_favorites = fetch_favorites_from_peer(user)
            # Merge with local favorites
            favorites = merge_favorites(favorites, peer_favorites)

        serializer = DrinkSerializer(favorites, many=True)
        return Response(serializer.data)

    def post(self, request, user_id):
        """
        POST /backend/users/<user_id>/favorites/
        {
            "drink_id": 123
        }

        Add drink to favorites and sync to peers
        """
        drink_id = request.data.get('drink_id')
        user = User.objects.get(id=user_id)
        drink = Drink.objects.get(id=drink_id)

        # Add to favorites
        user.favorite_drinks.add(drink)

        # Propagate to peers
        send_event_to_peers.delay(
            event_type='FAVORITE_ADDED',
            payload={
                'user_id': user_id,
                'drink_id': drink_id,
                'drink_data': DrinkSerializer(drink).data
            }
        )

        return Response({'status': 'added'}, status=status.HTTP_201_CREATED)

def fetch_favorites_from_peer(user):
    """Fetch user's favorites from their source node"""
    if not user.profile.source_node_id:
        return []

    try:
        peer = PeerNode.objects.get(peer_id=user.profile.source_node_id)

        response = requests.get(
            f"{peer.api_base_url}/backend/p2p/users/{user.id}/favorites/",
            timeout=3
        )

        if response.status_code == 200:
            drinks_data = response.json()
            return [create_drink_from_data(d) for d in drinks_data]

    except Exception as e:
        logger.error(f"Failed to fetch favorites from peer: {e}")

    return []

def merge_favorites(local_favorites, peer_favorites):
    """Merge local and peer favorites, removing duplicates"""
    all_drinks = list(local_favorites) + peer_favorites
    seen = set()
    unique_drinks = []

    for drink in all_drinks:
        if drink.id not in seen:
            seen.add(drink.id)
            unique_drinks.append(drink)

    return unique_drinks

def create_drink_from_data(drink_data):
    """Create or update local drink from peer data"""
    drink, created = Drink.objects.update_or_create(
        id=drink_data['id'],
        defaults={
            'Name': drink_data['Name'],
            'SyrupsUsed': drink_data['SyrupsUsed'],
            'SodaUsed': drink_data['SodaUsed'],
            'AddIns': drink_data['AddIns'],
            'Price': drink_data['Price'],
            'Size': drink_data['Size'],
            'Ice_Amount': drink_data['Ice_Amount'],
            'Rating': drink_data['Rating'],
            'User_Created': drink_data['User_Created'],
        }
    )
    return drink

def handle_favorite_added(payload):
    """Handle FAVORITE_ADDED event from peer"""
    user_id = payload['user_id']
    drink_data = payload['drink_data']

    try:
        user = User.objects.get(id=user_id)
        drink = create_drink_from_data(drink_data)

        # Add to favorites if not already present
        if not user.favorite_drinks.filter(id=drink.id).exists():
            user.favorite_drinks.add(drink)

    except User.DoesNotExist:
        # User doesn't exist locally yet
        pass
```

#### Testing Strategy
- [ ] User adds favorite on Store A
- [ ] Favorite appears on Store B
- [ ] User adds same favorite on Store B (no duplicate)
- [ ] Favorites list merges correctly
- [ ] Works even if one store is offline

#### Documentation Required
- `docs/FAVORITES_SYNC.md`: Favorites synchronization design

#### Success Criteria
✅ Favorites sync across all stores
✅ No duplicate favorites
✅ Sync happens within 30 seconds
✅ Works with intermittent connectivity

---

### Phase 1 Testing & Verification

#### Integration Tests
Create `backend/tests/test_multistore.py`:
```python
class MultiStoreTests(TestCase):
    def test_store_discovery(self):
        """Test store discovery by location"""
        pass

    def test_cross_store_authentication(self):
        """Test user login across stores"""
        pass

    def test_favorites_sync(self):
        """Test favorites sync between stores"""
        pass

    def test_inventory_per_store(self):
        """Test inventory isolated per store"""
        pass
```

#### Manual Testing Checklist
- [ ] Create 3 store nodes (ports 8000, 8001, 8002)
- [ ] Register user on Store A
- [ ] Log in as user on Store B (should replicate)
- [ ] Add favorite drink on Store B
- [ ] Verify favorite appears on Store A
- [ ] Place order on Store C
- [ ] Verify order only appears on Store C
- [ ] Check inventory isolated per store

#### Documentation Deliverables
- [ ] `docs/DATA_MODEL.md` - Multi-store schema
- [ ] `docs/API_STORES.md` - Store discovery API
- [ ] `docs/AUTHENTICATION_P2P.md` - Cross-store auth
- [ ] `docs/FAVORITES_SYNC.md` - Favorites sync design
- [ ] `docs/MIGRATION_GUIDE.md` - Data migration guide

#### Phase 1 Success Criteria
✅ Multiple stores can operate independently
✅ Users authenticate across all stores
✅ Favorites sync reliably between stores
✅ Inventory and orders scoped correctly per store
✅ Store discovery API works with geolocation
✅ All tests pass with >80% coverage

---

## Phase 2: Role System & Permissions (Weeks 5-6)

### Overview
Implement new user roles required for nationwide operations: `logistics_manager`, `repair_staff`, and `super_admin`. Update permission system to support store-scoped and region-scoped access control.

### Goals
- Create new role models and permission groups
- Implement role-based access control (RBAC) middleware
- Update existing admin/manager roles for multi-store
- Create role assignment APIs for super_admin

---

### Task 2.1: Role Models & Permission System

**Priority**: MUST HAVE (M)
**Estimated Effort**: 3-4 days
**Assigned To**: Backend Developer 1

#### Requirements
Create database models to represent user roles and their permissions.

#### Implementation Steps

**Backend Changes**:

1. **Create Role Model** (`backend/models.py`):
```python
class UserRole(models.Model):
    """User role with store/region scope"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='roles')

    ROLE_CHOICES = [
        ('ACCOUNT_USER', 'Account User'),
        ('GENERAL_USER', 'General User'),
        ('MANAGER', 'Store Manager'),
        ('ADMIN', 'Store Admin'),
        ('LOGISTICS_MANAGER', 'Logistics Manager'),
        ('REPAIR_STAFF', 'Repair Staff'),
        ('SUPER_ADMIN', 'Super Admin'),
    ]

    role_type = models.CharField(max_length=30, choices=ROLE_CHOICES)

    # Scope - what this role has access to
    store = models.ForeignKey(Store, on_delete=models.CASCADE, null=True, blank=True, related_name='user_roles')
    # null=True for roles not tied to specific store (super_admin, general users)

    region = models.ForeignKey(Region, on_delete=models.CASCADE, null=True, blank=True, related_name='user_roles')
    # For logistics_manager and repair_staff (region-scoped)

    supply_hub = models.ForeignKey(SupplyHub, on_delete=models.CASCADE, null=True, blank=True, related_name='user_roles')
    # For logistics_manager (hub-specific)

    # Status
    is_active = models.BooleanField(default=True)

    # Audit
    assigned_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='assigned_roles')
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'role_type', 'store', 'region']
        ordering = ['user', 'role_type']

    def __str__(self):
        scope = ""
        if self.store:
            scope = f" at {self.store.name}"
        elif self.region:
            scope = f" in Region {self.region.region_code}"
        elif self.supply_hub:
            scope = f" at {self.supply_hub.name}"

        return f"{self.user.username} - {self.get_role_type_display()}{scope}"

    def has_store_access(self, store):
        """Check if this role grants access to given store"""
        if self.role_type == 'SUPER_ADMIN':
            return True

        if self.role_type in ['MANAGER', 'ADMIN'] and self.store == store:
            return True

        if self.role_type in ['LOGISTICS_MANAGER', 'REPAIR_STAFF'] and self.region == store.region:
            return True

        return False

    def has_region_access(self, region):
        """Check if this role grants access to given region"""
        if self.role_type == 'SUPER_ADMIN':
            return True

        if self.region == region:
            return True

        return False
```

2. **Create Permission Helper Functions** (`backend/permissions.py`):
```python
from rest_framework import permissions

class IsStoreManager(permissions.BasePermission):
    """Permission: User is manager of the requested store"""

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        store_id = view.kwargs.get('store_id')
        if not store_id:
            return False

        return UserRole.objects.filter(
            user=request.user,
            role_type__in=['MANAGER', 'ADMIN', 'SUPER_ADMIN'],
            store__store_id=store_id,
            is_active=True
        ).exists()

class IsLogisticsManager(permissions.BasePermission):
    """Permission: User is logistics manager for the requested region"""

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        region_code = view.kwargs.get('region_code')
        if not region_code:
            return False

        return UserRole.objects.filter(
            user=request.user,
            role_type='LOGISTICS_MANAGER',
            region__region_code=region_code,
            is_active=True
        ).exists() or is_super_admin(request.user)

class IsRepairStaff(permissions.BasePermission):
    """Permission: User is repair staff for the requested region"""

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        region_code = view.kwargs.get('region_code')
        if not region_code:
            return False

        return UserRole.objects.filter(
            user=request.user,
            role_type='REPAIR_STAFF',
            region__region_code=region_code,
            is_active=True
        ).exists() or is_super_admin(request.user)

class IsSuperAdmin(permissions.BasePermission):
    """Permission: User is super admin"""

    def has_permission(self, request, view):
        return is_super_admin(request.user)

def is_super_admin(user):
    """Check if user has super_admin role"""
    return UserRole.objects.filter(
        user=user,
        role_type='SUPER_ADMIN',
        is_active=True
    ).exists()

def get_user_stores(user):
    """Get all stores user has access to"""
    if is_super_admin(user):
        return Store.objects.all()

    role_stores = UserRole.objects.filter(
        user=user,
        is_active=True,
        store__isnull=False
    ).values_list('store', flat=True)

    return Store.objects.filter(store_id__in=role_stores)

def get_user_regions(user):
    """Get all regions user has access to"""
    if is_super_admin(user):
        return Region.objects.all()

    role_regions = UserRole.objects.filter(
        user=user,
        is_active=True,
        region__isnull=False
    ).values_list('region', flat=True)

    return Region.objects.filter(region_code__in=role_regions)
```

3. **Create Role Management API** (`backend/views.py`):
```python
class RoleAssignmentView(APIView):
    """Assign roles to users (super_admin only)"""
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def post(self, request):
        """
        POST /backend/roles/assign/
        {
            "user_id": 123,
            "role_type": "LOGISTICS_MANAGER",
            "region_code": "C",  # Optional
            "store_id": "uuid",  # Optional
            "supply_hub_id": "uuid"  # Optional
        }
        """
        user_id = request.data.get('user_id')
        role_type = request.data.get('role_type')

        user = User.objects.get(id=user_id)

        # Determine scope based on role
        store = None
        region = None
        supply_hub = None

        if role_type in ['MANAGER', 'ADMIN']:
            store_id = request.data.get('store_id')
            store = Store.objects.get(store_id=store_id)

        elif role_type in ['LOGISTICS_MANAGER', 'REPAIR_STAFF']:
            region_code = request.data.get('region_code')
            region = Region.objects.get(region_code=region_code)

            if role_type == 'LOGISTICS_MANAGER':
                supply_hub_id = request.data.get('supply_hub_id')
                supply_hub = SupplyHub.objects.get(hub_id=supply_hub_id)

        # Create role
        user_role = UserRole.objects.create(
            user=user,
            role_type=role_type,
            store=store,
            region=region,
            supply_hub=supply_hub,
            assigned_by=request.user
        )

        # Propagate to peers
        send_event_to_peers.delay(
            event_type='ROLE_ASSIGNED',
            payload={
                'user_id': user_id,
                'role_type': role_type,
                'store_id': str(store.store_id) if store else None,
                'region_code': region.region_code if region else None,
            }
        )

        return Response(
            UserRoleSerializer(user_role).data,
            status=status.HTTP_201_CREATED
        )

    def delete(self, request):
        """
        DELETE /backend/roles/revoke/
        {
            "role_id": 123
        }
        """
        role_id = request.data.get('role_id')
        user_role = UserRole.objects.get(id=role_id)

        user_role.is_active = False
        user_role.save()

        return Response({'status': 'revoked'})

class UserRolesView(APIView):
    """Get user's roles"""
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        """
        GET /backend/users/<user_id>/roles/

        Returns user's active roles
        """
        if request.user.id != int(user_id) and not is_super_admin(request.user):
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        roles = UserRole.objects.filter(user_id=user_id, is_active=True)
        serializer = UserRoleSerializer(roles, many=True)

        return Response(serializer.data)
```

4. **Create Serializers** (`backend/serializers.py`):
```python
class UserRoleSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source='get_role_type_display', read_only=True)
    store_name = serializers.CharField(source='store.name', read_only=True)
    region_name = serializers.CharField(source='region.name', read_only=True)

    class Meta:
        model = UserRole
        fields = '__all__'
```

#### Testing Strategy
- [ ] Create user with multiple roles
- [ ] Assign store-specific role
- [ ] Assign region-specific role
- [ ] Verify permission checks work
- [ ] Test role revocation

#### Documentation Required
- `docs/ROLES_PERMISSIONS.md`: Role system documentation

#### Success Criteria
✅ All 7 role types can be assigned
✅ Permission checks work correctly
✅ Roles scope to stores/regions as expected
✅ Super admin has universal access

---

### Task 2.2: Update Existing Dashboards for Role-Based Access

**Priority**: MUST HAVE (M)
**Estimated Effort**: 2-3 days
**Assigned To**: Backend Developer 2

#### Requirements
Update existing manager and admin dashboards to respect new permission system and multi-store architecture.

#### Implementation Steps

**Backend Changes**:

1. **Update Manager Dashboard** (`backend/views.py`):
```python
class ManagerDashboardView(APIView):
    """Store manager dashboard (store-specific)"""
    permission_classes = [IsAuthenticated]

    def get(self, request, store_id):
        """
        GET /backend/stores/<store_id>/dashboard/

        Returns dashboard data for store managers
        """
        # Verify user has manager role for this store
        has_access = UserRole.objects.filter(
            user=request.user,
            role_type__in=['MANAGER', 'ADMIN'],
            store__store_id=store_id,
            is_active=True
        ).exists() or is_super_admin(request.user)

        if not has_access:
            return Response(
                {'error': 'Access denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        store = Store.objects.get(store_id=store_id)

        # Get store-specific data
        inventory = Inventory.objects.filter(store=store)
        orders = Order.objects.filter(store=store).order_by('-PickupTime')[:50]
        revenue = Revenue.objects.filter(store=store)

        # Calculate metrics
        low_stock = inventory.filter(Quantity__lte=models.F('ThresholdLevel'))
        pending_orders = orders.filter(OrderStatus__in=['pending', 'processing'])
        today_revenue = revenue.filter(
            transaction_date__date=timezone.now().date()
        ).aggregate(total=models.Sum('amount'))

        return Response({
            'store': StoreSerializer(store).data,
            'inventory': {
                'total_items': inventory.count(),
                'low_stock': InventorySerializer(low_stock, many=True).data,
            },
            'orders': {
                'pending': OrderSerializer(pending_orders, many=True).data,
                'recent': OrderSerializer(orders[:10], many=True).data,
            },
            'revenue': {
                'today': today_revenue['total'] or 0,
            }
        })
```

2. **Update Admin Dashboard** (`backend/views.py`):
```python
class AdminDashboardView(APIView):
    """Admin dashboard (store-specific or system-wide for super_admin)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        GET /backend/admin/dashboard/?store_id=uuid

        Returns admin dashboard data
        """
        store_id = request.query_params.get('store_id')

        if is_super_admin(request.user):
            # Super admin can view all stores or specific store
            if store_id:
                stores = Store.objects.filter(store_id=store_id)
            else:
                stores = Store.objects.all()
        else:
            # Regular admin can only view their assigned stores
            user_stores = get_user_stores(request.user)

            if store_id:
                stores = user_stores.filter(store_id=store_id)
                if not stores.exists():
                    return Response(
                        {'error': 'Access denied'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            else:
                stores = user_stores

        # Aggregate data across accessible stores
        total_users = User.objects.count()
        total_orders = Order.objects.filter(store__in=stores).count()
        total_revenue = Revenue.objects.filter(store__in=stores).aggregate(
            total=models.Sum('amount')
        )['total'] or 0

        return Response({
            'stores': StoreSerializer(stores, many=True).data,
            'metrics': {
                'total_users': total_users,
                'total_orders': total_orders,
                'total_revenue': total_revenue,
            }
        })
```

#### Testing Strategy
- [ ] Manager can only see their store's data
- [ ] Admin can see their assigned stores
- [ ] Super admin can see all stores
- [ ] Unauthorized users blocked

#### Documentation Required
- Update `docs/API.md` with new dashboard endpoints

#### Success Criteria
✅ Dashboards respect role-based access
✅ Store-scoped data returned correctly
✅ Super admin sees system-wide data

---

*(Continuing in next part due to length...)*

---

**THIS PLAN CONTINUES...**

The complete PLAN.md includes:
- Phase 3: Supply Hub & Logistics System
- Phase 4: Machine Maintenance Tracking
- Phase 5: Enhanced Dashboards & Features
- Phase 6: Test Data & Documentation
- Phase 7: Integration Testing & Polish
- Team Assignments
- Risk Management
- Success Criteria

**Should I continue writing the remaining phases?** This is already quite extensive - would you like me to:
1. Continue with the full plan (all 7 phases)
2. Provide a summary of remaining phases
3. Create the complete plan as separate files (PLAN_PHASE_3.md, etc.)

Let me know how you'd like to proceed!
