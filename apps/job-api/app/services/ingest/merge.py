"""Merge extracted resume text into the prose doc (#497).

LLM-backed semantic merge. Existing prose is preserved verbatim — the LLM
adds only statements from the new resume that aren't already covered.
This replaces the previous naive concat-with-divider behavior, which caused
prose to balloon with duplicate content on every upload.

Pure async function — no DB. The caller fetches existing prose, awaits
this, then persists the result as a new prose version.
"""

from __future__ import annotations

from app.models.llm import LLMResult, Message, ModelId
from app.services.ingest.parse import ParsedResume
from app.services.llm.client import LLMClient

DEFAULT_MODEL: ModelId = "claude-sonnet-4-6"
DEFAULT_PURPOSE = "experience.ingest_merge"

# Output cap. Big enough to cover existing prose + new statements without
# truncating realistic users. The safety check below catches truncation.
MERGE_MAX_TOKENS = 16_384

# If the merged output is shorter than this fraction of the existing prose,
# we treat it as a paraphrase or truncation and fall back to legacy concat
# rather than silently shrinking the source of truth.
MIN_PRESERVATION_RATIO = 0.9

SYSTEM_PROMPT = """You merge a newly-uploaded resume into an existing master \
career document. The existing document is the source of truth — preserve every \
statement it contains.

Rules:
- Output the FULL merged document, not just the additions.
- Preserve the existing document's content. Do not paraphrase, summarize, \
condense, or reorder existing statements. Verbatim wins.
- Add only NEW statements from the resume — facts, accomplishments, roles, \
or skills not already covered.
- Skip anything that duplicates content already in the document. A statement \
counts as a duplicate if its core fact (same role at same company, same \
accomplishment, same skill claim) is already present, even with different \
wording.
- When the new resume adds detail under an existing role/section, place the \
new statement under that role. When it introduces a wholly new role, append \
it as a new section preserving the structure of the existing document.
- Never invent details that are in neither input.
- Output ONLY the merged document. No preamble, no code fences, no commentary."""


async def merge_into_prose(
    llm: LLMClient,
    *,
    existing_content: str | None,
    parsed: ParsedResume,
    model: ModelId = DEFAULT_MODEL,
    purpose: str = DEFAULT_PURPOSE,
) -> tuple[str, LLMResult | None]:
    """Semantically merge a parsed resume into existing prose.

    Returns ``(merged_text, llm_result)``. If there is no existing content,
    the parsed text is returned directly with no LLM call (``llm_result``
    is None).

    Safety net: if the LLM output is materially shorter than the existing
    prose (suggesting paraphrase or truncation), falls back to legacy
    append-with-divider so user content is never lost.
    """
    if not existing_content or not existing_content.strip():
        return parsed.text, None

    user_message = (
        "<existing_master_document>\n"
        f"{existing_content}\n"
        "</existing_master_document>\n\n"
        f'<new_resume filename="{parsed.source_filename}">\n'
        f"{parsed.text}\n"
        "</new_resume>"
    )

    result = await llm.complete(
        model=model,
        system=SYSTEM_PROMPT,
        messages=[Message(role="user", content=user_message)],
        purpose=purpose,
        max_tokens=MERGE_MAX_TOKENS,
        cache_system=True,
    )

    merged = result.content.strip()
    if len(merged) < len(existing_content) * MIN_PRESERVATION_RATIO:
        merged = _legacy_concat(existing_content, parsed)

    return merged, result


def _legacy_concat(existing_content: str, parsed: ParsedResume) -> str:
    """Fallback path used when the LLM merge output is suspiciously short.

    Preserves all data at the cost of duplicating content the next merge
    will need to resolve.
    """
    return (
        f"{existing_content}\n\n"
        f"---\n"
        f"[Uploaded Resume: {parsed.source_filename}]\n\n"
        f"{parsed.text}"
    )
