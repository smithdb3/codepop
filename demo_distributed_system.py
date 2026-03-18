#!/usr/bin/env python3
"""
CodePop Distributed Network Demo Server
========================================
Interactive web-based demo of the hub-and-spoke distributed system.

Run with:   python3 demo_server.py
Then open:  http://localhost:8080
"""

import json, random, string, time, webbrowser, logging
import urllib.request, urllib.error
from http.server import BaseHTTPRequestHandler, HTTPServer
from socketserver import ThreadingMixIn

logging.getLogger("http.server").setLevel(logging.WARNING)

PORT = 8080

NODES = {
    "Logan Hub":       {"url": "http://34.136.12.86:8000",    "type": "hub",   "region": "logan",   "id": "logan-hub"},
    "Logan Store 1":   {"url": "http://34.55.170.11:8000",    "type": "store", "region": "logan",   "id": "logan-s1"},
    "Logan Store 2":   {"url": "http://34.121.91.135:8000",   "type": "store", "region": "logan",   "id": "logan-s2"},
    "Atlanta Hub":     {"url": "http://136.115.168.184:8000", "type": "hub",   "region": "atlanta", "id": "atlanta-hub"},
    "Atlanta Store 1": {"url": "http://136.112.202.76:8000",  "type": "store", "region": "atlanta", "id": "atlanta-s1"},
    "Atlanta Store 2": {"url": "http://34.173.157.74:8000",   "type": "store", "region": "atlanta", "id": "atlanta-s2"},
}
SECRET = "80e2aa14293fb413d71bd251200c96c3ab531d5c884fc795185bf3b23138b9c5cbfec31f6df709ecce64511046b8e9a06032"


# ─── HTTP helpers ─────────────────────────────────────────────────────────────

def _req(url, method="GET", data=None, headers=None, timeout=12):
    t0 = time.time()
    h = {**(headers or {})}
    body = None
    if data is not None:
        body = json.dumps(data).encode()
        h["Content-Type"] = "application/json"
    try:
        req = urllib.request.Request(url, data=body, headers=h, method=method)
        with urllib.request.urlopen(req, timeout=timeout) as r:
            ms = int((time.time() - t0) * 1000)
            return r.status, json.loads(r.read().decode()), ms, None
    except urllib.error.HTTPError as e:
        ms = int((time.time() - t0) * 1000)
        try:    bd = json.loads(e.read().decode())
        except: bd = {}
        return e.code, bd, ms, str(e)
    except Exception as e:
        ms = int((time.time() - t0) * 1000)
        return 0, {}, ms, str(e)

def GET(url, h=None, t=12):      return _req(url, "GET",  headers=h, timeout=t)
def POST(url, d, h=None, t=12):  return _req(url, "POST", data=d, headers=h, timeout=t)
def auth():   return {"Authorization": f"NodeToken {SECRET}"}
def rnd_email():
    s = "".join(random.choices(string.ascii_lowercase + string.digits, k=7))
    return f"demo_{s}@codepop.test"


# ─── Demo steps ───────────────────────────────────────────────────────────────

def step(name, ok, sc=None, ms=None, detail=None):
    return {"step": name, "ok": ok, "status": sc, "ms": ms, "detail": detail}


def run_health():
    results = []
    for name, node in NODES.items():
        sc, data, ms, err = POST(
            f"{node['url']}/backend/api/inter-node/health-check/", {}, h=auth(), t=8
        )
        results.append({
            "name": name, "id": node["id"], "type": node["type"], "region": node["region"],
            "ok": sc == 200,
            "store_id": data.get("store_id"),
            "ms": ms,
            "error": err if sc != 200 else None,
        })
    return {"ok": all(r["ok"] for r in results), "nodes": results}


def run_registry():
    out = {}
    for name, node in NODES.items():
        if node["type"] != "hub": continue
        sc, data, ms, err = GET(f"{node['url']}/backend/api/hub/store-registry/", h=auth())
        stores = data.get("stores", []) if sc == 200 else []
        out[name] = {"ok": sc == 200, "count": len(stores), "stores": stores, "ms": ms, "error": err}
    return {"ok": all(v["ok"] for v in out.values()), "hubs": out}


def run_heartbeat():
    results = []
    hub_url = {
        "logan":   next(v["url"] for v in NODES.values() if v["type"] == "hub" and v["region"] == "logan"),
        "atlanta": next(v["url"] for v in NODES.values() if v["type"] == "hub" and v["region"] == "atlanta"),
    }
    for name, node in NODES.items():
        if node["type"] != "store": continue
        sc, hdata, _, _ = POST(f"{node['url']}/backend/api/inter-node/health-check/", {}, h=auth(), t=5)
        sid = hdata.get("store_id", 0) if sc == 200 else 0
        hub = "Logan Hub" if node["region"] == "logan" else "Atlanta Hub"
        sc2, _, ms, err = POST(
            f"{hub_url[node['region']]}/backend/api/hub/heartbeat/",
            {"store_id": sid, "status": "active"}, h=auth()
        )
        results.append({
            "store": name, "hub": hub, "store_id": sid,
            "ok": sc2 == 200, "ms": ms, "error": err,
        })
    return {"ok": all(r["ok"] for r in results), "results": results}


