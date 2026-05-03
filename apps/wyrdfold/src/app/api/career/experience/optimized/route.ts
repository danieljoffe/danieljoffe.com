import { proxyToWyrdfoldAPI } from '@/lib/api/proxy';

export async function GET(): Promise<ReturnType<typeof proxyToWyrdfoldAPI>> {
  return proxyToWyrdfoldAPI('/experience/optimized');
}
