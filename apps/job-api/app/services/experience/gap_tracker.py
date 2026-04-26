"""Deterministic gap detection over an optimized doc.

Pure function. No LLM. Scans the typed payload for missing slots that
matter for resume tailoring: roles without quantified outcomes, outcomes
without metrics, roles without end dates, etc.

The conversation orchestrator calls `next_probe()` to turn the top-priority
gap into a user-facing probing question (LLM phrases it; priorities here
are deterministic).

Priority scale: lower = more urgent. Tailored so a missing outcome on the
most recent role beats a missing end-date on an older role.
"""

from app.models.conversation import Gap, GapHealthResult, GapKind, GapTier, GateResult
from app.models.experience import OptimizedPayload

GAP_WEIGHTS: dict[GapKind, int] = {
    "role.missing_outcomes": 5,
    "outcome.missing_metric": 3,
    "role.missing_summary": 2,
    "role.missing_end_date": 1,
    "skill.missing_evidence": 1,
    "content.empty": 0,
}


def _pct_to_tier(pct: float) -> GapTier:
    if pct >= 45:
        return "red"
    if pct >= 25:
        return "yellow"
    return "green"


def _role_priority_boost(index: int, total: int) -> int:
    """Earlier roles (by declared order) get higher priority boost since
    `roles[0]` is usually the most recent. Translates index to an additive
    adjustment; 0 for newest, grows with age.
    """
    if total <= 0:
        return 0
    return min(index * 2, 20)


def detect_gaps(payload: OptimizedPayload) -> list[Gap]:
    """Return all gaps, sorted by priority ascending (most urgent first)."""
    gaps: list[Gap] = []

    if (
        not payload.roles
        and not payload.skills
        and not payload.outcomes
        and not payload.summary
    ):
        gaps.append(
            Gap(
                kind="content.empty",
                ref="",
                priority=0,
                context="No content yet. Start with an onboarding turn.",
            )
        )
        return gaps

    outcome_refs_by_role: dict[str, list[str]] = {}
    for o in payload.outcomes:
        if o.role_ref:
            outcome_refs_by_role.setdefault(o.role_ref, []).append(o.description)

    for idx, role in enumerate(payload.roles):
        boost = _role_priority_boost(idx, len(payload.roles))
        role_outcomes = outcome_refs_by_role.get(role.id, [])
        if not role_outcomes and not role.outcome_refs:
            gaps.append(
                Gap(
                    kind="role.missing_outcomes",
                    ref=role.id,
                    priority=10 + boost,
                    context=f"{role.title} at {role.company} has no outcomes.",
                )
            )
        if not role.summary:
            gaps.append(
                Gap(
                    kind="role.missing_summary",
                    ref=role.id,
                    priority=30 + boost,
                    context=f"{role.title} at {role.company} has no summary sentence.",
                )
            )
        if role.end is None and idx > 0:
            gaps.append(
                Gap(
                    kind="role.missing_end_date",
                    ref=role.id,
                    priority=40 + boost,
                    context=(
                        f"{role.title} at {role.company} has no end date but "
                        "isn't the most recent role."
                    ),
                )
            )

    for outcome in payload.outcomes:
        if outcome.metric is None or outcome.value is None:
            gaps.append(
                Gap(
                    kind="outcome.missing_metric",
                    ref=outcome.description[:80],
                    priority=20,
                    context=(
                        f"Outcome lacks a quantified metric: "
                        f"'{outcome.description[:80]}'"
                    ),
                )
            )

    for skill in payload.skills:
        if not skill.evidence_refs:
            gaps.append(
                Gap(
                    kind="skill.missing_evidence",
                    ref=skill.name,
                    priority=50,
                    context=f"Skill '{skill.name}' has no evidence references.",
                )
            )

    return sorted(gaps, key=lambda g: g.priority)


def top_gap(payload: OptimizedPayload) -> Gap | None:
    gaps = detect_gaps(payload)
    return gaps[0] if gaps else None


def can_generate(payload: OptimizedPayload) -> GateResult:
    """Structural minimum check: block only when the LLM can't produce useful output."""
    if not payload.roles:
        return GateResult(
            ok=False,
            reason="no_roles",
            message="No roles in the master document. Add at least one role before generating.",
        )

    outcome_refs_by_role: dict[str, bool] = {}
    for o in payload.outcomes:
        if o.role_ref:
            outcome_refs_by_role[o.role_ref] = True

    roles_without = sum(
        1
        for role in payload.roles
        if not role.outcome_refs and role.id not in outcome_refs_by_role
    )

    if roles_without > len(payload.roles) / 2:
        return GateResult(
            ok=False,
            reason="insufficient_outcomes",
            message=(
                f"{roles_without} of {len(payload.roles)} roles have no outcomes. "
                "Add outcomes to at least half your roles before generating."
            ),
        )

    return GateResult(ok=True)


def gap_health(payload: OptimizedPayload) -> GapHealthResult:
    """Weighted completeness metric. Pure, deterministic, no LLM."""
    gaps = detect_gaps(payload)

    if any(g.kind == "content.empty" for g in gaps):
        return GapHealthResult(
            gap_pct=100.0, tier="red", gaps=gaps, total_weight=0, gap_weight=0
        )

    n_roles = len(payload.roles)
    n_outcomes = len(payload.outcomes)
    n_skills = len(payload.skills)
    n_non_first_roles = max(0, n_roles - 1)

    total_weight = (
        n_roles * 5  # each role could be missing outcomes
        + n_roles * 2  # each role could be missing summary
        + n_outcomes * 3  # each outcome could be missing metric
        + n_non_first_roles * 1  # non-first roles could be missing end date
        + n_skills * 1  # each skill could be missing evidence
    )

    if total_weight == 0:
        return GapHealthResult(
            gap_pct=0.0, tier="green", gaps=gaps, total_weight=0, gap_weight=0
        )

    gap_weight = sum(GAP_WEIGHTS.get(g.kind, 0) for g in gaps)
    gap_pct = round((gap_weight / total_weight) * 100, 1)
    tier = _pct_to_tier(gap_pct)

    return GapHealthResult(
        gap_pct=gap_pct,
        tier=tier,
        gaps=gaps,
        total_weight=total_weight,
        gap_weight=gap_weight,
    )
