"""Annotation helpers for per-target emphasis/exclusion (#499).

Annotations are structured directives stored on OptimizedPayload. They
control what the tailor emphasizes, de-emphasizes, or excludes when
generating a resume or cover letter for a specific target.

CRUD operations (add/remove) create a new optimized doc version with
source='user_edit', following the same versioning pattern as manual
payload edits.
"""

from __future__ import annotations

import uuid

from supabase import Client

from app.models.experience import (
    Annotation,
    AnnotationCreate,
    OptimizedDoc,
    OptimizedPayload,
    Outcome,
)
from app.services.experience import optimized


def add_annotation(
    supabase: Client,
    user_id: str | None,
    body: AnnotationCreate,
) -> OptimizedDoc:
    """Add an annotation to the latest optimized doc, creating a new version."""
    latest = optimized.get_latest(supabase, user_id=user_id)
    if latest is None:
        raise ValueError("no optimized doc to annotate")

    annotation = Annotation(
        id=str(uuid.uuid4()),
        action=body.action,
        ref_type=body.ref_type,
        ref_value=body.ref_value,
        target_label=body.target_label,
        reason=body.reason,
    )
    updated_payload = latest.payload.model_copy(
        update={"annotations": [*latest.payload.annotations, annotation]}
    )
    return optimized.create_version(
        supabase,
        user_id=user_id,
        payload=updated_payload,
        prose_doc_id=latest.prose_doc_id,
        source="user_edit",
    )


def remove_annotation(
    supabase: Client,
    user_id: str | None,
    annotation_id: str,
) -> OptimizedDoc:
    """Remove an annotation by ID, creating a new version."""
    latest = optimized.get_latest(supabase, user_id=user_id)
    if latest is None:
        raise ValueError("no optimized doc")

    kept = [a for a in latest.payload.annotations if a.id != annotation_id]
    if len(kept) == len(latest.payload.annotations):
        raise ValueError(f"annotation not found: {annotation_id}")

    updated_payload = latest.payload.model_copy(update={"annotations": kept})
    return optimized.create_version(
        supabase,
        user_id=user_id,
        payload=updated_payload,
        prose_doc_id=latest.prose_doc_id,
        source="user_edit",
    )


def list_annotations(
    supabase: Client,
    user_id: str | None,
) -> list[Annotation]:
    """Return all annotations from the latest optimized doc."""
    latest = optimized.get_latest(supabase, user_id=user_id)
    if latest is None:
        return []
    return latest.payload.annotations


# ---------------------------------------------------------------------------
# Pure functions (no DB) — used at tailor time
# ---------------------------------------------------------------------------


def resolve_for_target(
    annotations: list[Annotation],
    target_label: str | None,
) -> tuple[list[Annotation], list[Annotation], list[Annotation]]:
    """Partition annotations into (emphasize, exclude, de_emphasize) lists
    that apply to the given target.

    An annotation applies if:
    - Its target_label is None (global), OR
    - Its target_label matches the given target_label (case-insensitive)
    """
    target_lower = target_label.lower() if target_label else None

    def _matches(a: Annotation) -> bool:
        if a.target_label is None:
            return True
        return target_lower is not None and a.target_label.lower() == target_lower

    emphasize: list[Annotation] = []
    exclude: list[Annotation] = []
    de_emphasize: list[Annotation] = []

    for a in annotations:
        if not _matches(a):
            continue
        if a.action == "emphasize":
            emphasize.append(a)
        elif a.action == "exclude":
            exclude.append(a)
        elif a.action == "de-emphasize":
            de_emphasize.append(a)

    return emphasize, exclude, de_emphasize


