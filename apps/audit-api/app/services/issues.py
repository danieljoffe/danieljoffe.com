from dataclasses import dataclass
from typing import Any

from app.services.issue_mappings import (
    LIGHTHOUSE_ISSUE_MAPPINGS,
    Category,
    FixDifficulty,
    Severity,
)

_SEVERITY_ORDER: dict[Severity, int] = {"critical": 0, "warning": 1, "info": 2}
_CATEGORY_ORDER: dict[Category, int] = {
    "performance": 0,
    "accessibility": 1,
    "seo": 2,
    "ux": 3,
}


@dataclass(frozen=True)
class ParsedIssue:
    category: Category
    severity: Severity
    title: str
    description: str
    impact: str
    fix_difficulty: FixDifficulty
    technical_detail: dict[str, Any]


def parse_issues(
    lighthouse_result: dict[str, Any], axe_result: dict[str, Any]
) -> list[ParsedIssue]:
    issues: list[ParsedIssue] = []

    audits = lighthouse_result.get("audits") or {}
    for audit_id, mapping in LIGHTHOUSE_ISSUE_MAPPINGS.items():
        audit = audits.get(audit_id)
        if not audit:
            continue

        score = audit.get("score")
        if score is None or score >= 0.9:
            continue

        display_value = audit.get("displayValue") or ""
        numeric_value = audit.get("numericValue") or 0

        description = mapping.description_template.replace("{value}", str(display_value))

        issues.append(
            ParsedIssue(
                category=mapping.category,
                severity=mapping.severity,
                title=mapping.title,
                description=description,
                impact=mapping.impact_template,
                fix_difficulty=mapping.fix_difficulty,
                technical_detail={
                    "auditId": audit_id,
                    "score": score,
                    "displayValue": display_value,
                    "numericValue": numeric_value,
                },
            )
        )

    violations = axe_result.get("violations") or []
    for violation in violations:
        violation_id = violation.get("id", "")
        spaced = violation_id.replace("-", " ").lower()
        already_captured = any(spaced in i.title.lower() for i in issues)
        if already_captured:
            continue

        nodes = violation.get("nodes") or []
        node_count = len(nodes)
        impact = violation.get("impact", "")

        if impact in ("critical", "serious"):
            severity: Severity = "critical"
        elif impact == "moderate":
            severity = "warning"
        else:
            severity = "info"

        plural = "s" if node_count != 1 else ""
        description = (
            f"{violation.get('description', '')}. "
            f"Found {node_count} instance{plural} on this page."
        )

        issues.append(
            ParsedIssue(
                category="accessibility",
                severity=severity,
                title=violation.get("help") or violation_id,
                description=description,
                impact=(
                    "Fixing this improves usability for people using assistive "
                    "technology and may improve your search ranking."
                ),
                fix_difficulty="easy",
                technical_detail={
                    "axeRuleId": violation_id,
                    "impact": impact,
                    "nodeCount": node_count,
                    "helpUrl": violation.get("helpUrl", ""),
                },
            )
        )

    issues.sort(
        key=lambda i: (_SEVERITY_ORDER[i.severity], _CATEGORY_ORDER[i.category])
    )
    return issues
