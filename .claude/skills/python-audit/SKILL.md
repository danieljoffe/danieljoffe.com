---
name: python-audit
description: Audit Python/FastAPI services for security, performance, correctness, and best practices
disable-model-invocation: true
---

# Python / FastAPI Audit

Audit the Python FastAPI service (audit-api) against current documentation and project conventions, producing actionable findings and direct code fixes.

## Scope

By default, audit `apps/audit-api`.

## Token Budget Rules

- Route ALL file reads and command outputs through `ctx_batch_execute` or `ctx_execute`
- Batch context7 `query-docs` calls — resolve all libraries first, then query in 2-3 batched calls
- If context7 docs for the same libraries were already fetched in this session, skip Phase 1

## Instructions

### Phase 1: Fetch Current Documentation

Use the context7 MCP server (`resolve-library-id` then `query-docs`) to fetch documentation for each audit area. Every finding MUST cite a specific doc section or PEP. Do not rely on memorized knowledge — the docs are the source of truth.

Resolve and query these libraries (batch into 3-4 calls):

1. **FastAPI** — app lifecycle, dependency injection, middleware, exception handlers, response models, security utilities, background tasks, OpenAPI customization
2. **Pydantic** (v2) — BaseSettings, Field validators, model_config, discriminated unions, strict mode
3. **Ruff** — available rule sets (B, S, SIM, RUF, PTH, ASYNC, etc.), configuration options, per-file ignores

Also read the project conventions file for Python-specific patterns:

- `.claude/rules/python.md` — stack requirements, code patterns, testing conventions

### Phase 2: Inspect the Projects

For each Python project in scope, read and index:

- `pyproject.toml` — dependencies, tool config (ruff, mypy, pytest)
- `app/main.py` — app setup, middleware stack, lifespan, router registration
- `app/config.py` — settings class, secret fields, validators
- `app/dependencies.py` — DI providers, auth functions
- `app/routers/*.py` — all endpoint modules
- `app/services/*.py` — business logic (scan for blocking calls, error handling)
- `app/models/*.py` — Pydantic schemas
- `tests/conftest.py` — fixtures, env overrides
- `Dockerfile` — build stages, security posture

Use context-mode `ctx_batch_execute` to run:

```bash
# Dependency versions and known issues
cd apps/<project> && uv run --package <project> pip list --format=json

# Type ignore count
grep -r "type: ignore" apps/<project>/app/ --include="*.py" -c

# Bare except count
grep -rn "except:" apps/<project>/app/ --include="*.py"

# TODO/FIXME/HACK count
grep -rn "TODO\|FIXME\|HACK" apps/<project>/app/ --include="*.py"
```

### Phase 3: Audit Areas

For each area below, read the relevant source files, compare against fetched docs and project conventions, and report findings.

#### 3.1 Configuration & Settings

Files: `app/config.py`

Check against docs:

- Secret fields (API keys, tokens, passwords) missing `repr=False` to prevent leaking in logs/tracebacks
- Settings fields with dangerous defaults (e.g., `allowed_hosts: str = "*"`, `debug: bool = True`)
- Missing `Field()` constraints on bounded values (ports, timeouts, thresholds, limits) — should have `ge=`, `le=`, `min_length=`, etc.
- Missing `@field_validator` for fields requiring format validation (URLs, phone numbers, email patterns)
- Inconsistent env var naming between projects (prefix conventions, casing)
- Settings not using `model_config = SettingsConfigDict(env_file=".env")` pattern from pydantic-settings

#### 3.2 API Design & OpenAPI

Files: `app/routers/*.py`, `app/models/*.py`

Check against docs:

