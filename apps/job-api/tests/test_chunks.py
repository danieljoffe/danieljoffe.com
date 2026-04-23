"""Pure-function tests for chunks_for_optimized.

The DB-write path (`upsert_for_optimized`) needs Supabase mocking and is
left for an integration test alongside the rest of the experience layer.
"""

from app.models.experience import OptimizedPayload, Outcome, Role, Skill
from app.services.experience.chunks import chunks_for_optimized


def _payload(**overrides: object) -> OptimizedPayload:
    base: dict[str, object] = {
        "summary": "Senior frontend with a focus on performance and a11y.",
        "roles": [
            Role(
                id="fightcamp",
                company="FightCamp",
                title="Senior Frontend Engineer",
                start="2021-11",
                end="2024-04",
                summary="Cut mobile load times from 10s to 2s.",
                skills=["React", "Next.js"],
                outcome_refs=[],
            )
        ],
        "skills": [Skill(name="React", years=8.0)],
        "outcomes": [
            Outcome(
                description="Cut mobile load times from 10s to 2s",
                metric="LCP",
                value="2s",
                role_ref="fightcamp",
            )
        ],
    }
    base.update(overrides)
    return OptimizedPayload.model_validate(base)


def test_summary_chunk_first() -> None:
    chunks = chunks_for_optimized(_payload())
    assert chunks[0].chunk_type == "summary"
    assert chunks[0].chunk_ref == "summary"


def test_one_chunk_per_role_skill_outcome() -> None:
    chunks = chunks_for_optimized(_payload())
    by_type = {c.chunk_type: 0 for c in chunks}
    for c in chunks:
        by_type[c.chunk_type] += 1
    assert by_type == {"summary": 1, "role": 1, "skill": 1, "outcome": 1}


def test_role_chunk_includes_company_and_dates() -> None:
    chunks = chunks_for_optimized(_payload())
    role_chunk = next(c for c in chunks if c.chunk_type == "role")
    assert "FightCamp" in role_chunk.content
    assert "2021-11" in role_chunk.content
    assert "2024-04" in role_chunk.content


def test_role_with_no_end_uses_present() -> None:
    chunks = chunks_for_optimized(
        _payload(
            roles=[
                Role(
                    id="current",
                    company="Acme",
                    title="Engineer",
                    start="2024-05",
                    end=None,
                    summary=None,
                    skills=[],
                    outcome_refs=[],
                )
            ]
        )
    )
    role_chunk = next(c for c in chunks if c.chunk_type == "role")
    assert "present" in role_chunk.content


def test_outcome_with_metric_appends_metric_value() -> None:
    chunks = chunks_for_optimized(_payload())
    outcome_chunk = next(c for c in chunks if c.chunk_type == "outcome")
    assert "LCP" in outcome_chunk.content
    assert "2s" in outcome_chunk.content


def test_outcome_ref_is_stable_for_same_description() -> None:
    p = _payload()
    a = chunks_for_optimized(p)
    b = chunks_for_optimized(p)
    a_outcome = next(c for c in a if c.chunk_type == "outcome")
    b_outcome = next(c for c in b if c.chunk_type == "outcome")
    assert a_outcome.chunk_ref == b_outcome.chunk_ref


def test_skill_with_no_years_omits_paren() -> None:
    chunks = chunks_for_optimized(
        _payload(skills=[Skill(name="TypeScript", years=None)])
    )
    skill_chunk = next(c for c in chunks if c.chunk_type == "skill")
    assert "(" not in skill_chunk.content


def test_skill_chunk_ref_is_lowercased() -> None:
    chunks = chunks_for_optimized(
        _payload(skills=[Skill(name="GraphQL", years=None)])
    )
    skill_chunk = next(c for c in chunks if c.chunk_type == "skill")
    assert skill_chunk.chunk_ref == "graphql"


def test_empty_payload_yields_no_chunks() -> None:
    payload = OptimizedPayload(summary=None, roles=[], skills=[], outcomes=[])
    assert chunks_for_optimized(payload) == []


def test_no_summary_omits_summary_chunk() -> None:
    chunks = chunks_for_optimized(_payload(summary=None))
    assert all(c.chunk_type != "summary" for c in chunks)
