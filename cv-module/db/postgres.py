"""
db/postgres.py — PostgreSQL async engine + ORM models dùng SQLAlchemy
Thay thế db/mongodb.py (đã xóa MongoDB/motor)

Lưu data dạng JSONB để linh hoạt (không cần thay đổi schema mỗi lần)
"""

import json
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import Column, DateTime, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from core.config import get_settings

# ─────────────────────────────────────
# Engine & Session factory
# ─────────────────────────────────────

_engine = None
_async_session_factory = None


def _get_db_url() -> str:
    """Chuyển postgresql:// → postgresql+asyncpg:// cho asyncpg driver."""
    url = get_settings().database_url
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    # Bỏ pgbouncer=true nếu có (asyncpg không hỗ trợ)
    if "pgbouncer=true" in url:
        url = url.replace("?pgbouncer=true", "").replace("&pgbouncer=true", "")
    return url


def get_engine():
    global _engine
    if _engine is None:
        _engine = create_async_engine(
            _get_db_url(),
            echo=False,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
        )
    return _engine


def get_session_factory():
    global _async_session_factory
    if _async_session_factory is None:
        _async_session_factory = sessionmaker(
            get_engine(), class_=AsyncSession, expire_on_commit=False
        )
    return _async_session_factory


# ─────────────────────────────────────
# ORM Models
# ─────────────────────────────────────


class Base(DeclarativeBase):
    pass


class CVAnalysisModel(Base):
    __tablename__ = "cv_module_analyses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(String(36), unique=True, nullable=False, index=True)
    user_id = Column(String(255), nullable=True, index=True)
    filename = Column(String(500), nullable=True)
    job_title = Column(String(255), nullable=True)
    job_description = Column(Text, nullable=True)
    target_language = Column(String(10), nullable=True)
    model_used = Column(String(100), nullable=True)
    processing_time_ms = Column(String(20), nullable=True)
    analysis_data = Column(JSONB, nullable=True)   # Toàn bộ kết quả phân tích
    kg_enrichment = Column(JSONB, nullable=True)   # KG enrichment payload
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class CVQuestionsModel(Base):
    __tablename__ = "cv_module_questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(String(36), nullable=False, index=True)
    analysis_id = Column(String(36), nullable=True)
    job_title = Column(String(255), nullable=True)
    job_description = Column(Text, nullable=True)
    experience_level = Column(String(50), nullable=True)
    target_language = Column(String(10), nullable=True)
    questions = Column(JSONB, nullable=True)        # Danh sách câu hỏi
    kg_enrichment = Column(JSONB, nullable=True)
    total_questions = Column(String(10), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class CVEvaluationModel(Base):
    __tablename__ = "cv_module_evaluations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(String(36), nullable=False, index=True)
    evaluation_data = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


# ─────────────────────────────────────
# Lifecycle helpers
# ─────────────────────────────────────


async def init_postgres() -> None:
    """Tạo tables nếu chưa tồn tại (CREATE TABLE IF NOT EXISTS)."""
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_postgres() -> None:
    global _engine
    if _engine is not None:
        await _engine.dispose()
        _engine = None


def get_db_session() -> AsyncSession:
    """Trả về AsyncSession mới (caller phải tự đóng)."""
    factory = get_session_factory()
    return factory()


# ─────────────────────────────────────
# Helper: chuyển ORM model → dict
# ─────────────────────────────────────


def model_to_dict(obj: Any) -> dict[str, Any]:
    """Chuyển SQLAlchemy model instance sang dict (JSON-serializable)."""
    result = {}
    for col in obj.__table__.columns:
        val = getattr(obj, col.name)
        if isinstance(val, uuid.UUID):
            val = str(val)
        elif isinstance(val, datetime):
            val = val.isoformat()
        result[col.name] = val
    return result
