/**
 * Parse a failing ``Response`` into a human-readable error message.
 *
 * Handles three FastAPI error shapes the wyrdfold-api emits:
 *
 *   1. ``{ detail: "..." }`` — plain string. The default
 *      ``HTTPException(detail=...)`` shape; surface verbatim.
 *
 *   2. ``{ detail: { code: 'llm_budget_exceeded', scope, limit_usd,
 *      spent_usd } }`` — structured budget-cap rejection (429). The
 *      previous error surface threw away the detail because the
 *      handler only checked ``typeof detail === 'string'`` — users
 *      saw a generic "Analysis failed (429)" with no recovery path.
 *      Format both the scope (hourly / daily) and the spend so the
 *      message is actionable.
 *
 *   3. Anything else (HTML, malformed JSON, no body, structured
 *      detail we don't recognize) — return ``fallback`` so the
 *      caller still has *something* to surface. Includes the HTTP
 *      status code in the fallback for debuggability.
 *
 * Reads the body via ``.clone()`` so the caller is free to read the
 * body again afterward (e.g. to extract a structured payload on
 * specific status codes).
 */
export async function extractApiError(
  res: Response,
  fallback: string
): Promise<string> {
  const statusFallback = `${fallback} (${res.status})`;
  let body: unknown;
  try {
    body = await res.clone().json();
  } catch {
    return statusFallback;
  }
  if (!body || typeof body !== 'object') return statusFallback;
  const detail = (body as { detail?: unknown }).detail;

  if (typeof detail === 'string' && detail.trim()) return detail;

  // FastAPI pydantic validation errors arrive as
  // ``detail: [{ loc, msg, type, ... }, ...]``. Surface the first
  // entry's ``msg`` (stripping the ``Value error,`` prefix pydantic
  // adds when our validators raise ``ValueError``) so the user sees
  // "Phone must be E.164" instead of a generic fallback. SettingsPage
  // previously had a copy of this branch in its own
  // ``extractFastApiError``; centralizing here so every PATCH/PUT
  // gets the same treatment.
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: unknown } | undefined;
    if (first && typeof first.msg === 'string' && first.msg.trim()) {
      return first.msg.replace(/^Value error,\s*/, '');
    }
  }

  if (
    detail &&
    typeof detail === 'object' &&
    'code' in detail &&
    (detail as { code: unknown }).code === 'llm_budget_exceeded'
  ) {
    const d = detail as {
      code: string;
      scope?: string;
      limit_usd?: number;
      spent_usd?: number;
    };
    const scope =
      d.scope === 'monthly'
        ? 'monthly'
        : d.scope === 'daily'
          ? 'daily'
          : 'hourly';
    const spent =
      typeof d.spent_usd === 'number' ? `$${d.spent_usd.toFixed(2)}` : null;
    const limit =
      typeof d.limit_usd === 'number' ? `$${d.limit_usd.toFixed(2)}` : null;
    const waitHint =
      scope === 'hourly'
        ? ' — try again in an hour'
        : scope === 'daily'
          ? ' — try again tomorrow'
          : ' — frees up as usage rolls out of the 30-day window';
    const label =
      scope === 'monthly' ? 'Monthly LLM allowance' : `LLM ${scope} budget`;
    if (spent && limit) {
      return `${label} reached (${spent} of ${limit})${waitHint}.`;
    }
    return `${label} reached${waitHint}.`;
  }

  if (
    detail &&
    typeof detail === 'object' &&
    'code' in detail &&
    (detail as { code: unknown }).code === 'llm_disabled'
  ) {
    return 'AI features are currently disabled for your account.';
  }

  if (
    detail &&
    typeof detail === 'object' &&
    'code' in detail &&
    (detail as { code: unknown }).code === 'analysis_daily_limit'
  ) {
    const d = detail as { limit?: number };
    const limit = typeof d.limit === 'number' ? ` (${d.limit}/day)` : '';
    return `Daily deep-analysis limit reached${limit} — more tomorrow. Already-analyzed jobs stay free to revisit.`;
  }

  return statusFallback;
}
