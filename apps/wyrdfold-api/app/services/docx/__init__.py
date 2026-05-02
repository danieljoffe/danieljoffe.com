"""ATS-friendly `.docx` renderer (#185 P3b).

Pure function: TailoredResume -> bytes. Single column, system fonts,
standard section headings, plain bullets. No tables, no images, no
text boxes. Targets Greenhouse's parser as the floor.

The ATS linter (P3c) validates the output against the same rules
enforced here. Rendering and linting are kept separate so the linter
can catch regressions if this module ever widens its output.
"""

from app.services.docx.renderer import (
    format_date,
    render_cover_letter_docx,
    render_docx,
)

__all__ = ["format_date", "render_cover_letter_docx", "render_docx"]
