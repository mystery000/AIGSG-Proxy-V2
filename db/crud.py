import pytz
from . import models
from datetime import datetime
from operator import attrgetter
from sqlalchemy.orm import Session

def save_pos(db: Session, source: str, content: str, location: str, _BPSCreated: str):
    
    if _BPSCreated == None:
        row = models.PosData(
            source=source,
            content=content,
            location=location,
            created_at=datetime.now(pytz.timezone('America/Sao_Paulo')))

        db.add(row)
        db.commit()
    else:
        row = models.PosData(
            source=source,
            content=content,
            location=location,
            created_at=datetime.strptime(_BPSCreated, '%Y-%m-%d %H:%M:%S'))

        db.add(row)
        db.commit()

def get_pos(db: Session, source: str, created_at: str) -> None:
    records = db.query(models.PosData.created_at.label('TimeStamp'), models.PosData.content.label('Message')).filter(models.PosData.source == source).filter(models.PosData.created_at >= created_at).order_by(models.PosData.id.desc()).limit(100).all()
    return records

def get_samba(db: Session, source: str, created_at: str) -> None:
    records = db.query(models.PosData.created_at.label('TimeStamp'), models.PosData.content.label('Message')).filter(models.PosData.source == source).filter(models.PosData.created_at >= created_at).order_by(models.PosData.id.desc()).limit(50).all()
    posData = []
    
    for record in records:
        posData.append(record._mapping)
    posData.sort(key = attrgetter('TimeStamp'), reverse = False)

    return posData

def save_user(db: Session, username: str, email: str, hashed_password: str, disabled: bool = True):
    row = models.UserData(
        username=username, 
        email=email, 
        hashed_password=hashed_password,
        disabled=disabled,
        created_at=datetime.now()
    )
    db.add(row)
    db.commit()


def get_user(db: Session, email: str):
    db_user = db.query(models.UserData).filter(models.UserData.email == email).first()
    return db_user