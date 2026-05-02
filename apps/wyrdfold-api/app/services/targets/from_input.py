"""Create-or-link a target from user-authored input.

Both flows (manual title+description, or JD URL) funnel through a common
shape: LLM normalize -> match against existing -> link or create+link.
This guarantees the user always ends up with a ``user_targets`` row, so
the new target appears in ``GET /targets/mine`` immediately.

URL mode also acts as a corpus builder — when the URL maps to an existing
shared target, the JD is appended as a reference and the composite profile
is re-merged so all linked users benefit from the new data point.
"""

from __future__ import annotations

import logging

from supabase import Client

from app.models.experience import OptimizedPayload
from app.models.targets import (
    CreateOrLinkResult,
    JobTarget,
    ScoringProfile,
    TargetCreate,
    TargetUpdate,
    UserTarget,
)
from app.services.llm import cost_log
from app.services.llm.client import LLMClient
from app.services.targets import crud
from app.services.targets.derive_profile import (
    DEFAULT_PURPOSE as DERIVE_JD_PURPOSE,
)
from app.services.targets.derive_profile import (
    derive_profile_from_jd,
)
from app.services.targets.derive_profile_from_label import (
    DEFAULT_PURPOSE as DERIVE_LABEL_PURPOSE,
)
from app.services.targets.derive_profile_from_label import (
    derive_profile_from_label,
)
from app.services.targets.fit_score import (
    DEFAULT_PURPOSE as FIT_SCORE_PURPOSE,
)
from app.services.targets.fit_score import (
    derive_fit_score,
)
from app.services.targets.match import find_matching_target
from app.services.targets.merge import merge_profiles
from app.services.targets.normalize_manual import (
    DEFAULT_PURPOSE as NORMALIZE_PURPOSE,
)
from app.services.targets.normalize_manual import (
    normalize_manual_input,
)

logger = logging.getLogger(__name__)


async def _link_with_fit_score(
    supabase: Client,
    llm: LLMClient,
    *,
    user_id: str,
    target: JobTarget,
    payload: OptimizedPayload,
) -> UserTarget:
    """Link the user to a target with a derived fit score. Starts inactive."""
    fit_result, llm_result = await derive_fit_score(
        llm, payload=payload, target=target
    )
    cost_log.record(
        supabase,
        user_id=user_id,
        purpose=FIT_SCORE_PURPOSE,
        result=llm_result,
        metadata={"target_id": target.id, "user_id": user_id},
    )
    return crud.link_user_to_target(
        supabase,
        user_id=user_id,
        target_id=target.id,
        is_active=False,
        fit_score=fit_result.fit_score,
        fit_score_reasoning=fit_result.reasoning,
    )


async def from_manual(
    supabase: Client,
    llm: LLMClient,
    *,
    user_id: str,
    label: str,
    description: str | None,
    payload: OptimizedPayload,
) -> CreateOrLinkResult:
    """Manual flow: user-typed title + description.

    1. LLM normalizes input into a canonical ``TargetSuggestion``
    2. Match against existing targets
    3. If matched, link the user
    4. If new, derive a profile from label+experience, create, link
    """
    suggestion, norm_result = await normalize_manual_input(
        llm, label=label, description=description, payload=payload
    )
    cost_log.record(
        supabase,
        user_id=user_id,
        purpose=NORMALIZE_PURPOSE,
        result=norm_result,
        metadata={"user_id": user_id, "raw_label": label},
    )

    matched = find_matching_target(supabase, suggestion.label)
    if matched is not None:
        link = await _link_with_fit_score(
            supabase, llm, user_id=user_id, target=matched, payload=payload
        )
        return CreateOrLinkResult(
            user_target=link, target=matched, was_matched=True
        )

    derived, derive_result = await derive_profile_from_label(
        llm, label=suggestion.label, payload=payload
    )
    cost_log.record(
        supabase,
        user_id=user_id,
        purpose=DERIVE_LABEL_PURPOSE,
        result=derive_result,
        metadata={"user_id": user_id, "label": suggestion.label},
    )

    target = crud.create(
        supabase,
        payload=TargetCreate(
            label=suggestion.label,
            description=suggestion.description,
            scoring_profile=derived.scoring_profile,
            search_keywords=derived.search_keywords,
        ),
    )
    link = await _link_with_fit_score(
        supabase, llm, user_id=user_id, target=target, payload=payload
    )
    return CreateOrLinkResult(
        user_target=link, target=target, was_matched=False
    )


async def from_url(
    supabase: Client,
    llm: LLMClient,
    *,
    user_id: str,
    final_url: str,
    extracted_title: str | None,
    jd_text: str,
    label_override: str | None,
    payload: OptimizedPayload,
) -> CreateOrLinkResult:
    """URL flow: validated URL + already-fetched JD.

    The router fetches and validates the URL; this service handles the
    LLM-derived steps and persistence. When a match is found the JD is
    appended as a reference and the composite profile is re-merged.
    """
    derived, derive_result = await derive_profile_from_jd(llm, jd_text=jd_text)
    cost_log.record(
        supabase,
        user_id=user_id,
        purpose=DERIVE_JD_PURPOSE,
        result=derive_result,
        metadata={"user_id": user_id, "jd_url": final_url},
    )

    label = (
        (label_override or "").strip()
        or (extracted_title or "").strip()
        or "Untitled Target"
    )[:200]

    matched = find_matching_target(supabase, label)

    if matched is not None:
        crud.add_reference_jd(
            supabase,
            target_id=matched.id,
            jd_text=jd_text,
            jd_url=final_url,
            extracted_profile=derived.scoring_profile,
        )
        all_jds = crud.list_reference_jds(supabase, matched.id)
        composite = (
            merge_profiles([jd.extracted_profile for jd in all_jds])
            if all_jds
            else ScoringProfile()
        )
        updated = crud.update(
            supabase,
            matched.id,
            TargetUpdate(
                scoring_profile=composite,
                search_keywords=derived.search_keywords,
                profile_version=matched.profile_version + 1,
            ),
        )
        target = updated or matched
        link = await _link_with_fit_score(
            supabase, llm, user_id=user_id, target=target, payload=payload
        )
        return CreateOrLinkResult(
            user_target=link, target=target, was_matched=True
        )

    target = crud.create(
        supabase,
        payload=TargetCreate(
            label=label,
            scoring_profile=derived.scoring_profile,
            search_keywords=derived.search_keywords,
        ),
    )
    crud.add_reference_jd(
        supabase,
        target_id=target.id,
        jd_text=jd_text,
        jd_url=final_url,
        extracted_profile=derived.scoring_profile,
    )
    refreshed = crud.get(supabase, target.id) or target
    link = await _link_with_fit_score(
        supabase, llm, user_id=user_id, target=refreshed, payload=payload
    )
    return CreateOrLinkResult(
        user_target=link, target=refreshed, was_matched=False
    )
