"""Configuration for store node."""

import os

# Store identity
STORE_ID = int(os.getenv("STORE_ID", 1))
STORE_NAME = os.getenv("STORE_NAME", f"Store {STORE_ID}")
STORE_REGION = os.getenv("STORE_REGION", "Unknown")
STORE_PORT = int(os.getenv("STORE_PORT", 5002))
STORE_ENDPOINT = os.getenv("STORE_ENDPOINT", f"http://localhost:{STORE_PORT}")

# Hub connection
HUB_URL = os.getenv("HUB_URL", "http://localhost:5001")

# Inter-node authentication token
NODE_TOKEN = os.getenv("NODE_TOKEN", "supersecrettoken")

# Heartbeat interval (how often to ping hub)
HEARTBEAT_INTERVAL_SECONDS = 30

# User cache TTL (time before cached user data expires)
USER_CACHE_TTL_SECONDS = 86400  # 24 hours

# Machine state machine
VALID_MACHINE_TRANSITIONS = {
    "NORMAL":           ["WARNING", "SCHEDULE_SERVICE"],
    "WARNING":          ["NORMAL", "ERROR"],
    "ERROR":            ["NORMAL", "OUT_OF_ORDER"],
    "OUT_OF_ORDER":     ["REPAIR_START"],
    "SCHEDULE_SERVICE": ["REPAIR_START"],
    "REPAIR_START":     ["REPAIR_END"],
    "REPAIR_END":       ["NORMAL", "ERROR"],
}

# Log level
LOG_LEVEL = os.getenv("LOG_LEVEL", "info")
