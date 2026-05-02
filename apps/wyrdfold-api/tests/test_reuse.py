"""Tests for resume reuse within targets (#504)."""

from unittest.mock import MagicMock

from app.models.tailor import TailoredResumeRecord
from app.models.targets import (
    CategoryProfile,
    DomainProfile,
    NegativeProfile,
    ScoringProfile,
    SeniorityProfile,
)
from app.services.tailor.reuse import (
    SIMILARITY_THRESHOLD,
    clone_resume_for_job,
    extract_profile_keywords,
    find_reusable_resume,
    jd_similarity,
)


def _profile(keywords_by_cat: dict[str, dict[str, int]]) -> ScoringProfile:
    cats = {
        name: CategoryProfile(keywords=kws, weight=1.0)
        for name, kws in keywords_by_cat.items()
    }
    return ScoringProfile(
        categories=cats,
        seniority=SeniorityProfile(level="senior", signals=[]),
        domain=DomainProfile(signals=[], weight=0.5),
        negative=NegativeProfile(keywords=[], weight=-10.0),
    )


def _record(
    *,
    id: str = "rec-1",
    jd_snapshot: str = "some jd text",
    job_posting_id: str = "jp-1",
    payload_md: str | None = None,
    docx_payload_md_hash: str | None = None,
) -> TailoredResumeRecord:
    return TailoredResumeRecord(
        id=id,
        user_id=None,
        job_posting_id=job_posting_id,
        document_type="resume",
        resume_type="generic",
        jd_snapshot=jd_snapshot,
        jd_snapshot_hash="fakehash",
        payload={"summary": "test", "contact": {"name": "Test"}, "experience": [], "skills": []},
        payload_md=payload_md,
        docx_payload_md_hash=docx_payload_md_hash,
        storage_path="anon/rec-1.docx",
        warnings=[],
        model="claude-sonnet-4-20250514",
        input_tokens=1000,
        output_tokens=500,
        cost_usd=0.05,
        latency_ms=3000,
        created_at="2026-04-25T00:00:00Z",
    )


# ---- extract_profile_keywords ----


def test_extract_profile_keywords_basic() -> None:
    profile = _profile(
        {
            "core_skills": {"React": 3, "TypeScript": 3},
            "secondary": {"GraphQL": 2, "Node.js": 1},
        }
    )
    kws = extract_profile_keywords(profile)
    assert kws == {"react", "typescript", "graphql", "node.js"}


def test_extract_profile_keywords_empty() -> None:
    profile = _profile({})
    assert extract_profile_keywords(profile) == set()


# ---- jd_similarity ----


def test_jd_similarity_identical_jds() -> None:
    jd = "We need React and TypeScript experience."
    kws = {"react", "typescript", "graphql"}
    assert jd_similarity(jd, jd, kws) == 1.0


def test_jd_similarity_no_overlap() -> None:
    jd_a = "We need React expertise."
    jd_b = "Looking for a Python developer."
    kws = {"react", "python"}
    # a hits {"react"}, b hits {"python"} — intersection empty, union has 2
    assert jd_similarity(jd_a, jd_b, kws) == 0.0


def test_jd_similarity_partial_overlap() -> None:
    kws = {"react", "typescript", "graphql", "node.js"}
    jd_a = "Senior React TypeScript developer with GraphQL experience."
    jd_b = "Senior React TypeScript developer with Node.js experience."
    # a hits: {react, typescript, graphql}
    # b hits: {react, typescript, node.js}
    # intersection: {react, typescript} = 2
    # union: {react, typescript, graphql, node.js} = 4
    # jaccard = 2/4 = 0.5
    assert jd_similarity(jd_a, jd_b, kws) == 0.5


def test_jd_similarity_no_keywords_hit() -> None:
    kws = {"rust", "wasm"}
    jd_a = "Looking for React developer"
    jd_b = "Looking for Angular developer"
    assert jd_similarity(jd_a, jd_b, kws) == 0.0


def test_jd_similarity_empty_keywords() -> None:
    assert jd_similarity("any text", "any text", set()) == 0.0


def test_jd_similarity_high_overlap() -> None:
    kws = {"react", "typescript", "nextjs", "tailwind", "testing"}
    jd_a = "React TypeScript NextJS Tailwind with testing experience"
    jd_b = "React TypeScript NextJS Tailwind with testing preferred"
    # Both hit all 5 keywords
    assert jd_similarity(jd_a, jd_b, kws) == 1.0


# ---- find_reusable_resume ----


def test_find_reusable_resume_no_jobs_in_target() -> None:
    supabase = MagicMock()
    supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []

    result = find_reusable_resume(
        supabase,
        target_id="target-1",
        job_description="some jd",
        profile_keywords={"react", "typescript"},
    )
    assert result is None


def test_find_reusable_resume_no_resumes() -> None:
    supabase = MagicMock()

    # First call: jobs query returns IDs
    jp_mock = MagicMock()
    jp_mock.select.return_value.eq.return_value.execute.return_value.data = [{"id": "jp-1"}]

    # Second call: documents query returns empty
    tr_mock = MagicMock()
    tr_chain = tr_mock.select.return_value.in_.return_value.eq.return_value.order.return_value
    tr_chain.limit.return_value.execute.return_value.data = []

    supabase.table.side_effect = lambda name: jp_mock if name == "jobs" else tr_mock

    result = find_reusable_resume(
        supabase,
        target_id="target-1",
        job_description="We need React and TypeScript experience",
        profile_keywords={"react", "typescript"},
    )
    assert result is None