- Endpoints missing `response_model` parameter (responses aren't schema-validated)
- Endpoints missing explicit `status_code` (relies on implicit 200)
- Missing or inconsistent `tags` on routers (affects OpenAPI grouping)
- POST/PUT/PATCH endpoints not returning the created/updated resource
- Missing `responses` parameter for documented error codes (4xx, 5xx)
- Pydantic models using `dict` return instead of proper response models
- Endpoints accepting `dict[str, Any]` instead of typed Pydantic models
- Query/path parameters missing `Field()` descriptions for OpenAPI docs
- Inconsistent naming: snake_case vs camelCase in request/response fields

#### 3.3 Authentication & Security

Files: `app/dependencies.py`, `app/main.py`, `app/config.py`, `app/routers/*.py`

Check against docs:

- Endpoints missing auth dependency (`Depends(verify_api_key)` or `Depends(verify_api_key_or_session)`)
- JWT validation gaps: missing `iss` check, missing `aud` check, algorithm not pinned
- API key comparison not using timing-safe comparison (`hmac.compare_digest`)
- CORS middleware missing or overly permissive (`allow_origins=["*"]` in production)
- Missing rate limiting on auth endpoints or expensive operations
- Secrets with fallback defaults that could accidentally work in production
- Raw SQL or string interpolation in Supabase queries (injection risk)
- File upload endpoints missing size limits or type validation
- Missing `Content-Security-Policy`, `X-Content-Type-Options`, or other security headers
- Session tokens or API keys logged at INFO level or above

#### 3.4 Dependency Injection

Files: `app/dependencies.py`, `app/routers/*.py`, `app/services/*.py`

Check against docs:

- Module-level mutable state (global variables, singletons) that should be DI-managed
- Services instantiated directly in handlers instead of via `Depends()`
- Missing `Depends(get_settings)` — settings accessed via direct import instead of injection
- Database client accessed outside DI (not via `Depends(get_supabase)`)
- Heavy initialization in dependency functions without caching (missing `@lru_cache` or equivalent)
- Circular dependency chains between DI providers

#### 3.5 Error Handling

Files: `app/main.py`, `app/routers/*.py`, `app/services/*.py`

Check against docs:

- Bare `except:` or `except Exception:` that swallows errors silently
- Missing `app.exception_handler()` registration for custom exceptions
- Inconsistent error response shape (some return `{"detail": ...}`, others return `{"error": ...}`)
- HTTP exceptions with wrong status codes (e.g., 400 for auth failures instead of 401)
- Missing logging in exception handlers (errors swallowed without trace)
- Service functions that catch and re-raise as generic exceptions, losing context
- `raise HTTPException` inside service layer (should raise domain exceptions, let router translate)

#### 3.6 Async Patterns & Performance

Files: `app/services/*.py`, `app/routers/*.py`

Check against docs:

- Blocking calls (file I/O, CPU-heavy, synchronous HTTP) in async handlers without `asyncio.to_thread()`
- Sequential awaits that could be parallelized with `asyncio.gather()`
- Missing connection pool limits or timeouts on HTTP clients (httpx)
- Database queries fetching all rows when only a count or subset is needed (`limit=1_000_000` anti-pattern)
- Missing timeout parameters on external API calls
- Background tasks that should use FastAPI's `BackgroundTasks` instead of fire-and-forget
- Connection/client objects created per-request instead of reused (e.g., Supabase client, Twilio client)

#### 3.7 Testing

Files: `tests/*.py`, `tests/conftest.py`, `pyproject.toml` (`[tool.pytest]`)

Check against docs:

- Test files missing for routers or services that have been added/modified
- Missing `pytest-cov` in dev dependencies (no coverage measurement)
- Tests using real external services instead of mocks (API calls, database writes)
- Missing async test patterns (tests that should be async but aren't)
- Fixtures with broad scope (`session`/`module`) that should be `function`-scoped for isolation
- Test assertions that only check happy path — missing error/edge case tests
- Mocks that patch at the wrong level (patching the import site, not the definition site)
- Missing `conftest.py` env overrides that could leak real credentials in CI

#### 3.8 Linting & Type Safety

Files: `pyproject.toml` (`[tool.ruff]`, `[tool.mypy]`), `app/**/*.py`

Check against docs:

- Ruff rule sets: current selection (`E, F, I, N, W, UP`) is narrow. Evaluate adding:
  - `B` (flake8-bugbear) — common bug patterns
  - `S` (flake8-bandit) — basic security checks
  - `SIM` (flake8-simplify) — code simplification
  - `RUF` (Ruff-specific) — Ruff's own rules
  - `PTH` (flake8-use-pathlib) — Path over os.path
  - `ASYNC` — async anti-patterns
  - `T20` (flake8-print) — stray print() statements
- Ruff `target-version` not matching actual Python version in `requires-python`
- Mypy `strict = true` verified — but check for excessive `type: ignore` comments (>5 per file is a smell)
- Missing `warn_unreachable = true` in mypy config
- Missing `disallow_any_generics = true` overrides
- Inconsistent ruff/mypy config between the two Python projects

#### 3.9 Docker & Deployment

Files: `Dockerfile`, `app/main.py` (health endpoints)

Check against docs:

- Missing `HEALTHCHECK` directive in Dockerfile
- Running as root (missing `USER` directive or non-root user setup)
- Secrets passed as `ARG` or `ENV` in Dockerfile (should use runtime env vars or secret mounts)
- Unnecessary files copied into image (missing `.dockerignore` or overly broad `COPY`)
- `uv sync` not using `--frozen` (non-deterministic builds)
- Missing `--no-dev` flag (dev dependencies in production image)
- Large base image when slim alternative exists
- Health endpoint not checking downstream dependencies (DB connectivity, etc.)
- Missing `--proxy-headers` or `--forwarded-allow-ips` for reverse proxy deployments

#### 3.10 Dependencies

Files: `pyproject.toml`, `uv.lock`

Check:

- Dependencies with overly broad version ranges (e.g., `>=1.0` with no upper bound on a fast-moving library)
- Dev dependencies mixed into production dependencies
- Unused dependencies (imported in pyproject.toml but not used in code)
- Missing `.python-version` file at workspace root for consistent Python version across environments
- `uv.lock` not committed (non-reproducible builds)
- Known vulnerability patterns: check if `pip-audit` or `safety` is available and run it

### Phase 4: Cross-Reference & Apply Fixes

1. Cross-reference findings with context7 documentation to confirm they are genuine violations, not acceptable patterns. Drop findings that the docs show are valid alternatives.

2. For findings rated HIGH or with a clear, safe fix:
   - Use the Edit tool to apply the fix directly
   - Do NOT add comments that just restate what the code does

3. For findings that require design decisions or have trade-offs:
   - Report as recommendations without editing

## Output Format

Present findings grouped by audit area. For each finding:

```
### [AREA] Finding Title

**Severity**: HIGH | MEDIUM | LOW
**File**: path/to/file.py:line
**Doc Reference**: [specific doc section or PEP]
**Status**: FIXED | RECOMMENDATION

**Issue**: What violates the documented best practice or project convention.

**Fix** (if applied): Brief description of the change made.

**Recommendation** (if not applied): What to do and why, with a code example.
```

After all findings, include a summary table:

| Area | HIGH | MEDIUM | LOW | Fixed |
| ---- | ---- | ------ | --- | ----- |
| ...  | ...  | ...    | ... | ...   |

If no issues are found in a category, state that explicitly.

End with "Next Steps" listing recommended follow-up actions in priority order.
