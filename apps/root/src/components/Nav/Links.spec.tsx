import {
  NAV_LINKS,
  PRIMARY_NAV_LINKS,
  MORE_NAV_LINKS,
  PROJECTS_LINK,
  EXPERIENCE_LINK,
  ABOUT_LINK,
  BLOG_LINK,
} from '@/utils/constants';

describe('Nav link constants', () => {
  test('PRIMARY_NAV_LINKS contains Projects, Experience, About', () => {
    expect(PRIMARY_NAV_LINKS).toContainEqual(PROJECTS_LINK);
    expect(PRIMARY_NAV_LINKS).toContainEqual(EXPERIENCE_LINK);
    expect(PRIMARY_NAV_LINKS).toContainEqual(ABOUT_LINK);
    expect(PRIMARY_NAV_LINKS).toHaveLength(3);
  });

  test('MORE_NAV_LINKS contains Blog', () => {
    expect(MORE_NAV_LINKS).toContainEqual(BLOG_LINK);
    expect(MORE_NAV_LINKS).toHaveLength(1);
  });

  test('NAV_LINKS is the union of PRIMARY and MORE', () => {
    expect(NAV_LINKS).toEqual([...PRIMARY_NAV_LINKS, ...MORE_NAV_LINKS]);
  });
});
