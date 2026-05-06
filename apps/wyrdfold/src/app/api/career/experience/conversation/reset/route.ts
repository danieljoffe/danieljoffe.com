import { proxyToWyrdfoldAPI } from '@/lib/api/proxy';

export async function POST() {
  return proxyToWyrdfoldAPI('/experience/conversation/reset', {
    method: 'POST',
  });
}
