"""Experience module (#185 P1).

Two-doc content model:
- ProseDoc: user-owned narrative, append-only from chat turns.
- OptimizedDoc: LLM-derived structured projection. User-editable.

This module owns the data layer. Conversation orchestration, embedding/retrieval,
and tailoring live in peer modules (added in later phases) that consume the
optimized doc only.
"""
