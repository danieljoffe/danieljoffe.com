import type { Metadata } from 'next';
import CoverLetterReviewPage from './CoverLetterReviewPage';

export const metadata: Metadata = {
  title: 'Review Cover Letter',
};

export default async function FittedCoverLetterReview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CoverLetterReviewPage jobPostingId={id} />;
}
