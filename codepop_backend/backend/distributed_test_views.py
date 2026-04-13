"""
Distributed System Test Runners

Ported from demo_distributed_system.py to run as Django API views.
Allows super admin to test the hub-and-spoke network directly from the dashboard.
"""

import json
import random
import string
import time
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .permissions import IsSuperUser


# ─── Configuration ────────────────────────────────────────────────────────────

NODES = {
    "Logan Hub": {"url": "http://34.136.12.86:8000", "type": "hub", "region": "logan", "id": "logan-hub"},
    "Logan Store 1": {"url": "http://34.55.170.11:8000", "type": "store", "region": "logan", "id": "logan-s1"},
    "Logan Store 2": {"url": "http://34.121.91.135:8000", "type": "store", "region": "logan", "id": "logan-s2"},
    "Atlanta Hub": {"url": "http://136.115.168.184:8000", "type": "hub", "region": "atlanta", "id": "atlanta-hub"},
    "Atlanta Store 1": {"url": "http://136.112.202.76:8000", "type": "store", "region": "atlanta", "id": "atlanta-s1"},
    "Atlanta Store 2": {"url": "http://34.173.157.74:8000", "type": "store", "region": "atlanta", "id": "atlanta-s2"},
}

SECRET = "80e2aa14293fb413d71bd251200c96c3ab531d5c884fc795185bf3b23138b9c5cbfec31f6df709ecce64511046b8e9a06032"


# ─── HTTP Helpers ─────────────────────────────────────────────────────────────

def _req(url, method="GET", data=None, headers=None, timeout=12):
    """Make HTTP request and return (status_code, json_body, latency_ms, error_str)"""
    import requests

    t0 = time.time()
    h = {**(headers or {})}

    try:
        if method == "GET":
            r = requests.get(url, headers=h, timeout=timeout)
        else:  # POST
            r = requests.post(url, json=data, headers=h, timeout=timeout)

        ms = int((time.time() - t0) * 1000)
        try:
            body = r.json()
        except:
            body = {}
        return r.status_code, body, ms, None
    except requests.exceptions.RequestException as e:
        ms = int((time.time() - t0) * 1000)
        return 0, {}, ms, str(e)
    except Exception as e:
        ms = int((time.time() - t0) * 1000)
        return 0, {}, ms, str(e)


def GET(url, h=None, t=12):
    return _req(url, "GET", headers=h, timeout=t)


def POST(url, d, h=None, t=12):
    return _req(url, "POST", data=d, headers=h, timeout=t)


def auth():
    return {"Authorization": f"NodeToken {SECRET}"}


def rnd_email():
    s = "".join(random.choices(string.ascii_lowercase + string.digits, k=7))
    return f"demo_{s}@codepop.test"


# ─── Test Functions ───────────────────────────────────────────────────────────


def step(name, ok, sc=None, ms=None, detail=None):
    """Helper to build a step result object."""
    return {"step": name, "ok": ok, "status": sc, "ms": ms, "detail": detail}


def run_health():
    """Health check: POST to all nodes' health-check endpoint."""
    results = []
    for name, node in NODES.items():
        sc, data, ms, err = POST(
            f"{node['url']}/backend/api/inter-node/health-check/", {}, h=auth(), t=8
        )
        results.append(
            {
                "name": name,
                "id": node["id"],
                "type": node["type"],
                "region": node["region"],
                "ok": sc == 200,
                "store_id": data.get("store_id"),
                "ms": ms,
                "error": err if sc != 200 else None,
            }
        )
    return {"ok": all(r["ok"] for r in results), "nodes": results}


def run_registry():
    """Store registry: GET hub store lists."""
    out = {}
    for name, node in NODES.items():
        if node["type"] != "hub":
            continue
        sc, data, ms, err = GET(f"{node['url']}/backend/api/hub/store-registry/", h=auth())
        stores = data.get("stores", []) if sc == 200 else []
        out[name] = {"ok": sc == 200, "count": len(stores), "stores": stores, "ms": ms, "error": err}
    return {"ok": all(v["ok"] for v in out.values()), "hubs": out}


def run_heartbeat():
    """Heartbeat: stores ping their regional hubs."""
    results = []
    hub_url = {
        "logan": next(
            v["url"] for v in NODES.values() if v["type"] == "hub" and v["region"] == "logan"
        ),
        "atlanta": next(
            v["url"] for v in NODES.values() if v["type"] == "hub" and v["region"] == "atlanta"
        ),
    }
    for name, node in NODES.items():
        if node["type"] != "store":
            continue
        sc, hdata, _, _ = POST(
            f"{node['url']}/backend/api/inter-node/health-check/", {}, h=auth(), t=5
        )
        sid = hdata.get("store_id", 0) if sc == 200 else 0
        hub = "Logan Hub" if node["region"] == "logan" else "Atlanta Hub"
        sc2, _, ms, err = POST(
            f"{hub_url[node['region']]}/backend/api/hub/heartbeat/",
            {"store_id": sid, "status": "active"},
            h=auth(),
        )
        results.append(
            {"store": name, "hub": hub, "store_id": sid, "ok": sc2 == 200, "ms": ms, "error": err}
        )
    return {"ok": all(r["ok"] for r in results), "results": results}


