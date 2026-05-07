import type { Metadata } from 'next';
import MagicLinkForm from './MagicLinkForm';

export const metadata: Metadata = {
  title: 'Sign in to WyrdFold',
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return <MagicLinkForm next={next} />;
}
