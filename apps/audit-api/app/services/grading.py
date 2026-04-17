from dataclasses import dataclass
from typing import Literal

Grade = Literal["A", "B", "C", "D", "F"]


@dataclass(frozen=True)
class CategoryScores:
    performance: int
    accessibility: int
    seo: int
    best_practices: int


@dataclass(frozen=True)
class GradeResult:
    grade: Grade
    label: str
    color: str


def calculate_grade(scores: CategoryScores) -> GradeResult:
    weighted = (
        scores.performance * 0.4
        + scores.accessibility * 0.25
        + scores.seo * 0.2
        + scores.best_practices * 0.15
    )
    if weighted >= 90:
        return GradeResult(grade="A", label="Excellent", color="#63CAA5")
    if weighted >= 75:
        return GradeResult(grade="B", label="Good", color="#8C8FFF")
    if weighted >= 60:
        return GradeResult(grade="C", label="Needs Work", color="#FFB46B")
    if weighted >= 40:
        return GradeResult(grade="D", label="Poor", color="#FF8CA0")
    return GradeResult(grade="F", label="Critical", color="#FF6B6B")
