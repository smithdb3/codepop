# Cross-Region User Discovery - Addition to HighLevelDoc_REVISED.md

*This clarifies how lazy replication works across regions nationwide*

---

## **To Add After "Lazy Replication" Section**

### **Cross-Region User Discovery**

**Important Clarification:** User account lazy replication works **nationwide**, not just within a single region.

**Scenario: User Travels Across Country**
- User creates account at Logan Store (Region C - Utah)
- User travels to New York (Region B)
- User logs in at New York Store
- **System automatically discovers and replicates user account across regions**

---

#### **How Cross-Region Discovery Works**

When a user from one region logs in at a store in a different region, the system uses **hierarchical hub coordination** to locate the user's origin store:

```
User from Logan (Region C) logs in at New York Store (Region B)
        ↓
New York Store: checks local DB → not found
        ↓
New York Store → New York Hub: "Where is user alice@example.com?"
        ↓
New York Hub: queries NY stores → not found locally
        ↓
New York Hub: broadcasts to OTHER 6 REGIONAL HUBS
    "Does anyone have user alice@example.com?"
        ↓
    ┌───────┼───────┬────────┬─────────┐
    ▼       ▼       ▼        ▼         ▼
Chicago Dallas Phoenix Atlanta Logan Boise
  Hub     Hub     Hub      Hub    Hub   Hub
    ↓       ↓       ↓        ↓      ↓     ↓
   No      No      No       No    YES!  No
                                   ↓
                    Logan Hub responds:
            "Yes! User at store-logan-001.codepop.com"
                                   ↓
        New York Hub tells New York Store:
            "User found at Logan Store (Region C)"
                                   ↓
        New York Store → Logan Store (direct P2P)
            "Please send user alice's data"
                                   ↓
            Logan Store → New York Store
            (sends user account + preferences)
                                   ↓
        New York Store replicates user locally
                                   ↓
                User logs in successfully!
```

---

#### **Key Points**

1. **Hubs Coordinate Cross-Region Discovery**
   - Regional hubs don't just know about their own region
   - When user not found locally, hub queries **all other 6 regional hubs** in parallel
   - First hub to respond with "we have this user" provides the user's location

2. **Data Transfer Remains Direct Store-to-Store**
   - Once New York Store knows "user is at Logan Store", it contacts Logan Store **directly** (bypassing hubs)
   - This maintains the hybrid model: hub for discovery, direct P2P for data transfer
   - Works across regions just like same-region transfers

3. **Caching Prevents Repeated Cross-Region Lookups**
   - After first login, user account is cached at New York Store
   - Next login at New York: <100ms (local lookup)
   - No cross-region query needed again unless user hasn't visited NY Store in long time

---

#### **Performance Impact**

**Same-Region Login** (e.g., Logan Store 1 → Logan Store 2, both in Region C):
- Hub lookup within region: 50-200ms
- Direct store fetch: 100-500ms
- Local replication: 50-100ms
- **Total: 500-1000ms**

**Cross-Region Login** (e.g., Logan Store → New York Store, Region C → Region B):
- Hub query to local region: 50ms
- Local region search (miss): 100ms
- Cross-region hub coordination (6 hubs queried in parallel): 300-500ms
- Direct store fetch across regions: 200-800ms (longer network distance)
- Local replication: 50-100ms
- **Total: 1000-2000ms**

**Subsequent Logins** (at any store where account is cached):
- **Total: <100ms** (local only, no network lookup)

---

#### **Why This Still Qualifies as "Lazy"**

**Still lazy replication because:**
- User accounts are NOT eagerly replicated to all stores nationwide
- User accounts are NOT eagerly replicated to all regions
- Replication happens **only when user actually travels to that region**
- Most users stay in their home region (70-80%), avoiding cross-region queries entirely

**Nationwide reach:**
- Users CAN travel anywhere and log in successfully
- First login in new region is slightly slower (~2 seconds)
- Subsequent logins in that region are fast (<100ms, cached locally)
- Users are not locked to a single region

---

#### **Hub Coordination Protocol**

**Step-by-Step Hub Communication:**

1. **Local Search First** (fast path)
   - Hub always searches its own region first
   - If user found locally → return immediately (no cross-region query)

2. **Cross-Region Broadcast** (if local search fails)
   - Hub sends parallel queries to all 6 other regional hubs
   - Query format: "Does your region have user with username X?"
   - Timeout: 500ms per hub

3. **First Response Wins**
   - First hub to respond with "yes, we have this user" provides store address
   - Other responses are ignored (user can only have one origin store)
   - If NO hub responds within timeout → user does not exist (registration needed)

4. **Result Caching**
   - Requesting hub caches result: "User X is in Region C"
   - Future cross-region queries for same user skip broadcast (check cached region directly)
   - Cache TTL: 24 hours

---

#### **Data Model Updates**

**SupplyHub Functions (Updated):**
* **Service Registry**: Maintains list of stores in region with health status
* **User Account Lookup**: Queries stores in region to find user accounts
* **Cross-Region Hub Coordination**: Communicates with other 6 regional hubs to locate users traveling from different regions
* **Hub-to-Hub Directory**: Maintains list of other regional hubs' API endpoints for cross-region queries
* **Supply Request Management**: Receives and tracks supply requests from stores
* **Regional Inventory Aggregation**: Queries stores on-demand for regional inventory reports
* **Revenue Aggregation**: Queries stores on-demand for logistics manager revenue dashboards

---

#### **Failure Handling**

**What if Logan Hub is offline when NY Hub queries?**
- NY Hub queries 6 hubs in parallel
- Logan Hub doesn't respond (timeout after 500ms)
- NY Hub returns "User not found" to NY Store
- User cannot log in at NY Store until Logan Hub comes back online
- **Trade-off**: Accepted for distributed architecture (no central registry)

**Mitigation:**
- Hub-level redundancy (2 hubs per region) - future enhancement
- User can still log in at any store in their home region (Region C)

---

## **Summary**

**Lazy replication in CodePop works nationwide:**
- ✅ Users can travel from Logan, UT to New York, NY and log in successfully
- ✅ First cross-region login is ~2 seconds (acceptable one-time cost)
- ✅ Subsequent logins are <100ms (cached locally)
- ✅ Most users (70-80%) never trigger cross-region queries (stay in home region)
- ✅ No central user registry needed (maintains distributed architecture)
- ✅ Hubs coordinate discovery, stores handle direct data transfer

**This approach balances:**
- **User mobility** (can travel anywhere)
- **Performance** (cached after first visit)
- **Scalability** (no eager replication to thousands of stores)
- **Distributed architecture** (no single point of failure)
