from typing import Any
from .database import engine, SessionLocal, Base
from .crud import save_pos, get_pos, get_samba, save_user, get_user


class Db():
    _db: Any

    def __init__(self):
        Base.metadata.create_all(bind=engine)
        self._db = SessionLocal()

    def save_pos(self, source: str, content: str, location: str, _BPSCreated: str = None):
        save_pos(self._db, source, content, location, _BPSCreated)

    def get_pos(self, source: str, created_at: str):
        return get_pos(self._db, source, created_at)

    def get_samba(self, source: str, created_at: str):
        return get_samba(self._db, source, created_at)
    
    def save_user(self, username: str, email: str, hashed_password: str, disabled: bool = False):
        return save_user(self._db, username, email, hashed_password, disabled)
    
    def get_user(self, email: str):
        return get_user(self._db, email)