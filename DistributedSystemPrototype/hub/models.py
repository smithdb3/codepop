"""Database models for hub node."""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from database import Base


class StoreRegistry(Base):
    """Registry of all stores connected to this hub."""

    __tablename__ = "store_registry"

    store_id = Column(Integer, primary_key=True)
    store_name = Column(String, nullable=False)
    region = Column(String, nullable=False)
    api_endpoint = Column(String, nullable=False)
    last_heartbeat = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_healthy = Column(Boolean, default=True, nullable=False)

    def to_dict(self):
        """Convert to dict for JSON response."""
        return {
            "store_id": self.store_id,
            "store_name": self.store_name,
            "region": self.region,
            "api_endpoint": self.api_endpoint,
            "is_healthy": self.is_healthy,
            "last_heartbeat": self.last_heartbeat.isoformat() + "Z" if self.last_heartbeat else None,
        }
