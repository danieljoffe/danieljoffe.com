"""One-shot operator action (#845 cost stop-gap): deactivate ALL targets.

Sets user_targets.is_active=false for every active link; the DB trigger
syncs targets.is_active. Verifies both tables after. The poller keeps
fetching/upserting jobs (zero active targets skips Phase-1, title
pre-match, and all per-target scoring), so no LLM costs accrue.
"""

from __future__ import annotations

import os

from supabase import create_client


def main() -> None:
    url = os.environ.get("SUPABASE_URL") or os.environ["NEXT_PUBLIC_SUPABASE_URL"]
    sb = create_client(url, os.environ["SUPABASE_SERVICE_ROLE_KEY"])

    ut_active = sb.table("user_targets").select("id", count="exact").eq("is_active", True).execute().count or 0
    t_active = sb.table("targets").select("id", count="exact").eq("is_active", True).execute().count or 0
    print(f"before: user_targets active={ut_active}, targets active={t_active}")

    if ut_active:
        sb.table("user_targets").update({"is_active": False}).eq("is_active", True).execute()

    # Trigger should sync targets.is_active; backstop in case any row
    # was set directly on targets without a user link.
    t_after_trigger = sb.table("targets").select("id", count="exact").eq("is_active", True).execute().count or 0
    if t_after_trigger:
        sb.table("targets").update({"is_active": False}).eq("is_active", True).execute()

    ut_final = sb.table("user_targets").select("id", count="exact").eq("is_active", True).execute().count or 0
    t_final = sb.table("targets").select("id", count="exact").eq("is_active", True).execute().count or 0
    print(f"after:  user_targets active={ut_final}, targets active={t_final}")
    print("OK" if ut_final == 0 and t_final == 0 else "!! STILL ACTIVE ROWS — investigate")


if __name__ == "__main__":
    main()
