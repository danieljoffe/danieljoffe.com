from app.services.sanitize import sanitize_html


def test_strips_script_tag():
    # bleach with strip=True removes the <script> element tags but keeps text content.
    # The important guarantee is that no executable <script> remains.
    out = sanitize_html("<script>alert(1)</script>")
    assert "<script" not in out
    assert "</script>" not in out


def test_preserves_paragraph_tag():
    assert sanitize_html("<p>hello</p>") == "<p>hello</p>"


def test_empty_string_returns_empty():
    assert sanitize_html("") == ""


def test_allowed_anchor_attrs_preserved():
    raw = '<a href="https://example.com" title="t" rel="noopener">link</a>'
    out = sanitize_html(raw)
    assert 'href="https://example.com"' in out
    assert 'title="t"' in out
    assert 'rel="noopener"' in out


def test_onclick_stripped_from_anchor():
    raw = '<a href="https://example.com" onclick="alert(1)">link</a>'
    out = sanitize_html(raw)
    assert "onclick" not in out
    assert 'href="https://example.com"' in out


def test_javascript_scheme_stripped():
    raw = '<a href="javascript:alert(1)">x</a>'
    out = sanitize_html(raw)
    assert "javascript:" not in out