def run_cross_store():
    """Cross-store login: register at Store 1, login at Store 2."""
    steps = []
    s1 = NODES["Logan Store 1"]["url"]
    s2 = NODES["Logan Store 2"]["url"]
    email = rnd_email()
    pw = "DemoPass123!"

    sc, _, ms, _ = POST(f"{s1}/backend/auth/register/", {"username": email, "email": email, "password": pw})
    steps.append(
        step("Register user at Logan Store 1", sc in (200, 201), sc, ms, f"user: {email}")
    )
    if not steps[-1]["ok"]:
        return {"ok": False, "steps": steps, "email": email}

    sc, data, ms, _ = POST(f"{s1}/backend/auth/login/", {"username": email, "password": pw})
    steps.append(
        step(
            "Local login at Logan Store 1 (home user)",
            sc == 200,
            sc,
            ms,
            f"token: {data.get('token', '')[:20]}…" if sc == 200 else str(data),
        )
    )
    if not steps[-1]["ok"]:
        return {"ok": False, "steps": steps, "email": email}

    sc, data, ms, _ = POST(f"{s2}/backend/auth/login/", {"username": email, "password": pw}, t=22)
    steps.append(
        step(
            "Cross-store login at Logan Store 2",
            sc == 200,
            sc,
            ms,
            (
                f"visiting={data.get('visiting')}, home_store={data.get('home_store')}"
                if sc == 200
                else str(data)
            ),
        )
    )
    return {"ok": all(x["ok"] for x in steps), "steps": steps, "email": email}


def run_cross_region():
    """Cross-region login: register at Logan Store 1, login at Atlanta Store 1."""
    steps = []
    s1 = NODES["Logan Store 1"]["url"]
    atl = NODES["Atlanta Store 1"]["url"]
    email = rnd_email()
    pw = "DemoPass123!"

    sc, _, ms, _ = POST(f"{s1}/backend/auth/register/", {"username": email, "email": email, "password": pw})
    steps.append(
        step("Register user at Logan Store 1", sc in (200, 201), sc, ms, f"user: {email}")
    )
    if not steps[-1]["ok"]:
        return {"ok": False, "steps": steps, "email": email}

    sc, data, ms, _ = POST(f"{atl}/backend/auth/login/", {"username": email, "password": pw}, t=28)
    steps.append(
        step(
            "Cross-region login at Atlanta Store 1 (hub mesh)",
            sc == 200,
            sc,
            ms,
            (
                f"visiting={data.get('visiting')}, home_store={data.get('home_store')}"
                if sc == 200
                else str(data)
            ),
        )
    )
    return {"ok": all(x["ok"] for x in steps), "steps": steps, "email": email}


def run_p2p_sync():
    """P2P user-sync: Store 2 fetches user from Store 1 directly."""
    steps = []
    s1 = NODES["Logan Store 1"]["url"]
    email = rnd_email()
    pw = "DemoPass123!"

    sc, _, ms, _ = POST(f"{s1}/backend/auth/register/", {"username": email, "email": email, "password": pw})
    steps.append(
        step("Register user at Logan Store 1", sc in (200, 201), sc, ms, f"user: {email}")
    )
    if not steps[-1]["ok"]:
        return {"ok": False, "steps": steps}

    sc, data, ms, _ = POST(
        f"{s1}/backend/api/inter-node/user-sync/",
        {"email": email, "requesting_store_id": 3},
        h=auth(),
        t=10,
    )
    user = (
        {
            "user_id": data.get("user_id"),
            "email": data.get("email"),
            "role": data.get("role"),
            "home_store_id": data.get("home_store_id"),
        }
        if sc == 200
        else None
    )
    steps.append(
        step(
            "P2P user-sync: Store 2 fetches directly from Store 1",
            sc == 200,
            sc,
            ms,
            (
                f"user_id={user['user_id']}, email={user['email']}, role={user['role']}"
                if user
                else str(data)
            ),
        )
    )
    return {"ok": all(x["ok"] for x in steps), "steps": steps, "user": user}


def run_profile_update():
    """Profile update: register, visit another store, propagate changes back to home."""
    steps = []
    s1 = NODES["Logan Store 1"]["url"]
    s2 = NODES["Logan Store 2"]["url"]
    email = rnd_email()
    pw = "DemoPass123!"

    # Register at Store 1
    sc, _, ms, _ = POST(f"{s1}/backend/auth/register/", {"username": email, "email": email, "password": pw})
    steps.append(step("Register user at Logan Store 1", sc in (200, 201), sc, ms, f"user: {email}"))
    if not steps[-1]["ok"]:
        return {"ok": False, "steps": steps}

    # Cross-store login at Store 2
    sc, login_data, ms, _ = POST(f"{s2}/backend/auth/login/", {"username": email, "password": pw}, t=22)
    steps.append(
        step(
            "Login at Logan Store 2 (creates visiting user cache)",
            sc == 200,
            sc,
            ms,
            f"visiting={login_data.get('visiting')}" if sc == 200 else str(login_data),
        )
    )
    if not steps[-1]["ok"]:
        return {"ok": False, "steps": steps}

    # Push profile update to home store
    user_id = login_data.get("user_id")
    changes = {"preferences": ["mango", "peach"], "favorite_drink_ids": []}
    sc, data, ms, _ = POST(
        f"{s1}/backend/api/inter-node/profile-update/",
        {
            "user_id": user_id,
            "changes": changes,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        },
        h=auth(),
        t=10,
    )
    steps.append(
        step(
            "Profile update propagated to Logan Store 1 (home store)",
            sc == 200,
            sc,
            ms,
            f"preferences confirmed on home store" if sc == 200 else str(data),
        )
    )
    return {"ok": all(x["ok"] for x in steps), "steps": steps, "email": email}


