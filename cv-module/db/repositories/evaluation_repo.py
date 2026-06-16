from typing import Any

from sqlalchemy import select, func

from db.postgres import CVEvaluationModel, get_db_session, model_to_dict


class EvaluationRepository:
    async def create(self, document: dict[str, Any]) -> dict[str, Any]:
        async with get_db_session() as session:
            async with session.begin():
                obj = CVEvaluationModel(
                    session_id=document.get("session_id", ""),
                    evaluation_data={k: _to_json(v) for k, v in document.items()
                                     if k not in {"session_id"}},
                )
                session.add(obj)
            await session.refresh(obj)
            return _flatten_eval(model_to_dict(obj))

    async def get_by_session_id(self, session_id: str) -> dict[str, Any] | None:
        async with get_db_session() as session:
            result = await session.execute(
                select(CVEvaluationModel).where(CVEvaluationModel.session_id == session_id)
            )
            obj = result.scalar_one_or_none()
            return _flatten_eval(model_to_dict(obj)) if obj else None

    async def get_by_interview_session_id(self, interview_session_id: str) -> dict[str, Any] | None:
        """Tìm evaluation theo interview_session_id lưu trong evaluation_data JSONB."""
        async with get_db_session() as session:
            result = await session.execute(
                select(CVEvaluationModel).where(
                    CVEvaluationModel.evaluation_data["interview_session_id"].as_string() == interview_session_id
                )
            )
            obj = result.scalar_one_or_none()
            return _flatten_eval(model_to_dict(obj)) if obj else None

    async def list_history_by_user(self, user_id: str, page: int, limit: int) -> dict[str, Any]:
        skip = max(page - 1, 0) * limit
        async with get_db_session() as session:
            count_result = await session.execute(
                select(func.count()).select_from(CVEvaluationModel).where(
                    CVEvaluationModel.evaluation_data["user_id"].as_string() == user_id
                )
            )
            total = count_result.scalar_one()

            rows_result = await session.execute(
                select(CVEvaluationModel)
                .where(CVEvaluationModel.evaluation_data["user_id"].as_string() == user_id)
                .order_by(CVEvaluationModel.created_at.desc())
                .offset(skip)
                .limit(limit)
            )
            items = [_flatten_eval(model_to_dict(r)) for r in rows_result.scalars()]

        return {"items": items, "page": page, "limit": limit, "total": total}


def _to_json(obj: Any) -> Any:
    if obj is None:
        return None
    if hasattr(obj, "model_dump"):
        return obj.model_dump()
    return obj


def _flatten_eval(d: dict) -> dict:
    """Ghép evaluation_data vào root."""
    data = d.pop("evaluation_data", None) or {}
    return {**d, **data}
