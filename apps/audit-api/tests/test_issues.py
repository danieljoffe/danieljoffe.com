from app.services.issues import parse_issues


def _lh_audit(score: float, display_value: str = "", numeric_value: float = 0) -> dict:
    return {
        "score": score,
        "displayValue": display_value,
        "numericValue": numeric_value,
    }


def test_parse_ignores_audits_with_high_score() -> None:
    lighthouse = {
        "audits": {
            "largest-contentful-paint": _lh_audit(score=0.95),
            "color-contrast": _lh_audit(score=1.0),
        }
    }
    assert parse_issues(lighthouse, {}) == []


def test_parse_ignores_audits_with_null_score() -> None:
    lighthouse = {"audits": {"largest-contentful-paint": _lh_audit(score=None)}}  # type: ignore[arg-type]
    assert parse_issues(lighthouse, {}) == []


def test_parse_lighthouse_issue_interpolates_display_value() -> None:
    lighthouse = {
        "audits": {
            "largest-contentful-paint": _lh_audit(
                score=0.3, display_value="4.2 s", numeric_value=4200
            )
        }
    }
    issues = parse_issues(lighthouse, {})
    assert len(issues) == 1
    assert "4.2 s" in issues[0].description
    assert issues[0].category == "performance"
    assert issues[0].severity == "critical"
    assert issues[0].technical_detail["auditId"] == "largest-contentful-paint"


def test_parse_axe_violation_severity_mapping() -> None:
    axe = {
        "violations": [
            {
                "id": "color-contrast-blue",
                "impact": "critical",
                "help": "Elements must have sufficient color contrast",
                "description": "Fix color contrast",
                "nodes": [{"html": "<p>"}, {"html": "<a>"}],
                "helpUrl": "https://example.com",
            }
        ]
    }
    issues = parse_issues({}, axe)
    assert len(issues) == 1
    assert issues[0].severity == "critical"
    assert issues[0].category == "accessibility"
    assert "Found 2 instances" in issues[0].description


def test_parse_keeps_axe_violation_when_not_deduped() -> None:
    # Real-world case: Lighthouse color-contrast title doesn't contain the
    # spaced violation id, so axe violation is preserved.
    lighthouse = {
        "audits": {
            "color-contrast": _lh_audit(score=0.3, display_value="5"),
        }
    }
    axe = {
        "violations": [
            {
                "id": "color-contrast",
                "impact": "serious",
                "help": "Elements must have sufficient contrast",
                "description": "Fix color contrast",
                "nodes": [{}],
                "helpUrl": "",
            }
        ]
    }
    issues = parse_issues(lighthouse, axe)
    assert len(issues) == 2


def test_parse_sorts_critical_before_warning_before_info() -> None:
    lighthouse = {
        "audits": {
            # warning
            "cumulative-layout-shift": _lh_audit(score=0.3, display_value="0.3"),
            # info
            "unminified-css": _lh_audit(score=0.3, display_value="10 KB"),
            # critical
            "largest-contentful-paint": _lh_audit(score=0.3, display_value="5 s"),
        }
    }
    issues = parse_issues(lighthouse, {})
    severities = [i.severity for i in issues]
    assert severities == ["critical", "warning", "info"]


def test_parse_singular_instance_label_for_one_violation_node() -> None:
    axe = {
        "violations": [
            {
                "id": "button-name",
                "impact": "serious",
                "help": "buttons need accessible names",
                "description": "missing name",
                "nodes": [{}],
                "helpUrl": "",
            }
        ]
    }
    issues = parse_issues({}, axe)
    assert "Found 1 instance on" in issues[0].description
