"""Store startup sequence."""

import logging
import time
import requests
from datetime import datetime

from database import SessionLocal, init_db
from models import Machine
from config import (
    STORE_ID, STORE_NAME, STORE_REGION, STORE_ENDPOINT,
    HUB_URL, NODE_TOKEN, HEARTBEAT_INTERVAL_SECONDS
)

logger = logging.getLogger(__name__)


def register_with_hub():
    """Register this store with the hub (with exponential backoff)."""
    logger.info(f"Registering store {STORE_ID} with hub at {HUB_URL}")

    backoff_times = [1, 2, 4, 8]  # seconds
    attempt = 1

    for wait_time in backoff_times:
        try:
            response = requests.post(
                f"{HUB_URL}/api/hub/register/",
                json={
                    "store_id": STORE_ID,
                    "store_name": STORE_NAME,
                    "region": STORE_REGION,
                    "api_endpoint": STORE_ENDPOINT
                },
                headers={"Authorization": f"NodeToken {NODE_TOKEN}"},
                timeout=5
            )

            if response.status_code == 201:
                logger.info(f"Successfully registered with hub")
                return True
            else:
                logger.warning(f"Hub returned {response.status_code}: {response.text}")
        except Exception as e:
            logger.warning(f"Registration attempt {attempt} failed: {e}")

        if attempt < len(backoff_times):
            wait = wait_time
            logger.info(f"Retrying in {wait} seconds...")
            time.sleep(wait)
            attempt += 1
        else:
            break

    logger.warning("Failed to register with hub after all retries. Will continue operating.")
    return False


def seed_machines():
    """Create sample machines for this store."""
    db = SessionLocal()
    try:
        # Check if machines already exist
        existing_count = db.query(Machine).count()
        if existing_count > 0:
            logger.info(f"Machines already exist ({existing_count} found)")
            return

        # Create 2 sample machines
        machines = [
            Machine(name="Machine 1", status="NORMAL"),
            Machine(name="Machine 2", status="NORMAL"),
        ]

        db.add_all(machines)
        db.commit()

        logger.info(f"Seeded {len(machines)} machines")
    finally:
        db.close()


def startup():
    """Run full store startup sequence."""
    logger.info("=" * 70)
    logger.info(f"Store {STORE_ID} Startup Sequence")
    logger.info("=" * 70)

    # Step 1: Initialize database
    logger.info("[1/5] Initializing database...")
    try:
        init_db()
        logger.info("✓ Database initialized")
    except Exception as e:
        logger.error(f"✗ Database initialization failed: {e}")
        raise

    # Step 2: Load config
    logger.info("[2/5] Loading configuration...")
    logger.info(f"  Store ID: {STORE_ID}")
    logger.info(f"  Store Name: {STORE_NAME}")
    logger.info(f"  Region: {STORE_REGION}")
    logger.info(f"  Endpoint: {STORE_ENDPOINT}")
    logger.info(f"  Hub URL: {HUB_URL}")

    # Step 3: Register with hub
    logger.info("[3/5] Registering with hub...")
    register_with_hub()

    # Step 4: Seed sample data
    logger.info("[4/5] Seeding machines...")
    try:
        seed_machines()
        logger.info("✓ Machines seeded")
    except Exception as e:
        logger.error(f"✗ Seeding failed: {e}")
        raise

    # Step 5: Ready
    logger.info("[5/5] Store ready for operations")
    logger.info("=" * 70)
    logger.info(f"Store startup complete at {datetime.utcnow().isoformat()}")
    logger.info("=" * 70)
