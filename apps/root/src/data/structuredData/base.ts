import { DOMAIN_URL, FULL_NAME, JOB_TITLE } from '@/utils/constants';
import { Person } from 'schema-dts';

export const personStructuredData: Person = Object.freeze({
  '@type': 'Person',
  name: FULL_NAME,
  jobTitle: JOB_TITLE,
  url: DOMAIN_URL,
});

export interface CollectionPageStructuredData {
  '@context': 'https://schema.org';
  '@type': 'CollectionPage';
  name: string;
  description: string;
  url: string;
  author: Person;
  mainEntity: {
    '@type': 'ItemList';
    itemListElement: Array<{
      '@type': 'ListItem';
      position: number;
      name: string;
      url: string;
      description: string;
    }>;
  };
}
