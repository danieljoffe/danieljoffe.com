import { LLM_TIMEOUT_MS, proxyToWyrdfoldAPI } from '@/lib/api/proxy';

export async function GET() {
  return proxyToWyrdfoldAPI('/experience/conversation/next-probe', {
    timeoutMs: LLM_TIMEOUT_MS,
  });
}
