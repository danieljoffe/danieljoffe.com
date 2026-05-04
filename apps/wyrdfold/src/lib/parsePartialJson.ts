/**
 * Best-effort partial-JSON parser for streaming LLM responses.
 *
 * Anthropic emits JSON one chunk at a time. After each chunk we'd like to
 * render whatever fields have completed so far — but the buffer is almost
 * never valid JSON mid-stream (open string, dangling key, half-typed array
 * element, etc). This walker patches up the common cases so the buffer
 * parses to "the longest valid prefix":
 *
 *   1. Close any open string (drop a trailing dangling `\` first).
 *   2. Trim trailing whitespace + comma (dangling field separator).
 *   3. If the buffer ends with `:` (key without value), append `null`.
 *   4. Close any open `{` / `[` in stack order.
 *
 * If that still fails (typically because we're mid-key, e.g. `{"rol`),
 * fall back to slicing off everything after the last top-level comma and
 * trying again. Returns `null` when no usable prefix can be recovered;
 * callers should hold their previously-parsed state until the next chunk.
 */
export function parsePartialJson<T = unknown>(buffer: string): T | null {
  if (!buffer) return null;

  try {
    return JSON.parse(buffer) as T;
  } catch {
    /* fall through */
  }

  const closed = closeOpenStructures(buffer);
  try {
    return JSON.parse(closed) as T;
  } catch {
    /* fall through */
  }

  const truncated = truncateAtLastTopLevelComma(buffer);
  if (truncated !== null) {
    try {
      return JSON.parse(closeOpenStructures(truncated)) as T;
    } catch {
      /* give up */
    }
  }

  return null;
}

function closeOpenStructures(buffer: string): string {
  const stack: string[] = [];
  let inString = false;
  let escape = false;

  for (let i = 0; i < buffer.length; i++) {
    const ch = buffer[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\') {
      if (inString) escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === '{') stack.push('}');
    else if (ch === '[') stack.push(']');
    else if (ch === '}' || ch === ']') stack.pop();
  }

  let candidate = buffer;
  if (inString) {
    if (candidate.endsWith('\\')) candidate = candidate.slice(0, -1);
    candidate += '"';
  }
  candidate = candidate.replace(/[\s,]+$/, '');
  if (/:\s*$/.test(candidate)) candidate += ' null';

  while (stack.length > 0) candidate += stack.pop();
  return candidate;
}

function truncateAtLastTopLevelComma(buffer: string): string | null {
  let depth = 0;
  let inString = false;
  let escape = false;
  let cutoff = -1;

  for (let i = 0; i < buffer.length; i++) {
    const ch = buffer[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\') {
      if (inString) escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === '{' || ch === '[') depth++;
    else if (ch === '}' || ch === ']') depth--;
    else if (ch === ',' && depth === 1) cutoff = i;
  }

  return cutoff > 0 ? buffer.slice(0, cutoff) : null;
}
