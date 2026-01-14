import { DOMAIN_URL, FULL_NAME, JOB_TITLE } from '@/utils/constants';
import { Person } from 'schema-dts';

export const personStructuredData: Person = Object.freeze({
  '@type': 'Person',
  name: FULL_NAME,
  jobTitle: JOB_TITLE,
  url: DOMAIN_URL,
});
