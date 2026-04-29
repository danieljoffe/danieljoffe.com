"""Resolve ContactInfo from the user_profiles row (F3-A).

Before this module existed, every tailor / cover-letter request had to send a
fully-populated `contact: ContactInfo` body. The frontend had nowhere to capture
identity fields and shipped `contact: {}`, which 422'd on every call. The fix
moves contact info to the `user_profiles` table (single source of truth) and
resolves it server-side. Request bodies may still pass an override for one-off
generations, but the typical path is "no contact in body, read from profile".
"""

import asyncio
from typing import Any, cast

from fastapi import HTTPException
from supabase import Client

from app.models.tailor import ContactInfo

_IDENTITY_COLUMNS = "name, email, phone_number, location, linkedin_url, website_url"


async def resolve_contact(
    supabase: Client,
    override: ContactInfo | None = None,
) -> ContactInfo:
    """Return contact info to use for generation.

    Precedence: explicit override -> profile row. Raises 400 if no name is
    available anywhere — without a name there's nothing to put on the resume.
    """
    if override is not None and override.name:
        return override

    resp = await asyncio.to_thread(
        lambda: supabase.table("user_profiles")
        .select(_IDENTITY_COLUMNS)
        .limit(1)
        .execute()
    )
    rows = cast(list[dict[str, Any]], resp.data or [])
    row = rows[0] if rows else {}
    name = row.get("name")
    if not name:
        raise HTTPException(
            status_code=400,
            detail=(
                "No contact name on file. Set your name in Settings → Profile "
                "before generating resumes or cover letters."
            ),
        )

    return ContactInfo(
        name=name,
        email=row.get("email"),
        phone=row.get("phone_number"),
        location=row.get("location"),
        linkedin=row.get("linkedin_url"),
        website=row.get("website_url"),
    )
