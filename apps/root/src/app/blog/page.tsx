import { Metadata } from 'next';
import { blogRootMetadata } from '@/data/metadata/blog';
import { BlogIndexView } from '@/components/BlogIndexView';

export const metadata: Metadata = blogRootMetadata;

export default function Blog() {
  return <BlogIndexView currentPage={1} />;
}