def run_cross_store():
    steps = []
    s1 = NODES["Logan Store 1"]["url"]
    s2 = NODES["Logan Store 2"]["url"]
    email = rnd_email(); pw = "DemoPass123!"

    sc, _, ms, _ = POST(f"{s1}/backend/auth/register/",
                        {"username": email, "email": email, "password": pw})
    steps.append(step("Register user at Logan Store 1", sc in (200, 201), sc, ms, f"user: {email}"))
    if not steps[-1]["ok"]: return {"ok": False, "steps": steps, "email": email}

    sc, data, ms, _ = POST(f"{s1}/backend/auth/login/", {"username": email, "password": pw})
    steps.append(step("Local login at Logan Store 1 (home user)", sc == 200, sc, ms,
                      f"token: {data.get('token','')[:20]}…" if sc == 200 else str(data)))
    if not steps[-1]["ok"]: return {"ok": False, "steps": steps, "email": email}

    sc, data, ms, _ = POST(f"{s2}/backend/auth/login/", {"username": email, "password": pw}, t=22)
    steps.append(step("Cross-store login at Logan Store 2", sc == 200, sc, ms,
                      (f"visiting={data.get('visiting')}, home_store={data.get('home_store')}"
                       if sc == 200 else str(data))))
    return {"ok": all(x["ok"] for x in steps), "steps": steps, "email": email}


def run_cross_region():
    steps = []
    s1  = NODES["Logan Store 1"]["url"]
    atl = NODES["Atlanta Store 1"]["url"]
    email = rnd_email(); pw = "DemoPass123!"

    sc, _, ms, _ = POST(f"{s1}/backend/auth/register/",
                        {"username": email, "email": email, "password": pw})
    steps.append(step("Register user at Logan Store 1", sc in (200, 201), sc, ms, f"user: {email}"))
    if not steps[-1]["ok"]: return {"ok": False, "steps": steps, "email": email}

    sc, data, ms, _ = POST(f"{atl}/backend/auth/login/", {"username": email, "password": pw}, t=28)
    steps.append(step("Cross-region login at Atlanta Store 1 (hub mesh)", sc == 200, sc, ms,
                      (f"visiting={data.get('visiting')}, home_store={data.get('home_store')}"
                       if sc == 200 else str(data))))
    return {"ok": all(x["ok"] for x in steps), "steps": steps, "email": email}


def run_p2p_sync():
    """Direct P2P user-sync: Store 2 fetches user from Store 1, no hub involved."""
    steps = []
    s1 = NODES["Logan Store 1"]["url"]
    email = rnd_email(); pw = "DemoPass123!"

    sc, _, ms, _ = POST(f"{s1}/backend/auth/register/",
                        {"username": email, "email": email, "password": pw})
    steps.append(step("Register user at Logan Store 1", sc in (200, 201), sc, ms, f"user: {email}"))
    if not steps[-1]["ok"]: return {"ok": False, "steps": steps}

    sc, data, ms, _ = POST(f"{s1}/backend/api/inter-node/user-sync/",
                           {"email": email, "requesting_store_id": 3}, h=auth(), t=10)
    user = ({"user_id": data.get("user_id"), "email": data.get("email"),
             "role": data.get("role"), "home_store_id": data.get("home_store_id")}
            if sc == 200 else None)
    steps.append(step("P2P user-sync: Store 2 fetches directly from Store 1", sc == 200, sc, ms,
                      (f"user_id={user['user_id']}, email={user['email']}, role={user['role']}"
                       if user else str(data))))
    return {"ok": all(x["ok"] for x in steps), "steps": steps, "user": user}


def run_profile_update():
    """
    Register a user, log them in at a visiting store, then trigger a profile update
    via the inter-node profile-update endpoint (simulating what happens when preferences
    are changed at a visiting store and propagated back to the home store).
    """
    steps = []
    s1 = NODES["Logan Store 1"]["url"]
    s2 = NODES["Logan Store 2"]["url"]
    email = rnd_email(); pw = "DemoPass123!"

    # 1. Register at Store 1
    sc, _, ms, _ = POST(f"{s1}/backend/auth/register/",
                        {"username": email, "email": email, "password": pw})
    steps.append(step("Register user at Logan Store 1", sc in (200, 201), sc, ms, f"user: {email}"))
    if not steps[-1]["ok"]: return {"ok": False, "steps": steps}

    # 2. Cross-store login at Store 2 (creates VisitingUserCache + shadow user)
    sc, login_data, ms, _ = POST(f"{s2}/backend/auth/login/",
                                 {"username": email, "password": pw}, t=22)
    steps.append(step("Login at Logan Store 2 (creates visiting user cache)", sc == 200, sc, ms,
                      f"visiting={login_data.get('visiting')}" if sc == 200 else str(login_data)))
    if not steps[-1]["ok"]: return {"ok": False, "steps": steps}

    # 3. Push a profile update directly to the home store (inter-node endpoint)
    #    Simulates what _propagate_to_home_store() sends after a preference change
    user_id = login_data.get("user_id")
    changes = {"preferences": ["mango", "peach"], "favorite_drink_ids": []}
    sc, data, ms, _ = POST(f"{s1}/backend/api/inter-node/profile-update/",
                           {"user_id": user_id, "changes": changes,
                            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())},
                           h=auth(), t=10)
    steps.append(step("Profile update propagated to Logan Store 1 (home store)", sc == 200, sc, ms,
                      f"preferences confirmed on home store" if sc == 200 else str(data)))
    return {"ok": all(x["ok"] for x in steps), "steps": steps, "email": email}


def run_revenue():
    out = {}
    grand = 0.0
    for name, node in NODES.items():
        if node["type"] != "hub": continue
        sc, data, ms, err = GET(f"{node['url']}/backend/api/hub/revenue/", h=auth(), t=22)
        if sc == 200:
            t = data.get("total_revenue", 0.0)
            grand += t
            out[name] = {
                "ok": True, "region": data.get("hub_region"),
                "total": t, "stores": data.get("store_count"), "ms": ms,
            }
        else:
            out[name] = {"ok": False, "error": err or str(data), "ms": ms}
    return {"ok": all(v["ok"] for v in out.values()), "hubs": out, "grand_total": round(grand, 2)}


