import asyncio
import logging
from datetime import UTC, datetime
from typing import Any

from app.services.grading import CategoryScores, calculate_grade
from app.services.issues import ParsedIssue
from app.services.scanner import ScanResults

logger = logging.getLogger(__name__)


def _extract_scores(lighthouse: dict[str, Any]) -> CategoryScores:
    categories = lighthouse.get("categories") or {}

    def _score(name: str) -> int:
        raw = (categories.get(name) or {}).get("score")
        return round((raw or 0) * 100)

    return CategoryScores(
        performance=_score("performance"),
        accessibility=_score("accessibility"),
        seo=_score("seo"),
        best_practices=_score("best-practices"),
    )


def _extract_core_web_vitals(lighthouse: dict[str, Any]) -> dict[str, Any]:
    audits = lighthouse.get("audits") or {}

    def _numeric(key: str) -> Any:
        value = (audits.get(key) or {}).get("numericValue")
        return value if value is not None else None

    return {
        "fcp_ms": _numeric("first-contentful-paint"),
        "lcp_ms": _numeric("largest-contentful-paint"),
        "tbt_ms": _numeric("total-blocking-time"),
        "cls": _numeric("cumulative-layout-shift"),
        "si_ms": _numeric("speed-index"),
    }


async def mark_scan_running(supabase: Any, scan_id: str) -> None:
    if supabase is None:
        return
    await asyncio.to_thread(
        lambda: supabase.table("scans")
        .update({"status": "running"})
        .eq("id", scan_id)
        .execute()
    )


async def persist_scan_completion(
    supabase: Any,
    scan_id: str,
    results: ScanResults,
    issues: list[ParsedIssue],
) -> None:
    scores = _extract_scores(results.lighthouse)
    grade = calculate_grade(scores)
    cwv = _extract_core_web_vitals(results.lighthouse)

    payload: dict[str, Any] = {
        "status": "completed",
        "completed_at": datetime.now(UTC).isoformat(),
        "score_performance": scores.performance,
        "score_accessibility": scores.accessibility,
        "score_best_practices": scores.best_practices,
        "score_seo": scores.seo,
        "grade_overall": grade.grade,
        "page_title": results.page_title,
        "page_description": results.page_description,
        "page_screenshot_url": results.screenshot_url,
        "lighthouse_raw": results.lighthouse,
        "axe_raw": results.axe,
        **cwv,
    }

    if supabase is None:
        logger.info("Supabase not configured; skipping scan persistence for %s", scan_id)
        return

    await asyncio.to_thread(
        lambda: supabase.table("scans").update(payload).eq("id", scan_id).execute()
    )

    if issues:
        rows = [
            {
                "scan_id": scan_id,
                "category": issue.category,
                "severity": issue.severity,
                "title": issue.title,
                "description": issue.description,
                "impact": issue.impact,
                "fix_difficulty": issue.fix_difficulty,
                "technical_detail": issue.technical_detail,
                "sort_order": index,
            }
            for index, issue in enumerate(issues)
        ]
        await asyncio.to_thread(
            lambda: supabase.table("scan_issues").insert(rows).execute()
        )


async def mark_scan_failed(supabase: Any, scan_id: str, error_message: str) -> None:
    if supabase is None:
        return
    await asyncio.to_thread(
        lambda: supabase.table("scans")
        .update({"status": "failed", "error_message": error_message})
        .eq("id", scan_id)
        .execute()
    )
