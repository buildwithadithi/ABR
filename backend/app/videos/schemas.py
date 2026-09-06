from datetime import datetime
from pydantic import BaseModel


class VideoResponse(BaseModel):
    id: int
    title: str
    original_filename: str
    storage_key: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class UploadUrlResponse(BaseModel):
    upload_url: str
    storage_key: str


class CompleteUploadRequest(BaseModel):
    title: str
    original_filename: str
    storage_key: str