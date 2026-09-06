from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.auth.security import hash_password, verify_password


async def create_user(
    db: AsyncSession,
    email: str,
    password: str,
) -> User:

    result = await db.execute(
        select(User).where(User.email == email)
    )

    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise ValueError("Email already registered")

    user = User(
        email=email,
        password_hash=hash_password(password),
    )

    db.add(user)

    await db.commit()
    await db.refresh(user)

    return user

async def authenticate_user(
    db: AsyncSession,
    email: str,
    password: str,
) -> User | None:

    result = await db.execute(
        select(User).where(User.email == email)
    )

    user = result.scalar_one_or_none()

    if user is None:
        return None

    if not verify_password(password, user.password_hash):
        return None

    return user