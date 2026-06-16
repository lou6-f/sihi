from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select

from db.postgres import CVQuestionsModel, get_db_session, model_to_dict


class QuestionRepository:
    async def create(self, document: dict[str, Any]) -> dict[str, Any]:
        async with get_db_session() as session:
            async with session.begin():
                obj = CVQuestionsModel(
                    session_id=document.get("session_id", ""),
                    analysis_id=str(document.get("analysis_id", "")),
                    job_title=document.get("job_title"),
                    job_description=document.get("job_description"),
                    experience_level=document.get("experience_level"),
                    target_language=document.get("target_language"),
                    questions=_to_json(document.get("questions")),
                    kg_enrichment=_to_json(document.get("kg_enrichment")),
                    total_questions=str(document.get("total_questions", 0)),
                )
                session.add(obj)
            await session.refresh(obj)
            return model_to_dict(obj)

    async def get_by_session_id(self, session_id: str) -> dict[str, Any] | None:
        async with get_db_session() as session:
            result = await session.execute(
                select(CVQuestionsModel).where(CVQuestionsModel.session_id == session_id)
            )
            obj = result.scalar_one_or_none()
            return model_to_dict(obj) if obj else None

    async def update_answer(
        self,
        session_id: str,
        question_index: int,
        answer_given: str,
        answer_score: int | None,
    ) -> dict[str, Any] | None:
        async with get_db_session() as session:
            result = await session.execute(
                select(CVQuestionsModel).where(CVQuestionsModel.session_id == session_id)
            )
            obj = result.scalar_one_or_none()
            if obj is None:
                return None

            questions = list(obj.questions or [])
            if question_index < len(questions):
                questions[question_index] = {
                    **questions[question_index],
                    "answered": True,
                    "answer_given": answer_given,
                    "answer_score": answer_score,
                }
                obj.questions = questions
                await session.commit()
                await session.refresh(obj)

            return model_to_dict(obj)


def _to_json(obj: Any) -> Any:
    if obj is None:
        return None
    if hasattr(obj, "model_dump"):
        return obj.model_dump()
    return obj
