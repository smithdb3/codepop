# Why Celery and Redis?

*Understanding the role of asynchronous task processing in CodePop's distributed architecture*

---

## **TL;DR**

**Celery + Redis enable asynchronous communication between stores**, allowing:
- ✅ Immediate user feedback (no waiting for peer stores to respond)
- ✅ Automatic retries when peer stores are temporarily offline
- ✅ Periodic background tasks (heartbeat monitoring, inventory checks)
- ✅ Fault-tolerant distributed system (stores don't block each other)

**Without them**: Users see errors whenever peer stores are slow/offline, no automatic retries, poor user experience.

---

## **The Problem: Synchronous vs. Asynchronous Communication**

### **Scenario: User Updates Preference**

#### **❌ Synchronous Approach (Without Celery/Redis)**

```
User at Store B adds "Strawberry" to preferences
  ↓
Store B saves to local database ✅ (50ms)
  ↓
Store B immediately tries to notify Store A (synchronous HTTP POST)
  ↓
Waiting for Store A to respond... ⏳
  ↓
Store A is temporarily slow/offline ❌
  ↓
HTTP request times out after 5 seconds 💔
  ↓
Store B returns error to user: "Failed to update preference"
  ↓
User sees error message 😞
```

**Problems:**
1. **User waits 5+ seconds** for operation that should be instant
2. **User sees error** for something that should "just work"
3. **No automatic retry** - user must manually try again
4. **Tight coupling** - Store B's success depends on Store A being available right now
5. **Poor UX** - Users frustrated by frequent errors during peak hours or maintenance

**Code Example:**
```python
def update_preference(user, preference):
    # Save locally
    Preference.objects.create(user=user, preference=preference)

    # Try to sync with origin store (BLOCKING)
    try:
        response = requests.post(
            f"https://store-a.codepop.com/backend/p2p/events/",
            json={'user_id': user.id, 'preference': preference},
            timeout=5  # Block for up to 5 seconds
        )
        if response.status_code != 200:
            # What now? User already saved locally...
            return {"status": "error", "message": "Failed to sync"}
    except requests.exceptions.RequestException:
        # Store A is down - fail the entire request?
        return {"status": "error", "message": "Peer store unreachable"}

    return {"status": "success"}
```

---

#### **✅ Asynchronous Approach (With Celery/Redis)**

```
User at Store B adds "Strawberry" to preferences
  ↓
Store B saves to local database ✅ (50ms)
  ↓
Store B queues sync task in Redis (5ms)
  ↓
Store B immediately returns success to user ✅ (total: 55ms)
  ↓
User sees: "Preference updated!" 😊
  ↓
═══════════════════════════════════════════
(Meanwhile, in the background...)
═══════════════════════════════════════════
  ↓
Celery worker picks up task from Redis queue
  ↓
Worker tries to POST to Store A
  ↓
IF Store A responds → Great! Update delivered ✅
  ↓
IF Store A is down → Worker retries automatically:
  - Retry #1 after 1 second
  - Retry #2 after 5 seconds
  - Retry #3 after 25 seconds
  ↓
Eventually Store A comes back online and receives update
  ↓
Eventual consistency achieved ✅
```

**Benefits:**
1. **Fast response** - User sees success in <100ms (not 5+ seconds)
2. **No user-facing errors** - Background worker handles retries silently
3. **Fault tolerance** - System handles temporary outages gracefully
4. **Decoupling** - Store B doesn't depend on Store A being online RIGHT NOW
5. **Better UX** - Users don't see errors, don't have to retry manually

**Code Example:**
```python
from celery import shared_task

def update_preference(user, preference):
    # Save locally (fast)
    Preference.objects.create(user=user, preference=preference)

    # Queue async task (fast)
    send_preference_update.delay(user.id, preference)

    # Return immediately (user doesn't wait)
    return {"status": "success"}


@shared_task(bind=True, max_retries=3)
def send_preference_update(self, user_id, preference):
    """Background task - runs asynchronously"""
    try:
        response = requests.post(
            f"https://store-a.codepop.com/backend/p2p/events/",
            json={'user_id': user_id, 'preference': preference},
            timeout=5
        )
        response.raise_for_status()
    except requests.exceptions.RequestException as exc:
        # Retry with exponential backoff: 1s, 5s, 25s
        raise self.retry(exc=exc, countdown=5 ** self.request.retries)
```

---

## **What Is Celery?**

**Celery** is a distributed task queue system for Python that allows you to run tasks asynchronously in the background.

### **Core Features**

#### **1. Asynchronous Task Execution**
Run time-consuming operations without blocking the main application:
```python
# Main app returns immediately
result = slow_operation.delay(param1, param2)

# Task runs in background worker
@shared_task
def slow_operation(param1, param2):
    # This runs in a separate process
    time.sleep(10)
    return "Done!"
```

#### **2. Automatic Retries**
Built-in retry logic with exponential backoff:
```python
@shared_task(bind=True, max_retries=5)
def unreliable_operation(self, data):
    try:
        result = make_api_call(data)
        return result
    except Exception as exc:
        # Retry with increasing delays: 1s, 2s, 4s, 8s, 16s
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)
```

#### **3. Scheduled Periodic Tasks**
Run tasks on a schedule (like cron, but better):
```python
from celery.schedules import crontab

@periodic_task(run_every=crontab(hour=2, minute=0))
def cleanup_old_data():
    """Runs every day at 2:00 AM"""
    OldData.objects.filter(created_at__lt=thirty_days_ago).delete()

@periodic_task(run_every=60)  # Every 60 seconds
def check_peer_health():
    """Heartbeat monitoring"""
    for peer in PeerNode.objects.all():
        ping_peer.delay(peer.id)
```

#### **4. Distributed Workers**
Scale horizontally by running multiple workers:
```bash
# Start 4 workers on different servers
server1$ celery -A codepop_backend worker --concurrency=4
server2$ celery -A codepop_backend worker --concurrency=4
server3$ celery -A codepop_backend worker --concurrency=4
```

---

## **What Is Redis?**

**Redis** is an in-memory data structure store used as Celery's message broker.

### **Why Redis?**

#### **1. Message Broker**
Acts as a queue between Django and Celery workers:
```
Django App → Redis Queue → Celery Workers
  (writes)    (stores)      (reads)
```

#### **2. Super Fast**
- In-memory storage (not disk-based like databases)
- Operations complete in microseconds
- Perfect for high-throughput task queuing

#### **3. Persistence**
- Can persist tasks to disk (survives restarts)
- Configurable durability vs. speed trade-offs

#### **4. Pub/Sub**
- Can broadcast messages to multiple workers
- Useful for real-time features (optional)

### **Alternative Brokers**

Celery supports other brokers, but Redis is recommended:

| Broker | Pros | Cons |
|--------|------|------|
| **Redis** | Fast, simple, Django-friendly | Requires separate service |
| RabbitMQ | Full-featured, robust | More complex setup |
| AWS SQS | Managed service | Vendor lock-in, cost |
| Database | No extra service | Slow, inefficient |

---

## **Use Cases in CodePop**

### **1. User Data Synchronization**

**Problem**: When Store B updates user data, Store A needs to know (but might be offline)

**Solution**:
```python
# User updates preference at Store B
def add_preference(request):
    preference = request.data['preference']

    # Save locally (fast)
    Preference.objects.create(
        UserID=request.user,
        Preference=preference
    )

    # Queue background sync
    sync_preference_to_origin.delay(
        user_id=request.user.id,
        preference=preference
    )

    # Return immediately
    return Response({"status": "success"})


@shared_task(bind=True, max_retries=3)
def sync_preference_to_origin(self, user_id, preference):
    """Runs asynchronously in background"""
    user = User.objects.get(id=user_id)
    origin_store_url = get_origin_store_url(user)

    try:
        requests.post(
            f"{origin_store_url}/backend/p2p/events/",
            json={
                'event_type': 'PREFERENCE_ADDED',
                'user_id': user_id,
                'preference': preference
            },
            timeout=5
        )
    except requests.exceptions.RequestException as exc:
        raise self.retry(exc=exc, countdown=5 ** self.request.retries)
```

**Benefits**:
- User sees success immediately (doesn't wait for Store A)
- Automatic retries if Store A is down
- Eventually consistent when both stores are online

---

### **2. Heartbeat Monitoring**

**Problem**: Need to periodically check if peer stores and hub are online

**Solution**:
```python
from celery.schedules import crontab

@periodic_task(run_every=60)  # Every 60 seconds
def heartbeat_peers():
    """Check health of all known peers"""
    peers = PeerNode.objects.all()

    for peer in peers:
        # Queue individual ping tasks
        ping_peer.delay(peer.peer_id)


@shared_task
def ping_peer(peer_id):
    """Ping a single peer node"""
    peer = PeerNode.objects.get(peer_id=peer_id)

    try:
        start_time = time.time()
        response = requests.get(
            f"{peer.api_base_url}/backend/p2p/health/",
            timeout=5
        )
        response_time = (time.time() - start_time) * 1000

        # Update peer status
        peer.is_reachable = (response.status_code == 200)
        peer.response_time_ms = int(response_time)
        peer.last_seen = timezone.now()
        peer.save()

    except requests.exceptions.RequestException:
        peer.is_reachable = False
        peer.save()
```

**Benefits**:
- Automatic health monitoring (no manual checks needed)
- Runs continuously without blocking main application
- Updates peer registry in real-time

---

### **3. Inventory Monitoring**

**Problem**: Need to detect low inventory and trigger supply requests automatically

**Solution**:
```python
@periodic_task(run_every=900)  # Every 15 minutes
def check_low_inventory():
    """Monitor inventory levels across all items"""

    low_stock_items = Inventory.objects.filter(
        Quantity__lte=F('ThresholdLevel')
    )

    for item in low_stock_items:
        # Queue alert task
        send_low_stock_alert.delay(item.InventoryID)


@shared_task
def send_low_stock_alert(inventory_id):
    """Send alert to manager and optionally auto-request supplies"""
    item = Inventory.objects.get(InventoryID=inventory_id)
    store = item.store

    # Notify store manager
    Notification.objects.create(
        store=store,
        message=f"Low stock: {item.ItemName} ({item.Quantity} remaining)",
        Type='inventory_alert'
    )

    # If critically low, auto-create supply request
    if item.Quantity <= item.ThresholdLevel / 2:
        create_supply_request.delay(store.store_id, item.ItemName)
```

**Benefits**:
- Proactive monitoring (catches issues before stockout)
- Automated alerts (no manual inventory checks)
- Can trigger automatic supply requests

---

### **4. Event Replay After Network Partition**

**Problem**: Store A was offline for hours. Store B has queued 100 updates. Need to sync them all when Store A comes back.

**Solution**:
```python
@shared_task
def replay_failed_events():
    """Re-attempt delivery of failed sync events"""

    # Find events that failed but are still within retry window
    failed_events = P2PEvent.objects.filter(
        status='FAILED',
        created_at__gte=timezone.now() - timedelta(hours=24)
    )

    for event in failed_events:
        # Re-queue for delivery
        deliver_event.delay(event.event_id)


@shared_task(bind=True, max_retries=5)
def deliver_event(self, event_id):
    """Attempt to deliver a single event"""
    event = P2PEvent.objects.get(event_id=event_id)
    target_peer = PeerNode.objects.get(peer_id=event.target_node_id)

    # Check if target is now reachable
    if not target_peer.is_reachable:
        raise self.retry(countdown=300)  # Retry in 5 minutes

    try:
        response = requests.post(
            f"{target_peer.api_base_url}/backend/p2p/events/",
            json=event.payload,
            timeout=5
        )
        response.raise_for_status()

        # Mark as delivered
        event.status = 'DELIVERED'
        event.processed_at = timezone.now()
        event.save()

    except requests.exceptions.RequestException as exc:
        event.retry_count += 1
        event.save()
        raise self.retry(exc=exc, countdown=5 ** self.request.retries)
```

**Benefits**:
- Automatic recovery from network partitions
- No manual intervention needed
- System self-heals when connectivity restored

---

## **Architecture: How It All Fits Together**

```
┌─────────────────────────────────────────────────────────────┐
│                     Store B                                  │
│                                                              │
│  ┌──────────────┐         ┌──────────────┐                 │
│  │ Django App   │────────►│ Redis Queue  │                 │
│  │ (Web Server) │ writes  │ (Broker)     │                 │
│  └──────────────┘  tasks  └──────┬───────┘                 │
│         │                         │                          │
│         │ returns                 │ reads                    │
│         │ immediately             │ tasks                    │
│         ▼                         ▼                          │
│  ┌──────────────┐         ┌──────────────┐                 │
│  │ Mobile App   │         │ Celery       │                 │
│  │ (User sees   │         │ Workers      │                 │
│  │  success!)   │         │ (Background) │                 │
│  └──────────────┘         └──────┬───────┘                 │
│                                   │                          │
└───────────────────────────────────┼──────────────────────────┘
                                    │
                                    │ Direct HTTP
                                    │ to peer store
                                    ▼
                            ┌──────────────┐
                            │   Store A    │
                            │  (Receives   │
                            │   update)    │
                            └──────────────┘
```

### **Flow Breakdown**

1. **User Request** → Django App (synchronous)
2. **Django saves locally** → PostgreSQL (fast)
3. **Django queues task** → Redis (fast)
4. **Django returns success** → User (total <100ms)
5. **Celery worker picks up task** → Redis queue
6. **Worker executes task** → Background processing
7. **Worker contacts peer** → Direct store-to-store HTTP
8. **Worker handles failures** → Automatic retries

---

## **Could We Do Without Celery/Redis?**

Yes, but with significant trade-offs. Let's compare:

### **Option 1: All Synchronous (No Celery/Redis)**

```python
def update_preference(request):
    # Save locally
    preference = Preference.objects.create(...)

    # BLOCKING call to peer store
    response = requests.post(peer_url, data=..., timeout=5)

    if response.status_code != 200:
        return Response({"error": "Failed to sync"}, 500)

    return Response({"status": "success"})
```

**Pros:**
- ✅ Simpler architecture (no extra services)
- ✅ Easier to debug (synchronous flow)
- ✅ Immediate consistency (if it succeeds)

**Cons:**
- ❌ Slow response times (5+ seconds if peer is slow)
- ❌ Frequent user-facing errors (when peers are down)
- ❌ No automatic retries
- ❌ Tight coupling between stores
- ❌ Poor user experience

**Verdict**: ❌ **Not suitable for production distributed system**

---

### **Option 2: Database-Backed Queue (No Redis)**

Use Django's database as a task queue:

```python
class PendingTask(models.Model):
    task_type = models.CharField(max_length=50)
    payload = models.JSONField()
    status = models.CharField(max_length=20)
    retry_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

# Worker polls database for pending tasks
while True:
    tasks = PendingTask.objects.filter(status='PENDING')[:10]
    for task in tasks:
        process_task(task)
    time.sleep(5)
```

**Pros:**
- ✅ No extra services (uses existing database)
- ✅ Persistent (survives restarts)

**Cons:**
- ❌ Slow (disk I/O vs. in-memory)
- ❌ Inefficient polling (wastes resources)
- ❌ No built-in retry logic
- ❌ No scheduling capabilities
- ❌ Hard to scale (polling bottleneck)
- ❌ Reinventing the wheel

**Verdict**: ❌ **Not recommended - use purpose-built tools**

---

### **Option 3: Cloud-Managed Queues (AWS SQS, Google Cloud Tasks)**

Use cloud provider's managed queue service:

**Pros:**
- ✅ Fully managed (no operations overhead)
- ✅ Auto-scaling
- ✅ High availability

**Cons:**
- ❌ Vendor lock-in
- ❌ Requires cloud account
- ❌ Ongoing costs
- ❌ Can't run on-premises (conflicts with store autonomy)
- ❌ Less control over infrastructure

**Verdict**: ⚠️ **Good for cloud-native apps, but conflicts with CodePop's store autonomy requirement**

---

### **Option 4: Lightweight Alternatives (Huey)**

Use simpler task queue like Huey:

```python
from huey import RedisHuey

huey = RedisHuey('codepop')

@huey.task()
def sync_preference(user_id, preference):
    # Same logic as Celery
    pass
```

**Pros:**
- ✅ Simpler than Celery
- ✅ Still uses Redis (fast)
- ✅ Supports retries and scheduling

**Cons:**
- ❌ Less mature than Celery
- ❌ Fewer features (no canvas/workflows)
- ❌ Smaller community

**Verdict**: ⚠️ **Good for simpler projects, but Celery is more battle-tested for distributed systems**

---

## **Decision Matrix**

| Solution | User Experience | Scalability | Complexity | Recommendation |
|----------|----------------|-------------|------------|----------------|
| **Celery + Redis** | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐⭐ Moderate | ✅ **Recommended** |
| All Synchronous | ⭐ Poor | ⭐⭐ Poor | ⭐⭐⭐⭐⭐ Simple | ❌ Not suitable |
| Database Queue | ⭐⭐⭐ Fair | ⭐⭐ Poor | ⭐⭐⭐⭐ Moderate | ❌ Don't reinvent |
| Cloud Queues | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐⭐⭐ Easy | ⚠️ Vendor lock-in |
| Huey | ⭐⭐⭐⭐ Good | ⭐⭐⭐⭐ Good | ⭐⭐⭐⭐ Easy | ⚠️ Less proven |

---

## **For This Class Project**

### **If You Want Full Production-Ready System:**
✅ **Use Celery + Redis**
- Matches industry best practices
- Demonstrates understanding of distributed systems
- Shows you can handle complex architecture

### **If You Want to Simplify for Grading:**
⚠️ **Use Huey (Celery alternative)**
- Still asynchronous (good UX)
- Simpler to set up
- Easier for professor to run/test

### **If You Want Absolute Simplicity:**
❌ **All synchronous (not recommended)**
- Easier to understand
- Fewer moving parts
- But: Poor UX, frequent errors, doesn't scale

---

## **Installation & Setup**

### **Install Dependencies**
```bash
pip install celery redis
```

### **Configure Django Settings**
```python
# codepop_backend/settings.py

# Celery Configuration
CELERY_BROKER_URL = 'redis://redis:6379/0'
CELERY_RESULT_BACKEND = 'redis://redis:6379/0'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'America/Denver'
```

### **Create Celery App**
```python
# codepop_backend/celery.py

import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'codepop_backend.settings')

app = Celery('codepop')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()
```

### **Update Docker Compose**
```yaml
services:
  redis:
    image: redis:7
    ports:
      - "6379:6379"

  celery:
    build: .
    command: celery -A codepop_backend worker -l info
    depends_on:
      - db
      - redis
    environment:
      CELERY_BROKER_URL: redis://redis:6379/0

  celery-beat:
    build: .
    command: celery -A codepop_backend beat -l info
    depends_on:
      - db
      - redis
```

### **Run Services**
```bash
# Start all services (Django, Celery, Redis, PostgreSQL)
docker-compose up

# Or using Makefile
make up
```

---

## **Monitoring & Debugging**

### **View Celery Worker Logs**
```bash
docker-compose logs celery
```

### **Monitor Task Queue**
```bash
# Install Flower (Celery monitoring tool)
pip install flower

# Start Flower dashboard
celery -A codepop_backend flower

# Open browser to http://localhost:5555
```

### **Check Redis Queue**
```bash
# Connect to Redis CLI
docker-compose exec redis redis-cli

# View queued tasks
LLEN celery

# Inspect a task
LRANGE celery 0 0
```

---

## **Summary**

**Celery + Redis solve a fundamental problem in distributed systems**: How do you communicate between nodes without blocking user operations and without tightly coupling system components?

**Key Benefits:**
1. ✅ **Fast user responses** - Users don't wait for peer stores
2. ✅ **Fault tolerance** - Automatic retries when peers are down
3. ✅ **Eventual consistency** - Data propagates when both stores are online
4. ✅ **Decoupling** - Stores don't depend on each other's availability
5. ✅ **Background tasks** - Periodic monitoring, cleanup, alerts
6. ✅ **Scalability** - Add more workers as load increases

**Without them**: You'd build a fragile, tightly-coupled system with poor user experience and frequent errors.

**Industry Standard**: Celery + Redis is the Django ecosystem's proven solution for asynchronous task processing, used by:
- Instagram (billions of tasks per day)
- Pinterest (image processing)
- Reddit (comment notifications)
- Mozilla (release automation)

For CodePop's distributed architecture, they're **essential, not optional**.

---

**Questions?**
- "Do I need to learn all this for the project?" → No, just understand the concepts
- "Can I skip this to simplify?" → Yes, but UX will suffer significantly
- "Are there simpler alternatives?" → Yes (Huey), but Celery is more proven
- "Is this overkill for a class project?" → Depends on your goals (learning vs. quick prototype)
