"""Tests for the Phase 2 derive_job_fit scaffold.

Schema-level tests (no LLM): the JobFitResult / AxisScores bounds and
the user-message builder. The integration of derive_job_fit into the
poller's Stage 2 lands in a follow-up; tests there mock the LLM.
"""

from __future__ import annotations

from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from app.models.experience import OptimizedPayload, Role, Skill
from app.models.targets import (
    CategoryProfile,
    DomainProfile,
    JobTarget,
    NegativeProfile,
    ScoringProfile,
    SeniorityProfile,
)
from app.services.fit.job_fit import (
    AxisScores,
    JobFitResult,
    _build_user_message,
)


def _payload() -> OptimizedPayload:
    return OptimizedPayload(
        summary="Senior frontend engineer with 8+ years at SaaS startups.",
        roles=[
            Role(
                id="r-1",
                title="Senior Frontend Engineer",
                company="Acme",
                start="2022",
                end=None,
                skills=["React", "TypeScript", "Webpack"],
            ),
        ],
        skills=[
            Skill(name="React", years=8),
            Skill(name="TypeScript", years=6),
        ],
        outcomes=[],
    )


def _target() -> JobTarget:
    return JobTarget(
        id="t-1",
        label="Staff Frontend Engineer",
        description="Web platform leadership at a consumer SaaS.",
        scoring_profile=ScoringProfile(
            categories={
                "core_skills": CategoryProfile(
                    keywords={"React": 3, "TypeScript": 3, "Webpack": 2},
                    weight=2.0,
                ),
            },
            seniority=SeniorityProfile(level="staff", signals=["8+ years", "mentor"]),
            domain=DomainProfile(signals=["saas", "consumer"], weight=0.5),
            negative=NegativeProfile(keywords=["junior", "intern"], weight=-10.0),
        ),
        is_active=True,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )


# ---- AxisScores / JobFitResult schema -------------------------------------


class TestSchemas:
    def test_axis_scores_bounds(self) -> None:
        AxisScores(title_fit=0, skills_fit=0, seniority_fit=0, domain_fit=0)
        AxisScores(title_fit=100, skills_fit=100, seniority_fit=100, domain_fit=100)
        with pytest.raises(ValidationError):
            AxisScores(title_fit=-1, skills_fit=50, seniority_fit=50, domain_fit=50)
        with pytest.raises(ValidationError):
            AxisScores(title_fit=101, skills_fit=50, seniority_fit=50, domain_fit=50)

    def test_job_fit_result_round_trip(self) -> None:
        result = JobFitResult(
            fit_score=82,
            axes=AxisScores(
                title_fit=95, skills_fit=80, seniority_fit=85, domain_fit=70
            ),
            reasoning="Title squarely matches; missing e-commerce domain.",
        )
        # Round-trip preserves both the overall score and the axes.
        dumped = result.model_dump()
        re = JobFitResult.model_validate(dumped)
        assert re.fit_score == 82
        assert re.axes.title_fit == 95
        assert re.reasoning.startswith("Title squarely")

    def test_job_fit_result_rejects_oversized_reasoning(self) -> None:
        # Mirror the 1500-char cap on the existing target-level
        # FitScoreResult — keeps the UI's reasoning block bounded.
        with pytest.raises(ValidationError):
            JobFitResult(
                fit_score=50,
                axes=AxisScores(
                    title_fit=50, skills_fit=50, seniority_fit=50, domain_fit=50
                ),
                reasoning="x" * 1501,
            )

    def test_job_fit_result_requires_axes(self) -> None:
        # Unlike the legacy FitScoreResult (no axes), the new shape
        # makes axes mandatory — every Phase 2 grade carries the
        # breakdown so the UI can render it.
        with pytest.raises(ValidationError):
            JobFitResult.model_validate({"fit_score": 50, "reasoning": "ok"})


# ---- _build_user_message -------------------------------------------------


