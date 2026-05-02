"""ATS linter (#185 P3c).

Deterministic format check over the rendered `.docx` bytes. Runs after
`render_docx` and before the document is persisted or returned to the
client. Catches regressions if the renderer ever widens its output.

Targets Greenhouse's parser as the floor. See `linter.py` for the rule
set and `models/ats_lint.py` for the result shape.
"""

from app.services.ats_lint.linter import lint_docx
from app.services.ats_lint.markdown_linter import lint_markdown

__all__ = ["lint_docx", "lint_markdown"]
