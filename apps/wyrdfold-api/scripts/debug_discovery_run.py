"""Run source discovery for a single target locally with a full traceback.

The bulk ``/discovery/run`` endpoint swallows per-target exceptions into a
generic ``"<id>: discovery failed"`` string. This script bypasses that so the
real exception + traceback surfaces on the console.

Usage:
    cd apps/wyrdfold-api
    PYTHONPATH=. uv run python scripts/debug_discovery_run.py <target_id>
"""

from __future__ import annotations

import asyncio
import sys
import traceback

from app.config import settings
from app.services.source_discovery import run_discovery_for_target
from app.services.targets import crud
from app.supabase_pool import get_supabase_pool, init_supabase


async def _run(target_id: str) -> None:
    init_supabase()
    sb = get_supabase_pool()
    if sb is None:
        raise SystemExit("Supabase not configured — check .env / SUPABASE_URL")

    print("# config")
    print(f"  brave_search_api_key set: {bool(settings.brave_search_api_key)}")
    print(f"  query_cap_per_run:        {settings.discovery_query_cap_per_run}")
    print(f"  results_per_query:        {settings.discovery_results_per_query}")

    target = crud.get(sb, target_id)
    if target is None:
        raise SystemExit(f"No target row for id={target_id!r}")

    print("\n# target")
    print(f"  id:            {target.id}")
    print(f"  is_active:     {target.is_active}")
    kws = target.search_keywords or []
    print(f"  search_keywords ({len(kws)}): {kws[:20]}")

    print("\n# running discovery …")
    try:
        stats = await run_discovery_for_target(sb, target)
    except Exception:
        print("\n!!! discovery raised:")
        traceback.print_exc()
        raise SystemExit(1) from None

    print("\n# stats")
    print(f"  {stats}")


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: debug_discovery_run.py <target_id>")
    asyncio.run(_run(sys.argv[1]))


if __name__ == "__main__":
    main()