class TestBuildUserMessage:
    def test_includes_user_profile_section(self) -> None:
        msg = _build_user_message(
            payload=_payload(),
            target=_target(),
            job_title="Senior Frontend Engineer",
            jd_text="<p>React shop.</p>",
        )
        assert "## User profile" in msg
        # The profile serializer surfaces summary + roles + skills.
        assert "8+ years" in msg
        assert "React" in msg

    def test_includes_target_section_slim_shape_preferred(self) -> None:
        """When the slim shape (description / seniority_hint /
        domain_hints) is populated, Phase 2 uses it instead of dumping
        keyword categories. The keyword block was the legacy fallback."""
        msg = _build_user_message(
            payload=_payload(),
            target=_target(),  # has description set
            job_title="Senior Frontend Engineer",
            jd_text="<p>React shop.</p>",
        )
        assert "## Target: Staff Frontend Engineer" in msg
        # Slim shape content present.
        assert "Web platform leadership at a consumer SaaS." in msg
        # Legacy keyword block suppressed when slim shape is populated.
        assert "core_skills" not in msg
        assert "junior" not in msg

    def test_includes_target_section_legacy_fallback(self) -> None:
        """When the slim shape is NOT populated (legacy target), Phase 2
        falls back to dumping scoring_profile.categories as it always did."""
        legacy = _target()
        legacy.description = None  # legacy targets lack slim fields
        msg = _build_user_message(
            payload=_payload(),
            target=legacy,
            job_title="Senior Frontend Engineer",
            jd_text="<p>React shop.</p>",
        )
        assert "## Target: Staff Frontend Engineer" in msg
        # Legacy keyword + negative block restored.
        assert "core_skills" in msg
        assert "staff" in msg
        assert "junior" in msg

    def test_includes_job_posting_section_last(self) -> None:
        msg = _build_user_message(
            payload=_payload(),
            target=_target(),
            job_title="Senior Frontend Engineer",
            jd_text="We need a Frontend engineer for our React stack.",
        )
        # Job section is the cache-unfriendly tail — should appear after
        # both the user and target sections. Order matters for prompt
        # caching to hit on the per-(user, target) prefix.
        user_idx = msg.index("## User profile")
        target_idx = msg.index("## Target")
        job_idx = msg.index("## Job posting")
        assert user_idx < target_idx < job_idx

    def test_truncates_long_jd_with_marker(self) -> None:
        long_jd = "A" * 5000
        msg = _build_user_message(
            payload=_payload(),
            target=_target(),
            job_title="x",
            jd_text=long_jd,
        )
        # Long JDs are capped and tagged so a downstream reviewer can
        # tell the model saw a trimmed copy.
        assert "[truncated]" in msg
        # Sanity-check the cap is roughly in the expected range
        # (~2000 chars + envelope). Not asserting an exact number
        # because the envelope evolves.
        assert len(msg) < 6000

    def test_does_not_truncate_short_jd(self) -> None:
        msg = _build_user_message(
            payload=_payload(),
            target=_target(),
            job_title="x",
            jd_text="Short JD body.",
        )
        assert "[truncated]" not in msg
        assert "Short JD body." in msg


# ---- prompt-cache marker ----------------------------------------------------


class TestCacheMarker:
    @pytest.mark.asyncio
    async def test_marker_covers_profile_and_target_but_not_jd(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """``cache_prefix_chars`` must span the per-(user, target) static
        block and exclude the per-job posting context."""
        from unittest.mock import MagicMock

        from app.services.fit import job_fit as job_fit_mod
        from app.services.fit.job_fit import derive_job_fit

        captured: dict[str, object] = {}

        async def fake_complete_json(*_args: object, **kwargs: object) -> object:
            captured.update(kwargs)
            return MagicMock(), MagicMock()

        monkeypatch.setattr(job_fit_mod, "complete_json", fake_complete_json)

        await derive_job_fit(
            MagicMock(),
            payload=_payload(),
            target=_target(),
            job_title="Staff Web Engineer",
            jd_text="We need React and TypeScript experience.",
        )

        messages = captured["messages"]
        assert isinstance(messages, list) and len(messages) == 1
        msg = messages[0]
        n = msg.cache_prefix_chars
        assert n is not None
        prefix, suffix = msg.content[:n], msg.content[n:]
        # Profile + target context cached...
        assert "## User profile" in prefix
        assert "## Target: Staff Frontend Engineer" in prefix
        # ...job posting not.
        assert "## Job posting" not in prefix
        assert "## Job posting" in suffix
        assert "Staff Web Engineer" in suffix
        # Split, not rewrite.
        assert prefix + suffix == _build_user_message(
            payload=_payload(),
            target=_target(),
            job_title="Staff Web Engineer",
            jd_text="We need React and TypeScript experience.",
        )
