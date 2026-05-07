import { LLM_TIMEOUT_MS, proxyToWyrdfoldAPI } from '@/lib/api/proxy';

export async function POST() {
  return proxyToWyrdfoldAPI('/targets/suggest', {
    method: 'POST',
    timeoutMs: LLM_TIMEOUT_MS,
  });
}
