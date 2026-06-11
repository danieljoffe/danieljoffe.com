"""Tests for the Phase-2 seniority pre-gate (#902)."""

from __future__ import annotations

from app.services.fit.seniority_gate import detect_title_rank, passes_seniority_gate


class TestDetectTitleRank:
    def test_director(self) -> None:
        assert detect_title_rank("Director of CX Operations") == 4
        assert detect_title_rank("Head of Customer Experience") == 4

    def test_director_wins_over_senior(self) -> None:
        # High-to-low scan: "Senior Director" reads as director, not senior.
        assert detect_title_rank("Senior Director, Customer Success") == 4

    def test_vp_and_clevel(self) -> None:
        assert detect_title_rank("VP, Customer Operations") == 5
        assert detect_title_rank("Vice President of Support") == 5
        assert detect_title_rank("Chief Customer Officer") == 6

    def test_manager(self) -> None:
        assert detect_title_rank("Customer Success Manager") == 3

    def test_management_does_not_trip_manager(self) -> None:
        # Word-boundaried: "Management" must not match "manager".
        assert detect_title_rank("Director, Product Management") == 4

    def test_sub_level(self) -> None:
        assert detect_title_rank("Customer Experience Coordinator") == 0
        assert detect_title_rank("Support Specialist") == 0

    def test_senior_ic(self) -> None:
        assert detect_title_rank("Senior Machine Learning Engineer") == 1

    def test_ambiguous_is_none(self) -> None:
        assert detect_title_rank("Customer Experience") is None
        assert detect_title_rank("Solutions Architect") is None


class TestPassesSeniorityGate:
    def test_none_hint_passes_everything(self) -> None:
        assert passes_seniority_gate("Support Coordinator", None) is True

    def test_below_director_hint_is_passthrough(self) -> None:
        # Only director+ targets are gated; a manager target keeps everything.
        assert passes_seniority_gate("Support Coordinator", "manager") is True

    def test_director_hint_keeps_director_and_above(self) -> None:
        assert passes_seniority_gate("Director of CX", "director") is True
        assert passes_seniority_gate("VP, Customer Ops", "director") is True
        assert passes_seniority_gate("Chief Customer Officer", "director") is True

    def test_director_hint_default_tolerance_keeps_manager(self) -> None:
        # tolerance=1 → a Manager is the stretch case worth a grade.
        assert passes_seniority_gate("Customer Success Manager", "director") is True

    def test_director_hint_drops_sub_level(self) -> None:
        assert passes_seniority_gate("CX Coordinator", "director") is False
        assert passes_seniority_gate("Senior Sales Engineer", "director") is False

    def test_director_hint_passes_ambiguous(self) -> None:
        # No level token → never dropped on a guess.
        assert passes_seniority_gate("Customer Experience", "director") is True

    def test_tolerance_zero_drops_manager(self) -> None:
        assert (
            passes_seniority_gate("Customer Success Manager", "director", tolerance=0)
            is False
        )
        assert (
            passes_seniority_gate("Director of CX", "director", tolerance=0) is True
        )

    def test_offdomain_director_still_passes(self) -> None:
        # Documented blind spot: the gate is seniority-only, so a wrong-domain
        # director (e.g. eng/product) passes — domain filtering is separate.
        assert passes_seniority_gate("Head of Solutions Engineering", "director") is True