def run_auth_reject():
    """Verify inter-node endpoints reject requests without the NodeToken."""
    results = []
    cases = [
        ("Logan Hub",     "POST /backend/api/hub/register/",
         lambda: POST(f"{NODES['Logan Hub']['url']}/backend/api/hub/register/",
                      {"store_id": 99, "store_name": "x", "region": "x", "api_endpoint": "x"},
                      h={})),
        ("Logan Store 1", "POST /backend/api/inter-node/user-sync/",
         lambda: POST(f"{NODES['Logan Store 1']['url']}/backend/api/inter-node/user-sync/",
                      {"email": "x@x.com"}, h={})),
        ("Atlanta Hub",   "GET  /backend/api/hub/revenue/",
         lambda: GET(f"{NODES['Atlanta Hub']['url']}/backend/api/hub/revenue/", h={})),
    ]
    for node_name, label, fn in cases:
        sc, _, ms, _ = fn()
        ok = sc in (401, 403)
        results.append({
            "node": node_name, "endpoint": label, "ok": ok, "status": sc, "ms": ms,
            "detail": f"Correctly rejected ({sc})" if ok else f"Expected 401/403, got {sc}",
        })
    return {"ok": all(r["ok"] for r in results), "results": results}


RUNNERS = {
    "health":         ("Health Check",               run_health),
    "registry":       ("Store Registry",              run_registry),
    "heartbeat":      ("Heartbeat",                   run_heartbeat),
    "cross_store":    ("Cross-Store Login",           run_cross_store),
    "cross_region":   ("Cross-Region Login",          run_cross_region),
    "p2p_sync":       ("P2P User Sync",               run_p2p_sync),
    "profile_update": ("Profile Update Propagation", run_profile_update),
    "revenue":        ("Revenue Aggregation",         run_revenue),
    "auth_reject":    ("Auth Rejection",              run_auth_reject),
}


# ─── HTML ─────────────────────────────────────────────────────────────────────

