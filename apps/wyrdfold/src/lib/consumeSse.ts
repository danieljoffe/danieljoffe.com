/**
 * Minimal Server-Sent Events reader for `fetch` Responses.
 *
 * The browser's native EventSource only supports GET, so we hand-roll a
 * reader for our POST-based SSE endpoints. Frames are delimited by a
 * blank line; each frame may contain `event:` and one or more `data:`
 * lines (per the SSE spec). We dispatch each completed frame through
 * the handler with the JSON-decoded data payload.
 */
export async function consumeSse(
  response: Response,
  handler: (event: string, data: unknown) => void,
  options: { signal?: AbortSignal } = {}
): Promise<void> {
  if (!response.body) {
    throw new Error('Response has no body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const onAbort = () => {
    reader.cancel().catch(() => {
      /* already closed */
    });
  };
  options.signal?.addEventListener('abort', onAbort);

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const frames = buffer.split('\n\n');
      buffer = frames.pop() ?? '';

      for (const frame of frames) {
        if (!frame.trim()) continue;
        let eventName = 'message';
        const dataLines: string[] = [];
        for (const line of frame.split('\n')) {
          if (line.startsWith('event: ')) {
            eventName = line.slice('event: '.length);
          } else if (line.startsWith('data: ')) {
            dataLines.push(line.slice('data: '.length));
          }
        }
        if (dataLines.length === 0) continue;
        const raw = dataLines.join('\n');
        try {
          handler(eventName, JSON.parse(raw));
        } catch {
          /* malformed frame — skip rather than abort the stream */
        }
      }
    }
  } finally {
    options.signal?.removeEventListener('abort', onAbort);
  }
}
