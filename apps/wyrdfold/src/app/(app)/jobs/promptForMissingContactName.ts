/**
 * Shared between ``ResumeSection`` and ``CoverLetterSection``: when the
 * backend rejects a tailor request with the "No contact name on file"
 * 400, prompt the user inline (native ``window.prompt`` for
 * minimum-friction), PATCH ``/api/profile/identity``, and return whether
 * the caller should retry. The onboarding wizard doesn't capture this
 * field today (Supabase magic-link auth has no name), and the tailor
 * pipeline requires it to render the resume header — so a fresh user
 * always hits this gate on their first Generate click. Without the
 * inline capture they have to context-switch to Settings, copy the
 * Greenhouse JD URL, and start over.
 *
 * Caller pattern:
 *
 *     if (await promptForMissingContactName(detail)) {
 *       // user filled in the name — try the same request again
 *       return retry();
 *     }
 *
 * Returns ``false`` if the detail doesn't match this specific failure
 * (so the caller can fall through to its generic error toast), or if
 * the user cancelled the prompt. ``true`` only when the PATCH
 * succeeded and the caller should re-issue the original request.
 */
export async function promptForMissingContactName(
  detail: string | undefined
): Promise<boolean> {
  if (!detail || !/no contact name on file/i.test(detail)) return false;
  // eslint-disable-next-line no-alert -- personal tool, native prompt matches the codebase
  const name = window.prompt(
    'What name should appear on your resume / cover letter?'
  );
  const trimmed = name?.trim() ?? '';
  if (!trimmed) return false;
  const res = await fetch('/api/profile/identity', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: trimmed }),
  });
  return res.ok;
}
