"""FastAPI application for a store node."""

import logging
import secrets
import uvicorn
from datetime import datetime, timedelta
from typing import Optional
from passlib.context import CryptContext
import requests

from fastapi import FastAPI, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session
from apscheduler.schedulers.background import BackgroundScheduler

from config import (
    STORE_ID, STORE_NAME, STORE_REGION, STORE_ENDPOINT,
    HUB_URL, NODE_TOKEN, HEARTBEAT_INTERVAL_SECONDS,
    USER_CACHE_TTL_SECONDS, VALID_MACHINE_TRANSITIONS, LOG_LEVEL
)
from database import SessionLocal, init_db
from models import User, UserCache, Machine, Order
from startup import startup

# Setup logging
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL.upper(), logging.INFO),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ============================================================================
# Authentication & Hashing
# ============================================================================

def hash_password(password: str) -> str:
    """Hash a password."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def generate_token() -> str:
    """Generate an auth token."""
    return secrets.token_hex(32)


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
            detail="Invalid authorization format"
        )

    if parts[1] != NODE_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )

    return parts[1]


# ============================================================================
# FastAPI Setup
# ============================================================================

app = FastAPI(
    title="CodePop Store",
    description=f"Store node {STORE_ID}",
    version="1.0.0"
)


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


class UserRegisterRequest(BaseModel):
    """User registration request."""
    username: str
    email: str
    password: str


class UserLoginRequest(BaseModel):
    """User login request."""
    email: str
    password: str


class UpdateMachineStatusRequest(BaseModel):
    """Machine status update request."""
    new_status: str


class InterNodeUserLookupRequest(BaseModel):
    """Inter-node user lookup request."""
    email: str


class InterNodeUserSyncRequest(BaseModel):
    """Inter-node user sync request."""
    user_id: int
    username: str
    email: str
    password_hash: str
    is_staff: bool = False
    is_superuser: bool = False


# ============================================================================
# Background Tasks
# ============================================================================

def send_heartbeat():
    """Send heartbeat to hub (background task)."""
    try:
        response = requests.post(
            f"{HUB_URL}/api/hub/heartbeat/",
            json={"store_id": STORE_ID},
            headers={"Authorization": f"NodeToken {NODE_TOKEN}"},
            timeout=5
        )
        if response.status_code == 200:
            logger.debug("Heartbeat sent successfully")
        else:
            logger.warning(f"Hub responded with {response.status_code}")
    except Exception as e:
        logger.warning(f"Heartbeat failed: {e}")
        # Don't crash - continue operating


def start_scheduler():
    """Start background scheduler for heartbeats."""
    scheduler = BackgroundScheduler()
    scheduler.add_job(
        send_heartbeat,
        'interval',
        seconds=HEARTBEAT_INTERVAL_SECONDS,
        id='heartbeat_task'
    )
    scheduler.start()
    logger.info(f"Scheduler started - heartbeat every {HEARTBEAT_INTERVAL_SECONDS}s")
    return scheduler


scheduler = None


@app.on_event("startup")
async def app_startup():
    """Run on app startup."""
    global scheduler
    scheduler = start_scheduler()
    logger.info(f"Store {STORE_ID} API started")


@app.on_event("shutdown")
async def app_shutdown():
    """Run on app shutdown."""
    global scheduler
    if scheduler:
        scheduler.shutdown()
        logger.info("Scheduler shutdown")


# ============================================================================
# Endpoints - Health & Status
# ============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "store_id": STORE_ID,
        "store_name": STORE_NAME
    }


# ============================================================================
# Endpoints - Authentication
# ============================================================================

@app.post("/api/auth/register/", status_code=201)
async def register_user(
    request: UserRegisterRequest,
    db: Session = Depends(get_db)
):
    """Register a new user at this store."""
    logger.info(f"User registration request: {request.email}")

    # Check if user already exists
    existing = db.query(User).filter_by(email=request.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered at this store"
        )

    # Create user
    user = User(
        username=request.username,
        email=request.email,
        password_hash=hash_password(request.password),
        home_store_id=STORE_ID
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Generate token
    token = generate_token()

    logger.info(f"User {request.email} registered successfully")
    return {
        "user_id": user.user_id,
        "username": user.username,
        "email": user.email,
        "token": token,
        "home_store_id": user.home_store_id
    }


@app.post("/api/auth/login/")
async def login_user(
    request: UserLoginRequest,
    db: Session = Depends(get_db)
):
    """User login (with cross-store discovery)."""
    logger.info(f"Login request: {request.email}")

    # Step 1: Check local database
    user = db.query(User).filter_by(email=request.email).first()

    if user and verify_password(request.password, user.password_hash):
        logger.info(f"User {request.email} found locally")
        token = generate_token()
        return {
            "user_id": user.user_id,
            "username": user.username,
            "email": user.email,
            "token": token,
            "location": "local"
        }

    # Step 2: Check local cache
    cache = db.query(UserCache).filter_by(email=request.email).first()
    logger.debug(f"Cache lookup for {request.email}: {'found' if cache else 'not found'}")
    if cache:
        age = (datetime.utcnow() - cache.cached_at).total_seconds()
        logger.debug(f"Cache age: {age}s, TTL: {USER_CACHE_TTL_SECONDS}s")
        if age < USER_CACHE_TTL_SECONDS:
            # Verify password against cached data
            cached_user = cache.user_data
            logger.debug(f"Cached user data keys: {cached_user.keys() if isinstance(cached_user, dict) else 'not a dict'}")
            cached_password_hash = cached_user.get("password_hash") if isinstance(cached_user, dict) else None
            if cached_password_hash and verify_password(request.password, cached_password_hash):
                logger.info(f"User {request.email} found in cache")
                token = generate_token()
                return {
                    "user_id": cached_user["user_id"],
                    "username": cached_user["username"],
                    "email": cached_user["email"],
                    "token": token,
                    "location": "cached"
                }
            else:
                logger.debug(f"Password verification failed for cached user {request.email}")
        else:
            # Cache expired, remove it
            logger.info(f"Cache for {request.email} expired")
            db.delete(cache)
            db.commit()

    # Step 3: Query hub to discover user in other stores
    logger.info(f"User {request.email} not found locally, querying hub...")

    try:
        hub_response = requests.post(
            f"{HUB_URL}/api/hub/find-user/",
            json={"email": request.email},
            headers={"Authorization": f"NodeToken {NODE_TOKEN}"},
            timeout=10
        )

        if hub_response.status_code == 200:
            hub_data = hub_response.json()
            peer_store_id = hub_data.get("store_id")
            user_data = hub_data.get("user_data", {})

            logger.info(f"Found user at store {peer_store_id}, caching locally...")
            logger.debug(f"User data keys: {user_data.keys() if isinstance(user_data, dict) else 'not a dict'}")

            if not user_data.get("password_hash"):
                logger.warning(f"Replicated user payload for {request.email} is missing password_hash")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Replicated user data incomplete; retry login shortly"
                )

            # Step 4: Cache user data locally for future logins (upsert)
            cache = db.query(UserCache).filter_by(email=user_data.get("email")).first()
            if cache:
                cache.user_data = user_data
                cache.cached_at = datetime.utcnow()
            else:
                cache = UserCache(
                    email=user_data.get("email"),
                    user_data=user_data,
                    cached_at=datetime.utcnow()
                )
                db.add(cache)
            db.commit()

            logger.info(f"User data cached from store {peer_store_id}")
            logger.debug(f"Cache ID: {cache.id}, Email: {cache.email}")
            token = generate_token()
            return {
                "user_id": user_data.get("user_id"),
                "username": user_data.get("username"),
                "email": user_data.get("email"),
                "token": token,
                "location": "replicated"
            }

    except Exception as e:
        logger.warning(f"Hub discovery failed: {e}")

    # User not found anywhere
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials"
    )


# ============================================================================
# Endpoints - Users
# ============================================================================

@app.get("/api/users/")
async def list_users(db: Session = Depends(get_db)):
    """List all users at this store."""
    users = db.query(User).all()
    return [user.to_dict() for user in users]


# ============================================================================
# Endpoints - Machines
# ============================================================================

@app.get("/api/machines/")
async def list_machines(db: Session = Depends(get_db)):
    """List all machines and their statuses."""
    machines = db.query(Machine).all()
    return [machine.to_dict() for machine in machines]


@app.post("/api/machines/{machine_id}/update-status/")
async def update_machine_status(
    machine_id: int,
    request: UpdateMachineStatusRequest,
    db: Session = Depends(get_db)
):
    """Update machine status (with state machine validation)."""
    machine = db.query(Machine).filter_by(machine_id=machine_id).first()

    if not machine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Machine not found"
        )

    current_status = machine.status
    new_status = request.new_status

    # Validate transition
    valid_transitions = VALID_MACHINE_TRANSITIONS.get(current_status, [])
    if new_status not in valid_transitions:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid transition from {current_status} to {new_status}. Valid transitions: {valid_transitions}"
        )

    # Apply transition
    machine.status = new_status
    machine.last_status_update = datetime.utcnow()
    db.commit()

    logger.info(f"Machine {machine_id} transitioned {current_status} → {new_status}")
    return machine.to_dict()


# ============================================================================
# Inter-Node Endpoints
# ============================================================================

@app.post("/api/inter-node/user-lookup/")
async def inter_node_user_lookup(
    request: InterNodeUserLookupRequest,
    token: str = Depends(verify_node_token),
    db: Session = Depends(get_db)
):
    """Inter-node: check if this store has a user."""
    user = db.query(User).filter_by(email=request.email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    logger.debug(f"Inter-node lookup: found user {request.email} at this store")
    return {
        "status": "found",
        "user_data": user.to_dict(include_password_hash=True)
    }


@app.post("/api/inter-node/user-sync/")
async def inter_node_user_sync(
    request: InterNodeUserSyncRequest,
    token: str = Depends(verify_node_token),
    db: Session = Depends(get_db)
):
    """Inter-node: receive and cache user data from peer."""
    logger.debug(f"Inter-node sync: caching user {request.email}")

    # Don't save to User table, only to cache (upsert to avoid unique violations)
    synced_user_data = {
        "user_id": request.user_id,
        "username": request.username,
        "email": request.email,
        "password_hash": request.password_hash,
        "is_staff": request.is_staff,
        "is_superuser": request.is_superuser,
    }
    cache = db.query(UserCache).filter_by(email=request.email).first()
    if cache:
        cache.user_data = synced_user_data
        cache.cached_at = datetime.utcnow()
    else:
        cache = UserCache(
            email=request.email,
            user_data=synced_user_data,
            cached_at=datetime.utcnow()
        )
        db.add(cache)
    db.commit()

    return {
        "status": "synced",
        "user_id": request.user_id,
        "email": request.email
    }


@app.post("/api/inter-node/health-check/")
async def inter_node_health_check():
    """Inter-node: health check."""
    return {
        "status": "ok",
        "store_id": STORE_ID
    }


# ============================================================================
# Main
# ============================================================================

if __name__ == "__main__":
    # Run startup sequence first
    startup()

    # Then start FastAPI
    logger.info(f"Starting FastAPI server on port {STORE_ID + 5001}")
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=STORE_ID + 5001,  # Dynamic port based on store ID
        log_level=LOG_LEVEL
    )
