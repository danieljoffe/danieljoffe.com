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

from app.models.conversation import Gap
from app.models.experience import OptimizedPayload


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
