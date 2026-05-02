"""Resume ingest: file parsing + prose doc merge (#497).

Parse uploaded resume files (PDF, DOCX), extract text, and merge into
the master prose document for downstream LLM derivation.
"""

from app.services.ingest.merge import merge_into_prose
from app.services.ingest.parse import ParsedResume, parse_resume

__all__ = [
    "ParsedResume",
    "merge_into_prose",
    "parse_resume",
]
