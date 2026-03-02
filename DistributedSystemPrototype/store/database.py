"""Database setup for store node."""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Database path - store in /app/data for persistence across container restarts
# Use environment variable to allow per-instance customization if needed
store_id = os.getenv("STORE_ID", "default")
db_path = f"/app/data/store_{store_id}.db"
os.makedirs(os.path.dirname(db_path), exist_ok=True)

# Create SQLite engine
engine = create_engine(
    f"sqlite:///{db_path}",
    connect_args={"check_same_thread": False},
    echo=False
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


def get_db():
    """Dependency for FastAPI to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables."""
    Base.metadata.create_all(bind=engine)
