import { analytics } from './analytics';

const mockGtag = jest.fn();
const win = window as unknown as Record<string, unknown>;

beforeEach(() => {
  win.gtag = mockGtag;
  mockGtag.mockClear();
});

afterEach(() => {
  delete win.gtag;
});

describe('analytics', () => {
  it('tracks nav click events', () => {
    analytics.navClick('About');
    expect(mockGtag).toHaveBeenCalledWith('event', 'nav_click', {
      link_label: 'About',
    });
  });

  it('tracks CTA click events', () => {
    analytics.ctaClick('hire_me', '/about');
    expect(mockGtag).toHaveBeenCalledWith('event', 'cta_click', {
      cta_name: 'hire_me',
      destination: '/about',
    });
  });

  it('tracks form start events', () => {
    analytics.formStart('contact');
    expect(mockGtag).toHaveBeenCalledWith('event', 'form_start', {
      form_name: 'contact',
    });
  });

  it('tracks form submit events', () => {
    analytics.formSubmit('contact');
    expect(mockGtag).toHaveBeenCalledWith('event', 'form_submit', {
      form_name: 'contact',
    });
  });

  it('tracks form error events', () => {
    analytics.formError('contact', 'Validation failed');
    expect(mockGtag).toHaveBeenCalledWith('event', 'form_error', {
      form_name: 'contact',
      error_message: 'Validation failed',
    });
  });

  it('tracks mobile menu toggle events', () => {
    analytics.mobileMenuToggle('open');
    expect(mockGtag).toHaveBeenCalledWith('event', 'mobile_menu_toggle', {
      action: 'open',
    });
  });

  it('tracks project click events', () => {
    analytics.projectClick('my-project');
    expect(mockGtag).toHaveBeenCalledWith('event', 'project_click', {
      project: 'my-project',
    });
  });

  it('tracks experience click events', () => {
    analytics.experienceClick('company-x');
    expect(mockGtag).toHaveBeenCalledWith('event', 'experience_click', {
      experience: 'company-x',
    });
  });

  it('tracks blog click events', () => {
    analytics.blogClick('my-blog-post');
    expect(mockGtag).toHaveBeenCalledWith('event', 'blog_click', {
      blog: 'my-blog-post',
    });
  });

  it('tracks theme toggle events', () => {
    analytics.themeToggle('dark');
    expect(mockGtag).toHaveBeenCalledWith('event', 'theme_toggle', {
      theme: 'dark',
    });
  });

  it('tracks form engage events', () => {
    analytics.formEngage('contact');
    expect(mockGtag).toHaveBeenCalledWith('event', 'form_engage', {
      form_name: 'contact',
    });
  });

  it('tracks search open events', () => {
    analytics.searchOpen();
    expect(mockGtag).toHaveBeenCalledWith('event', 'search_open', {});
  });

  it('tracks search events with the query and destination', () => {
    analytics.search('react', '/projects/component-library-case-study');
    expect(mockGtag).toHaveBeenCalledWith('event', 'search', {
      search_term: 'react',
      destination: '/projects/component-library-case-study',
    });
  });

  it('tracks not found events with the path', () => {
    analytics.notFound('/old/dead/link');
    expect(mockGtag).toHaveBeenCalledWith('event', 'not_found', {
      page_path: '/old/dead/link',
    });
  });
});
