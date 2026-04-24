import type { Metadata } from 'next';
import JobsList from './JobsList';

export const metadata: Metadata = {
  title: 'Jobs',
};

export default function FittedJobsPage() {
  return <JobsList />;
}
