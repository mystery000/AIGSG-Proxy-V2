import os
import re
import sys
import asyncio
import logging
import uvicorn
from db import Db
from conf import Conf
import logging.handlers
from yaml import load, dump
import multiprocessing as mp
from jose import jwt, JWTError
from pydantic import BaseModel
from dotenv import load_dotenv
from typing import Dict, Set, Union
from datetime import datetime, timedelta
from passlib.context import CryptContext
from fastapi.responses import FileResponse
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import FastAPI, WebSocket, Request, Response
from fastapi import FastAPI, HTTPException, status, Security

from yaml import load, dump
try:
    from yaml import CLoader as Loader
except ImportError:
    from yaml import Loader

app = FastAPI()

sqlite_db: Db = Db()

class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):

        if str(request.url.path).find("/api/") < 0:
            return await call_next(request) 
        
        # The paths to exclude from the middleware
        EXCLUDE_PATHS_RE = re.compile(r'^/api/(login|register)$')
        
        if EXCLUDE_PATHS_RE.match(str(request.url.path)):
            return await call_next(request)   
        
        if str(request.url.path).find("stationdata") > 0 or str(request.url.path).find("samba") > 0:
            return await call_next(request)

        try:
            token = request.headers.get('authorization')
            if token is None:
                return JSONResponse(status_code=401, content={'detail': 'Not authenticated'})
            if token.startswith("Bearer "):
                token = token[7:]
            else:
                return JSONResponse(status_code=401, content={'detail': 'Invalid token type'})
            
            get_current_user(token)

            return await call_next(request)
        
        except HTTPException as e:
            return JSONResponse(status_code=e.status_code, content={'detail': e.detail})
        except Exception as e:
            return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={'detail': str(e)})
        
origins = [
    "http://localhost:3000",
]

app.add_middleware(AuthMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
load_dotenv()

# Secret key to encode JWT token
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))

# Password context for hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 password bearer token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Function to verify passwords
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

# Function to authenticate user
def authenticate_user(email: str, password: str):
    user = sqlite_db.get_user(email)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_token(token: str) -> bool:
    exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer "}
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_email = payload.get("sub")
        if user_email is None:
            raise exception
        return user_email
    except JWTError:
        raise exception

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def get_current_user(token: str = Security(oauth2_scheme)):
    user_email = verify_token(token)
    db_user = sqlite_db.get_user(user_email)

    if db_user.disabled is True:
        raise HTTPException(status_code=400, detail="Your account is disabled.")
    
    return db_user

admin_user = sqlite_db.get_user("development@aigsg.com")

if admin_user is None:
    sqlite_db.save_user(
        email="development@aigsg.com",
        username="AIGSG",
        hashed_password=get_password_hash("Aigsg2023"),
        disabled=False,
    )

class UnicornException(Exception):
    def __init__(self, name: str):
        self.name = name

@app.exception_handler(UnicornException)
async def unicorn_exception_handler(request: Request, exc: UnicornException):
    logging.basicConfig(
            format="[%(asctime)s] %(message)s",
            level=logging.INFO,
            handlers=[
                logging.handlers.RotatingFileHandler(
                    "logs/web_svc.txt",
                    maxBytes=1024 * 1024 * 100,
                    backupCount=10),
            ]
        )
    clientIP = request.client.host
    logging.info(f"The incoming request from {clientIP} has an invalid URL format.")
    
    return JSONResponse(
        status_code=418,
        content={"message": "The request has an invalid URL format"},
    )

conf = Conf("conf.yaml")

app_queue: mp.Queue = None
log_queues: Set[asyncio.Queue] = set()

class RegisterForm(BaseModel):
    username: str
    email: str
    password: str

