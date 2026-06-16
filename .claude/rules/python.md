---
paths:
  - 'apps/audit-api/**'
  - '**/pyproject.toml'
  - '**/conftest.py'
---

# Python / FastAPI Conventions

## Stack

- Python 3.11+, FastAPI 0.115+, Pydantic 2.7+ (pydantic-settings)
- Supabase SDK (no SQLAlchemy) — database via REST API
- pytest 8.3 + pytest-asyncio 0.25 (`asyncio_mode = "auto"`)
- Ruff for linting and formatting (line-length 100)
- Mypy strict mode

## Patterns

- **Async-first**: All handlers and I/O are async
- **Lifespan**: Use `@asynccontextmanager async def lifespan(app)` for startup/shutdown — not deprecated `on_startup`/`on_shutdown`
- **Routers**: `APIRouter(prefix="/route", tags=["tag"])` with `response_model` on endpoints
- **Dependencies**: `Depends(get_settings)` for config, `Depends(get_supabase)` for DB, `Depends(verify_api_key)` for auth
- **Settings**: pydantic-settings `BaseSettings` in `app/config.py`, injected via `Depends`
- **Validation**: Pydantic v2 `Field(min_length=..., ge=...)` and `@field_validator` — not v1 `@validator`
- **Type hints**: Use `X | None` union syntax, not `Optional[X]`

## Testing

- Tests in `tests/` with `conftest.py` for env var overrides and fixtures
- File naming: `test_<feature>.py` (e.g., `test_health.py`, `test_gap_tracker.py`)
- Async tests: `async def test_*()` — pytest-asyncio handles the event loop
- Mocks: `MagicMock` / `AsyncMock` for HTTP clients and external services
- Run via: `pnpm nx test audit-api`

## Project Structure

```
app/
├── main.py          # FastAPI app, lifespan, middleware, router registration
├── config.py        # pydantic-settings BaseSettings
├── dependencies.py  # Depends() providers (DB, auth, settings)
├── routers/         # APIRouter modules
├── services/        # Business logic
├── models/          # Pydantic schemas (request/response)
tests/
├── conftest.py      # Fixtures, env overrides
└── test_*.py        # Test files
```
