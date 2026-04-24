"""Pure-function tests for gap_tracker.detect_gaps, top_gap, gap_health, and can_generate."""

from app.models.experience import OptimizedPayload, Outcome, Role, Skill
from app.services.experience.gap_tracker import can_generate, detect_gaps, gap_health, top_gap


def _role(
    id_: str,
    *,
    summary: str | None = None,
    end: str | None = "2024-01",
    outcome_refs: list[str] | None = None,
) -> Role:
    return Role(
        id=id_,
        company=id_,
        title="Engineer",
        start="2020-01",
        end=end,
        summary=summary,
        skills=[],
        outcome_refs=outcome_refs or [],
    )


def _outcome(
    description: str,
    *,
    metric: str | None = None,
    value: str | None = None,
    role_ref: str | None = None,
) -> Outcome:
    return Outcome(description=description, metric=metric, value=value, role_ref=role_ref)


def test_empty_payload_returns_content_empty_gap() -> None:
    gaps = detect_gaps(OptimizedPayload())
    assert len(gaps) == 1
    assert gaps[0].kind == "content.empty"


def test_role_without_outcomes_surfaces_gap() -> None:
    payload = OptimizedPayload(
        roles=[_role("a", summary="s"), _role("b", summary="s")],
        outcomes=[_outcome("x", metric="m", value="v", role_ref="a")],
    )
    kinds = {g.kind for g in detect_gaps(payload)}
    assert "role.missing_outcomes" in kinds


def test_role_outcome_ref_counts_as_having_outcomes() -> None:
    payload = OptimizedPayload(
        roles=[_role("a", summary="s", outcome_refs=["baked-in outcome"])],
    )
    kinds = {g.kind for g in detect_gaps(payload)}
    assert "role.missing_outcomes" not in kinds


def test_role_without_summary_surfaces_gap() -> None:
    payload = OptimizedPayload(
        roles=[_role("a", summary=None, outcome_refs=["x"])],
    )
    kinds = {g.kind for g in detect_gaps(payload)}
    assert "role.missing_summary" in kinds


def test_older_role_without_end_surfaces_gap() -> None:
    payload = OptimizedPayload(
        roles=[
            _role("recent", summary="s", end=None, outcome_refs=["x"]),
            _role("older", summary="s", end=None, outcome_refs=["x"]),
        ],
    )
    gaps = detect_gaps(payload)
    end_gaps = [g for g in gaps if g.kind == "role.missing_end_date"]
    assert len(end_gaps) == 1
    assert end_gaps[0].ref == "older"


def test_outcome_without_metric_surfaces_gap() -> None:
    payload = OptimizedPayload(
        roles=[_role("a", summary="s", outcome_refs=["x"])],
        outcomes=[_outcome("did a thing", role_ref="a")],
    )
    kinds = {g.kind for g in detect_gaps(payload)}
    assert "outcome.missing_metric" in kinds


def test_skill_without_evidence_surfaces_gap() -> None:
    payload = OptimizedPayload(
        roles=[_role("a", summary="s", outcome_refs=["x"])],
        skills=[Skill(name="React")],
    )
    kinds = {g.kind for g in detect_gaps(payload)}
    assert "skill.missing_evidence" in kinds


def test_gaps_sorted_by_priority_ascending() -> None:
    payload = OptimizedPayload(
        roles=[_role("a", summary=None)],
        skills=[Skill(name="React")],
    )
    gaps = detect_gaps(payload)
    priorities = [g.priority for g in gaps]
    assert priorities == sorted(priorities)


def test_missing_outcomes_beats_missing_summary_in_priority() -> None:
    payload = OptimizedPayload(
        roles=[_role("a", summary=None)],
    )
    gaps = detect_gaps(payload)
    outcome_gap = next(g for g in gaps if g.kind == "role.missing_outcomes")
    summary_gap = next(g for g in gaps if g.kind == "role.missing_summary")
    assert outcome_gap.priority < summary_gap.priority


def test_top_gap_returns_highest_priority() -> None:
    payload = OptimizedPayload(
        roles=[_role("a", summary=None)],
        skills=[Skill(name="React")],
    )
    top = top_gap(payload)
    assert top is not None
    assert top.kind == "role.missing_outcomes"


def test_top_gap_returns_none_when_complete() -> None:
    payload = OptimizedPayload(
        summary="s",
        roles=[
            _role(
                "a",
                summary="good summary",
                outcome_refs=["x"],
                end="2024-01",
            )
        ],
        outcomes=[_outcome("cut LCP", metric="LCP", value="2s", role_ref="a")],
        skills=[Skill(name="React", evidence_refs=["a"])],
    )
    assert top_gap(payload) is None


def test_later_roles_get_lower_priority_boost() -> None:
    """Older roles (higher index) should have a larger additive priority value
    (i.e. be less urgent) than newer ones for the same gap kind."""
    payload = OptimizedPayload(
        roles=[
            _role("newest", summary=None, outcome_refs=["x"]),
            _role("older", summary=None, outcome_refs=["x"]),
        ],
    )
    gaps = detect_gaps(payload)
    newest_summary = next(
        g for g in gaps if g.kind == "role.missing_summary" and g.ref == "newest"
    )
    older_summary = next(
        g for g in gaps if g.kind == "role.missing_summary" and g.ref == "older"
    )
    assert newest_summary.priority < older_summary.priority


