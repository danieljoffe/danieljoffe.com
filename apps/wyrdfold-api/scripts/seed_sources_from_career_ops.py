# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "pyyaml>=6.0",
#   "httpx>=0.28",
# ]
# ///
"""Generate a Supabase seed migration for the `sources` table from
santifer/career-ops's `portals.example.yml`.

Career-ops's curated company list is MIT-licensed (© 2026 Santiago
Fernández de Valderrama). It groups ~80 companies across multiple ATS
providers; this script filters to the four wyrdfold's scanner currently
supports (greenhouse, ashby, lever, smartrecruiters), extracts a
(provider, board_token, company_name) tuple from each entry, and emits
an idempotent INSERT migration.

Three classes of entry exist in the source YAML:
  - Bucket A — Greenhouse with an explicit `api:` field. Slug parsed
    from the API URL (most reliable).
  - Bucket B — Lever / Ashby / SmartRecruiters with a slug-bearing
    careers_url like https://jobs.lever.co/{slug}.
  - Bucket C — branded careers URL with `scan_method: websearch`
    (OpenAI, Twilio, etc.). Career-ops handles these via Playwright +
    WebSearch as a fallback. Wyrdfold's `sources` model needs a
    board_token, so these are skipped with a stderr note.

Entries with `enabled: false` are skipped. Companies are de-duplicated
by board_token (career-ops occasionally lists a company under multiple
sections). The emitted INSERT uses ON CONFLICT DO NOTHING so re-running
the migration on a database that already has manually-added entries is
safe.

Usage:
    cd apps/wyrdfold-api
    uv run --script scripts/seed_sources_from_career_ops.py \\
        > ../../supabase/migrations/{timestamp}_seed_sources_from_career_ops.sql

    # Or with a local YAML for offline reproducibility:
    uv run --script scripts/seed_sources_from_career_ops.py \\
        --from-file ./portals.example.yml > out.sql

The script writes SQL to stdout and a parse summary to stderr.
"""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import httpx
import yaml  # type: ignore[import-untyped]

DEFAULT_URL = (
    "https://raw.githubusercontent.com/santifer/career-ops/main/"
    "templates/portals.example.yml"
)

SUPPORTED_PROVIDERS = {"greenhouse", "ashby", "lever", "smartrecruiters"}

# Slug extractors. Order matters — Greenhouse `api:` is the most reliable
# signal so we check it first; the careers_url patterns are fallbacks.
GREENHOUSE_API_RE = re.compile(
    r"https?://boards-api\.greenhouse\.io/v\d+/boards/([^/]+)/jobs"
)
GREENHOUSE_CAREERS_RES = (
    re.compile(r"https?://job-boards\.greenhouse\.io/([^/?#]+)"),
    re.compile(r"https?://boards\.greenhouse\.io/([^/?#]+)"),
)
LEVER_CAREERS_RE = re.compile(r"https?://jobs\.lever\.co/([^/?#]+)")
ASHBY_CAREERS_RE = re.compile(r"https?://jobs\.ashbyhq\.com/([^/?#]+)")
SMARTRECRUITERS_CAREERS_RE = re.compile(
    r"https?://jobs\.smartrecruiters\.com/([^/?#]+)"
)


@dataclass(frozen=True)
class Source:
    provider: str
    board_token: str
    company_name: str
    notes: str | None


def classify(entry: dict[str, Any]) -> Source | None:
    """Map a career-ops tracked_companies entry to a wyrdfold source row,
    or None if the entry can't be represented."""
    name = entry.get("name")
    if not isinstance(name, str) or not name.strip():
        return None

    api = entry.get("api")
    if isinstance(api, str):
        m = GREENHOUSE_API_RE.search(api)
        if m:
            return Source("greenhouse", m.group(1), name.strip(), entry.get("notes"))

    careers = entry.get("careers_url")
    if not isinstance(careers, str):
        return None

    for pattern in GREENHOUSE_CAREERS_RES:
        m = pattern.search(careers)
        if m:
            return Source("greenhouse", m.group(1), name.strip(), entry.get("notes"))

    m = LEVER_CAREERS_RE.search(careers)
    if m:
        return Source("lever", m.group(1), name.strip(), entry.get("notes"))

    m = ASHBY_CAREERS_RE.search(careers)
    if m:
        return Source("ashby", m.group(1), name.strip(), entry.get("notes"))

    m = SMARTRECRUITERS_CAREERS_RE.search(careers)
    if m:
        return Source(
            "smartrecruiters", m.group(1), name.strip(), entry.get("notes")
        )

    return None


