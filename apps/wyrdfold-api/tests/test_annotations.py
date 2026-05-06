"""Pure-function tests for annotation helpers (#499)."""

from app.models.experience import Annotation, OptimizedPayload, Outcome, Role, Skill
from app.services.experience.annotations import (
    apply_exclusions,
    build_annotations_text,
    resolve_for_target,
    validate_annotation_refs,
)


def _ann(
    action: str = "exclude",
    ref_type: str = "role",
    ref_value: str = "helpdesk",
    target_label: str | None = None,
    reason: str | None = None,
) -> Annotation:
    return Annotation(
        id="ann-1",
        action=action,
        ref_type=ref_type,
        ref_value=ref_value,
        target_label=target_label,
        reason=reason,
    )


def _role(
    id_: str,
    *,
    summary: str | None = None,
    outcome_refs: list[str] | None = None,
) -> Role:
    return Role(
        id=id_,
        company=id_,
        title="Engineer",
        start="2020-01",
        end="2024-01",
        summary=summary,
        skills=[],
        outcome_refs=outcome_refs or [],
    )


def _outcome(
    description: str,
    *,
    role_ref: str | None = None,
) -> Outcome:
    return Outcome(description=description, role_ref=role_ref)


# ---- resolve_for_target ---------------------------------------------------


class TestResolveForTarget:
    def test_global_annotations_apply_to_all_targets(self) -> None:
        ann = _ann(action="exclude", target_label=None)
        emph, excl, de = resolve_for_target([ann], "Frontend Engineer")
        assert len(excl) == 1
        assert len(emph) == 0
        assert len(de) == 0

    def test_target_specific_matches_label(self) -> None:
        ann = _ann(action="emphasize", target_label="Frontend Engineer")
        emph, excl, de = resolve_for_target([ann], "Frontend Engineer")
        assert len(emph) == 1

    def test_target_specific_case_insensitive(self) -> None:
        ann = _ann(action="exclude", target_label="frontend engineer")
        emph, excl, de = resolve_for_target([ann], "Frontend Engineer")
        assert len(excl) == 1

    def test_target_specific_does_not_match_other_label(self) -> None:
        ann = _ann(action="exclude", target_label="Backend Engineer")
        emph, excl, de = resolve_for_target([ann], "Frontend Engineer")
        assert len(excl) == 0

    def test_mixed_global_and_target_specific(self) -> None:
        anns = [
            _ann(action="exclude", target_label=None, ref_value="helpdesk"),
            _ann(action="emphasize", target_label="PM", ref_value="roadmap"),
            _ann(action="de-emphasize", target_label=None, ref_value="old-role"),
        ]
        emph, excl, de = resolve_for_target(anns, "PM")
        assert len(excl) == 1  # global exclude
        assert len(emph) == 1  # PM-specific emphasize
        assert len(de) == 1    # global de-emphasize

    def test_no_target_label_returns_only_global(self) -> None:
        anns = [
            _ann(action="exclude", target_label=None),
            _ann(action="emphasize", target_label="Frontend"),
        ]
        emph, excl, de = resolve_for_target(anns, None)
        assert len(excl) == 1
        assert len(emph) == 0


# ---- apply_exclusions ------------------------------------------------------


class TestApplyExclusions:
    def test_exclude_role_removes_role(self) -> None:
        payload = OptimizedPayload(
            roles=[_role("keep"), _role("helpdesk")],
        )
        result = apply_exclusions(payload, [_ann(ref_value="helpdesk")])
        assert [r.id for r in result.roles] == ["keep"]

    def test_exclude_role_cascades_outcomes(self) -> None:
        payload = OptimizedPayload(
            roles=[_role("keep"), _role("helpdesk")],
            outcomes=[
                _outcome("Good work", role_ref="keep"),
                _outcome("Bad work", role_ref="helpdesk"),
            ],
        )
        result = apply_exclusions(payload, [_ann(ref_value="helpdesk")])
        assert len(result.outcomes) == 1
        assert result.outcomes[0].description == "Good work"

    def test_exclude_skill_removes_by_name(self) -> None:
        payload = OptimizedPayload(
            skills=[Skill(name="React"), Skill(name="Java")],
        )
        result = apply_exclusions(
            payload, [_ann(ref_type="skill", ref_value="Java")]
        )
        assert [s.name for s in result.skills] == ["React"]

    def test_exclude_skill_case_insensitive(self) -> None:
        payload = OptimizedPayload(
            skills=[Skill(name="React"), Skill(name="Java")],
        )
        result = apply_exclusions(
            payload, [_ann(ref_type="skill", ref_value="java")]
        )
        assert [s.name for s in result.skills] == ["React"]

    def test_exclude_outcome_by_substring(self) -> None:
        payload = OptimizedPayload(
            outcomes=[
                _outcome("Cut LCP from 10s to 2s"),
                _outcome("Built dashboard"),
            ],
        )
        result = apply_exclusions(
            payload, [_ann(ref_type="outcome", ref_value="Cut LCP")]
        )
        assert len(result.outcomes) == 1
        assert result.outcomes[0].description == "Built dashboard"

    def test_empty_exclusions_returns_unchanged(self) -> None:
        payload = OptimizedPayload(
            roles=[_role("a")],
            skills=[Skill(name="React")],
        )
        result = apply_exclusions(payload, [])
        assert len(result.roles) == 1
        assert len(result.skills) == 1

    def test_annotations_preserved_through_exclusion(self) -> None:
        """apply_exclusions should not strip annotations from the payload."""
        ann = _ann(action="emphasize", ref_value="a")
        payload = OptimizedPayload(
            roles=[_role("a"), _role("b")],
            annotations=[Annotation(
                id="keep-me", action="emphasize", ref_type="role",
                ref_value="a", target_label=None, reason=None,
            )],
        )
        result = apply_exclusions(payload, [_ann(ref_value="b")])
        assert len(result.annotations) == 1


