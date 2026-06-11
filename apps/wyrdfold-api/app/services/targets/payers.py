"""Payer resolution + budget gating for background LLM work.

Background grading (Phase-1 triage, Phase-2 fit) runs under the system
API key, outside the per-request budget gate. These helpers charge that
work to the user who activated the target (the "payer") and let the
poller skip targets whose payer has exhausted their monthly allowance.

Payer rule: the user whose ``user_targets`` link is active; if several,
the earliest-standing link wins (``created_at`` — NOT ``updated_at``,
which upserts stamp on every fit-score refresh). Tie-break ``user_id``
ascending for determinism.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from typing import Any, cast

from supabase import Client

from app.config import settings
from app.services.llm import cost_log
from app.services.llm.budget import MONTHLY_WINDOW_DAYS


def resolve_target_payers(
    supabase: Client, target_ids: list[str]
) -> dict[str, str | None]:
    """Map each target id to its payer user id (or None if orphaned)."""
    if not target_ids:
        return {}
    resp = (
        supabase.table("user_targets")
        .select("target_id,user_id,created_at")
        .eq("is_active", True)
        .in_("target_id", target_ids)
        .order("created_at")
        .order("user_id")
        .execute()
    )
    rows = cast(list[dict[str, Any]], resp.data or [])
    payers: dict[str, str | None] = {tid: None for tid in target_ids}
    for row in rows:
        tid = row["target_id"]
        if payers.get(tid) is None:
            payers[tid] = row["user_id"]
    return payers


@dataclass(frozen=True)
class PayerBudgetGate:
    """Per-cycle snapshot of who pays for each target and who is over
    their monthly allowance. Snapshot semantics: at most one cycle of
    drift if a payer's spend or links change mid-cycle — acceptable."""

    payer_by_target: dict[str, str | None] = field(default_factory=dict)
    over_budget_users: frozenset[str] = frozenset()

    def payer_for(self, target_id: str) -> str | None:
        return self.payer_by_target.get(target_id)

    def target_blocked(self, target_id: str) -> bool:
        """True when this target's LLM work must be skipped this cycle.

        Blocked when the payer is over budget OR unknown (orphan active
        target, or activated after the snapshot) — never spend
        unattributed money. Jobs still ingest fail-open; grading
        resumes once the payer's window frees up (next cycle for
        post-snapshot activations).
        """
        payer = self.payer_by_target.get(target_id)
        return payer is None or payer in self.over_budget_users

    def user_blocked(self, user_id: str) -> bool:
        return user_id in self.over_budget_users


def build_budget_gate(
    supabase: Client, target_ids: list[str]
) -> PayerBudgetGate:
    """Build the cycle snapshot: payers, overrides, rolling-30d spends.

    Three queries total (payers IN, overrides IN, one spend RPC per
    distinct payer) — computed once per poll cycle, not per source/job.
    A monthly limit of 0 (global or override) disables gating for that
    user.
    """
    payers = resolve_target_payers(supabase, target_ids)
    distinct = sorted({p for p in payers.values() if p is not None})
    if not distinct:
        return PayerBudgetGate(payer_by_target=payers)

    overrides: dict[str, float | None] = {}
    resp = (
        supabase.table("user_profiles")
        .select("user_id,llm_monthly_budget_usd")
        .in_("user_id", distinct)
        .execute()
    )
    for row in cast(list[dict[str, Any]], resp.data or []):
        overrides[row["user_id"]] = row.get("llm_monthly_budget_usd")

    since = datetime.now(UTC) - timedelta(days=MONTHLY_WINDOW_DAYS)
    over: set[str] = set()
    for uid in distinct:
        raw = overrides.get(uid)
        cap = float(raw) if raw is not None else settings.user_llm_monthly_budget_usd
        if cap <= 0:
            continue
        spent = cost_log.total_spend(supabase, user_id=uid, since=since)
        if spent >= cap:
            over.add(uid)

    return PayerBudgetGate(
        payer_by_target=payers, over_budget_users=frozenset(over)
    )
