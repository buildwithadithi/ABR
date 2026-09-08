from pathlib import Path
import subprocess
import shutil

from sqlalchemy import select
from botocore.exceptions import (
    BotoCoreError,
    ClientError,
)

from app.storage.s3_service import S3Service
from app.database.sync_database import SessionLocal
from app.auth.models import User
from app.videos.models import Video
from app.processing.celery_app import celery_app


s3_service = S3Service()

BASE_DIR = Path(__file__).resolve().parent.parent.parent
TEMP_DIR = BASE_DIR / "tmp"


def mark_video_failed(video_id: int):
    db = SessionLocal()

    try:
        video = db.execute(
            select(Video).where(Video.id == video_id)
        ).scalar_one_or_none()

        if video is not None:
            video.status = "failed"
            db.commit()

    finally:
        db.close()


@celery_app.task(
    bind=True,
    max_retries=3,
)
def process_video(
    self,
    storage_key: str,
    video_id: int,
):

    # --------------------------------------------------
    # 1. Mark video as processing
    # --------------------------------------------------

    db = SessionLocal()

    try:
        video = db.execute(
            select(Video).where(Video.id == video_id)
        ).scalar_one_or_none()

        if video is None:
            raise ValueError(
                f"Video {video_id} not found"
            )

        video.status = "processing"

        db.commit()

    finally:
        db.close()

    print(
        "Video status updated: processing"
    )

    try:

        # --------------------------------------------------
        # 2. Prepare temporary directories
        # --------------------------------------------------

        video_dir = TEMP_DIR / str(video_id)

        # If this is a retry, remove any files from
        # the previous attempt.
        if video_dir.exists():
            shutil.rmtree(video_dir)

        video_dir.mkdir(
            parents=True,
            exist_ok=True,
        )

        input_path = video_dir / "original.mp4"

        hls_dir = video_dir / "hls"

        # Create quality directories
        for quality in [
            "360p",
            "480p",
            "720p",
        ]:
            (
                hls_dir / quality
            ).mkdir(
                parents=True,
                exist_ok=True,
            )

        # --------------------------------------------------
        # 3. Download original video from S3
        # --------------------------------------------------

        print(
            f"Downloading {storage_key} from S3..."
        )

        s3_service.download_object(
            storage_key=storage_key,
            destination_path=str(input_path),
        )

        print(
            "Download completed."
        )

        # --------------------------------------------------
        # 4. Generate 360p
        # --------------------------------------------------

        print(
            "Generating 360p..."
        )

        subprocess.run(
            [
                "ffmpeg",
                "-i",
                str(input_path),
                "-vf",
                "scale=-2:360",
                "-c:v",
                "libx264",
                "-b:v",
                "500k",
                "-c:a",
                "aac",
                "-b:a",
                "96k",
                "-f",
                "hls",
                "-hls_time",
                "6",
                "-hls_playlist_type",
                "vod",
                str(
                    hls_dir
                    / "360p"
                    / "playlist.m3u8"
                ),
            ],
            check=True,
        )

        # --------------------------------------------------
        # 5. Generate 480p
        # --------------------------------------------------

        print(
            "Generating 480p..."
        )

        subprocess.run(
            [
                "ffmpeg",
                "-i",
                str(input_path),
                "-vf",
                "scale=-2:480",
                "-c:v",
                "libx264",
                "-b:v",
                "1000k",
                "-c:a",
                "aac",
                "-b:a",
                "128k",
                "-f",
                "hls",
                "-hls_time",
                "6",
                "-hls_playlist_type",
                "vod",
                str(
                    hls_dir
                    / "480p"
                    / "playlist.m3u8"
                ),
            ],
            check=True,
        )

        # --------------------------------------------------
        # 6. Generate 720p
        # --------------------------------------------------

        print(
            "Generating 720p..."
        )

        subprocess.run(
            [
                "ffmpeg",
                "-i",
                str(input_path),
                "-vf",
                "scale=-2:720",
                "-c:v",
                "libx264",
                "-b:v",
                "2500k",
                "-c:a",
                "aac",
                "-b:a",
                "128k",
                "-f",
                "hls",
                "-hls_time",
                "6",
                "-hls_playlist_type",
                "vod",
                str(
                    hls_dir
                    / "720p"
                    / "playlist.m3u8"
                ),
            ],
            check=True,
        )

        print(
            "All quality levels generated."
        )

        # --------------------------------------------------
        # 7. Create master playlist
        # --------------------------------------------------

        master_playlist = """#EXTM3U
#EXT-X-VERSION:3

#EXT-X-STREAM-INF:BANDWIDTH=600000,RESOLUTION=640x360
360p/playlist.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=1200000,RESOLUTION=854x480
480p/playlist.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720
720p/playlist.m3u8
"""

        master_path = (
            hls_dir / "master.m3u8"
        )

        master_path.write_text(
            master_playlist
        )

        print(
            f"Master playlist created: "
            f"{master_path}"
        )

        # --------------------------------------------------
        # 8. Upload HLS files to S3
        # --------------------------------------------------

        print(
            "Uploading HLS files to S3..."
        )

        for file_path in hls_dir.rglob("*"):

            if not file_path.is_file():
                continue

            relative_path = (
                file_path.relative_to(
                    hls_dir
                )
            )

            output_storage_key = (
                f"processed/{video_id}/"
                f"{relative_path.as_posix()}"
            )

            # Determine content type
            if file_path.suffix == ".m3u8":

                content_type = (
                    "application/vnd.apple.mpegurl"
                )

            elif file_path.suffix == ".ts":

                content_type = (
                    "video/mp2t"
                )

            else:

                content_type = (
                    "application/octet-stream"
                )

            print(
                f"Uploading {relative_path} "
                f"→ {output_storage_key}"
            )

            s3_service.upload_file(
                local_path=str(file_path),
                storage_key=output_storage_key,
                content_type=content_type,
            )

        print(
            "HLS upload completed."
        )

        # --------------------------------------------------
        # 9. Update video as completed
        # --------------------------------------------------

        processed_key = (
            f"processed/{video_id}/master.m3u8"
        )

        db = SessionLocal()

        try:

            video = db.execute(
                select(Video).where(
                    Video.id == video_id
                )
            ).scalar_one_or_none()

            if video is None:
                raise ValueError(
                    f"Video {video_id} not found"
                )

            video.processed_storage_key = (
                processed_key
            )

            video.status = "completed"

            db.commit()

        finally:

            db.close()

        print(
            "Video status updated: completed"
        )

        # --------------------------------------------------
        # 10. Cleanup temporary files
        # --------------------------------------------------

        if video_dir.exists():

            shutil.rmtree(
                video_dir
            )

        print(
            f"Temporary files deleted: "
            f"{video_dir}"
        )

    # --------------------------------------------------
    # 11. Retry temporary AWS failures
    # --------------------------------------------------

    except (
        BotoCoreError,
        ClientError,
    ) as error:

        print(
            f"Temporary AWS error: "
            f"{error}"
        )

        # retries starts at 0
        #
        # First retry  -> 10 seconds
        # Second retry -> 20 seconds
        # Third retry  -> 40 seconds

        if (
            self.request.retries
            >= self.max_retries - 1
        ):

            print(
                "Maximum retries reached. "
                "Marking video as failed."
            )

            mark_video_failed(
                video_id
            )

            raise

        countdown = (
            10
            * (
                2
                ** self.request.retries
            )
        )

        print(
            f"Retrying in "
            f"{countdown} seconds..."
        )

        raise self.retry(
            exc=error,
            countdown=countdown,
        )

    # --------------------------------------------------
    # 12. Handle permanent processing failures
    # --------------------------------------------------

    except Exception as error:

        print(
            f"Video processing failed: "
            f"{error}"
        )

        mark_video_failed(
            video_id
        )

        # Tell Celery that the task failed
        raise