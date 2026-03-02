"""Configuration for hub node."""

import os

# Port to listen on
HUB_PORT = int(os.getenv("HUB_PORT", 5001))

# Inter-node authentication token
NODE_TOKEN = os.getenv("NODE_TOKEN", "supersecrettoken")

# Heartbeat timeout (seconds) - mark store unhealthy if no heartbeat in this time
HEARTBEAT_TIMEOUT_SECONDS = 90

# Heartbeat check interval (how often to check for timeouts)
HEARTBEAT_CHECK_INTERVAL_SECONDS = 30

# Log level
LOG_LEVEL = os.getenv("LOG_LEVEL", "info")
