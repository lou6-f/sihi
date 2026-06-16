from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select, func
from sqlalchemy.dialects.postgresql import insert

from db.postgres import CVAnalysisModel, get_db_session, model_to_dict


class CVRepository:
    async def create(self, document: dict[str, Any]) -> dict[str, Any]:
        """Lưu kết quả phân tích CV vào PostgreSQL."""
        async with get_db_session() as session:
            async with session.begin():
                obj = CVAnalysisModel(
                    session_id=document.get("session_id", ""),
                    user_id=document.get("user_id"),
                    filename=document.get("filename"),
                    job_title=document.get("job_title"),
                    job_description=document.get("job_description"),
                    target_language=document.get("target_language"),
                    model_used=document.get("model_used"),
                    processing_time_ms=str(document.get("processing_time_ms", "")),
                    analysis_data=_extract_analysis(document),
                    kg_enrichment=_to_json(document.get("kg_enrichment")),
                )
                session.add(obj)
            await session.refresh(obj)
            return model_to_dict(obj)

    async def get_by_session_id(self, session_id: str) -> dict[str, Any] | None:
        async with get_db_session() as session:
            result = await session.execute(
                select(CVAnalysisModel).where(CVAnalysisModel.session_id == session_id)
            )
            obj = result.scalar_one_or_none()
            if obj is None:
                return None
            return _flatten_analysis(model_to_dict(obj))

    async def list_history_by_user(self, user_id: str, page: int, limit: int) -> dict[str, Any]:
        skip = max(page - 1, 0) * limit
        async with get_db_session() as session:
            count_result = await session.execute(
                select(func.count()).select_from(CVAnalysisModel).where(
                    CVAnalysisModel.user_id == user_id
                )
            )
            total = count_result.scalar_one()

            rows_result = await session.execute(
                select(CVAnalysisModel)
                .where(CVAnalysisModel.user_id == user_id)
                .order_by(CVAnalysisModel.created_at.desc())
                .offset(skip)
                .limit(limit)
            )
            items = [_flatten_analysis(model_to_dict(r)) for r in rows_result.scalars()]

        return {"items": items, "page": page, "limit": limit, "total": total}


# ─────────────────────────────────────
# Helpers
# ─────────────────────────────────────

def _to_json(obj: Any) -> Any:
    """Chuyển Pydantic model / dict sang dict JSON."""
    if obj is None:
        return None
    if hasattr(obj, "model_dump"):
        return obj.model_dump()
    return obj


def _extract_analysis(doc: dict) -> dict:
    """Trích các field phân tích CV (không gồm metadata)."""
    skip = {"session_id", "user_id", "filename", "job_title", "job_description",
            "target_language", "model_used", "processing_time_ms", "kg_enrichment", "created_at"}
    return {k: _to_json(v) for k, v in doc.items() if k not in skip}


def _flatten_analysis(d: dict) -> dict:
    """Ghép analysis_data vào root cho dễ đọc."""
    analysis = d.pop("analysis_data", None) or {}
    return {**d, **analysis}
