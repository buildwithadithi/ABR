from pathlib import Path

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database.database import engine
from sqlalchemy import text
from app.auth.router import router as auth_router
from app.videos.router import router as video_router


app = FastAPI(
    swagger_ui_parameters={
        "persistAuthorization": True
    }
)


BASE_DIR = Path(__file__).resolve().parent.parent

VIDEOS_DIR = BASE_DIR / "videos"
PROCESSED_DIR = BASE_DIR / "processed"

VIDEOS_DIR.mkdir(exist_ok=True)
PROCESSED_DIR.mkdir(exist_ok=True)

app.include_router(auth_router)
app.include_router(video_router)

app.mount(
    "/hls",
    StaticFiles(directory=PROCESSED_DIR),
    name="hls",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {
        "message": "Adaptive Video Streaming Backend"
    }
    

@app.get("/db-test")
async def db_test():
    async with engine.connect() as connection:
        result = await connection.execute(
            text("SELECT 1")
        )

        return {
            "database": "connected",
            "result": result.scalar(),
        }