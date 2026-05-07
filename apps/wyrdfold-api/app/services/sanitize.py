import bleach

ALLOWED_TAGS = [
    "p",
    "br",
    "ul",
    "ol",
    "li",
    "strong",
    "em",
    "b",
    "i",
    "u",
    "a",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "blockquote",
    "code",
    "pre",
    "span",
    "div",
]

ALLOWED_ATTRS = {
    "a": ["href", "title", "rel"],
    "span": [],
    "div": [],
}

ALLOWED_PROTOCOLS = ["http", "https", "mailto"]


def sanitize_html(raw: str) -> str:
    if not raw:
        return ""
    cleaned: str = bleach.clean(
        raw,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRS,
        protocols=ALLOWED_PROTOCOLS,
        strip=True,
    )
    return cleaned
