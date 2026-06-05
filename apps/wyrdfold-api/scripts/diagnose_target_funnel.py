"""Funnel diagnosis for a single target (#845).

Reusable: hands an operator the per-stage candidate counts so the
collapse stage is obvious from the console. Read-only against
Supabase. Same logic as ``GET /targets/{id}/funnel``.

Usage:
    cd apps/wyrdfold-api
    PYTHONPATH=. uv run python scripts/diagnose_target_funnel.py <target_id>

    # or pass an email — looks up the user's primary active target
    PYTHONPATH=. uv run python scripts/diagnose_target_funnel.py --email mel@example.com

The pre-DB drops (non-US, title pre-match, Phase 1 unpromising) are
not visible here — they're emitted as ``poll_funnel`` log lines from
``_poll_one_source``. Grep Railway with ``poll_funnel`` to read them.
"""

from __future__ import annotations

import argparse
import json
import sys
from typing import Any, cast

from app.services.diagnostics.funnel import compute_target_funnel
from app.supabase_pool import get_supabase_pool, init_supabase


def _resolve_target_id_for_email(sb: Any, email: str) -> str:
    """user_profiles.email → user_id → user_targets.is_active → target_id.

    If multiple active targets, picks the most recently updated one and
    notes it on stderr so the operator can re-run with an explicit id.
    """
    prof = (
        sb.table("user_profiles")
        .select("user_id")
        .eq("email", email)
        .limit(1)
        .execute()
    )
    prof_rows = cast(list[dict[str, Any]], prof.data or [])
    if not prof_rows:
        sys.exit(f"No user_profiles row for email={email!r}")
    user_id = prof_rows[0]["user_id"]

    ut = (
        sb.table("user_targets")
        .select("target_id, is_active, updated_at")
        .eq("user_id", user_id)
        .eq("is_active", True)
        .order("updated_at", desc=True)
        .execute()
    )
    ut_rows = cast(list[dict[str, Any]], ut.data or [])
    if not ut_rows:
        sys.exit(f"User {user_id} has no active user_targets row")
    if len(ut_rows) > 1:
        print(
            f"# warning: {email} has {len(ut_rows)} active targets; "
            f"using most-recently-updated. To pick another:",
            file=sys.stderr,
        )
        for r in ut_rows:
            print(f"#   {r['target_id']}  updated_at={r['updated_at']}", file=sys.stderr)
    return cast(str, ut_rows[0]["target_id"])


def _print_report(report: Any) -> None:
    n = report.nomenclature
    s = report.stages
    h = report.scores_histogram

    print("=" * 72)
    print(f"Target funnel report  ({report.generated_at.isoformat()})")
    print("=" * 72)

    print(f"\n# Nomenclature  ({n.target_id})")
    print(f"  label:          {n.label!r}")
    print(f"  is_active:      {n.is_active}  status={n.activation_status}  v{n.profile_version}")
    print(f"  seniority_hint: {n.seniority_hint!r}")
    print(f"  domain_hints:   {n.domain_hints}")
    print(f"  example_promising_titles  ({len(n.example_promising_titles)}):")
    for t in n.example_promising_titles[:10]:
        print(f"    + {t}")
    print(f"  example_unpromising_titles  ({len(n.example_unpromising_titles)}):")
    for t in n.example_unpromising_titles[:10]:
        print(f"    - {t}")
    print(f"  search_keywords  ({len(n.search_keywords)}): {n.search_keywords[:20]}")
    print("  scoring_profile (JSON, abbreviated):")
    print("    " + json.dumps(n.scoring_profile, indent=2).replace("\n", "\n    ")[:1200])
    if len(json.dumps(n.scoring_profile)) > 1200:
        print("    … (truncated; use the HTTP endpoint for full payload)")

    print("\n# DB-visible funnel")
    print(f"  scores rows (all):          {s.scores_total}")
    print(f"  promising=True:             {s.promising_true}")
    print(f"  promising=False:            {s.promising_false}")
    print(f"  promising=NULL (no verdict):{s.promising_null}")
    print(f"  by scoring_status:          {s.by_status}")
    print(f"  excluded=False:             {s.excluded_false}")
    print(f"  excluded=True:              {s.excluded_true}")
    print(f"  graded (promising & ≥stage2): {s.graded}")
    print(f"  complete (Phase 2 done):    {s.complete}")
    print(f"  stuck in stage1 (promising):{s.stuck_in_stage1}  ⚠ daily-cap starvation if >0")

    print(f"\n# Score histogram (excluded=False, floor={h.floor})")
    print(f"  total:    {h.total}   max:{h.max_score}   above_floor:{h.above_floor}")
    width = 40
    peak = max(h.buckets.values(), default=1)
    for label, count in h.buckets.items():
        bar = "█" * int((count / max(peak, 1)) * width) if count else ""
        print(f"  {label:>6}  {count:>4}  {bar}")

    print("\n# Users on this target")
    for u in report.users:
        print(
            f"  user_id={u.user_id}  list_min_score={u.list_min_score}  "
            f"phase2_quota_remaining={u.phase2_quota_remaining}"
        )
    if not report.users:
        print("  (none — target has no active users; sourcing is moot)")

    print("\n# Source staleness  (top 10 most-recent + any never-polled)")
    never = [s for s in report.sources if s.last_polled_at is None]
    polled = sorted(
        [s for s in report.sources if s.last_polled_at is not None],
        key=lambda x: x.hours_since_polled or 0,
    )
    for s in polled[:10]:
        print(
            f"  {s.company_name:<28} {s.provider:<14} "
            f"polled {s.hours_since_polled}h ago  jobs={s.job_count}"
        )
    if never:
        print(f"  -- never polled ({len(never)}):")
        for s in never[:10]:
            print(f"  {s.company_name:<28} {s.provider:<14} enabled={s.enabled}")

    print("\n# Pre-DB drops (invisible here)")
    print(f"  {report.pre_db_hint}")

    print(
        "\n# Where did the funnel collapse?  Read top-down:"
        "\n  scores_total==0           → no jobs ever survived ingest "
        "(check `poll_funnel` logs: fetched, dropped_non_us, dropped_title_prematch)"
        "\n  promising_true is tiny    → Phase 1 rejecting most titles "
        "(check example_promising_titles vs real role titles)"
        "\n  stuck_in_stage1 is large  → Phase-2 daily-cap starvation"
        "\n  above_floor is tiny       → list_min_score is too aggressive "
        "(check the histogram peak vs the floor)"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "target_id",
        nargs="?",
        help="Target UUID. Omit to use --email instead.",
    )
    parser.add_argument(
        "--email", help="Resolve target_id from this user's primary active target."
    )
    parser.add_argument(
        "--json", action="store_true", help="Emit the raw JSON response."
    )
    args = parser.parse_args()

    if not args.target_id and not args.email:
        parser.error("provide target_id or --email")

    init_supabase()
    sb = get_supabase_pool()
    if sb is None:
        raise SystemExit("Supabase not configured — check .env / SUPABASE_URL")

    target_id = args.target_id or _resolve_target_id_for_email(sb, args.email)

    try:
        report = compute_target_funnel(sb, target_id)
    except ValueError as exc:
        sys.exit(str(exc))

    if args.json:
        print(report.model_dump_json(indent=2))
    else:
        _print_report(report)


if __name__ == "__main__":
    main()
