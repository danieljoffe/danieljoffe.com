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
    const scope = d.scope === 'daily' ? 'daily' : 'hourly';
    const spent =
      typeof d.spent_usd === 'number' ? `$${d.spent_usd.toFixed(2)}` : null;
    const limit =
      typeof d.limit_usd === 'number' ? `$${d.limit_usd.toFixed(2)}` : null;
    const waitHint =
      scope === 'hourly' ? ' — try again in an hour' : ' — try again tomorrow';
    if (spent && limit) {
      return `LLM ${scope} budget reached (${spent} of ${limit})${waitHint}.`;
    }
    return `LLM ${scope} budget reached${waitHint}.`;
  }

  return statusFallback;
}
