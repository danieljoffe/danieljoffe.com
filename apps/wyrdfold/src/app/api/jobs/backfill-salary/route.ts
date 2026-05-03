import { proxyToWyrdfoldAPI } from '@/lib/api/proxy';

export async function POST() {
  return proxyToWyrdfoldAPI('/jobs/backfill-salary', { method: 'POST' });
}
