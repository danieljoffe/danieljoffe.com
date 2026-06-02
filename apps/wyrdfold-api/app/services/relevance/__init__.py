"""Relevance signals for the scoring pipeline.

Currently exposes:

- ``title_triage`` (Phase 1): cheap LLM binary classifier that gates
  ingestion. Replaced the earlier cosine-similarity prefilter once the
  prefilter proved structurally weak for short job titles in
  voyage-3-lite's embedding space.

Phase 2 (``derive_job_fit``) will land here too once the deeper
per-job-per-target grader lands.
"""