@app.post("/api/register")
async def register_user(user: RegisterForm):
    db_user = sqlite_db.get_user(user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    sqlite_db.save_user(
        username=user.username,
        email=user.email,
        hashed_password=get_password_hash(user.password)
    )
    return {"msg": "Registration successful!"}

class LoginForm(BaseModel):
    email: str
    password: str

@app.post("/api/login")
async def login_user(credential: LoginForm):
    user = authenticate_user(credential.email, credential.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": user.email}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/stationdata/{station_id}")
async def get_station_data(request: Request, station_id: str = "", From: Union[str, None] = None):
    logging.basicConfig(
            format="[%(asctime)s] %(message)s",
            level=logging.INFO,
            handlers=[
                logging.handlers.RotatingFileHandler(
                    "logs/web_svc.txt",
                    maxBytes=1024 * 1024 * 100,
                    backupCount=10),
            ]
        )

    if From == None: 
        raise UnicornException(name="WrongURL")
    
    result  = Db().get_pos(station_id,From)

    clientIP = request.client.host
    serverIP = conf.get_agent_host()
    serverPort = conf.get_agent_port()

    url = serverIP + ":" + str(serverPort) + "/api/stationdata/" + station_id + "?From=" + From
    logging.info(clientIP + "---->" + url)
    return { "data": result }

@app.get("/api/samba/{samba_id}")
async def get_samba_data(request: Request, samba_id: str = "", From: Union[str, None] = None):
    if From == None: raise UnicornException(name="WrongURL")
    
    result  = Db().get_samba(samba_id,From)

    logging.basicConfig(
            format="[%(asctime)s] %(message)s",
            level=logging.INFO,
            handlers=[
                logging.handlers.RotatingFileHandler(
                    "logs/web_svc.txt",
                    maxBytes=1024 * 1024 * 100,
                    backupCount=10),
            ]
        )

    clientIP = request.client.host
    serverIP = conf.get_agent_host()
    serverPort = conf.get_agent_port()

    url = serverIP + ":" + str(serverPort) + "/api/samba/" + samba_id + "?From=" + From
    logging.info(clientIP + "---->" + url)

    return {"data": result}

def do_push_log(obj: Dict):
    global log_queues

    for queue in log_queues:
        try:
            queue.put_nowait(obj)
        except:
            pass

def root_dir():
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "config"))

def get_resource(path):
    mimetypes = {
        ".css": "text/css",
        ".html": "text/html",
        ".js": "application/javascript",
        ".png": "image/png"
    }
    complete_path = os.path.join(root_dir(), path)
    ext = os.path.splitext(path)[1]
    mimetype = mimetypes.get(ext, "text/html")
    with open(complete_path, "rb") as fp:
        return Response(content=fp.read(), media_type=mimetype)

@app.get("/api/download-sambalog")
async def download_applog():
    return FileResponse(
        path="logs/samba_svc.txt",
        filename="samba_svc.txt",
        media_type="application/octet-stream")

@app.get("/api/download-proxylog")
async def download_proxylog():
    return FileResponse(
        path="/logs/proxy_svc.txt",
        filename="proxy_svc.txt",
        media_type="application/octet-stream")

@app.get("/api/download-weblog")
async def download_applog():
    return FileResponse(
        path="logs/web_svc.txt",
        filename="web_svc.txt",
        media_type="application/octet-stream")

@app.get("/api/cfg")
async def get_cfg():
    with open("conf.yaml", "rt") as fp:
        return load(fp, Loader=Loader)

@app.post("/api/cfg")
async def set_cfg(body: Dict):
    with open("conf.yaml", "wt") as fp:
        dump(body, fp)

    return {}

@app.post("/api/push_log")
async def push_log(body: Dict):
    do_push_log(body)

    return {
        "status": "ok"
    }

from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path

# Make sure to set the correct path to your 'build' folder
build_path = Path(__file__).parent / "config"
app.mount("/static", StaticFiles(directory=build_path / "static"), name="static")

@app.get("/{path_name:path}", response_class=HTMLResponse)
def receiver(path_name: str):
    whitelist = [
        "",
        "log",
        "manifest.json",
    ]
    if path_name.endswith(".css") \
            or path_name.endswith(".js") \
            or path_name.endswith(".html") \
            or path_name.endswith(".png") \
            or path_name.endswith("login") \
            or path_name.endswith("register") \
            or path_name in whitelist: 

        if path_name == "" or path_name == "log" or path_name.endswith("login") or path_name.endswith("register"):
            path_name = "index.html"

        return get_resource(path_name)

@app.websocket("/logging")
async def websocket_endpoint(websocket: WebSocket):
    global log_queues

    new_queue = asyncio.Queue()
    log_queues.add(new_queue)

    try:
        await websocket.accept()
        while True:
            obj = await new_queue.get()
            await websocket.send_json(obj)
    except:
        pass

    log_queues.remove(new_queue)

def run_web(queue: mp.Queue, log_to_file: bool, is_debug: bool = False):
    global app_queue

    app_queue = queue

    if log_to_file:
        logging.basicConfig(
            format="[%(asctime)s] %(message)s",
            level=logging.INFO,
            handlers=[
                logging.handlers.RotatingFileHandler(
                    "logs/web_svc.txt",
                    maxBytes=1024 * 1024 * 100,
                    backupCount=10),
            ]
        )
    else:
        logging.basicConfig(
            format="[%(asctime)s] %(message)s",
            level=logging.INFO,
            handlers=[
                logging.StreamHandler(sys.stdout),
            ]
        )

    logging.info("Web logging is working well")
    uvicorn.run(
        "web:app",
        host=conf.get_agent_host(),
        port=conf.get_agent_port(),
        reload=True,
        workers=1,
        log_level="info")

if __name__ == "__main__":
    print("Beging called as program")
    run_web(None, False, True)