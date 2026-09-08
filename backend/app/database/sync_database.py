from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import settings


SYNC_DATABASE_URL = settings.DATABASE_URL.replace(
    "postgresql+asyncpg://",
    "postgresql+psycopg2://",
)

engine = create_engine(
    SYNC_DATABASE_URL,
)

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
)