def test_find_reusable_resume_below_threshold() -> None:
    supabase = MagicMock()

    jp_mock = MagicMock()
    jp_mock.select.return_value.eq.return_value.execute.return_value.data = [{"id": "jp-1"}]

    # Resume with very different JD
    resume_row = _record(jd_snapshot="Looking for a Python Django developer").model_dump(
        mode="json"
    )
    tr_mock = MagicMock()
    tr_chain = tr_mock.select.return_value.in_.return_value.eq.return_value.order.return_value
    tr_chain.limit.return_value.execute.return_value.data = [resume_row]

    supabase.table.side_effect = lambda name: jp_mock if name == "jobs" else tr_mock

    result = find_reusable_resume(
        supabase,
        target_id="target-1",
        job_description="We need React and TypeScript experience",
        profile_keywords={"react", "typescript", "graphql", "node.js"},
    )
    assert result is None


def test_find_reusable_resume_above_threshold() -> None:
    supabase = MagicMock()

    jp_mock = MagicMock()
    jp_mock.select.return_value.eq.return_value.execute.return_value.data = [{"id": "jp-1"}]

    # Resume with very similar JD (all same keywords)
    resume_row = _record(
        jd_snapshot="Senior React TypeScript developer with GraphQL and Node.js"
    ).model_dump(mode="json")
    tr_mock = MagicMock()
    tr_chain = tr_mock.select.return_value.in_.return_value.eq.return_value.order.return_value
    tr_chain.limit.return_value.execute.return_value.data = [resume_row]

    supabase.table.side_effect = lambda name: jp_mock if name == "jobs" else tr_mock

    kws = {"react", "typescript", "graphql", "node.js"}
    result = find_reusable_resume(
        supabase,
        target_id="target-1",
        job_description="React TypeScript GraphQL Node.js developer needed",
        profile_keywords=kws,
    )
    assert result is not None
    assert result.id == "rec-1"


# ---- clone_resume_for_job ----


def test_clone_resume_preserves_payload() -> None:
    supabase = MagicMock()
    source = _record(id="source-1", jd_snapshot="original jd")

    # Mock the insert to return the row with a new ID
    cloned_row = {
        **source.model_dump(mode="json"),
        "id": "clone-1",
        "job_posting_id": "jp-new",
        "source_resume_id": "source-1",
        "input_tokens": 0,
        "output_tokens": 0,
        "cost_usd": 0.0,
        "latency_ms": 0,
    }
    supabase.table.return_value.insert.return_value.execute.return_value.data = [cloned_row]

    result = clone_resume_for_job(
        supabase,
        source=source,
        job_posting_id="jp-new",
        job_description="new jd text",
        user_id=None,
    )

    assert result.source_resume_id == "source-1"
    assert result.cost_usd == 0.0
    assert result.input_tokens == 0
    assert result.payload == source.payload
    assert result.storage_path == source.storage_path


def test_clone_resume_carries_markdown_and_cache_hash() -> None:
    """Cloned rows must inherit payload_md + docx_payload_md_hash so the
    download endpoint serves the cached .docx without re-rendering. If
    either field is dropped the clone forces a pandoc round-trip on first
    download (slower) or worse, treats the cached storage_path bytes as
    valid for a different markdown body.
    """
    supabase = MagicMock()
    md = "# Daniel\n\n## Experience\n\n### Engineer — Acme\n\n- Did things\n"
    source = _record(
        id="source-1",
        payload_md=md,
        docx_payload_md_hash="hash-source",
    )

    cloned_row = {
        **source.model_dump(mode="json"),
        "id": "clone-1",
        "job_posting_id": "jp-new",
        "source_resume_id": "source-1",
    }
    supabase.table.return_value.insert.return_value.execute.return_value.data = [cloned_row]

    result = clone_resume_for_job(
        supabase,
        source=source,
        job_posting_id="jp-new",
        job_description="new jd text",
        user_id=None,
    )

    # `insert_row` writes to `documents` first and then to the
    # versions table — find the documents call and assert against it.
    inserts = supabase.table.return_value.insert.call_args_list
    main_insert = next(
        call[0][0] for call in inserts if "jd_snapshot" in call[0][0]
    )
    assert main_insert["payload_md"] == md
    assert main_insert["docx_payload_md_hash"] == "hash-source"
    # And the returned record reflects them.
    assert result.payload_md == md
    assert result.docx_payload_md_hash == "hash-source"


def test_clone_resume_adds_reuse_warning() -> None:
    supabase = MagicMock()
    source = _record(id="source-1")

    cloned_row = {
        **source.model_dump(mode="json"),
        "id": "clone-1",
        "warnings": [*source.warnings, "reused_from_similar_job"],
        "source_resume_id": "source-1",
    }
    supabase.table.return_value.insert.return_value.execute.return_value.data = [cloned_row]

    result = clone_resume_for_job(
        supabase,
        source=source,
        job_posting_id="jp-new",
        job_description="new jd",
        user_id=None,
    )
    assert "reused_from_similar_job" in result.warnings


# ---- threshold sanity check ----


def test_similarity_threshold_value() -> None:
    """Verify the threshold is set to 0.70 as designed."""
    assert SIMILARITY_THRESHOLD == 0.70
