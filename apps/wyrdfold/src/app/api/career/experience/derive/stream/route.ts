import { proxyStreamingToWyrdfoldAPI } from '@/lib/api/proxy';

export async function POST(request: Request) {
  return proxyStreamingToWyrdfoldAPI('/experience/derive/stream', request, {
    method: 'POST',
  });
}
