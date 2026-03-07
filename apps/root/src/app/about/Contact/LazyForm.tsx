'use client';

import dynamic from 'next/dynamic';
import { Loading } from '@danieljoffe.com/shared-ui';

const Form = dynamic(() => import('./Form'), {
  ssr: false,
  loading: () => <Loading />,
});

export default function LazyForm() {
  return <Form />;
}
