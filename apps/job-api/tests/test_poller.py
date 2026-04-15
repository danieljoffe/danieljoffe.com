from app.services.poller import _title_matches_any_role


def test_title_matches_senior_frontend_engineer():
    assert _title_matches_any_role("Senior Frontend Engineer") is True


def test_title_does_not_match_marketing():
    assert _title_matches_any_role("Marketing Specialist") is False


# TODO: An integration test for `poll_all_sources` would require mocking the full
# Supabase client chain (.table().select().eq().execute(), .upsert(...), .update(...))
# plus `fetch_board_jobs`. The non-trivial chain is skipped here — scoring, sanitize,
# and greenhouse are each covered individually and compose via simple sequential calls.
