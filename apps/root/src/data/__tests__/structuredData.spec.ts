import { personStructuredData } from '../structuredData/base';
import { rootStructuredData } from '../structuredData/root';
import {
  experienceStructuredData,
  experienceRootStructuredData,
} from '../structuredData/experience';
import {
  projectStructuredData,
  projectsRootStructuredData,
} from '../structuredData/project';
import {
  servicesStructuredData,
  servicesPageStructuredData,
} from '../structuredData/services';

// ---------------------------------------------------------------------------
// base.ts — personStructuredData
// ---------------------------------------------------------------------------
describe('personStructuredData (base)', () => {
  it('is defined', () => {
    expect(personStructuredData).toBeDefined();
  });

  it('has @type "Person"', () => {
    expect(personStructuredData['@type']).toBe('Person');
  });

  it('includes name, jobTitle, and url', () => {
    expect(personStructuredData.name).toBeTruthy();
    expect(personStructuredData.jobTitle).toBeTruthy();
    expect(personStructuredData.url).toBeTruthy();
  });

  it('is frozen (immutable)', () => {
    expect(Object.isFrozen(personStructuredData)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// root.ts — rootStructuredData
// ---------------------------------------------------------------------------
describe('rootStructuredData', () => {
  it('is defined', () => {
    expect(rootStructuredData).toBeDefined();
  });

  it('has @context and @type', () => {
    expect(rootStructuredData['@context']).toBe('https://schema.org');
    expect(rootStructuredData['@type']).toBe('Person');
  });

  it('includes worksFor Organization', () => {
    expect(rootStructuredData.worksFor).toBeDefined();
    expect(rootStructuredData.worksFor['@type']).toBe('Organization');
    expect(rootStructuredData.worksFor.name).toBeTruthy();
  });

  it('includes alumniOf Organization', () => {
    expect(rootStructuredData.alumniOf).toBeDefined();
    expect(rootStructuredData.alumniOf['@type']).toBe('Organization');
  });

  it('includes hasCredential', () => {
    expect(rootStructuredData.hasCredential).toBeDefined();
    expect(rootStructuredData.hasCredential['@type']).toBe(
      'EducationalOccupationalCredential'
    );
  });

  it('has a non-empty knowsAbout array', () => {
    expect(Array.isArray(rootStructuredData.knowsAbout)).toBe(true);
    expect(rootStructuredData.knowsAbout.length).toBeGreaterThan(0);
  });

  it('has sameAs array with URLs', () => {
    expect(Array.isArray(rootStructuredData.sameAs)).toBe(true);
    rootStructuredData.sameAs.forEach(url => {
      expect(url).toMatch(/^https?:\/\//);
    });
  });
});

// ---------------------------------------------------------------------------
// experience.ts — experienceStructuredData & experienceRootStructuredData
// ---------------------------------------------------------------------------
describe('experienceStructuredData', () => {
  it('is defined and has entries', () => {
    expect(experienceStructuredData).toBeDefined();
    const keys = Object.keys(experienceStructuredData);
    expect(keys.length).toBeGreaterThan(0);
  });

  it.each(Object.entries(experienceStructuredData))(
    '%s has @context, @type "Role", roleName, worksFor, and member',
    (_slug, entry) => {
      expect(entry['@context']).toBe('https://schema.org');
      expect(entry['@type']).toBe('Role');
      expect(entry.roleName).toBeTruthy();
      expect(entry.worksFor).toBeDefined();
      expect(entry.worksFor['@type']).toBe('Corporation');
      expect(entry.worksFor.name).toBeTruthy();
      expect(entry.member).toBeDefined();
      expect(entry.member['@type']).toBe('Person');
    }
  );

  it.each(Object.entries(experienceStructuredData))(
    '%s has a startDate',
    (_slug, entry) => {
      expect(entry.startDate).toBeTruthy();
    }
  );
});

describe('experienceRootStructuredData', () => {
  it('is defined', () => {
    expect(experienceRootStructuredData).toBeDefined();
  });

  it('has @context and @type "CollectionPage"', () => {
    expect(experienceRootStructuredData['@context']).toBe('https://schema.org');
    expect(experienceRootStructuredData['@type']).toBe('CollectionPage');
  });

  it('has mainEntity with @type "ItemList"', () => {
    const { mainEntity } = experienceRootStructuredData;
    expect(mainEntity['@type']).toBe('ItemList');
  });

  it('has itemListElement array with ListItem entries', () => {
    const items = experienceRootStructuredData.mainEntity.itemListElement;
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThan(0);
    items.forEach((item, index) => {
      expect(item['@type']).toBe('ListItem');
      expect(item.position).toBe(index + 1);
      expect(item.name).toBeTruthy();
      expect(item.url).toMatch(/^https?:\/\//);
      expect(item.description).toBeTruthy();
    });
  });
});

// ---------------------------------------------------------------------------
// project.ts — projectStructuredData & projectsRootStructuredData
// ---------------------------------------------------------------------------
describe('projectStructuredData', () => {
  it('is defined and has entries', () => {
    expect(projectStructuredData).toBeDefined();
    const keys = Object.keys(projectStructuredData);
    expect(keys.length).toBeGreaterThan(0);
  });

  it.each(Object.entries(projectStructuredData))(
    '%s has @context, @type "Blog", headline, about, and author',
    (_slug, entry) => {
      expect(entry['@context']).toBe('https://schema.org');
      expect(entry['@type']).toBe('Blog');
      expect(entry.headline).toBeTruthy();
      expect(entry.about).toBeTruthy();
      expect(entry.author).toBeDefined();
      expect(entry.author['@type']).toBe('Person');
    }
  );
});

describe('projectsRootStructuredData', () => {
  it('is defined', () => {
    expect(projectsRootStructuredData).toBeDefined();
  });

  it('has @context and @type "CollectionPage"', () => {
    expect(projectsRootStructuredData['@context']).toBe('https://schema.org');
    expect(projectsRootStructuredData['@type']).toBe('CollectionPage');
  });

  it('has mainEntity with @type "ItemList"', () => {
    const { mainEntity } = projectsRootStructuredData;
    expect(mainEntity['@type']).toBe('ItemList');
  });

  it('has itemListElement array with ListItem entries', () => {
    const items = projectsRootStructuredData.mainEntity.itemListElement;
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThan(0);
    items.forEach((item, index) => {
      expect(item['@type']).toBe('ListItem');
      expect(item.position).toBe(index + 1);
      expect(item.name).toBeTruthy();
      expect(item.url).toMatch(/^https?:\/\//);
      expect(item.description).toBeTruthy();
    });
  });
});

// ---------------------------------------------------------------------------
// services.ts — servicesStructuredData & servicesPageStructuredData
// ---------------------------------------------------------------------------
describe('servicesStructuredData', () => {
  it('is defined', () => {
    expect(servicesStructuredData).toBeDefined();
  });

  it('has @context and @type "Service"', () => {
    expect(servicesStructuredData['@context']).toBe('https://schema.org');
    expect(servicesStructuredData['@type']).toBe('Service');
  });

  it('has a provider with @type "Person"', () => {
    expect(servicesStructuredData.provider).toBeDefined();
    expect(servicesStructuredData.provider['@type']).toBe('Person');
  });

  it('has hasOfferCatalog with @type "OfferCatalog"', () => {
    const { hasOfferCatalog } = servicesStructuredData;
    expect(hasOfferCatalog).toBeDefined();
    expect(hasOfferCatalog['@type']).toBe('OfferCatalog');
  });

  it('has offers in the catalog', () => {
    const offers = servicesStructuredData.hasOfferCatalog.itemListElement;
    expect(Array.isArray(offers)).toBe(true);
    expect(offers.length).toBeGreaterThan(0);
    offers.forEach(offer => {
      expect(offer['@type']).toBe('Offer');
      expect(offer.itemOffered['@type']).toBe('Service');
      expect(offer.itemOffered.name).toBeTruthy();
      expect(offer.itemOffered.description).toBeTruthy();
      expect(offer.position).toBeGreaterThan(0);
    });
  });

  it('has a url', () => {
    expect(servicesStructuredData.url).toMatch(/^https?:\/\//);
  });
});

describe('servicesPageStructuredData', () => {
  it('is defined', () => {
    expect(servicesPageStructuredData).toBeDefined();
  });

  it('has @context and @type "WebPage"', () => {
    expect(servicesPageStructuredData['@context']).toBe('https://schema.org');
    expect(servicesPageStructuredData['@type']).toBe('WebPage');
  });

  it('has author with @type "Person"', () => {
    expect(servicesPageStructuredData.author['@type']).toBe('Person');
  });

  it('has mainEntity referencing the servicesStructuredData', () => {
    expect(servicesPageStructuredData.mainEntity).toBe(servicesStructuredData);
  });
});
