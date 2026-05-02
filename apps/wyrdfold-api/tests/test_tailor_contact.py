"""Tests for the F3-A contact resolution helper."""

from __future__ import annotations

from typing import Any
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.models.tailor import ContactInfo
from app.services.tailor.contact import resolve_contact


class _ExecuteStub:
    def __init__(self, data: list[dict[str, Any]] | None) -> None:
        self.data = data


def _profile_supabase(profile_row: dict[str, Any] | None) -> MagicMock:
    """Mock that answers `table('user_profiles').select(...).limit(1).execute()`."""
    chain = MagicMock()
    chain.select.return_value = chain
    chain.limit.return_value = chain
    chain.execute.return_value = _ExecuteStub([profile_row] if profile_row else [])

    supabase = MagicMock()
    supabase.table.return_value = chain
    return supabase


async def test_override_with_name_takes_precedence() -> None:
    supabase = _profile_supabase({"name": "From Profile"})
    override = ContactInfo(name="From Override", email="o@example.com")

    result = await resolve_contact(supabase, override)

    assert result.name == "From Override"
    assert result.email == "o@example.com"
    # Profile shouldn't even be queried when override has a name
    supabase.table.assert_not_called()


async def test_resolves_from_profile_when_no_override() -> None:
    supabase = _profile_supabase(
        {
            "name": "Daniel Joffe",
            "email": "d@example.com",
            "phone_number": "+15551234567",
            "location": "NYC",
            "linkedin_url": "https://linkedin.com/in/dj",
            "website_url": "https://danieljoffe.com",
        }
    )

    result = await resolve_contact(supabase, override=None)

    assert result.name == "Daniel Joffe"
    assert result.email == "d@example.com"
    assert result.phone == "+15551234567"
    assert result.location == "NYC"
    assert result.linkedin == "https://linkedin.com/in/dj"
    assert result.website == "https://danieljoffe.com"


async def test_override_without_name_falls_through_to_profile() -> None:
    """`contact: {}` from frontend (no name) should still resolve via profile."""
    supabase = _profile_supabase({"name": "Daniel Joffe", "email": "d@example.com"})
    override = ContactInfo(name="")  # Pydantic allows empty string

    result = await resolve_contact(supabase, override)

    assert result.name == "Daniel Joffe"


async def test_raises_400_when_no_name_anywhere() -> None:
    supabase = _profile_supabase({"name": None, "email": "d@example.com"})

    with pytest.raises(HTTPException) as exc_info:
        await resolve_contact(supabase, override=None)

    assert exc_info.value.status_code == 400
    assert "Settings" in exc_info.value.detail


async def test_raises_400_when_profile_row_missing() -> None:
    supabase = _profile_supabase(None)  # No rows at all

    with pytest.raises(HTTPException) as exc_info:
        await resolve_contact(supabase, override=None)

    assert exc_info.value.status_code == 400
