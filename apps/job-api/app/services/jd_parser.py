"""Parse job description HTML into weighted sections.

Used by stage 2 of the scoring pipeline to weight keyword matches
by where they appear in the JD. Keywords in "Requirements" are more
significant than those in "About Us" or "Benefits".

Section weights:
  requirements  2.0  — "Requirements", "Qualifications", "What you'll need", "Must have"
  nice_to_have  1.0  — "Nice to have", "Preferred", "Bonus", "Plus"
  about         0.5  — "About", "Who we are", "Our team", "Company"
  benefits      0.3  — "Benefits", "Perks", "Compensation", "What we offer"
  default       1.0  — Everything else (responsibilities, unclassified text)
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from bs4 import BeautifulSoup, Tag
from bs4.element import NavigableString

# ---- Section classification ------------------------------------------------

_SECTION_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    # nice_to_have checked first — "Preferred Qualifications" should be
    # nice-to-have, not requirements (even though "qualification" appears).
    (
        "nice_to_have",
        re.compile(
            r"(nice.to.have|preferred|bonus|plus|desirable|ideally|additional)",
            re.IGNORECASE,
        ),
    ),
    (
        "requirements",
        re.compile(
            r"(requirement|qualification|what you.ll need|must.have|skills?\s*(required|needed)"
            r"|minimum|essential|you.ll bring|what we.re looking|technical skills"
            r"|what you.ll bring|core competenc)",
            re.IGNORECASE,
        ),
    ),
    (
        "about",
        re.compile(
            r"(about\s+(us|the\s+company|the\s+team|the\s+role)|who we are"
            r"|our (team|company|mission|story)|company\s+description)",
            re.IGNORECASE,
        ),
    ),
    (
        "benefits",
        re.compile(
            r"(benefit|perk|compensation|what we offer|why\s+(join|work)|salary"
            r"|equity|pto|vacation|insurance|401k|remote)",
            re.IGNORECASE,
        ),
    ),
]

SECTION_WEIGHTS: dict[str, float] = {
    "requirements": 2.0,
    "nice_to_have": 1.0,
    "about": 0.5,
    "benefits": 0.3,
    "default": 1.0,
}


def classify_heading(text: str) -> str:
    """Classify a heading into a section type based on pattern matching."""
    for section_name, pattern in _SECTION_PATTERNS:
        if pattern.search(text):
            return section_name
    return "default"


# ---- Data structures -------------------------------------------------------


@dataclass
class JDSection:
    """A classified section of a job description."""

    name: str
    weight: float
    text: str
    text_lower: str = ""


@dataclass
class ParsedJD:
    """A parsed job description with weighted sections."""

    sections: list[JDSection] = field(default_factory=list)

    def all_text(self) -> str:
        """Return all section text concatenated (for fallback)."""
        return " ".join(s.text for s in self.sections)


# ---- Parser ----------------------------------------------------------------


def _get_text(element: Tag | NavigableString) -> str:
    """Extract text from a BeautifulSoup element."""
    if isinstance(element, NavigableString):
        return str(element).strip()
    return element.get_text(separator=" ").strip()


def _is_heading(tag: Tag) -> bool:
    """Check if a tag is a heading (h1-h6) or a strong/b tag that acts as a heading."""
    if tag.name in ("h1", "h2", "h3", "h4", "h5", "h6"):
        return True
    # Bold text that is the only child of a paragraph often acts as a section heading
    if tag.name in ("strong", "b") and tag.parent and tag.parent.name == "p":
        parent_text = tag.parent.get_text(separator=" ").strip()
        tag_text = tag.get_text(separator=" ").strip()
        # The bold text IS the paragraph (no other significant text)
        if len(tag_text) > 5 and len(parent_text) - len(tag_text) < 10:
            return True
    return False


def parse_jd(html: str) -> ParsedJD:
    """Parse job description HTML into weighted sections.

    Walks the DOM looking for headings. Text between headings is grouped
    into a section classified by the preceding heading. If no headings
    are found, all text is placed in a single "default" section.
    """
    if not html or not html.strip():
        return ParsedJD()

    soup = BeautifulSoup(html, "html.parser")

    # Collect all top-level elements
    sections: list[JDSection] = []
    current_name = "default"
    current_weight = SECTION_WEIGHTS["default"]
    current_texts: list[str] = []

    def _flush() -> None:
        text = " ".join(current_texts).strip()
        if text:
            sections.append(
                JDSection(
                    name=current_name,
                    weight=current_weight,
                    text=text,
                    text_lower=text.lower(),
                )
            )

    for element in soup.descendants:
        if isinstance(element, NavigableString):
            continue
        if not isinstance(element, Tag):
            continue

        if _is_heading(element):
            _flush()
            heading_text = element.get_text(separator=" ").strip()
            current_name = classify_heading(heading_text)
            current_weight = SECTION_WEIGHTS[current_name]
            current_texts = []
        elif element.name in ("p", "li"):
            text = element.get_text(separator=" ").strip()
            if text:
                current_texts.append(text)

    _flush()

    # Fallback: if no sections were created (no headings, or all empty),
    # treat the entire text as a single default section
    if not sections:
        full_text = soup.get_text(separator=" ").strip()
        if full_text:
            sections.append(
                JDSection(
                    name="default",
                    weight=SECTION_WEIGHTS["default"],
                    text=full_text,
                    text_lower=full_text.lower(),
                )
            )

    return ParsedJD(sections=sections)
