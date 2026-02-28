import { analytics } from '../analytics';

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
  describe('method existence', () => {
    it.each([
      'navClick',
      'ctaClick',
      'formStart',
      'formSubmit',
      'formError',
      'mobileMenuToggle',
      'projectClick',
      'experienceClick',
      'themeToggle',
    ] as const)('has %s method', method => {
      expect(typeof analytics[method]).toBe('function');
    });
  });

  describe('navigation events', () => {
    it('navClick calls gtag with nav_click event', () => {
      analytics.navClick('Home');
      expect(mockGtag).toHaveBeenCalledWith('event', 'nav_click', {
        link_label: 'Home',
      });
    });
  });

  describe('CTA events', () => {
    it('ctaClick calls gtag with cta_click event', () => {
      analytics.ctaClick('signup', '/signup');
      expect(mockGtag).toHaveBeenCalledWith('event', 'cta_click', {
        cta_name: 'signup',
        destination: '/signup',
      });
    });
  });

  describe('form events', () => {
    it('formStart calls gtag with form_start event', () => {
      analytics.formStart('contact');
      expect(mockGtag).toHaveBeenCalledWith('event', 'form_start', {
        form_name: 'contact',
      });
    });

    it('formSubmit calls gtag with form_submit event', () => {
      analytics.formSubmit('contact');
      expect(mockGtag).toHaveBeenCalledWith('event', 'form_submit', {
        form_name: 'contact',
      });
    });

    it('formError calls gtag with form_error event', () => {
      analytics.formError('contact', 'validation failed');
      expect(mockGtag).toHaveBeenCalledWith('event', 'form_error', {
        form_name: 'contact',
        error_message: 'validation failed',
      });
    });
  });

  describe('engagement events', () => {
    it('mobileMenuToggle calls gtag with mobile_menu_toggle event', () => {
      analytics.mobileMenuToggle('open');
      expect(mockGtag).toHaveBeenCalledWith('event', 'mobile_menu_toggle', {
        action: 'open',
      });
    });

    it('projectClick calls gtag with project_click event', () => {
      analytics.projectClick('my-project');
      expect(mockGtag).toHaveBeenCalledWith('event', 'project_click', {
        project: 'my-project',
      });
    });

    it('experienceClick calls gtag with experience_click event', () => {
      analytics.experienceClick('my-experience');
      expect(mockGtag).toHaveBeenCalledWith('event', 'experience_click', {
        experience: 'my-experience',
      });
    });
  });

  describe('theme events', () => {
    it('themeToggle calls gtag with theme_toggle event', () => {
      analytics.themeToggle('dark');
      expect(mockGtag).toHaveBeenCalledWith('event', 'theme_toggle', {
        theme: 'dark',
      });
    });
  });

  describe('SSR safety', () => {
    it('methods do not throw when called', () => {
      expect(() => analytics.navClick('Home')).not.toThrow();
      expect(() => analytics.ctaClick('cta', '/dest')).not.toThrow();
      expect(() => analytics.formStart('form')).not.toThrow();
      expect(() => analytics.formSubmit('form')).not.toThrow();
      expect(() => analytics.formError('form', 'err')).not.toThrow();
      expect(() => analytics.mobileMenuToggle('open')).not.toThrow();
      expect(() => analytics.projectClick('slug')).not.toThrow();
      expect(() => analytics.experienceClick('slug')).not.toThrow();
      expect(() => analytics.themeToggle('light')).not.toThrow();
    });

    it('all methods call gtag when window is defined (browser)', () => {
      mockGtag.mockClear();

      analytics.navClick('Home');
      analytics.ctaClick('cta', '/dest');
      analytics.formStart('form');
      analytics.formSubmit('form');
      analytics.formError('form', 'err');
      analytics.mobileMenuToggle('open');
      analytics.projectClick('slug');
      analytics.experienceClick('slug');
      analytics.themeToggle('light');

      expect(mockGtag).toHaveBeenCalledTimes(9);
    });
  });
});
