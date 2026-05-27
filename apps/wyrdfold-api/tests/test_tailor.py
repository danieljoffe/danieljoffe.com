"""Tailor service tests with MockLLMClient."""

import json

import pytest

from app.models.experience import OptimizedPayload, Outcome, Role, Skill
from app.models.tailor import (
    ContactInfo,
    TailoredBullet,
    TailoredEducation,
    TailoredResume,
    TailoredRole,
)
from app.services.llm.mock import MockLLMClient
from app.models.tailor import TailoredCoverLetter
from app.services.tailor.tailor import (
    DEFAULT_PURPOSE,
    build_user_message,
    tailor_resume,
    validate_cover_letter_refs,
    validate_trace_refs,
)


def _optimized() -> OptimizedPayload:
    return OptimizedPayload(
        summary="Senior frontend with a focus on performance and a11y.",
        roles=[
            Role(
                id="fc",
                company="FightCamp",
                title="Senior Frontend Engineer",
                start="2021-11",
                end="2024-04",
                summary="Led the PDP rebuild and cut mobile load times.",
                skills=["React", "Next.js"],
                outcome_refs=[],
            ),
            Role(
                id="winc",
                company="Winc",
                title="Frontend Engineer",
                start="2018-01",
                end="2021-10",
                summary="Built the self-serve landing page CMS.",
                skills=["Vue.js", "Nuxt.js"],
                outcome_refs=[],
            ),
        ],
        skills=[Skill(name="React"), Skill(name="TypeScript")],
        outcomes=[
            Outcome(
                description="Cut mobile load times from 10s to 2s",
                metric="LCP",
                value="2s",
                role_ref="fc",
            )
        ],
    )


def _contact() -> ContactInfo:
    return ContactInfo(name="Daniel Joffe", email="daniel@example.com")


def _valid_resume_json() -> str:
    return TailoredResume(
        summary="Senior FE with 10 years of shipped work. Focus on performance and design systems.",
        contact=_contact(),
        experience=[
            TailoredRole(
                company="FightCamp",
                title="Senior Frontend Engineer",
                start="2021-11",
                end="2024-04",
                bullets=[
                    TailoredBullet(
                        text="Cut mobile load times from 10s to 2s.",
                        source_outcome_ref="Cut mobile load times from 10s to 2s",
                    ),
                    TailoredBullet(
                        text="Led the PDP rebuild.",
                        source_outcome_ref="Led the PDP rebuild",
                    ),
                ],
                source_role_ref="fc",
            )
        ],
        skills=["React", "TypeScript"],
        education=[TailoredEducation(school="UCLA", degree="BA")],
        jd_snippet="Senior FE role",
    ).model_dump_json()


# ---- build_user_message ---------------------------------------------------


def test_build_user_message_contains_every_section() -> None:
    msg = build_user_message(
        optimized=_optimized(),
        job_description="We want a senior FE.",
        contact=_contact(),
        resume_type="senior-frontend",
        preferences_text='{"rules": ["present tense"]}',
        annotations_text="EMPHASIZE: role roadmap",
        critique="Lead with performance.",
        page_budget=2,
    )
    for tag in (
        "[OptimizedPayload]",
        "[ContactInfo]",
        "[ResumeType] senior-frontend",
        "[PageBudget] 2",
        "[Preferences]",
        "[Annotations]",
        "[Critique]",
        "[JobDescription]",
    ):
        assert tag in msg


def test_build_user_message_omits_preferences_and_critique_when_absent() -> None:
    msg = build_user_message(
        optimized=_optimized(),
        job_description="jd",
        contact=_contact(),
        resume_type="generic",
        preferences_text=None,
        annotations_text=None,
        critique=None,
        page_budget=1,
    )
    assert "[Preferences]" not in msg
    assert "[Annotations]" not in msg
    assert "[Critique]" not in msg
    assert "[JobDescription]" in msg


# ---- validate_trace_refs --------------------------------------------------


def test_validate_raises_on_unknown_role_ref() -> None:
    resume = TailoredResume(
        summary="x",
        contact=_contact(),
        experience=[
            TailoredRole(
                company="Acme",
                title="FE",
                start="2020-01",
                bullets=[],
                source_role_ref="unknown-role",
            )
        ],
        skills=[],
    )
    with pytest.raises(ValueError, match="unknown role id"):
        validate_trace_refs(resume, _optimized())


def test_validate_drops_bullets_without_ref() -> None:
    resume = TailoredResume(
        summary="x",
        contact=_contact(),
        experience=[
            TailoredRole(
                company="FightCamp",
                title="Senior Frontend Engineer",
                start="2021-11",
                bullets=[
                    TailoredBullet(text="No ref here.", source_outcome_ref=None),
                ],
                source_role_ref="fc",
            )
        ],
        skills=[],
    )
    cleaned, warnings = validate_trace_refs(resume, _optimized())
    assert cleaned.experience[0].bullets == []
    assert len(warnings) == 1
    assert "no ref" in warnings[0].lower()


