"""cost_log: RPC-first spend queries with Python fallback, plus enqueue."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any
from unittest.mock import MagicMock

import pytest

from app.models.llm import LLMResult, LLMUsage
from app.services.llm import cost_log
from app.services.llm.cost_log_buffer import buffer


class _Resp:
    def __init__(self, data: Any) -> None:
        self.data = data


def _llm_result(cost: float = 0.01) -> LLMResult:
    return LLMResult(
        content="ok",
        model="claude-haiku-4-5",
        usage=LLMUsage(
            input_tokens=10,
            output_tokens=5,
            cache_read_input_tokens=0,
            cache_creation_input_tokens=0,
        ),
        cost_usd=cost,
        latency_ms=42,
    )


# ---- total_spend RPC path -------------------------------------------------


def test_total_spend_uses_rpc_when_available() -> None:
    sb = MagicMock()
    sb.rpc.return_value.execute.return_value = _Resp(0.42)

    result = cost_log.total_spend(sb, user_id="u1", since=datetime.now(UTC))

    assert result == 0.42
    args, kwargs = sb.rpc.call_args
    assert args[0] == "total_spend_since"
    assert args[1]["p_user_id"] == "u1"
    # The supabase select-table API should NOT be touched.
    sb.table.assert_not_called()


def test_total_spend_treats_none_user_id_as_null_partition() -> None:
    sb = MagicMock()
    sb.rpc.return_value.execute.return_value = _Resp(1.5)

    cost_log.total_spend(sb, user_id=None, since=None)

    args, _ = sb.rpc.call_args
    assert args[1]["p_user_id"] is None
    assert args[1]["p_since"] is None


def test_total_spend_zero_when_rpc_returns_none() -> None:
    sb = MagicMock()
    sb.rpc.return_value.execute.return_value = _Resp(None)

    assert cost_log.total_spend(sb, user_id="u1") == 0.0


def test_total_spend_falls_back_to_python_when_rpc_unavailable() -> None:
    sb = MagicMock()
    sb.rpc.side_effect = Exception("function does not exist")

    # Fallback path: select cost_usd, sum in Python.
    sel = sb.table.return_value.select.return_value
    sel.eq.return_value.gte.return_value.execute.return_value = _Resp(
        [{"cost_usd": 0.10}, {"cost_usd": 0.25}, {"cost_usd": 0.05}]
    )
    sel.is_.return_value.gte.return_value.execute.return_value = _Resp([])

    result = cost_log.total_spend(
        sb, user_id="u1", since=datetime.now(UTC) - timedelta(hours=1)
    )
    assert result == pytest.approx(0.40)


def test_total_spend_rounds_to_six_decimals() -> None:
    sb = MagicMock()
    sb.rpc.return_value.execute.return_value = _Resp("0.0000004999")
    assert cost_log.total_spend(sb, user_id="u1") == pytest.approx(0.0)


# ---- spend_by_purpose RPC path --------------------------------------------


def test_spend_by_purpose_uses_rpc_when_available() -> None:
    sb = MagicMock()
    sb.rpc.return_value.execute.return_value = _Resp(
        {"job_analysis": "1.25", "tailor": "0.50"}
    )

    result = cost_log.spend_by_purpose(sb, user_id="u1")

    assert result == {"job_analysis": pytest.approx(1.25), "tailor": pytest.approx(0.50)}
    args, _ = sb.rpc.call_args
    assert args[0] == "spend_by_purpose_since"


def test_spend_by_purpose_empty_when_rpc_returns_empty_object() -> None:
    sb = MagicMock()
    sb.rpc.return_value.execute.return_value = _Resp({})
    assert cost_log.spend_by_purpose(sb, user_id="u1") == {}


def test_spend_by_purpose_falls_back_when_rpc_unavailable() -> None:
    sb = MagicMock()
    sb.rpc.side_effect = Exception("not deployed")

    sel = sb.table.return_value.select.return_value
    sel.eq.return_value.execute.return_value = _Resp(
        [
            {"purpose": "job_analysis", "cost_usd": 0.10},
            {"purpose": "job_analysis", "cost_usd": 0.20},
            {"purpose": "tailor", "cost_usd": 0.05},
        ]
    )
    sel.is_.return_value.execute.return_value = _Resp([])

    result = cost_log.spend_by_purpose(sb, user_id="u1")
    assert result == {"job_analysis": pytest.approx(0.30), "tailor": pytest.approx(0.05)}


# ---- enqueue helper --------------------------------------------------------


def test_enqueue_adds_one_row_to_module_buffer() -> None:
    # Drain anything left from prior tests.
    buffer._drain()
    cost_log.enqueue(
        user_id="u1", purpose="poll_scoring", result=_llm_result(cost=0.07)
    )

    drained = buffer._drain()
    assert len(drained) == 1
    row = drained[0]
    assert row["user_id"] == "u1"
    assert row["purpose"] == "poll_scoring"
    assert row["model"] == "claude-haiku-4-5"
    assert row["cost_usd"] == 0.07
    assert row["input_tokens"] == 10
    assert row["output_tokens"] == 5


def test_enqueue_carries_metadata_when_provided() -> None:
    buffer._drain()
    cost_log.enqueue(
        user_id=None,
        purpose="poll_scoring",
        result=_llm_result(),
        metadata={"job_id": "abc", "target_id": "xyz"},
    )
    drained = buffer._drain()
    assert drained[0]["metadata"] == {"job_id": "abc", "target_id": "xyz"}
    assert drained[0]["user_id"] is None
