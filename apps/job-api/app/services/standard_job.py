from dataclasses import dataclass


@dataclass
class StandardJob:
    """Normalized job shape shared across all ATS providers."""

    external_id: str
    title: str
    location_name: str | None
    department: str | None
    content: str
    updated_at: str
    absolute_url: str
    salary_text: str | None = None