def test_validate_drops_bullets_with_untraceable_ref() -> None:
    resume = TailoredResume(
        summary="x",
        contact=_contact(),
        experience=[
            TailoredRole(
                company="FightCamp",
                title="Senior Frontend Engineer",
                start="2021-11",
                bullets=[
                    TailoredBullet(
                        text="Invented claim.",
                        source_outcome_ref="something the LLM made up",
                    ),
                ],
                source_role_ref="fc",
            )
        ],
        skills=[],
    )
    cleaned, warnings = validate_trace_refs(resume, _optimized())
    assert cleaned.experience[0].bullets == []
    assert any("untraceable" in w for w in warnings)


def test_validate_keeps_bullets_matching_outcome_description() -> None:
    resume = TailoredResume(
        summary="x",
        contact=_contact(),
        experience=[
            TailoredRole(
                company="FightCamp",
                title="Senior Frontend Engineer",
                start="2021-11",
                bullets=[
                    TailoredBullet(
                        text="Cut mobile LCP from 10s to 2s.",
                        source_outcome_ref="Cut mobile load times from 10s to 2s",
                    ),
                ],
                source_role_ref="fc",
            )
        ],
        skills=[],
    )
    cleaned, warnings = validate_trace_refs(resume, _optimized())
    assert len(cleaned.experience[0].bullets) == 1
    assert warnings == []


def test_validate_keeps_bullets_matching_role_summary_substring() -> None:
    resume = TailoredResume(
        summary="x",
        contact=_contact(),
        experience=[
            TailoredRole(
                company="FightCamp",
                title="Senior Frontend Engineer",
                start="2021-11",
                bullets=[
                    TailoredBullet(
                        text="Led the PDP rebuild.",
                        source_outcome_ref="Led the PDP rebuild",
                    ),
                ],
                source_role_ref="fc",
            )
        ],
        skills=[],
    )
    cleaned, _ = validate_trace_refs(resume, _optimized())
    assert len(cleaned.experience[0].bullets) == 1


# ---- tailor_resume end-to-end --------------------------------------------


async def test_tailor_resume_parses_and_returns_result() -> None:
    llm = MockLLMClient(scripted={DEFAULT_PURPOSE: _valid_resume_json()})
    resume, warnings, result = await tailor_resume(
        llm,
        optimized=_optimized(),
        job_description="We want a senior FE",
        contact=_contact(),
    )
    assert isinstance(resume, TailoredResume)
    assert len(resume.experience) == 1
    assert result.cost_usd > 0
    assert warnings == []


async def test_tailor_resume_cost_logs_under_default_purpose() -> None:
    llm = MockLLMClient(scripted={DEFAULT_PURPOSE: _valid_resume_json()})
    await tailor_resume(
        llm,
        optimized=_optimized(),
        job_description="jd",
        contact=_contact(),
    )
    assert len(llm.calls) == 1
    assert llm.calls[0]["purpose"] == DEFAULT_PURPOSE


async def test_tailor_enables_system_cache() -> None:
    llm = MockLLMClient(scripted={DEFAULT_PURPOSE: _valid_resume_json()})
    await tailor_resume(
        llm,
        optimized=_optimized(),
        job_description="jd",
        contact=_contact(),
    )
    assert llm.calls[0]["cache_system"] is True


async def test_tailor_sends_preferences_into_user_message() -> None:
    seen: dict[str, str] = {}

    def responder(latest_user: str, _messages: object) -> str:
        seen["latest"] = latest_user
        return _valid_resume_json()

    llm = MockLLMClient(scripted={DEFAULT_PURPOSE: responder})
    await tailor_resume(
        llm,
        optimized=_optimized(),
        job_description="jd",
        contact=_contact(),
        preferences_rules=["use present tense"],
        preferences_avoid=["em dashes"],
    )
    assert "[Preferences]" in seen["latest"]
    assert "use present tense" in seen["latest"]
    assert "em dashes" in seen["latest"]


async def test_tailor_sends_critique_into_user_message() -> None:
    seen: dict[str, str] = {}

    def responder(latest_user: str, _messages: object) -> str:
        seen["latest"] = latest_user
        return _valid_resume_json()

    llm = MockLLMClient(scripted={DEFAULT_PURPOSE: responder})
    await tailor_resume(
        llm,
        optimized=_optimized(),
        job_description="jd",
        contact=_contact(),
        critique="Lead with performance not design systems.",
    )
    assert "[Critique]" in seen["latest"]
    assert "performance" in seen["latest"]