HTML = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CodePop Distributed Network Demo</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:       #0a0f1e;
    --card:     #111827;
    --card2:    #1a2236;
    --border:   #1f2f4a;
    --text:     #e2e8f0;
    --muted:    #64748b;
    --hub:      #7c3aed;
    --hub-bg:   #1e1040;
    --store:    #0ea5e9;
    --store-bg: #071e30;
    --ok:       #10b981;
    --fail:     #ef4444;
    --warn:     #f59e0b;
    --pulse:    #00e5ff;
  }

  body { background: var(--bg); color: var(--text); font-family: 'Segoe UI', system-ui, sans-serif;
         min-height: 100vh; }

  /* ── Header ── */
  header { display: flex; align-items: center; justify-content: space-between;
            padding: 18px 28px; border-bottom: 1px solid var(--border);
            background: linear-gradient(90deg, #0a0f1e 0%, #101830 100%); }
  header h1 { font-size: 1.35rem; font-weight: 700; letter-spacing: .5px; color: #fff; }
  header h1 span { color: var(--pulse); }
  #overall-badge { padding: 4px 14px; border-radius: 999px; font-size: .75rem;
                   font-weight: 600; background: var(--card2); border: 1px solid var(--border);
                   color: var(--muted); transition: all .3s; }
  #overall-badge.running { border-color: var(--warn); color: var(--warn); }
  #overall-badge.pass    { border-color: var(--ok);   color: var(--ok);   }
  #overall-badge.fail    { border-color: var(--fail);  color: var(--fail);  }

  /* ── Main layout ── */
  .main { display: grid; grid-template-columns: 1fr 300px; gap: 18px;
          padding: 20px 28px 0; }

  /* ── Topology ── */
  .topology-panel { background: var(--card); border: 1px solid var(--border);
                    border-radius: 14px; padding: 20px; }
  .topology-panel h2 { font-size: .82rem; text-transform: uppercase; letter-spacing: 1px;
                        color: var(--muted); margin-bottom: 14px; }

  /* SVG node styles */
  .node-hub  { fill: var(--hub-bg);   stroke: var(--hub);   stroke-width: 1.8; transition: stroke .3s; }
  .node-store{ fill: var(--store-bg); stroke: var(--store); stroke-width: 1.5; transition: stroke .3s; }
  .node-hub.ok   { stroke: var(--ok);   fill: #042318; }
  .node-store.ok { stroke: var(--ok);   fill: #012a1a; }
  .node-hub.fail,  .node-store.fail  { stroke: var(--fail);  fill: #250808; }
  .node-hub.checking, .node-store.checking { stroke: var(--warn); animation: pulse-border 1s ease-in-out infinite; }

  @keyframes pulse-border { 0%,100%{opacity:1} 50%{opacity:.4} }

  .link { stroke: #1e3a5f; stroke-width: 1.5; fill: none; transition: stroke .3s; }
  .link.mesh { stroke-dasharray: 6 5; stroke: #2a1f60; }
  .link.active { stroke: var(--pulse); animation: dash-flow .7s linear infinite; }
  .link.mesh.active { stroke: #a855f7; stroke-dasharray: 8 6; }
  @keyframes dash-flow { from{stroke-dashoffset:28} to{stroke-dashoffset:0} }
  .link.active { stroke-dasharray: 5 7; }

  .node-label { fill: var(--text); font-size: 12px; font-weight: 600;
                text-anchor: middle; dominant-baseline: middle; pointer-events: none; }
  .node-sub   { fill: var(--muted); font-size: 10px; text-anchor: middle;
                dominant-baseline: middle; pointer-events: none; }
  .node-id    { fill: #4a9eba; font-size: 9px; text-anchor: middle;
                dominant-baseline: middle; pointer-events: none; }

  .status-dot { transition: fill .3s; }
  .status-dot.unknown  { fill: var(--muted); }
  .status-dot.ok       { fill: var(--ok);   filter: drop-shadow(0 0 3px var(--ok)); }
  .status-dot.fail     { fill: var(--fail);  filter: drop-shadow(0 0 3px var(--fail)); }
  .status-dot.checking { fill: var(--warn);  animation: pulse-border .8s ease-in-out infinite; }

  .region-label { fill: #2a3d5a; font-size: 11px; font-weight: 700;
                  text-anchor: middle; letter-spacing: 1px; }

  /* ── Controls panel ── */
  .controls-panel { background: var(--card); border: 1px solid var(--border);
                    border-radius: 14px; padding: 20px; display: flex; flex-direction: column; gap: 10px; }
  .controls-panel h2 { font-size: .82rem; text-transform: uppercase;
                        letter-spacing: 1px; color: var(--muted); }

  #btn-run-all { background: linear-gradient(135deg, #5b21b6, #7c3aed);
                 color: #fff; border: none; border-radius: 10px; padding: 13px 16px;
                 font-size: .95rem; font-weight: 700; cursor: pointer; width: 100%;
                 transition: opacity .2s, transform .1s; letter-spacing: .3px; }
  #btn-run-all:hover { opacity: .9; }
  #btn-run-all:active { transform: scale(.97); }
  #btn-run-all:disabled { opacity: .45; cursor: not-allowed; }

  .divider { border: none; border-top: 1px solid var(--border); }

  .test-btn { display: flex; align-items: center; justify-content: space-between;
              background: var(--card2); border: 1px solid var(--border);
              border-radius: 8px; padding: 9px 12px; font-size: .82rem;
              color: var(--text); cursor: pointer; transition: border-color .2s, background .2s;
              width: 100%; text-align: left; }
  .test-btn:hover  { border-color: var(--store); background: #0d1f35; }
  .test-btn.running{ border-color: var(--warn); }
  .test-btn.pass   { border-color: var(--ok); }
  .test-btn.fail   { border-color: var(--fail); }

  .test-btn .icon { font-size: .95rem; }
  .test-btn .status-icon { font-size: .85rem; min-width: 18px; text-align: right; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .spinner { display: inline-block; animation: spin .7s linear infinite; }

  /* ── Results grid ── */
  .results-section { padding: 18px 28px 0; }
  .results-section h2 { font-size: .82rem; text-transform: uppercase;
                         letter-spacing: 1px; color: var(--muted); margin-bottom: 14px; }
  .results-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
                  gap: 14px; }

  .result-card { background: var(--card); border: 1px solid var(--border);
                 border-radius: 12px; padding: 16px; transition: border-color .3s; }
  .result-card.pass { border-color: #1a3d2a; }
  .result-card.fail { border-color: #3d1a1a; }

  .result-card .card-header { display: flex; align-items: center;
                               justify-content: space-between; margin-bottom: 12px; }
  .result-card .card-title  { font-size: .88rem; font-weight: 600; }
  .result-card .card-badge  { font-size: .72rem; font-weight: 700; padding: 3px 10px;
                               border-radius: 999px; }
  .card-badge.pass { background: #064e3b; color: var(--ok); }
  .card-badge.fail { background: #450a0a; color: var(--fail); }

  .step-row { display: flex; align-items: flex-start; gap: 8px; padding: 6px 0;
              border-bottom: 1px solid #161f30; font-size: .79rem; }
  .step-row:last-child { border-bottom: none; }
  .step-icon { font-size: .85rem; margin-top: 1px; flex-shrink: 0; }
  .step-name { flex: 1; color: var(--text); }
  .step-detail{ color: var(--muted); font-size: .73rem; margin-top: 2px; }
  .step-ms   { color: var(--muted); font-size: .72rem; white-space: nowrap; flex-shrink: 0; }
  .step-status { font-size: .72rem; font-weight: 700; padding: 1px 7px;
                 border-radius: 4px; flex-shrink: 0; }
  .step-status.ok   { background: #064e3b; color: var(--ok); }
  .step-status.fail { background: #450a0a; color: var(--fail); }

  .kv-table { width: 100%; border-collapse: collapse; font-size: .78rem; }
  .kv-table td { padding: 4px 6px; border-bottom: 1px solid #161f30; }
  .kv-table tr:last-child td { border-bottom: none; }
  .kv-table .k { color: var(--muted); width: 45%; }
  .kv-table .v { color: var(--text); font-family: monospace; }
  .kv-table .v.ok   { color: var(--ok); }
  .kv-table .v.fail { color: var(--fail); }

  /* ── Log feed ── */
  .log-section { padding: 18px 28px 28px; }
  .log-section h2 { font-size: .82rem; text-transform: uppercase;
                    letter-spacing: 1px; color: var(--muted); margin-bottom: 10px; }
  #log-feed { background: var(--card); border: 1px solid var(--border);
              border-radius: 12px; padding: 14px 16px; height: 220px;
              overflow-y: auto; font-family: 'Courier New', monospace; font-size: .78rem; }
  #log-feed::-webkit-scrollbar { width: 5px; }
  #log-feed::-webkit-scrollbar-track { background: #111827; }
  #log-feed::-webkit-scrollbar-thumb { background: #1f2f4a; border-radius: 3px; }

  .log-line { padding: 2px 0; display: flex; gap: 10px; }
  .log-time  { color: #2d4a6a; flex-shrink: 0; }
  .log-msg   { color: var(--muted); }
  .log-msg.ok { color: var(--ok); }
  .log-msg.fail { color: var(--fail); }
  .log-msg.info { color: var(--pulse); }
  .log-msg.warn { color: var(--warn); }
</style>
</head>
<body>

<header>
  <h1>CodePop Distributed Network Demo</h1>
  <span id="overall-badge">Idle</span>
</header>

<!-- ── Main: topology + controls ───────────────────────────────────── -->
<div class="main">
  <div class="topology-panel">
    <h2>Live Network Topology</h2>
    <svg id="topology-svg" viewBox="0 0 820 330" width="100%" preserveAspectRatio="xMidYMid meet">

      <!-- Region labels -->
      <text class="region-label" x="210" y="310">LOGAN REGION</text>
      <text class="region-label" x="610" y="310">ATLANTA REGION</text>

      <!-- Hub mesh connection (hub ↔ hub) -->
      <line id="link-hub-mesh" class="link mesh" x1="295" y1="68" x2="525" y2="68"/>

      <!-- Hub → Store connections -->
      <line id="link-loghub-logs1" class="link" x1="195" y1="105" x2="100"  y2="224"/>
      <line id="link-loghub-logs2" class="link" x1="210" y1="105" x2="295"  y2="224"/>
      <line id="link-atlhub-atls1" class="link" x1="605" y1="105" x2="510"  y2="224"/>
      <line id="link-atlhub-atls2" class="link" x1="620" y1="105" x2="710"  y2="224"/>

      <!-- Logan Hub -->
      <rect id="node-logan-hub" class="node-hub" x="110" y="30" width="190" height="75" rx="10"/>
      <text class="node-label" x="205" y="58">Logan Hub</text>
      <text class="node-sub"   x="205" y="74">hub · logan</text>
      <text class="node-id"    x="205" y="89" id="lbl-logan-hub">store_id=?</text>
      <circle id="dot-logan-hub" class="status-dot unknown" cx="290" cy="38" r="6"/>

      <!-- Atlanta Hub -->
      <rect id="node-atlanta-hub" class="node-hub" x="520" y="30" width="190" height="75" rx="10"/>
      <text class="node-label" x="615" y="58">Atlanta Hub</text>
      <text class="node-sub"   x="615" y="74">hub · atlanta</text>
      <text class="node-id"    x="615" y="89" id="lbl-atlanta-hub">store_id=?</text>
      <circle id="dot-atlanta-hub" class="status-dot unknown" cx="700" cy="38" r="6"/>

      <!-- Logan Store 1 -->
      <rect id="node-logan-s1" class="node-store" x="28"  y="224" width="148" height="60" rx="8"/>
      <text class="node-label" x="102" y="248">Logan Store 1</text>
      <text class="node-sub"   x="102" y="263">store · logan</text>
      <text class="node-id"    x="102" y="277" id="lbl-logan-s1">store_id=?</text>
      <circle id="dot-logan-s1" class="status-dot unknown" cx="168" cy="230" r="5"/>

      <!-- Logan Store 2 -->
      <rect id="node-logan-s2" class="node-store" x="220" y="224" width="148" height="60" rx="8"/>
      <text class="node-label" x="294" y="248">Logan Store 2</text>
      <text class="node-sub"   x="294" y="263">store · logan</text>
      <text class="node-id"    x="294" y="277" id="lbl-logan-s2">store_id=?</text>
      <circle id="dot-logan-s2" class="status-dot unknown" cx="360" cy="230" r="5"/>

      <!-- Atlanta Store 1 -->
      <rect id="node-atlanta-s1" class="node-store" x="440" y="224" width="148" height="60" rx="8"/>
      <text class="node-label" x="514" y="248">Atlanta Store 1</text>
      <text class="node-sub"   x="514" y="263">store · atlanta</text>
      <text class="node-id"    x="514" y="277" id="lbl-atlanta-s1">store_id=?</text>
      <circle id="dot-atlanta-s1" class="status-dot unknown" cx="580" cy="230" r="5"/>

      <!-- Atlanta Store 2 -->
      <rect id="node-atlanta-s2" class="node-store" x="635" y="224" width="148" height="60" rx="8"/>
      <text class="node-label" x="709" y="248">Atlanta Store 2</text>
      <text class="node-sub"   x="709" y="263">store · atlanta</text>
      <text class="node-id"    x="709" y="277" id="lbl-atlanta-s2">store_id=?</text>
      <circle id="dot-atlanta-s2" class="status-dot unknown" cx="775" cy="230" r="5"/>
    </svg>
  </div>

  <div class="controls-panel">
    <h2>Tests</h2>
    <button id="btn-run-all" onclick="runAll()">Run All Tests</button>
    <hr class="divider">
    <button class="test-btn" id="tbtn-health"         onclick="runOne('health')">
      <span>Health Check</span><span class="status-icon" id="si-health">–</span></button>
    <button class="test-btn" id="tbtn-registry"       onclick="runOne('registry')">
      <span>Store Registry</span><span class="status-icon" id="si-registry">–</span></button>
    <button class="test-btn" id="tbtn-heartbeat"      onclick="runOne('heartbeat')">
      <span>Heartbeat</span><span class="status-icon" id="si-heartbeat">–</span></button>
    <button class="test-btn" id="tbtn-cross_store"    onclick="runOne('cross_store')">
      <span>Cross-Store Login</span><span class="status-icon" id="si-cross_store">–</span></button>
    <button class="test-btn" id="tbtn-cross_region"   onclick="runOne('cross_region')">
      <span>Cross-Region Login</span><span class="status-icon" id="si-cross_region">–</span></button>
    <button class="test-btn" id="tbtn-p2p_sync"       onclick="runOne('p2p_sync')">
      <span>P2P User Sync</span><span class="status-icon" id="si-p2p_sync">–</span></button>
    <button class="test-btn" id="tbtn-profile_update" onclick="runOne('profile_update')">
      <span>Profile Propagation</span><span class="status-icon" id="si-profile_update">–</span></button>
    <button class="test-btn" id="tbtn-revenue"        onclick="runOne('revenue')">
      <span>Revenue Aggregation</span><span class="status-icon" id="si-revenue">–</span></button>
    <button class="test-btn" id="tbtn-auth_reject"    onclick="runOne('auth_reject')">
      <span>Auth Rejection</span><span class="status-icon" id="si-auth_reject">–</span></button>
  </div>
</div>

<!-- ── Results ─────────────────────────────────────────────────────── -->
<div class="results-section">
  <h2>Test Results</h2>
  <div class="results-grid" id="results-grid"></div>
</div>

<!-- ── Log ─────────────────────────────────────────────────────────── -->
<div class="log-section">
  <h2>Activity Log</h2>
  <div id="log-feed"></div>
</div>

<script>
// ── Config ───────────────────────────────────────────────────────────
const TESTS = [
  "health","registry","heartbeat","cross_store","cross_region",
  "p2p_sync","profile_update","revenue","auth_reject"
];

const LABELS = {
  health:"Health Check", registry:"Store Registry",
  heartbeat:"Heartbeat", cross_store:"Cross-Store Login",
  cross_region:"Cross-Region Login", p2p_sync:"P2P User Sync",
  profile_update:"Profile Propagation", revenue:"Revenue Aggregation",
  auth_reject:"Auth Rejection"
};

// Which SVG links to animate per test
const TEST_LINKS = {
  health:         [],
  registry:       ["link-hub-mesh"],
  heartbeat:      ["link-loghub-logs1","link-loghub-logs2","link-atlhub-atls1","link-atlhub-atls2"],
  cross_store:    ["link-loghub-logs1","link-loghub-logs2"],
  cross_region:   ["link-loghub-logs1","link-hub-mesh","link-atlhub-atls1"],
  p2p_sync:       ["link-loghub-logs1","link-loghub-logs2"],
  profile_update: ["link-loghub-logs1","link-loghub-logs2"],
  revenue:        ["link-loghub-logs1","link-loghub-logs2","link-hub-mesh","link-atlhub-atls1","link-atlhub-atls2"],
  auth_reject:    [],
};

// Which nodes to mark as "checking" per test
const TEST_NODES = {
  health:         ["logan-hub","logan-s1","logan-s2","atlanta-hub","atlanta-s1","atlanta-s2"],
  registry:       ["logan-hub","atlanta-hub"],
  heartbeat:      ["logan-s1","logan-s2","atlanta-s1","atlanta-s2","logan-hub","atlanta-hub"],
  cross_store:    ["logan-s1","logan-hub","logan-s2"],
  cross_region:   ["logan-s1","logan-hub","atlanta-hub","atlanta-s1"],
  p2p_sync:       ["logan-s1","logan-s2"],
  profile_update: ["logan-s1","logan-s2"],
  revenue:        ["logan-hub","atlanta-hub","logan-s1","logan-s2","atlanta-s1","atlanta-s2"],
  auth_reject:    ["logan-hub","logan-s1","atlanta-hub"],
};

let running = false;

// ── SVG helpers ──────────────────────────────────────────────────────
function setNodeCls(id, cls) {
  const el = document.getElementById("node-" + id);
  if (!el) return;
  const base = el.classList.contains("node-hub") ? "node-hub" : "node-store";
  el.setAttribute("class", base + (cls ? " " + cls : ""));
}
function setDot(id, cls) {
  const el = document.getElementById("dot-" + id);
  if (el) el.setAttribute("class", "status-dot " + cls);
}
function setLink(id, active) {
  const el = document.getElementById(id);
  if (!el) return;
  if (active) el.classList.add("active"); else el.classList.remove("active");
}
function setLabelId(id, text) {
  const el = document.getElementById("lbl-" + id);
  if (el) el.textContent = text;
}

function activateLinks(test, on) {
  (TEST_LINKS[test] || []).forEach(l => setLink(l, on));
}
function setNodesChecking(test) {
  (TEST_NODES[test] || []).forEach(id => { setNodeCls(id,"checking"); setDot(id,"checking"); });
}
function clearNodesChecking(test) {
  (TEST_NODES[test] || []).forEach(id => { setNodeCls(id,""); setDot(id,"unknown"); });
}

// ── Logging ──────────────────────────────────────────────────────────
function log(msg, cls="") {
  const feed = document.getElementById("log-feed");
  const ts = new Date().toLocaleTimeString("en-US", {hour12:false});
  const line = document.createElement("div");
  line.className = "log-line";
  line.innerHTML = `<span class="log-time">${ts}</span><span class="log-msg ${cls}">${msg}</span>`;
  feed.appendChild(line);
  feed.scrollTop = feed.scrollHeight;
}

// ── Button state helpers ─────────────────────────────────────────────
function setBtnState(id, state) {
  const btn  = document.getElementById("tbtn-" + id);
  const icon = document.getElementById("si-" + id);
  if (!btn || !icon) return;
  btn.className = "test-btn " + (state || "");
  if (state === "running") { icon.innerHTML = '<span class="spinner">⟳</span>'; }
  else if (state === "pass") { icon.textContent = "✓"; }
  else if (state === "fail") { icon.textContent = "✗"; }
  else { icon.textContent = "–"; }
}

function setOverall(state) {
  const b = document.getElementById("overall-badge");
  b.className = state;
  if      (state === "running") b.textContent = "Running…";
  else if (state === "pass")    b.textContent = "All Passed";
  else if (state === "fail")    b.textContent = "Some Failed";
  else                          b.textContent = "Idle";
}

// ── Result renderers ─────────────────────────────────────────────────
function renderCard(testId, data) {
  const grid = document.getElementById("results-grid");
  const id   = "card-" + testId;
  let card = document.getElementById(id);
  if (!card) { card = document.createElement("div"); card.id = id; grid.appendChild(card); }

  const ok = data.ok;
  card.className = "result-card " + (ok ? "pass" : "fail");
  card.innerHTML = `
    <div class="card-header">
      <span class="card-title">${LABELS[testId]}</span>
      <span class="card-badge ${ok?"pass":"fail"}">${ok?"PASS":"FAIL"}</span>
    </div>
    ${renderBody(testId, data)}
  `;
}

function renderBody(testId, data) {
  if (testId === "health")       return renderHealth(data);
  if (testId === "registry")     return renderRegistry(data);
  if (testId === "heartbeat")    return renderHeartbeat(data);
  if (testId === "revenue")      return renderRevenue(data);
  if (testId === "auth_reject")  return renderAuthReject(data);
  if (data.steps)                return renderSteps(data.steps);
  return `<pre style="font-size:.72rem;color:var(--muted)">${JSON.stringify(data,null,2)}</pre>`;
}

function stepIcon(ok) { return ok ? '✓' : '✗'; }

function renderSteps(steps) {
  return steps.map(s => `
    <div class="step-row">
      <span class="step-icon" style="color:${s.ok?'var(--ok)':'var(--fail)'}">${stepIcon(s.ok)}</span>
      <div style="flex:1">
        <div class="step-name">${s.step}</div>
        ${s.detail ? `<div class="step-detail">${s.detail}</div>` : ''}
      </div>
      ${s.status ? `<span class="step-status ${s.ok?'ok':'fail'}">HTTP ${s.status}</span>` : ''}
      ${s.ms ? `<span class="step-ms">${s.ms}ms</span>` : ''}
    </div>`).join('');
}

function renderHealth(data) {
  return (data.nodes || []).map(n => `
    <div class="step-row">
      <span class="step-icon" style="color:${n.ok?'var(--ok)':'var(--fail)'}">${stepIcon(n.ok)}</span>
      <div style="flex:1">
        <div class="step-name">${n.name}</div>
        <div class="step-detail">${n.ok ? `store_id=${n.store_id} · ${n.region}` : (n.error||'unreachable')}</div>
      </div>
      <span class="step-ms">${n.ms}ms</span>
    </div>`).join('');
}

function renderRegistry(data) {
  return Object.entries(data.hubs || {}).map(([hub, info]) => {
    const storeRows = (info.stores || []).map(s =>
      `<div class="step-detail" style="margin-left:22px">↳ ${s.store_name||s.store_id} · ${s.api_endpoint||''}</div>`
    ).join('');
    return `
    <div class="step-row" style="flex-direction:column;align-items:flex-start">
      <div style="display:flex;align-items:center;gap:8px;width:100%">
        <span class="step-icon" style="color:${info.ok?'var(--ok)':'var(--fail)'}">${stepIcon(info.ok)}</span>
        <span class="step-name">${hub}</span>
        <span class="step-ms" style="margin-left:auto">${info.count} store(s) · ${info.ms}ms</span>
      </div>
      ${storeRows}
    </div>`;
  }).join('');
}

function renderHeartbeat(data) {
  return (data.results || []).map(r => `
    <div class="step-row">
      <span class="step-icon" style="color:${r.ok?'var(--ok)':'var(--fail)'}">${stepIcon(r.ok)}</span>
      <div style="flex:1">
        <div class="step-name">${r.store}</div>
        <div class="step-detail">→ ${r.hub} (store_id=${r.store_id})</div>
      </div>
      <span class="step-ms">${r.ms}ms</span>
    </div>`).join('');
}

function renderRevenue(data) {
  const hubRows = Object.entries(data.hubs || {}).map(([hub, info]) => `
    <div class="step-row">
      <span class="step-icon" style="color:${info.ok?'var(--ok)':'var(--fail)'}">${stepIcon(info.ok)}</span>
      <div style="flex:1">
        <div class="step-name">${hub} — ${info.region||''}</div>
        <div class="step-detail">${info.ok ? `$${info.total?.toFixed(2)} across ${info.stores} store(s)` : (info.error||'error')}</div>
      </div>
      <span class="step-ms">${info.ms}ms</span>
    </div>`).join('');
  const totalRow = `
    <div class="step-row" style="margin-top:4px;padding-top:8px;border-top:1px solid #1e3a5f">
      <span class="step-icon"></span>
      <span class="step-name" style="font-weight:700">Grand Total (all regions)</span>
      <span class="step-ms" style="color:var(--ok);font-size:.85rem;font-weight:700">$${(data.grand_total||0).toFixed(2)}</span>
    </div>`;
  return hubRows + totalRow;
}

function renderAuthReject(data) {
  return (data.results || []).map(r => `
    <div class="step-row">
      <span class="step-icon" style="color:${r.ok?'var(--ok)':'var(--fail)'}">${stepIcon(r.ok)}</span>
      <div style="flex:1">
        <div class="step-name">${r.node} — <code style="font-size:.72rem">${r.endpoint}</code></div>
        <div class="step-detail">${r.detail}</div>
      </div>
      <span class="step-status ${r.ok?'ok':'fail'}">HTTP ${r.status}</span>
    </div>`).join('');
}

// ── Node status updaters ─────────────────────────────────────────────
function applyHealthToNodes(data) {
  (data.nodes || []).forEach(n => {
    const cls = n.ok ? "ok" : "fail";
    setNodeCls(n.id, cls);
    setDot(n.id, cls);
    if (n.store_id) setLabelId(n.id, `store_id=${n.store_id}`);
  });
}

// ── Core run logic ───────────────────────────────────────────────────
async function runOne(testId) {
  if (running) return;
  running = true;
  const allBtns = document.querySelectorAll(".test-btn");
  allBtns.forEach(b => b.disabled = true);
  document.getElementById("btn-run-all").disabled = true;

  setBtnState(testId, "running");
  setNodesChecking(testId);
  activateLinks(testId, true);
  log(`Starting: ${LABELS[testId]}`, "info");

  try {
    const resp = await fetch(`/api/run/${testId}`);
    const data = await resp.json();

    clearNodesChecking(testId);
    activateLinks(testId, false);
    setBtnState(testId, data.ok ? "pass" : "fail");
    renderCard(testId, data);

    if (testId === "health") applyHealthToNodes(data);

    const stepCount = (data.steps || data.nodes || data.results ||
                       Object.values(data.hubs || {})).length;
    log(`${data.ok ? "✓" : "✗"} ${LABELS[testId]} — ${data.ok ? "PASSED" : "FAILED"}`,
        data.ok ? "ok" : "fail");
  } catch (e) {
    clearNodesChecking(testId);
    activateLinks(testId, false);
    setBtnState(testId, "fail");
    log(`✗ ${LABELS[testId]} — error: ${e.message}`, "fail");
  }

  allBtns.forEach(b => b.disabled = false);
  document.getElementById("btn-run-all").disabled = false;
  running = false;
}

async function runAll() {
  if (running) return;
  document.getElementById("btn-run-all").disabled = true;
  setOverall("running");
  log("═══ Running all tests ═══", "info");

  let passed = 0;
  for (const testId of TESTS) {
    running = true;
    const allBtns = document.querySelectorAll(".test-btn");
    allBtns.forEach(b => b.disabled = true);

    setBtnState(testId, "running");
    setNodesChecking(testId);
    activateLinks(testId, true);
    log(`→ ${LABELS[testId]}`, "");

    try {
      const resp = await fetch(`/api/run/${testId}`);
      const data = await resp.json();
      clearNodesChecking(testId);
      activateLinks(testId, false);
      setBtnState(testId, data.ok ? "pass" : "fail");
      renderCard(testId, data);
      if (testId === "health") applyHealthToNodes(data);
      if (data.ok) passed++;
      log(`  ${data.ok ? "✓ PASS" : "✗ FAIL"} — ${LABELS[testId]}`, data.ok ? "ok" : "fail");
    } catch (e) {
      clearNodesChecking(testId);
      activateLinks(testId, false);
      setBtnState(testId, "fail");
      log(`  ✗ ERROR — ${LABELS[testId]}: ${e.message}`, "fail");
    }
    running = false;
    allBtns.forEach(b => b.disabled = false);
    await new Promise(r => setTimeout(r, 300));
  }

  const total = TESTS.length;
  const allOk = passed === total;
  setOverall(allOk ? "pass" : "fail");
  log(`═══ Done: ${passed}/${total} passed ═══`, allOk ? "ok" : "warn");
  document.getElementById("btn-run-all").disabled = false;
}

// Auto-run health check on load
window.addEventListener("load", () => {
  log("Demo server ready. Click a test or Run All to begin.", "info");
  setTimeout(() => runOne("health"), 600);
});
</script>
</body>
</html>
"""


# ─── HTTP server ──────────────────────────────────────────────────────────────

class DemoHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args): pass  # suppress request logs

    def do_GET(self):
        path = self.path.split("?")[0]
        if path == "/":
            self._send(200, "text/html; charset=utf-8", HTML.encode())
        elif path.startswith("/api/run/"):
            key = path[len("/api/run/"):]
            if key == "all":
                data = {k: fn() for k, (_, fn) in RUNNERS.items()}
                self._json(data)
            elif key in RUNNERS:
                _, fn = RUNNERS[key]
                self._json(fn())
            else:
                self._json({"error": f"unknown test: {key}"}, 404)
        else:
            self._send(404, "text/plain", b"Not found")

    def _send(self, code, ctype, body):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", len(body))
        self.end_headers()
        self.wfile.write(body)

    def _json(self, data, code=200):
        body = json.dumps(data).encode()
        self._send(code, "application/json", body)


class ThreadedServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True


if __name__ == "__main__":
    url = f"http://localhost:{PORT}"
    print(f"\n  CodePop Demo Server")
    print(f"  ───────────────────")
    print(f"  Listening on {url}")
    print(f"  Press Ctrl+C to stop\n")
    server = ThreadedServer(("", PORT), DemoHandler)
    import threading
    threading.Timer(1.0, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  Stopped.")
