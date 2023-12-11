from .database import Base
from sqlalchemy import Column, Integer, String, DateTime, Boolean

class PosData(Base):
    __tablename__ = "pos_data"

    id = Column(Integer, primary_key=True, index=True)
    source = Column(String, index=True)
    content = Column(String)
    location = Column(String)
    created_at = Column(DateTime(timezone=True), index=True)

class UserData(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    disabled = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), index=True)