async def test_tailor_model_override_respected() -> None:
    llm = MockLLMClient(scripted={DEFAULT_PURPOSE: _valid_resume_json()})
    await tailor_resume(
        llm,
        optimized=_optimized(),
        job_description="jd",
        contact=_contact(),
        model="claude-haiku-4-5",
    )
    assert llm.calls[0]["model"] == "claude-haiku-4-5"


async def test_tailor_drops_hallucinated_bullets() -> None:
    bad = TailoredResume(
        summary="x",
        contact=_contact(),
        experience=[
            TailoredRole(
                company="FightCamp",
                title="Senior Frontend Engineer",
                start="2021-11",
                bullets=[
                    TailoredBullet(
                        text="Real outcome.",
                        source_outcome_ref="Cut mobile load times from 10s to 2s",
                    ),
                    TailoredBullet(
                        text="Hallucinated.",
                        source_outcome_ref="Raised Series D of $1B",
                    ),
                ],
                source_role_ref="fc",
            )
        ],
        skills=[],
    )
    llm = MockLLMClient(scripted={DEFAULT_PURPOSE: bad.model_dump_json()})
    resume, warnings, _ = await tailor_resume(
        llm,
        optimized=_optimized(),
        job_description="jd",
        contact=_contact(),
    )
    assert len(resume.experience[0].bullets) == 1
    assert resume.experience[0].bullets[0].text == "Real outcome."
    assert any("untraceable" in w for w in warnings)


async def test_tailor_raises_on_hallucinated_role() -> None:
    bad = TailoredResume(
        summary="x",
        contact=_contact(),
        experience=[
            TailoredRole(
                company="Imaginary Inc.",
                title="CTO",
                start="2015-01",
                bullets=[],
                source_role_ref="not-in-payload",
            )
        ],
        skills=[],
    )
    llm = MockLLMClient(scripted={DEFAULT_PURPOSE: bad.model_dump_json()})
    with pytest.raises(ValueError):
        await tailor_resume(
            llm,
            optimized=_optimized(),
            job_description="jd",
            contact=_contact(),
        )


async def test_invalid_json_raises() -> None:
    llm = MockLLMClient(scripted={DEFAULT_PURPOSE: "not json"})
    with pytest.raises(Exception):
        await tailor_resume(
            llm,
            optimized=_optimized(),
            job_description="jd",
            contact=_contact(),
        )


def test_tailored_resume_json_round_trips() -> None:
    raw = _valid_resume_json()
    parsed = TailoredResume.model_validate_json(raw)
    assert parsed.contact.name == "Daniel Joffe"
    assert parsed.experience[0].source_role_ref == "fc"
    assert json.loads(raw)["skills"] == ["React", "TypeScript"]


def _cover_letter(skill_refs: list[str]) -> TailoredCoverLetter:
    """Bare letter used to exercise the ref-validation tolerance."""
    from app.models.tailor import CoverLetterParagraph

    return TailoredCoverLetter(
        contact=ContactInfo(name="Daniel Joffe", email="d@example.com"),
        recipient_company="Acme",
        salutation="Dear Acme team,",
        paragraphs=[CoverLetterParagraph(text="Body.")],
        closing="Sincerely,",
        signature="Daniel Joffe",
        source_role_refs=[],
        source_outcome_refs=[],
        source_skill_refs=skill_refs,
    )


def test_validate_cover_letter_accepts_canonical_skill() -> None:
    optimized = _optimized()  # has skills "React" + "TypeScript"
    letter, warnings = validate_cover_letter_refs(
        _cover_letter(["React"]), optimized
    )
    assert letter.source_skill_refs == ["React"]
    assert warnings == []


def test_validate_cover_letter_tolerates_pluralization_and_case() -> None:
    """LLM commonly emits 'TypeScripts' or 'react' when canonical is
    'TypeScript' / 'React'. Tolerance keeps the canonical form in the
    response and suppresses the cosmetic 'Dropped unknown skill_ref'
    warning users would otherwise see in their cover letter metadata."""
    optimized = _optimized()
    letter, warnings = validate_cover_letter_refs(
        _cover_letter(["react", "TypeScripts"]), optimized
    )
    assert sorted(letter.source_skill_refs) == ["React", "TypeScript"]
    assert warnings == []


def test_validate_cover_letter_drops_truly_unknown_skill() -> None:
    """Tolerance must not over-match: a skill that genuinely isn't in
    the optimized doc still gets dropped + warned."""
    optimized = _optimized()
    letter, warnings = validate_cover_letter_refs(
        _cover_letter(["Kafka"]), optimized
    )
    assert letter.source_skill_refs == []
    assert any("Kafka" in w for w in warnings)
