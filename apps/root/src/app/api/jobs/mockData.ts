/**
 * Mock data for testing the jobs dashboard UI without a running FastAPI backend.
 * TODO: Remove this file once the backend is deployed.
 */

export interface MockJobPosting {
  id: string;
  greenhouse_id: number;
  source_id: string;
  title: string;
  company_name: string;
  location: string | null;
  department: string | null;
  absolute_url: string | null;
  score: number;
  score_breakdown: Record<string, number>;
  status: string;
  first_seen_at: string;
  created_at: string;
}

export interface MockSource {
  id: string;
  board_token: string;
  company_name: string;
  enabled: boolean;
  last_polled_at: string | null;
  job_count: number;
}

const now = new Date();
function daysAgo(n: number): string {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export const MOCK_POSTINGS: MockJobPosting[] = [
  {
    id: 'mock-001',
    greenhouse_id: 5001001,
    source_id: 'src-stripe',
    title: 'Senior Frontend Engineer, Dashboard',
    company_name: 'Stripe',
    location: 'San Francisco, CA (Remote)',
    department: 'Engineering',
    absolute_url: 'https://boards.greenhouse.io/stripe/jobs/5001001',
    score: 92,
    score_breakdown: {
      role_titles: 9,
      technologies: 15,
      domain_skills: 9,
      seniority_signals: 7,
      negative: 0,
    },
    status: 'new',
    first_seen_at: daysAgo(1),
    created_at: daysAgo(1),
  },
  {
    id: 'mock-002',
    greenhouse_id: 5001002,
    source_id: 'src-vercel',
    title: 'Staff Frontend Engineer, Design Systems',
    company_name: 'Vercel',
    location: 'Remote (US)',
    department: 'Engineering',
    absolute_url: 'https://boards.greenhouse.io/vercel/jobs/5001002',
    score: 88,
    score_breakdown: {
      role_titles: 9,
      technologies: 12,
      domain_skills: 12,
      seniority_signals: 8,
      negative: 0,
    },
    status: 'saved',
    first_seen_at: daysAgo(2),
    created_at: daysAgo(2),
  },
  {
    id: 'mock-003',
    greenhouse_id: 5001003,
    source_id: 'src-figma',
    title: 'Senior Software Engineer, Frontend Platform',
    company_name: 'Figma',
    location: 'San Francisco, CA',
    department: 'Platform',
    absolute_url: 'https://boards.greenhouse.io/figma/jobs/5001003',
    score: 81,
    score_breakdown: {
      role_titles: 6,
      technologies: 12,
      domain_skills: 6,
      seniority_signals: 6,
      negative: 0,
    },
    status: 'applied',
    first_seen_at: daysAgo(3),
    created_at: daysAgo(3),
  },
  {
    id: 'mock-004',
    greenhouse_id: 5001004,
    source_id: 'src-airbnb',
    title: 'Senior Frontend Engineer, Guest Experience',
    company_name: 'Airbnb',
    location: 'Remote (US)',
    department: 'Guest & Host',
    absolute_url: 'https://boards.greenhouse.io/airbnb/jobs/5001004',
    score: 77,
    score_breakdown: {
      role_titles: 9,
      technologies: 9,
      domain_skills: 3,
      seniority_signals: 5,
      negative: 0,
    },
    status: 'new',
    first_seen_at: daysAgo(1),
    created_at: daysAgo(1),
  },
  {
    id: 'mock-005',
    greenhouse_id: 5001005,
    source_id: 'src-ramp',
    title: 'Frontend Engineer, Component Library',
    company_name: 'Ramp',
    location: 'New York, NY',
    department: 'Engineering',
    absolute_url: 'https://boards.greenhouse.io/ramp/jobs/5001005',
    score: 73,
    score_breakdown: {
      role_titles: 3,
      technologies: 9,
      domain_skills: 9,
      seniority_signals: 2,
      negative: 0,
    },
    status: 'new',
    first_seen_at: daysAgo(0),
    created_at: daysAgo(0),
  },
  {
    id: 'mock-006',
    greenhouse_id: 5001006,
    source_id: 'src-linear',
    title: 'Senior Full Stack Engineer',
    company_name: 'Linear',
    location: 'Remote',
    department: 'Engineering',
    absolute_url: 'https://boards.greenhouse.io/linear56/jobs/5001006',
    score: 68,
    score_breakdown: {
      role_titles: 9,
      technologies: 6,
      domain_skills: 3,
      seniority_signals: 4,
      negative: 0,
    },
    status: 'new',
    first_seen_at: daysAgo(4),
    created_at: daysAgo(4),
  },
  {
    id: 'mock-007',
    greenhouse_id: 5001007,
    source_id: 'src-notion',
    title: 'Senior Frontend Engineer',
    company_name: 'Notion',
    location: 'San Francisco, CA',
    department: 'Product Engineering',
    absolute_url: 'https://boards.greenhouse.io/notion/jobs/5001007',
    score: 65,
    score_breakdown: {
      role_titles: 9,
      technologies: 6,
      domain_skills: 0,
      seniority_signals: 5,
      negative: 0,
    },
    status: 'new',
    first_seen_at: daysAgo(5),
    created_at: daysAgo(5),
  },
  {
    id: 'mock-008',
    greenhouse_id: 5001008,
    source_id: 'src-shopify',
    title: 'Senior UI Engineer, Checkout',
    company_name: 'Shopify',
    location: 'Remote (North America)',
    department: 'Checkout',
    absolute_url: 'https://boards.greenhouse.io/shopify/jobs/5001008',
    score: 62,
    score_breakdown: {
      role_titles: 6,
      technologies: 6,
      domain_skills: 3,
      seniority_signals: 4,
      negative: -1,
    },
    status: 'saved',
    first_seen_at: daysAgo(2),
    created_at: daysAgo(2),
  },
  {
    id: 'mock-009',
    greenhouse_id: 5001009,
    source_id: 'src-datadog',
    title: 'Frontend Engineer, Dashboards',
    company_name: 'Datadog',
    location: 'New York, NY',
    department: 'Engineering',
    absolute_url: 'https://boards.greenhouse.io/datadog81/jobs/5001009',
    score: 55,
    score_breakdown: {
      role_titles: 3,
      technologies: 6,
      domain_skills: 3,
      seniority_signals: 2,
      negative: 0,
    },
    status: 'new',
    first_seen_at: daysAgo(3),
    created_at: daysAgo(3),
  },
  {
    id: 'mock-010',
    greenhouse_id: 5001010,
    source_id: 'src-sentry',
    title: 'Software Engineer, Web Platform',
    company_name: 'Sentry',
    location: 'San Francisco, CA (Hybrid)',
    department: 'Platform',
    absolute_url: 'https://boards.greenhouse.io/sentry/jobs/5001010',
    score: 48,
    score_breakdown: {
      role_titles: 1.5,
      technologies: 6,
      domain_skills: 3,
      seniority_signals: 1,
      negative: 0,
    },
    status: 'new',
    first_seen_at: daysAgo(6),
    created_at: daysAgo(6),
  },
  {
    id: 'mock-011',
    greenhouse_id: 5001011,
    source_id: 'src-plaid',
    title: 'Fullstack Engineer, Link',
    company_name: 'Plaid',
    location: 'Remote (US)',
    department: 'Engineering',
    absolute_url: 'https://boards.greenhouse.io/plaid/jobs/5001011',
    score: 42,
    score_breakdown: {
      role_titles: 3,
      technologies: 3,
      domain_skills: 0,
      seniority_signals: 2,
      negative: 0,
    },
    status: 'rejected',
    first_seen_at: daysAgo(8),
    created_at: daysAgo(8),
  },
  {
    id: 'mock-012',
    greenhouse_id: 5001012,
    source_id: 'src-brex',
    title: 'Software Engineer, Frontend',
    company_name: 'Brex',
    location: 'Remote (US / Canada)',
    department: 'Engineering',
    absolute_url: 'https://boards.greenhouse.io/brex/jobs/5001012',
    score: 38,
    score_breakdown: {
      role_titles: 1.5,
      technologies: 3,
      domain_skills: 0,
      seniority_signals: 2,
      negative: -1,
    },
    status: 'new',
    first_seen_at: daysAgo(5),
    created_at: daysAgo(5),
  },
  {
    id: 'mock-013',
    greenhouse_id: 5001013,
    source_id: 'src-mercury',
    title: 'Web Developer',
    company_name: 'Mercury',
    location: 'San Francisco, CA',
    department: null,
    absolute_url: 'https://boards.greenhouse.io/mercury/jobs/5001013',
    score: 25,
    score_breakdown: {
      role_titles: 3,
      technologies: 1.5,
      domain_skills: 0,
      seniority_signals: 0,
      negative: -2,
    },
    status: 'archived',
    first_seen_at: daysAgo(12),
    created_at: daysAgo(12),
  },
  {
    id: 'mock-014',
    greenhouse_id: 5001014,
    source_id: 'src-gusto',
    title: 'Software Engineer',
    company_name: 'Gusto',
    location: 'Denver, CO',
    department: 'Payroll',
    absolute_url: 'https://boards.greenhouse.io/gusto/jobs/5001014',
    score: 18,
    score_breakdown: {
      role_titles: 1.5,
      technologies: 1,
      domain_skills: 0,
      seniority_signals: 0,
      negative: -2,
    },
    status: 'new',
    first_seen_at: daysAgo(7),
    created_at: daysAgo(7),
  },
  {
    id: 'mock-015',
    greenhouse_id: 5001015,
    source_id: 'src-webflow',
    title: 'Senior React Engineer, Editor',
    company_name: 'Webflow',
    location: 'Remote (US)',
    department: 'Editor',
    absolute_url: 'https://boards.greenhouse.io/webflow/jobs/5001015',
    score: 85,
    score_breakdown: {
      role_titles: 9,
      technologies: 12,
      domain_skills: 6,
      seniority_signals: 5,
      negative: 0,
    },
    status: 'new',
    first_seen_at: daysAgo(0),
    created_at: daysAgo(0),
  },
];

export const MOCK_SOURCES: MockSource[] = [
  {
    id: 'src-stripe',
    board_token: 'stripe',
    company_name: 'Stripe',
    enabled: true,
    last_polled_at: daysAgo(0),
    job_count: 142,
  },
  {
    id: 'src-vercel',
    board_token: 'vercel',
    company_name: 'Vercel',
    enabled: true,
    last_polled_at: daysAgo(0),
    job_count: 38,
  },
  {
    id: 'src-figma',
    board_token: 'figma',
    company_name: 'Figma',
    enabled: true,
    last_polled_at: daysAgo(0),
    job_count: 67,
  },
  {
    id: 'src-airbnb',
    board_token: 'airbnb',
    company_name: 'Airbnb',
    enabled: true,
    last_polled_at: daysAgo(0),
    job_count: 203,
  },
  {
    id: 'src-ramp',
    board_token: 'ramp',
    company_name: 'Ramp',
    enabled: true,
    last_polled_at: daysAgo(0),
    job_count: 54,
  },
  {
    id: 'src-linear',
    board_token: 'linear56',
    company_name: 'Linear',
    enabled: true,
    last_polled_at: daysAgo(1),
    job_count: 22,
  },
  {
    id: 'src-notion',
    board_token: 'notion',
    company_name: 'Notion',
    enabled: true,
    last_polled_at: daysAgo(1),
    job_count: 89,
  },
  {
    id: 'src-shopify',
    board_token: 'shopify',
    company_name: 'Shopify',
    enabled: true,
    last_polled_at: daysAgo(0),
    job_count: 312,
  },
  {
    id: 'src-datadog',
    board_token: 'datadog81',
    company_name: 'Datadog',
    enabled: true,
    last_polled_at: daysAgo(0),
    job_count: 178,
  },
  {
    id: 'src-sentry',
    board_token: 'sentry',
    company_name: 'Sentry',
    enabled: false,
    last_polled_at: daysAgo(5),
    job_count: 31,
  },
  {
    id: 'src-plaid',
    board_token: 'plaid',
    company_name: 'Plaid',
    enabled: true,
    last_polled_at: daysAgo(1),
    job_count: 45,
  },
  {
    id: 'src-brex',
    board_token: 'brex',
    company_name: 'Brex',
    enabled: true,
    last_polled_at: daysAgo(0),
    job_count: 28,
  },
  {
    id: 'src-mercury',
    board_token: 'mercury',
    company_name: 'Mercury',
    enabled: false,
    last_polled_at: daysAgo(10),
    job_count: 19,
  },
  {
    id: 'src-gusto',
    board_token: 'gusto',
    company_name: 'Gusto',
    enabled: true,
    last_polled_at: daysAgo(0),
    job_count: 76,
  },
  {
    id: 'src-webflow',
    board_token: 'webflow',
    company_name: 'Webflow',
    enabled: true,
    last_polled_at: daysAgo(0),
    job_count: 41,
  },
];

/** Filter and paginate mock postings to mimic the FastAPI response */
export function queryMockPostings(params: URLSearchParams) {
  let filtered = [...MOCK_POSTINGS];

  const minScore = params.get('minScore') || params.get('min_score');
  if (minScore) filtered = filtered.filter(p => p.score >= Number(minScore));

  const status = params.get('status');
  if (status) filtered = filtered.filter(p => p.status === status);

  const company = params.get('company');
  if (company) filtered = filtered.filter(p => p.company_name === company);

  const search = params.get('search');
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(p => p.title.toLowerCase().includes(q));
  }

  const sort = params.get('sort') ?? 'score';
  const order = params.get('order') ?? 'desc';
  filtered.sort((a, b) => {
    const aVal = a[sort as keyof MockJobPosting] ?? '';
    const bVal = b[sort as keyof MockJobPosting] ?? '';
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return order === 'desc' ? bVal - aVal : aVal - bVal;
    }
    const cmp = String(aVal).localeCompare(String(bVal));
    return order === 'desc' ? -cmp : cmp;
  });

  const page = Number(params.get('page') ?? 1);
  const pageSize = Number(params.get('pageSize') ?? 20);
  const start = (page - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);

  return {
    postings: paged,
    total: filtered.length,
    page,
    page_size: pageSize,
  };
}
