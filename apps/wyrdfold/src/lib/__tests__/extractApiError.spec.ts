import { extractApiError } from '../extractApiError';

// jsdom has no fetch Response global; extractApiError only touches
// `.status` and `.clone().json()`, so a minimal fake suffices.
function res429(detail: unknown): Response {
  const fake = {
    status: 429,
    clone() {
      return { json: async () => ({ detail }) };
    },
  };
  return fake as unknown as Response;
}

describe('extractApiError — cost-cap shapes', () => {
  it('formats the monthly allowance breach with the rolling-window hint', async () => {
    const msg = await extractApiError(
      res429({
        code: 'llm_budget_exceeded',
        scope: 'monthly',
        limit_usd: 5,
        spent_usd: 5.12,
      }),
      'Request failed'
    );
    expect(msg).toBe(
      'Monthly LLM allowance reached ($5.12 of $5.00) — frees up as usage rolls out of the 30-day window.'
    );
  });

  it('keeps the hourly wording unchanged', async () => {
    const msg = await extractApiError(
      res429({
        code: 'llm_budget_exceeded',
        scope: 'hourly',
        limit_usd: 1,
        spent_usd: 1.01,
      }),
      'Request failed'
    );
    expect(msg).toBe(
      'LLM hourly budget reached ($1.01 of $1.00) — try again in an hour.'
    );
  });

  it('formats the analysis daily-count limit with the cached-revisit hint', async () => {
    const msg = await extractApiError(
      res429({ code: 'analysis_daily_limit', limit: 20, used: 20 }),
      'Analysis failed'
    );
    expect(msg).toBe(
      'Daily deep-analysis limit reached (20/day) — more tomorrow. Already-analyzed jobs stay free to revisit.'
    );
  });

  it('falls back with status code on unknown structured detail', async () => {
    const msg = await extractApiError(
      res429({ code: 'something_else' }),
      'Request failed'
    );
    expect(msg).toBe('Request failed (429)');
  });
});
