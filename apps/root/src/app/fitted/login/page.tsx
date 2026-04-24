import type { Metadata } from 'next';
import MagicLinkForm from './MagicLinkForm';

export const metadata: Metadata = {
  title: 'Sign in to Fitted',
  robots: { index: false, follow: false },
};

export default function FittedLoginPage() {
  return <MagicLinkForm />;
}
