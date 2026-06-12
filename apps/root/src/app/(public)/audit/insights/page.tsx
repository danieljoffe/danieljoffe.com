import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { PageLayout } from '@danieljoffe/shared-ui/PageLayout';
import { DOMAIN_URL } from '@/utils/constants';
import { getOrigin } from '@/lib/getOrigin';
import type {
  SummaryData,
  ViolationsData,
  ScoresData,
  TrendsData,
  DomainsData,
} from './types';
import { getAllViolationGuides } from './violations/data';
import HeroStats from './HeroStats';
import ViolationsSection from './ViolationsSection';
import TopDomains from './TopDomains';
import InsightsCTA from './InsightsCTA';

const ScoreDistribution = dynamic(() => import('./ScoreDistribution'));
const TrendsChart = dynamic(() => import('./TrendsChart'));

export const metadata: Metadata = {
  title: 'Audit Insights | Daniel Joffe',
  description:
    'Aggregated performance, accessibility, and SEO data from hundreds of website audits. See the most common issues, score trends, and top domains.',
  alternates: {
    canonical: '/audit/insights',
  },
  openGraph: {
    title: 'Audit Insights',
    description:
      'Aggregated data from hundreds of website audits. See what issues affect real websites the most.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Audit Insights',
    description:
      'Aggregated data from hundreds of website audits. See what issues affect real websites the most.',
  },
};

async function fetchInsights<T>(
  path: string,
  origin: string
): Promise<T | null> {
  try {
    const res = await fetch(`${origin}/api/audit/insights/${path}`, {
      headers: { origin },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

export default async function AuditInsightsPage() {
  const origin = await getOrigin();

  const [summary, violations, scores, trends, domains] = await Promise.all([
    fetchInsights<SummaryData>('summary', origin),
    fetchInsights<ViolationsData>('violations?limit=10', origin),
    fetchInsights<ScoresData>('scores', origin),
    fetchInsights<TrendsData>('trends?interval=monthly&period=6m', origin),
    fetchInsights<DomainsData>('domains?limit=10', origin),
  ]);

  const defaultSummary: SummaryData = {
    totalScans: 0,
    uniqueDomains: 0,
    avgOverallScore: null,
    topViolation: null,
  };

  const defaultScores: ScoresData = {
    period: null,
    averages: {
      performance: null,
      accessibility: null,
      bestPractices: null,
      seo: null,
      overall: null,
    },
    gradeDistribution: { A: 0, B: 0, C: 0, D: 0, F: 0 },
    total: 0,
  };

  const defaultTrends: TrendsData = {
    interval: 'monthly',
    period: '6m',
    series: [],
  };

  const summaryData = summary ?? defaultSummary;
  const scoresData = scores ?? defaultScores;
  const trendsData = trends ?? defaultTrends;

  // Build slug lookup for linking violation titles to guide pages
  const guideSlugs: Record<string, string> = {};
  for (const guide of getAllViolationGuides()) {
    guideSlugs[guide.title.toLowerCase()] = guide.slug;
  }

  return (
    <PageLayout>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Dataset',
            name: 'Website Audit Insights',
            description:
              'Aggregated performance, accessibility, and SEO scan data from the free audit tool on danieljoffe.com.',
            url: `${DOMAIN_URL}/audit/insights`,
            creator: {
              '@type': 'Person',
              name: 'Daniel Joffe',
              url: DOMAIN_URL,
            },
          }).replace(/</g, '\\u003c'),
        }}
      />
      <HeroStats data={summaryData} />
      <ViolationsSection
        violations={violations?.violations ?? []}
        guideSlugs={guideSlugs}
      />
      <ScoreDistribution data={scoresData} />
      <TrendsChart data={trendsData} />
      <TopDomains domains={domains?.domains ?? []} />
      <InsightsCTA
        topViolation={summaryData.topViolation}
        totalScans={summaryData.totalScans}
      />
    </PageLayout>
  );
}
