from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.database.database import get_db
from app.videos.service import (
    create_video,
    get_user_videos,
    get_video_by_id,
)
from app.storage.s3_service import S3Service
from app.videos.schemas import (
    VideoResponse,
    UploadUrlResponse,
    CompleteUploadRequest,
    MultipartInitRequest,
    MultipartInitResponse,
    MultipartPartUrlResponse,
    MultipartCompleteRequest,
)
from app.processing.worker import process_video
from uuid import uuid4

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
    extension = Path(filename).suffix.lower()

    storage_key = (
        f"videos/{current_user.id}/"
        f"{uuid4()}{extension}"
    )

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

    process_video.delay(
        data.storage_key,
        video.id,
    )

    return video

    
@router.post(
    "/multipart/init",
    response_model=MultipartInitResponse,
)
async def init_multipart_upload(
    data: MultipartInitRequest,
    current_user: User = Depends(get_current_user),
):
    extension = Path(data.filename).suffix.lower()

    storage_key = (
        f"videos/{current_user.id}/"
        f"{uuid4()}{extension}"
    )

    upload_id = s3_service.create_multipart_upload(
        storage_key=storage_key,
        content_type=data.content_type,
    )

    return {
        "upload_id": upload_id,
        "storage_key": storage_key,
    }
    
@router.post(
    "/multipart/part-url",
    response_model=MultipartPartUrlResponse,
)
async def get_multipart_part_url(
    storage_key: str,
    upload_id: str,
    part_number: int,
    current_user: User = Depends(get_current_user),
):
    if not storage_key.startswith(
        f"videos/{current_user.id}/"
    ):
        raise HTTPException(
            status_code=403,
            detail="Invalid storage key",
        )

    if part_number < 1 or part_number > 10000:
        raise HTTPException(
            status_code=400,
            detail="Invalid part number",
        )

    upload_url = s3_service.generate_part_upload_url(
        storage_key=storage_key,
        upload_id=upload_id,
        part_number=part_number,
    )

    return {
        "part_number": part_number,
        "upload_url": upload_url,
    }
    
@router.post("/multipart/complete")
async def complete_multipart_upload(
    data: MultipartCompleteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not data.storage_key.startswith(
        f"videos/{current_user.id}/"
    ):
        raise HTTPException(
            status_code=403,
            detail="Invalid storage key",
        )

    parts = sorted(
        data.parts,
        key=lambda part: part["PartNumber"],
    )

    s3_service.complete_multipart_upload(
        storage_key=data.storage_key,
        upload_id=data.upload_id,
        parts=parts,
    )

    if not s3_service.object_exists(
        data.storage_key
    ):
        raise HTTPException(
            status_code=500,
            detail="Multipart upload failed",
        )

    video = await create_video(
        db=db,
        user=current_user,
        title=data.title,
        original_filename=data.original_filename,
        storage_key=data.storage_key,
    )

    process_video.delay(
        data.storage_key,
        video.id,
    )

    return video

@router.post("/multipart/abort")
async def abort_multipart_upload(
    storage_key: str,
    upload_id: str,
    current_user: User = Depends(get_current_user),
):
    if not storage_key.startswith(
        f"videos/{current_user.id}/"
    ):
        raise HTTPException(
            status_code=403,
            detail="Invalid storage key",
        )

    s3_service.abort_multipart_upload(
        storage_key=storage_key,
        upload_id=upload_id,
    )

    return {
        "message": "Multipart upload aborted"
    }
    
@router.get("/{video_id}", response_model=VideoResponse)
async def get_video(
    video_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    video = await get_video_by_id(
        db=db,
        user=current_user,
        video_id=video_id,
    )

    if video is None:
        raise HTTPException(
            status_code=404,
            detail="Video not found",
        )

    return video

@router.delete("/{video_id}")
async def delete_video(
    video_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    video = await get_video_by_id(
        db=db,
        user=current_user,
        video_id=video_id,
    )

    if video is None:
        raise HTTPException(
            status_code=404,
            detail="Video not found",
        )

    # Delete original video
    s3_service.delete_object(
        video.storage_key
    )

    # Delete processed HLS files
    s3_service.delete_prefix(
        f"processed/{video.id}/"
    )

    # Delete database record
    await db.delete(video)
    await db.commit()

    return {
        "message": "Video deleted successfully"
    }