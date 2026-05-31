"""Search-term tokenizer + OR-chain regression tests.

Multi-word search ("customer director") should match titles containing
EITHER token, not the exact substring. The single-word path stays a
single ilike so existing behaviour is unchanged.
"""

from unittest.mock import MagicMock

from app.routers.jobs import _apply_title_search, _tokenize_search


def test_tokenize_empty() -> None:
    assert _tokenize_search(None) == []
    assert _tokenize_search("") == []
    assert _tokenize_search("   ") == []


def test_tokenize_single_word() -> None:
    assert _tokenize_search("director") == ["director"]


def test_tokenize_multi_word() -> None:
    assert _tokenize_search("customer director") == ["customer", "director"]


def test_tokenize_dedupes_case_insensitively() -> None:
    # Useful when the user re-types the same word with different casing
    # mid-correction — the OR chain should stay minimal.
    assert _tokenize_search("Director DIRECTOR director") == ["Director"]


def test_tokenize_collapses_whitespace() -> None:
    assert _tokenize_search("  customer   director  ") == ["customer", "director"]


def test_apply_search_no_op_when_empty() -> None:
    q = MagicMock()
    _apply_title_search(q, None)
    q.ilike.assert_not_called()
    q.or_.assert_not_called()


def test_apply_search_single_token_uses_ilike() -> None:
    # Single-word search: existing ilike pattern, unchanged.
    q = MagicMock()
    _apply_title_search(q, "director")
    q.ilike.assert_called_once_with("title", "%director%")
    q.or_.assert_not_called()


def test_apply_search_multi_token_uses_or_chain() -> None:
    # Multi-word search: PostgREST or_() with one ilike per token.
    q = MagicMock()
    _apply_title_search(q, "customer director")
    q.ilike.assert_not_called()
    q.or_.assert_called_once_with(
        "title.ilike.*customer*,title.ilike.*director*"
    )


def test_apply_search_strips_commas_and_parens() -> None:
    # PostgREST or-list grammar uses commas and parens as separators.
    # The escape would otherwise generate an invalid filter.
    q = MagicMock()
    _apply_title_search(q, "engineer, (senior)")
    q.or_.assert_called_once()
    arg = q.or_.call_args.args[0]
    # Commas inside tokens stripped, parens stripped, separator commas
    # (between two title.ilike.*x* segments) preserved.
    assert "title.ilike.*engineer*" in arg
    assert "title.ilike.*senior*" in arg
