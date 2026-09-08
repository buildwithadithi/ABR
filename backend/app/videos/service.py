from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.videos.models import Video


async def get_user_videos(
    db: AsyncSession,
    user: User,
) -> list[Video]:

    result = await db.execute(
        select(Video)
        .where(Video.user_id == user.id)
        .order_by(Video.created_at.desc())
    )

    return list(result.scalars().all())


async def create_video(
    db: AsyncSession,
    user: User,
    title: str,
    original_filename: str,
    storage_key: str,
) -> Video:

    video = Video(
        user_id=user.id,
        title=title,
        original_filename=original_filename,
        storage_key=storage_key,
        status="uploaded",
    )

    db.add(video)

    await db.commit()
    await db.refresh(video)

    return video

async def get_video_by_id(
    db: AsyncSession,
    user: User,
    video_id: int,
) -> Video | None:
    result = await db.execute(
        select(Video).where(
            Video.id == video_id,
            Video.user_id == user.id,
        )
    )

    return result.scalar_one_or_none()