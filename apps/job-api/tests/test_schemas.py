import pytest
from pydantic import ValidationError

from app.models.schemas import SourceAction, StatusUpdate


def test_source_action_add_valid():
    sa = SourceAction(action="add", board_token="foo", company_name="Foo")
    assert sa.action == "add"
    assert sa.board_token == "foo"
    assert sa.company_name == "Foo"


def test_source_action_invalid_action():
    with pytest.raises(ValidationError):
        SourceAction(action="invalid", board_token="foo", company_name="Foo")  # type: ignore[arg-type]


def test_source_action_bad_token_path_traversal():
    with pytest.raises(ValidationError):
        SourceAction(action="add", board_token="../etc/passwd", company_name="Foo")


def test_source_action_token_too_long():
    with pytest.raises(ValidationError):
        SourceAction(action="add", board_token="a" * 260, company_name="Foo")


def test_status_update_new_valid():
    su = StatusUpdate(status="new")
    assert su.status == "new"
    assert su.note is None


def test_status_update_bogus_status():
    with pytest.raises(ValidationError):
        StatusUpdate(status="bogus")  # type: ignore[arg-type]


def test_status_update_note_too_long():
    with pytest.raises(ValidationError):
        StatusUpdate(status="new", note="x" * 1001)
