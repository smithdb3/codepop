"""FastAPI application for the hub node."""

import logging
import uvicorn
from datetime import datetime
from typing import Optional, List

from fastapi import FastAPI, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session
from apscheduler.schedulers.background import BackgroundScheduler

from config import HUB_PORT, NODE_TOKEN, HEARTBEAT_TIMEOUT_SECONDS, HEARTBEAT_CHECK_INTERVAL_SECONDS, LOG_LEVEL
from database import SessionLocal, init_db
from models import StoreRegistry

# Setup logging
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL.upper(), logging.INFO),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="CodePop Hub",
    description="Regional hub for CodePop distributed system",
    version="1.0.0"
)

# Initialize database
init_db()


# ============================================================================
# Authentication
# ============================================================================

def verify_node_token(authorization: Optional[str] = Header(None)):
    """Verify inter-node authentication token."""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header"
        )

    parts = authorization.split()
    if len(parts) != 2 or parts[0] != "NodeToken":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization format. Expected: NodeToken <token>"
        )

    if parts[1] != NODE_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )

    return parts[1]


def get_db():
    """Get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============================================================================
# Request/Response Models
# ============================================================================

from pydantic import BaseModel


class StoreRegistrationRequest(BaseModel):
    """Request to register a store."""
    store_id: int
    store_name: str
    region: str
    api_endpoint: str


class HeartbeatRequest(BaseModel):
    """Heartbeat from a store."""
    store_id: int


class FindUserRequest(BaseModel):
    """Request to find a user."""
    email: str


# ============================================================================
# Background Tasks
# ============================================================================

def check_heartbeat_timeouts():
    """Check for stores that haven't sent heartbeat (background task)."""
    db = SessionLocal()
    try:
        current_time = datetime.utcnow()
        stores = db.query(StoreRegistry).all()

        for store in stores:
            if store.last_heartbeat:
                elapsed = (current_time - store.last_heartbeat).total_seconds()
                if elapsed > HEARTBEAT_TIMEOUT_SECONDS and store.is_healthy:
                    store.is_healthy = False
                    db.commit()
                    logger.warning(
                        f"Store {store.store_id} marked unhealthy "
                        f"(no heartbeat for {elapsed:.0f}s)"
                    )
    finally:
        db.close()


def start_scheduler():
    """Start background scheduler for heartbeat checks."""
    scheduler = BackgroundScheduler()
    scheduler.add_job(
        check_heartbeat_timeouts,
        'interval',
        seconds=HEARTBEAT_CHECK_INTERVAL_SECONDS,
        id='heartbeat_timeout_check'
    )
    scheduler.start()
    logger.info(f"Scheduler started - heartbeat check every {HEARTBEAT_CHECK_INTERVAL_SECONDS}s")
    return scheduler


# Start scheduler on app startup
scheduler = None


@app.on_event("startup")
async def startup_event():
    """Run on app startup."""
    global scheduler
    scheduler = start_scheduler()
    logger.info("Hub startup complete")


@app.on_event("shutdown")
async def shutdown_event():
    """Run on app shutdown."""
    global scheduler
    if scheduler:
        scheduler.shutdown()
        logger.info("Scheduler shutdown")


# ============================================================================
# Endpoints
# ============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "node": "hub"
    }


@app.post("/api/hub/register/", status_code=201)
async def register_store(
    request: StoreRegistrationRequest,
    token: str = Depends(verify_node_token),
    db: Session = Depends(get_db)
):
    """Register a store with the hub."""
    logger.info(f"Registering store {request.store_id} ({request.store_name})")

    # Check if store already exists
    existing = db.query(StoreRegistry).filter_by(store_id=request.store_id).first()

    if existing:
        # Update existing registration
        existing.store_name = request.store_name
        existing.region = request.region
        existing.api_endpoint = request.api_endpoint
        existing.last_heartbeat = datetime.utcnow()
        existing.is_healthy = True
    else:
        # Create new registration
        store = StoreRegistry(
            store_id=request.store_id,
            store_name=request.store_name,
            region=request.region,
            api_endpoint=request.api_endpoint,
            last_heartbeat=datetime.utcnow(),
            is_healthy=True
        )
        db.add(store)

    db.commit()
    store = db.query(StoreRegistry).filter_by(store_id=request.store_id).first()

    logger.info(f"Store {request.store_id} registered successfully")
    return store.to_dict()


@app.post("/api/hub/heartbeat/")
async def receive_heartbeat(
    request: HeartbeatRequest,
    token: str = Depends(verify_node_token),
    db: Session = Depends(get_db)
):
    """Receive heartbeat from a store."""
    store = db.query(StoreRegistry).filter_by(store_id=request.store_id).first()

    if not store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found. Did you register first?"
        )

    store.last_heartbeat = datetime.utcnow()
    store.is_healthy = True
    db.commit()

    logger.debug(f"Heartbeat received from store {request.store_id}")
    return {"status": "heartbeat_received"}


@app.get("/api/hub/stores/")
async def list_stores(db: Session = Depends(get_db)):
    """List all registered stores."""
    stores = db.query(StoreRegistry).all()
    return [store.to_dict() for store in stores]


@app.post("/api/hub/find-user/")
async def find_user(
    request: FindUserRequest,
    token: str = Depends(verify_node_token),
    db: Session = Depends(get_db)
):
    """Broadcast user search to all healthy stores."""
    import requests

    logger.info(f"Broadcasting user search for {request.email}")

    # Get all healthy stores
    healthy_stores = db.query(StoreRegistry).filter_by(is_healthy=True).all()

    if not healthy_stores:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No healthy stores available"
        )

    # Query each store for the user
    for store in healthy_stores:
        try:
            response = requests.post(
                f"{store.api_endpoint}/api/inter-node/user-lookup/",
                json={"email": request.email},
                headers={"Authorization": f"NodeToken {NODE_TOKEN}"},
                timeout=5
            )

            if response.status_code == 200:
                user_data = response.json()
                logger.info(f"Found user {request.email} at store {store.store_id}")
                return {
                    "status": "found",
                    "store_id": store.store_id,
                    "api_endpoint": store.api_endpoint,
                    "user_data": user_data.get("user_data")
                }
        except Exception as e:
            logger.warning(f"Error querying store {store.store_id}: {e}")
            continue

    # User not found in any store
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="User not found in any store"
    )


@app.get("/api/hub/store-location/")
async def get_store_location(
    store_id: int,
    token: str = Depends(verify_node_token),
    db: Session = Depends(get_db)
):
    """Get a specific store's location/endpoint."""
    store = db.query(StoreRegistry).filter_by(store_id=store_id).first()

    if not store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found"
        )

    return store.to_dict()


# ============================================================================
# Main
# ============================================================================

if __name__ == "__main__":
    logger.info(f"Starting Hub on port {HUB_PORT}")
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=HUB_PORT,
        log_level=LOG_LEVEL
    )
