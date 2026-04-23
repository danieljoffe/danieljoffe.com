"""Pydantic models for the ATS linter (#185 P3c).

Deterministic format-check results over a rendered `.docx`. Errors block
generation; warnings surface to the user but don't fail the pipeline.
"""

from typing import Literal

from pydantic import BaseModel

Severity = Literal["warning", "error"]


class LintViolation(BaseModel):
    code: str
    """Stable machine-readable identifier, e.g. 'no_tables'. Use for
    linking to docs or programmatic responses.
    """

    message: str
    severity: Severity


class LintResult(BaseModel):
    ok: bool
    """True iff no errors (warnings are fine)."""

    violations: list[LintViolation]

    @property
    def errors(self) -> list[LintViolation]:
        return [v for v in self.violations if v.severity == "error"]

    @property
    def warnings(self) -> list[LintViolation]:
        return [v for v in self.violations if v.severity == "warning"]
