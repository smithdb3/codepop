"""Database models for store node."""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON
from database import Base


class User(Base):
    """User account."""

    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    is_staff = Column(Boolean, default=False)
    is_superuser = Column(Boolean, default=False)
    home_store_id = Column(Integer, nullable=True)  # Store where user originally registered
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self, include_password_hash: bool = False):
        """Convert to dict for JSON response."""
        data = {
            "user_id": self.user_id,
            "username": self.username,
            "email": self.email,
            "is_staff": self.is_staff,
            "is_superuser": self.is_superuser,
            "home_store_id": self.home_store_id,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
        }
        if include_password_hash:
            data["password_hash"] = self.password_hash
        return data


class UserCache(Base):
    """Cached user data from other stores (24-hr TTL)."""

    __tablename__ = "user_cache"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String, unique=True, nullable=False)
    user_data = Column(JSON, nullable=False)  # Full user record
    cached_at = Column(DateTime, default=datetime.utcnow)


class Machine(Base):
    """Robotic drink machine."""

    __tablename__ = "machines"

    machine_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    status = Column(String, default="NORMAL", nullable=False)
    last_status_update = Column(DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        """Convert to dict for JSON response."""
        return {
            "machine_id": self.machine_id,
            "name": self.name,
            "status": self.status,
            "last_status_update": self.last_status_update.isoformat() + "Z" if self.last_status_update else None,
        }


class Order(Base):
    """Customer order."""

    __tablename__ = "orders"

    order_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=True)
    items = Column(JSON, default=[])  # List of drinks
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
