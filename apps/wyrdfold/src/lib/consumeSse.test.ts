/**
 * @jest-environment node
 */
import { consumeSse } from './consumeSse';

function makeStreamResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  let i = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      const chunk = chunks[i];
      if (chunk !== undefined) {
        controller.enqueue(encoder.encode(chunk));
        i += 1;
      } else {
        controller.close();
      }
    },
  });
  return new Response(stream);
}

describe('consumeSse', () => {
  it('throws when the response has no body', async () => {
    const headlessResponse = new Response(null);
    const handler = jest.fn();
    await expect(consumeSse(headlessResponse, handler)).rejects.toThrow(
      /no body/i
    );
  });

  it('dispatches a single complete frame', async () => {
    const response = makeStreamResponse([
      'event: progress\ndata: {"pct":42}\n\n',
    ]);
    const handler = jest.fn();
    await consumeSse(response, handler);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith('progress', { pct: 42 });
  });

  it('defaults the event name to "message" when omitted', async () => {
    const response = makeStreamResponse(['data: {"hello":"world"}\n\n']);
    const handler = jest.fn();
    await consumeSse(response, handler);
    expect(handler).toHaveBeenCalledWith('message', { hello: 'world' });
  });

  it('joins multi-line data fields', async () => {
    const response = makeStreamResponse([
      'data: {"a":1}\ndata: still-runs\n\n',
    ]);
    const handler = jest.fn();
    // The combined data is "{"a":1}\nstill-runs" which is invalid JSON; the
    // implementation skips malformed frames silently.
    await consumeSse(response, handler);
    expect(handler).not.toHaveBeenCalled();
  });

  it('reassembles frames split across chunk boundaries', async () => {
    const response = makeStreamResponse([
      'event: tick\ndata: {"n":',
      '1}\n\nevent: tick\ndata: {"n":2}\n\n',
    ]);
    const handler = jest.fn();
    await consumeSse(response, handler);
    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenNthCalledWith(1, 'tick', { n: 1 });
    expect(handler).toHaveBeenNthCalledWith(2, 'tick', { n: 2 });
  });

  it('skips empty frames', async () => {
    const response = makeStreamResponse([
      '\n\n', // empty frame
      'data: {"ok":true}\n\n',
    ]);
    const handler = jest.fn();
    await consumeSse(response, handler);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith('message', { ok: true });
  });

  it('skips frames with no data line', async () => {
    const response = makeStreamResponse(['event: ping\n\n']);
    const handler = jest.fn();
    await consumeSse(response, handler);
    expect(handler).not.toHaveBeenCalled();
  });

  it('silently drops malformed JSON frames without aborting', async () => {
    const response = makeStreamResponse([
      'data: {bad json}\n\n',
      'data: {"ok":true}\n\n',
    ]);
    const handler = jest.fn();
    await consumeSse(response, handler);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith('message', { ok: true });
  });

  it('cancels the reader when the abort signal fires', async () => {
    const cancel = jest.fn().mockResolvedValue(undefined);
    // First read hangs; once cancel fires we resolve it as done so the
    // consumer loop can exit cleanly.
    let resolveRead: (value: { done: boolean; value: undefined }) => void;
    const readPromise = new Promise<{ done: boolean; value: undefined }>(r => {
      resolveRead = r;
    });
    const fakeReader = {
      read: jest.fn(() => readPromise),
      cancel: jest.fn(async () => {
        await cancel();
        resolveRead({ done: true, value: undefined });
      }),
    };
    const fakeResponse = {
      body: { getReader: () => fakeReader },
    } as unknown as Response;

    const controller = new AbortController();
    const handler = jest.fn();
    const promise = consumeSse(fakeResponse, handler, {
      signal: controller.signal,
    });
    controller.abort();
    await promise;
    expect(cancel).toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
  });
});
