"""Logistics filters extracted by the Phase 2 grader.

Groundwork for plan-wyrdfold-logistics-chips.md. The Phase 2 prompt
change that actually emits these fields lands in a follow-up PR; this
module is the schema half — defines the shape and validates anything
that does write to the column today (e.g. backfill scripts).

Filter-only: the values inform the /jobs chips and filter query
params (?remote_only=true, ?min_salary=150000, ?country=US). They
never affect ``score``, ``recency_score``, or sort order.

See the "Concepts" block in plan-wyrdfold-streamlined-target.md for
the distinction between **axis weights** (score-tuning, lives on
user_targets) and **logistics filters** (list-filtering, lives on
scores). They are independent mechanisms and never collide in the
data path.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

RemoteStatus = Literal["remote", "hybrid", "onsite", "unspecified"]
SalaryUnit = Literal["year", "hour"]


class LogisticsFilters(BaseModel):
    """Structured logistics observed in the JD by the Phase 2 grader.

    Every field is optional / has a sentinel ``unspecified`` value;
    the grader is instructed to lean conservative and say "I don't
    know" rather than guess. False positives on filter pills are worse
    than misses — a "Remote only" filter that surfaces hybrid roles
    looks broken; a slightly under-populated chip list does not.

    Salary fields are intended to capture the explicit disclosed range
    only. "Competitive salary" / "DOE" / equity-only postings stay
    NULL across all four salary fields.

    Location fields capture the primary office anchor when one is
    named. A remote-only role with no anchor city / country leaves
    both NULL — the ``remote_status`` field carries the signal in
    that case.
    """

    remote_status: RemoteStatus = "unspecified"

    salary_min: int | None = Field(default=None, ge=0)
    salary_max: int | None = Field(default=None, ge=0)
    salary_currency: str | None = Field(default=None, max_length=8)
    salary_unit: SalaryUnit | None = None

    location_city: str | None = Field(default=None, max_length=120)
    location_country: str | None = Field(default=None, max_length=4)

    def has_any_signal(self) -> bool:
        """Whether this row carries any non-default information.

        Useful for the FE chip renderer: when this returns False the
        chip row can be skipped entirely rather than rendering an
        empty container.
        """
        return (
            self.remote_status != "unspecified"
            or self.salary_min is not None
            or self.salary_max is not None
            or self.location_city is not None
            or self.location_country is not None
        )
