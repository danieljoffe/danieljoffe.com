/**
 * Defensive fallback for the "No contact name on file" 400 from the
 * tailor pipeline. PR #703 added an Identity step to onboarding that
 * captures name up front, so the typical post-#703 user never hits
 * this gate — but this still fires for:
 *
 *   - users who onboarded before #703 shipped
 *   - users who clicked "Skip for now" on the onboarding Identity
 *     step (skip = exit to /targets, not "save without name")
 *   - users who cleared their name in Settings → Profile
 *
 * Wired into ``ResumeSection``, ``CoverLetterSection``, and
 * ``JobsList`` batch generate. Prompts the user inline (native
 * ``window.prompt`` for minimum-friction), PATCHes
 * ``/api/profile/identity``, and returns whether the caller should
 * retry. Without the inline capture the user would have to
 * context-switch to Settings, copy the Greenhouse JD URL, and start
 * over.
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
