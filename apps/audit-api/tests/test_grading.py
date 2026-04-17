from app.services.grading import CategoryScores, calculate_grade


def test_grade_a_for_high_weighted_score() -> None:
    scores = CategoryScores(performance=95, accessibility=95, seo=95, best_practices=95)
    result = calculate_grade(scores)
    assert result.grade == "A"
    assert result.label == "Excellent"


def test_grade_f_for_failing_weighted_score() -> None:
    scores = CategoryScores(performance=10, accessibility=20, seo=10, best_practices=20)
    result = calculate_grade(scores)
    assert result.grade == "F"


def test_grade_weighting_favors_performance() -> None:
    # performance has 0.4 weight; weighted = 90*0.4 + 90*0.25 + 90*0.2 + 90*0.15 = 90
    scores = CategoryScores(performance=90, accessibility=90, seo=90, best_practices=90)
    assert calculate_grade(scores).grade == "A"


def test_grade_boundary_b() -> None:
    # weighted = 75
    scores = CategoryScores(performance=75, accessibility=75, seo=75, best_practices=75)
    assert calculate_grade(scores).grade == "B"


def test_grade_boundary_c() -> None:
    scores = CategoryScores(performance=60, accessibility=60, seo=60, best_practices=60)
    assert calculate_grade(scores).grade == "C"


def test_grade_boundary_d() -> None:
    scores = CategoryScores(performance=40, accessibility=40, seo=40, best_practices=40)
    assert calculate_grade(scores).grade == "D"
