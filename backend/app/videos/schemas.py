from datetime import datetime
from pydantic import BaseModel

class UploadUrlResponse(BaseModel):
    upload_url: str
    storage_key: str


class CompleteUploadRequest(BaseModel):
    title: str
    original_filename: str
    storage_key: str
    
class VideoResponse(BaseModel):
    id: int
    title: str
    original_filename: str
    storage_key: str
    processed_storage_key: str | None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
    
# -------------------------------
# Multipart upload schemas
# -------------------------------

class MultipartInitRequest(BaseModel):
    filename: str
    content_type: str


class MultipartInitResponse(BaseModel):
    upload_id: str
    storage_key: str


class MultipartPartUrlResponse(BaseModel):
    part_number: int
    upload_url: str


class MultipartCompleteRequest(BaseModel):
    storage_key: str
    upload_id: str
    parts: list[dict]
    title: str
    original_filename: str