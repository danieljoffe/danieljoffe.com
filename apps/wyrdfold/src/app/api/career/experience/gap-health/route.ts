import { proxyToWyrdfoldAPI } from '@/lib/api/proxy';

export async function GET() {
  return proxyToWyrdfoldAPI('/experience/gap-health');
}
