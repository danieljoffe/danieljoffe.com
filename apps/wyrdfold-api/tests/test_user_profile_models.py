"""Tests for user_profile Pydantic models — focuses on the E.164 phone
validator (F5-C). The router is a thin wrapper over Supabase; the validator
is the only piece with non-trivial logic worth pinning down."""

import pytest
from pydantic import ValidationError

from app.models.user_profile import (
    IdentityFieldsUpdate,
    NotificationPreferencesUpdate,
)


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("+14155552671", "+14155552671"),
        ("+1 415 555 2671", "+14155552671"),
        ("+1 (415) 555-2671", "+14155552671"),
        ("  +442071838750  ", "+442071838750"),
        ("", None),
        ("   ", None),
        (None, None),
    ],
)
def test_phone_normalization_accepts_valid(raw: str | None, expected: str | None) -> None:
    """Valid E.164 numbers (with permissive formatting) normalize cleanly;
    blank/None clears the field."""
    model = NotificationPreferencesUpdate(phone_number=raw)
    assert model.phone_number == expected
    identity = IdentityFieldsUpdate(phone_number=raw)
    assert identity.phone_number == expected


@pytest.mark.parametrize(
    "raw",
    [
        "415-555-2671",  # missing +
        "+0123456789",  # leading zero in country code
        "+1",  # too short (only country code)
        "+",  # just plus
        "not a phone",
        "+12345678901234567890",  # too long (>15 digits)
        "+1abc5552671",  # letters
    ],
)
def test_phone_validation_rejects_invalid(raw: str) -> None:
    with pytest.raises(ValidationError) as exc:
        NotificationPreferencesUpdate(phone_number=raw)
    assert "E.164" in str(exc.value)

    with pytest.raises(ValidationError):
        IdentityFieldsUpdate(phone_number=raw)
