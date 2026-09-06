from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.database.database import get_db
from app.videos.service import create_video, get_user_videos
from app.storage.s3_service import S3Service
from app.videos.schemas import (
    VideoResponse,
    UploadUrlResponse,
    CompleteUploadRequest,
)


router = APIRouter(
    prefix="/videos",
    tags=["Videos"],
)


BASE_DIR = Path(__file__).resolve().parent.parent.parent
VIDEOS_DIR = BASE_DIR / "videos"

VIDEOS_DIR.mkdir(exist_ok=True)

s3_service = S3Service()

@router.get("/", response_model=list[VideoResponse])
async def list_videos(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_user_videos(
        db=db,
        user=current_user,
    )


@router.post("/", response_model=VideoResponse)
async def upload_video(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    file_path = VIDEOS_DIR / file.filename

    with file_path.open("wb") as buffer:
        while chunk := await file.read(1024 * 1024):
            buffer.write(chunk)

    video = await create_video(
        db=db,
        user=current_user,
        title=file.filename,
        original_filename=file.filename,
        storage_key=file.filename,
    )

    return video

@router.post("/upload-url", response_model=UploadUrlResponse)
async def get_upload_url(
    filename: str,
    content_type: str,
    current_user: User = Depends(get_current_user),
):
    storage_key = f"videos/{current_user.id}/{filename}"

    upload_url = s3_service.generate_upload_url(
        storage_key=storage_key,
        content_type=content_type,
    )

    return {
        "upload_url": upload_url,
        "storage_key": storage_key,
    }
    
@router.post("/complete", response_model=VideoResponse)
async def complete_upload(
    data: CompleteUploadRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not data.storage_key.startswith(f"videos/{current_user.id}/"):
        raise HTTPException(
            status_code=403,
            detail="Invalid storage key",
        )

    if not s3_service.object_exists(data.storage_key):
        raise HTTPException(
            status_code=404,
            detail="Video was not found in S3",
        )

    video = await create_video(
        db=db,
        user=current_user,
        title=data.title,
        original_filename=data.original_filename,
        storage_key=data.storage_key,
    )

    return video