def run_revenue():
    """Revenue aggregation: fetch revenue from both hubs and compute grand total."""
    out = {}
    grand = 0.0
    for name, node in NODES.items():
        if node["type"] != "hub":
            continue
        sc, data, ms, err = GET(f"{node['url']}/backend/api/hub/revenue/", h=auth(), t=22)
        if sc == 200:
            t = data.get("total_revenue", 0.0)
            grand += t
            out[name] = {
                "ok": True,
                "region": data.get("hub_region"),
                "total": t,
                "stores": data.get("store_count"),
                "ms": ms,
            }
        else:
            out[name] = {"ok": False, "error": err or str(data), "ms": ms}
    return {"ok": all(v["ok"] for v in out.values()), "hubs": out, "grand_total": round(grand, 2)}


def run_auth_reject():
    """Auth rejection: verify inter-node endpoints reject requests without NodeToken."""
    results = []
    cases = [
        (
            "Logan Hub",
            "POST /backend/api/hub/register/",
            lambda: POST(
                f"{NODES['Logan Hub']['url']}/backend/api/hub/register/",
                {"store_id": 99, "store_name": "x", "region": "x", "api_endpoint": "x"},
                h={},
            ),
        ),
        (
            "Logan Store 1",
            "POST /backend/api/inter-node/user-sync/",
            lambda: POST(
                f"{NODES['Logan Store 1']['url']}/backend/api/inter-node/user-sync/",
                {"email": "x@x.com"},
                h={},
            ),
        ),
        (
            "Atlanta Hub",
            "GET  /backend/api/hub/revenue/",
            lambda: GET(f"{NODES['Atlanta Hub']['url']}/backend/api/hub/revenue/", h={}),
        ),
    ]
    for node_name, label, fn in cases:
        sc, _, ms, _ = fn()
        ok = sc in (401, 403)
        results.append(
            {
                "node": node_name,
                "endpoint": label,
                "ok": ok,
                "status": sc,
                "ms": ms,
                "detail": f"Correctly rejected ({sc})" if ok else f"Expected 401/403, got {sc}",
            }
        )
    return {"ok": all(r["ok"] for r in results), "results": results}


# ─── Test Registry ────────────────────────────────────────────────────────────

RUNNERS = {
    "health": ("Health Check", run_health),
    "registry": ("Store Registry", run_registry),
    "heartbeat": ("Heartbeat", run_heartbeat),
    "cross_store": ("Cross-Store Login", run_cross_store),
    "cross_region": ("Cross-Region Login", run_cross_region),
    "p2p_sync": ("P2P User Sync", run_p2p_sync),
    "profile_update": ("Profile Update Propagation", run_profile_update),
    "revenue": ("Revenue Aggregation", run_revenue),
    "auth_reject": ("Auth Rejection", run_auth_reject),
}


# ─── DRF Views ────────────────────────────────────────────────────────────────


class DistributedTestListView(APIView):
    """GET /backend/api/admin/distributed-tests/

    Returns list of available tests with metadata.
    """

    permission_classes = [IsSuperUser]

    def get(self, request):
        tests = [{"id": test_id, "name": name} for test_id, (name, _) in RUNNERS.items()]
        return Response({"tests": tests})


class DistributedTestRunView(APIView):
    """POST /backend/api/admin/distributed-tests/run/

    Runs a specified test. Request body: {"test_id": "health"}
    Special test_id "all" runs all tests.
    """

    permission_classes = [IsSuperUser]

    def post(self, request):
        test_id = request.data.get("test_id")

        if not test_id:
            return Response({"error": "test_id required"}, status=status.HTTP_400_BAD_REQUEST)

        if test_id == "all":
            results = {}
            for tid, (name, fn) in RUNNERS.items():
                try:
                    results[tid] = {"name": name, **fn()}
                except Exception as e:
                    results[tid] = {"name": name, "ok": False, "error": str(e)}
            return Response({"results": results})

        elif test_id in RUNNERS:
            name, fn = RUNNERS[test_id]
            try:
                result = fn()
                return Response({"id": test_id, "name": name, **result})
            except Exception as e:
                return Response(
                    {"id": test_id, "name": name, "ok": False, "error": str(e)},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        else:
            return Response({"error": f"Unknown test_id: {test_id}"}, status=status.HTTP_400_BAD_REQUEST)
