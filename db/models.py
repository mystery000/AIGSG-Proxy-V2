from .database import Base
from sqlalchemy import Column, Integer, String, DateTime

class PosData(Base):
    __tablename__ = "pos_data"

    id = Column(Integer, primary_key=True, index=True)
    source = Column(String, index=True)
    content = Column(String)
    location = Column(String)
    created_at = Column(DateTime(timezone=True), index=True)