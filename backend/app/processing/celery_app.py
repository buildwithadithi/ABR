from celery import Celery

celery_app = Celery(
    "video_processing",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/1",
    include=["app.processing.worker"],
)