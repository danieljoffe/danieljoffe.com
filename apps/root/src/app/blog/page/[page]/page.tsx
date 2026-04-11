import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BlogIndexView } from '@/components/BlogIndexView';
import { blogRootMetadata } from '@/data/metadata/blog';
import { getTotalPages } from '@/lib/pagination';
import { BLOG_LINK, DOMAIN_URL, POSTS_PER_PAGE } from '@/utils/constants';

interface PageProps {
  params: Promise<{ page: string }>;
}

export async function generateStaticParams() {
  const totalPages = getTotalPages('blog', POSTS_PER_PAGE);
  // Page 1 stays at /blog; only emit routes for pages 2..N.
  return Array.from({ length: Math.max(0, totalPages - 1) }, (_, i) => ({
    page: String(i + 2),
  }));
}

function parsePageParam(raw: string): number | null {
  if (!/^[0-9]+$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 2 ? n : null;
}

function hrefForPage(page: number): string {
  return page === 1
    ? `${DOMAIN_URL}${BLOG_LINK.href}`
    : `${DOMAIN_URL}${BLOG_LINK.href}/page/${page}`;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { page } = await params;
  const parsed = parsePageParam(page);
  const totalPages = getTotalPages('blog', POSTS_PER_PAGE);
  if (parsed === null || parsed > totalPages) {
    return { title: 'Blog | Daniel Joffe' };
  }

  const baseTitle =
    typeof blogRootMetadata.title === 'string'
      ? blogRootMetadata.title
      : 'Blog | Daniel Joffe';
  return {
    title: `${baseTitle} — Page ${parsed} of ${totalPages}`,
    description: blogRootMetadata.description,
    alternates: {
      canonical: hrefForPage(parsed),
    },
  };
}

export default async function BlogPaginatedPage({ params }: PageProps) {
  const { page } = await params;
  const parsed = parsePageParam(page);
  if (parsed === null) notFound();
  const totalPages = getTotalPages('blog', POSTS_PER_PAGE);
  if (parsed > totalPages) notFound();

  const prevHref = hrefForPage(parsed - 1);
  const nextHref = parsed < totalPages ? hrefForPage(parsed + 1) : undefined;

  return (
    <>
      {/*
        React 19 hoists bare <link> elements rendered in server components
        into the document <head>. Next's metadata API exposes canonical via
        `alternates.canonical` but has no first-class shape for rel=prev /
        rel=next, so we emit those inline.
      */}
      <link rel='prev' href={prevHref} />
      {nextHref && <link rel='next' href={nextHref} />}
      <BlogIndexView currentPage={parsed} />
    </>
  );
}
