from pathlib import Path
from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.mount("/hls", StaticFiles(directory="processed"), name="hls")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

VIDEOS_DIR = Path("videos")
VIDEOS_DIR.mkdir(exist_ok=True)


@app.get("/")
def home():
    return {"message": "Adaptive Video Streaming Backend"}


@app.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    file_path = VIDEOS_DIR / file.filename

    with file_path.open("wb") as buffer:
        while chunk := await file.read(1024 * 1024):
            buffer.write(chunk)

    return {
        "filename": file.filename,
        "message": "Video uploaded successfully"
    }
    
@app.get("/videos")
def list_videos():
    videos = [
        file.name
        for file in VIDEOS_DIR.iterdir()
        if file.is_file()
    ]

    return {"videos": videos}