# ---- build_annotations_text ------------------------------------------------


class TestBuildAnnotationsText:
    def test_emphasize_only(self) -> None:
        text = build_annotations_text(
            [_ann(action="emphasize", ref_value="roadmap", reason="PM targets")],
            [],
        )
        assert text is not None
        assert "EMPHASIZE" in text
        assert "roadmap" in text
        assert "PM targets" in text

    def test_de_emphasize_only(self) -> None:
        text = build_annotations_text(
            [],
            [_ann(action="de-emphasize", ref_value="old-role")],
        )
        assert text is not None
        assert "DE-EMPHASIZE" in text
        assert "old-role" in text

    def test_both_combined(self) -> None:
        text = build_annotations_text(
            [_ann(action="emphasize", ref_value="roadmap")],
            [_ann(action="de-emphasize", ref_value="old-role")],
        )
        assert text is not None
        assert "EMPHASIZE" in text
        assert "DE-EMPHASIZE" in text

    def test_empty_returns_none(self) -> None:
        assert build_annotations_text([], []) is None


# ---- validate_annotation_refs ----------------------------------------------


class TestValidateAnnotationRefs:
    def test_valid_role_ref_kept(self) -> None:
        payload = OptimizedPayload(roles=[_role("fightcamp")])
        anns = [_ann(ref_type="role", ref_value="fightcamp")]
        assert len(validate_annotation_refs(anns, payload)) == 1

    def test_stale_role_ref_dropped(self) -> None:
        payload = OptimizedPayload(roles=[_role("fightcamp")])
        anns = [_ann(ref_type="role", ref_value="deleted-role")]
        assert len(validate_annotation_refs(anns, payload)) == 0

    def test_valid_skill_ref_kept(self) -> None:
        payload = OptimizedPayload(skills=[Skill(name="React")])
        anns = [_ann(ref_type="skill", ref_value="React")]
        assert len(validate_annotation_refs(anns, payload)) == 1

    def test_skill_ref_case_insensitive(self) -> None:
        payload = OptimizedPayload(skills=[Skill(name="React")])
        anns = [_ann(ref_type="skill", ref_value="react")]
        assert len(validate_annotation_refs(anns, payload)) == 1

    def test_valid_outcome_ref_substring_match(self) -> None:
        payload = OptimizedPayload(
            outcomes=[_outcome("Cut LCP from 10s to 2s")],
        )
        anns = [_ann(ref_type="outcome", ref_value="Cut LCP")]
        assert len(validate_annotation_refs(anns, payload)) == 1

    def test_stale_outcome_ref_dropped(self) -> None:
        payload = OptimizedPayload(
            outcomes=[_outcome("Built dashboard")],
        )
        anns = [_ann(ref_type="outcome", ref_value="Cut LCP")]
        assert len(validate_annotation_refs(anns, payload)) == 0

    def test_mixed_valid_and_stale(self) -> None:
        payload = OptimizedPayload(
            roles=[_role("fightcamp")],
            skills=[Skill(name="React")],
        )
        anns = [
            _ann(ref_type="role", ref_value="fightcamp"),
            _ann(ref_type="role", ref_value="deleted"),
            _ann(ref_type="skill", ref_value="React"),
        ]
        result = validate_annotation_refs(anns, payload)
        assert len(result) == 2