def apply_exclusions(
    payload: OptimizedPayload,
    exclusions: list[Annotation],
) -> OptimizedPayload:
    """Return a copy of the payload with excluded items removed.

    Handles each ref_type:
    - role: remove by role.id, cascade-remove outcomes with that role_ref
    - skill: remove by skill.name (case-insensitive)
    - outcome: remove where ref_value is a substring of outcome.description
    """
    if not exclusions:
        return payload

    excluded_role_ids: set[str] = set()
    excluded_skill_names: set[str] = set()
    excluded_outcome_substrings: list[str] = []

    for ex in exclusions:
        if ex.ref_type == "role":
            excluded_role_ids.add(ex.ref_value)
        elif ex.ref_type == "skill":
            excluded_skill_names.add(ex.ref_value.lower())
        elif ex.ref_type == "outcome":
            excluded_outcome_substrings.append(ex.ref_value.lower())

    roles = [r for r in payload.roles if r.id not in excluded_role_ids]
    skills = [
        s for s in payload.skills if s.name.lower() not in excluded_skill_names
    ]

    def _outcome_excluded(o: Outcome) -> bool:
        if o.role_ref and o.role_ref in excluded_role_ids:
            return True
        desc_lower = o.description.lower()
        return any(sub in desc_lower for sub in excluded_outcome_substrings)

    outcomes = [o for o in payload.outcomes if not _outcome_excluded(o)]

    return payload.model_copy(
        update={
            "roles": roles,
            "skills": skills,
            "outcomes": outcomes,
        }
    )


def build_annotations_text(
    emphasize: list[Annotation],
    de_emphasize: list[Annotation],
) -> str | None:
    """Format emphasis/de-emphasis annotations as prompt directives."""
    if not emphasize and not de_emphasize:
        return None

    lines: list[str] = []

    if emphasize:
        lines.append("EMPHASIZE (prioritize these items):")
        for a in emphasize:
            reason = f" (reason: {a.reason})" if a.reason else ""
            lines.append(f"- {a.ref_type} \"{a.ref_value}\"{reason}")

    if de_emphasize:
        lines.append("DE-EMPHASIZE (include only if space allows):")
        for a in de_emphasize:
            reason = f" (reason: {a.reason})" if a.reason else ""
            lines.append(f"- {a.ref_type} \"{a.ref_value}\"{reason}")

    return "\n".join(lines)


def validate_annotation_refs(
    annotations: list[Annotation],
    payload: OptimizedPayload,
) -> list[Annotation]:
    """Drop annotations whose ref_value no longer matches anything in the payload.

    Used during re-derivation to carry forward only valid annotations.
    """
    role_ids = {r.id for r in payload.roles}
    skill_names = {s.name.lower() for s in payload.skills}
    outcome_descs = [o.description.lower() for o in payload.outcomes]

    valid: list[Annotation] = []
    for a in annotations:
        matches_role = a.ref_type == "role" and a.ref_value in role_ids
        matches_skill = a.ref_type == "skill" and a.ref_value.lower() in skill_names
        matches_outcome = a.ref_type == "outcome" and any(
            a.ref_value.lower() in desc for desc in outcome_descs
        )
        if matches_role or matches_skill or matches_outcome:
            valid.append(a)

    return valid


def _annotation_key(a: Annotation) -> tuple[str, str, str, str]:
    """Identity tuple for dedup. Excludes id/reason — same directive collapses
    even if the LLM phrased the reason differently across derivations."""
    return (
        a.action,
        a.ref_type,
        a.ref_value.lower(),
        (a.target_label or "").lower(),
    )


def merge_annotations(
    *annotation_lists: list[Annotation],
) -> list[Annotation]:
    """Merge annotation lists in order, dropping duplicates by identity tuple.

    Earlier lists win on collision — used to give carried-forward annotations
    (with stable ids) priority over freshly LLM-derived ones (which got fresh
    uuids and would otherwise create churn for downstream consumers).
    """
    seen: set[tuple[str, str, str, str]] = set()
    merged: list[Annotation] = []
    for annotations in annotation_lists:
        for a in annotations:
            key = _annotation_key(a)
            if key in seen:
                continue
            seen.add(key)
            merged.append(a)
    return merged