def collect_companies(doc: dict[str, Any]) -> list[dict[str, Any]]:
    companies = doc.get("tracked_companies", [])
    if not isinstance(companies, list):
        return []
    return [c for c in companies if isinstance(c, dict)]


def parse_sources(yaml_text: str) -> tuple[list[Source], list[str]]:
    """Return (sources kept, names skipped)."""
    doc = yaml.safe_load(yaml_text)
    if not isinstance(doc, dict):
        return [], []

    seen_tokens: set[tuple[str, str]] = set()
    kept: list[Source] = []
    skipped: list[str] = []

    for entry in collect_companies(doc):
        if entry.get("enabled") is False:
            continue
        source = classify(entry)
        if source is None or source.provider not in SUPPORTED_PROVIDERS:
            name_val = entry.get("name")
            skipped.append(name_val if isinstance(name_val, str) else "?")
            continue
        key = (source.provider, source.board_token)
        if key in seen_tokens:
            continue
        seen_tokens.add(key)
        kept.append(source)

    kept.sort(key=lambda s: (s.provider, s.board_token))
    return kept, skipped


def sql_escape(value: str) -> str:
    return value.replace("'", "''")


def render_migration(sources: list[Source], origin_url: str) -> str:
    """Single multi-row INSERT ... ON CONFLICT DO NOTHING."""
    header = [
        "-- Seed `sources` with curated companies adapted from",
        "-- santifer/career-ops's portals.example.yml",
        "-- (MIT, © 2026 Santiago Fernández de Valderrama).",
        f"-- Origin: {origin_url}",
        "--",
        "-- Filtered to the four ATS providers wyrdfold's scanner currently",
        "-- supports (greenhouse, ashby, lever, smartrecruiters). Entries",
        "-- with no resolvable board_token are skipped — see the parser",
        "-- script for details:",
        "--   apps/wyrdfold-api/scripts/seed_sources_from_career_ops.py",
        "--",
        "-- Idempotent: ON CONFLICT (board_token) DO NOTHING means re-running",
        "-- this migration is a no-op for any board_token already present.",
        "",
        "INSERT INTO public.sources (provider, board_token, company_name, enabled)",
        "VALUES",
    ]
    # SQL line comments (`--`) extend to end of line, so a trailing
    # comma after a comment gets swallowed. Place the row separator
    # *before* the comment, and skip it on the final row.
    rows: list[str] = []
    last = len(sources) - 1
    for i, s in enumerate(sources):
        sep = "" if i == last else ","
        # Newlines in notes would break the line comment — flatten them.
        note = s.notes.replace("\n", " ").strip() if s.notes else ""
        comment = f"  -- {note}" if note else ""
        rows.append(
            f"  ('{sql_escape(s.provider)}', '{sql_escape(s.board_token)}', "
            f"'{sql_escape(s.company_name)}', true){sep}{comment}"
        )
    body = "\n".join(rows)
    return "\n".join(header) + "\n" + body + "\nON CONFLICT (board_token) DO NOTHING;\n"


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Emit a Supabase seed migration for the sources table "
        "from santifer/career-ops's portals.example.yml."
    )
    parser.add_argument(
        "--url",
        default=DEFAULT_URL,
        help=f"Source YAML URL (default: {DEFAULT_URL})",
    )
    parser.add_argument(
        "--from-file",
        type=Path,
        default=None,
        help="Read YAML from a local path instead of fetching --url.",
    )
    args = parser.parse_args()

    if args.from_file is not None:
        yaml_text = args.from_file.read_text(encoding="utf-8")
        origin = str(args.from_file)
    else:
        response = httpx.get(args.url, timeout=30.0)
        response.raise_for_status()
        yaml_text = response.text
        origin = args.url

    sources, skipped = parse_sources(yaml_text)

    if not sources:
        print("No mappable companies found.", file=sys.stderr)
        return 1

    print(render_migration(sources, origin))

    by_provider: dict[str, int] = {}
    for s in sources:
        by_provider[s.provider] = by_provider.get(s.provider, 0) + 1

    print(f"\nKept {len(sources)} companies from {origin}", file=sys.stderr)
    for provider, count in sorted(by_provider.items()):
        print(f"  {provider}: {count}", file=sys.stderr)
    print(
        f"Skipped {len(skipped)} entries (no resolvable board_token):",
        file=sys.stderr,
    )
    for name in skipped:
        print(f"  - {name}", file=sys.stderr)

    return 0


if __name__ == "__main__":
    sys.exit(main())