# ---- gap_health() (#498) --------------------------------------------------


def test_gap_health_empty_payload_returns_100_pct() -> None:
    result = gap_health(OptimizedPayload())
    assert result.gap_pct == 100.0
    assert result.tier == "red"


def test_gap_health_complete_payload_returns_0_pct() -> None:
    payload = OptimizedPayload(
        summary="Senior engineer.",
        roles=[
            _role("a", summary="Built things", outcome_refs=["x"], end="2024-01"),
        ],
        outcomes=[_outcome("Cut LCP", metric="LCP", value="2s", role_ref="a")],
        skills=[Skill(name="React", evidence_refs=["a"])],
    )
    result = gap_health(payload)
    assert result.gap_pct == 0.0
    assert result.tier == "green"


def test_gap_health_tier_boundaries() -> None:
    assert gap_health(OptimizedPayload()).tier == "red"  # 100%

    complete = OptimizedPayload(
        summary="s",
        roles=[_role("a", summary="s", outcome_refs=["x"])],
        outcomes=[_outcome("x", metric="m", value="v", role_ref="a")],
        skills=[Skill(name="R", evidence_refs=["a"])],
    )
    assert gap_health(complete).tier == "green"  # 0%


def test_gap_health_outcomes_weighted_higher_than_end_dates() -> None:
    """A missing outcome (weight 5) should contribute more to gap_pct
    than a missing end date (weight 1)."""
    payload_missing_outcomes = OptimizedPayload(
        roles=[
            _role("a", summary="s", end="2024-01"),
            _role("b", summary="s", end="2024-01"),
        ],
    )
    payload_missing_end_date = OptimizedPayload(
        roles=[
            _role("a", summary="s", outcome_refs=["x"], end="2024-01"),
            _role("b", summary="s", outcome_refs=["x"], end=None),
        ],
    )
    h_outcomes = gap_health(payload_missing_outcomes)
    h_end_date = gap_health(payload_missing_end_date)
    assert h_outcomes.gap_pct > h_end_date.gap_pct


def test_gap_health_partial_payload_exact_pct() -> None:
    """One role missing summary (weight 2), one unquantified outcome (weight 3).
    The outcome has role_ref="a" so role.missing_outcomes does NOT fire.
    total_weight = 1*5 + 1*2 + 1*3 + 0*1 + 0*1 = 10
    gap_weight = 2 + 3 = 5
    gap_pct = 50.0%"""
    payload = OptimizedPayload(
        roles=[_role("a")],
        outcomes=[_outcome("did a thing", role_ref="a")],
    )
    result = gap_health(payload)
    assert result.total_weight == 10
    assert result.gap_weight == 5
    assert result.gap_pct == 50.0


def test_gap_health_summary_only_returns_green() -> None:
    """Payload with only a summary and nothing else (no roles/skills)
    should not be content.empty but has nothing to penalize."""
    payload = OptimizedPayload(summary="Senior engineer.")
    result = gap_health(payload)
    assert result.gap_pct == 0.0
    assert result.tier == "green"


# ---- can_generate() (#498 revision) -----------------------------------------


def test_can_generate_blocks_when_no_roles() -> None:
    result = can_generate(OptimizedPayload())
    assert not result.ok
    assert result.reason == "no_roles"


def test_can_generate_blocks_single_role_no_outcomes() -> None:
    payload = OptimizedPayload(roles=[_role("a")])
    result = can_generate(payload)
    assert not result.ok
    assert result.reason == "insufficient_outcomes"


def test_can_generate_blocks_when_majority_roles_lack_outcomes() -> None:
    payload = OptimizedPayload(
        roles=[
            _role("a", outcome_refs=["x"]),
            _role("b"),
            _role("c"),
        ],
    )
    result = can_generate(payload)
    assert not result.ok
    assert result.reason == "insufficient_outcomes"


def test_can_generate_allows_when_minority_roles_lack_outcomes() -> None:
    payload = OptimizedPayload(
        roles=[
            _role("a", outcome_refs=["x"]),
            _role("b", outcome_refs=["y"]),
            _role("c"),
        ],
    )
    result = can_generate(payload)
    assert result.ok


def test_can_generate_allows_with_all_outcomes_present() -> None:
    payload = OptimizedPayload(
        roles=[_role("a", outcome_refs=["x"]), _role("b", outcome_refs=["y"])],
    )
    result = can_generate(payload)
    assert result.ok


def test_can_generate_counts_outcome_role_refs() -> None:
    """Outcomes linked via role_ref count as the role having outcomes."""
    payload = OptimizedPayload(
        roles=[_role("a")],
        outcomes=[_outcome("did a thing", role_ref="a")],
    )
    result = can_generate(payload)
    assert result.ok
