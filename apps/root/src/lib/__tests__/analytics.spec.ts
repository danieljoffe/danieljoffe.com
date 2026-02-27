import { sendGAEvent } from '@next/third-parties/google';
import { analytics } from '../analytics';

jest.mock('@next/third-parties/google', () => ({
  sendGAEvent: jest.fn(),
}));

const mockSendGAEvent = sendGAEvent as jest.Mock;

beforeEach(() => {
  mockSendGAEvent.mockClear();
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
    it('navClick calls sendGAEvent with nav_click event', () => {
      analytics.navClick('Home');
      expect(mockSendGAEvent).toHaveBeenCalledWith('event', 'nav_click', {
        link_label: 'Home',
      });
    });
  });

  describe('CTA events', () => {
    it('ctaClick calls sendGAEvent with cta_click event', () => {
      analytics.ctaClick('signup', '/signup');
      expect(mockSendGAEvent).toHaveBeenCalledWith('event', 'cta_click', {
        cta_name: 'signup',
        destination: '/signup',
      });
    });
  });

  describe('form events', () => {
    it('formStart calls sendGAEvent with form_start event', () => {
      analytics.formStart('contact');
      expect(mockSendGAEvent).toHaveBeenCalledWith('event', 'form_start', {
        form_name: 'contact',
      });
    });

    it('formSubmit calls sendGAEvent with form_submit event', () => {
      analytics.formSubmit('contact');
      expect(mockSendGAEvent).toHaveBeenCalledWith('event', 'form_submit', {
        form_name: 'contact',
      });
    });

    it('formError calls sendGAEvent with form_error event', () => {
      analytics.formError('contact', 'validation failed');
      expect(mockSendGAEvent).toHaveBeenCalledWith('event', 'form_error', {
        form_name: 'contact',
        error_message: 'validation failed',
      });
    });
  });

  describe('engagement events', () => {
    it('mobileMenuToggle calls sendGAEvent with mobile_menu_toggle event', () => {
      analytics.mobileMenuToggle('open');
      expect(mockSendGAEvent).toHaveBeenCalledWith(
        'event',
        'mobile_menu_toggle',
        { action: 'open' }
      );
    });

    it('projectClick calls sendGAEvent with project_click event', () => {
      analytics.projectClick('my-project');
      expect(mockSendGAEvent).toHaveBeenCalledWith('event', 'project_click', {
        project: 'my-project',
      });
    });

    it('experienceClick calls sendGAEvent with experience_click event', () => {
      analytics.experienceClick('my-experience');
      expect(mockSendGAEvent).toHaveBeenCalledWith(
        'event',
        'experience_click',
        { experience: 'my-experience' }
      );
    });
  });

  describe('theme events', () => {
    it('themeToggle calls sendGAEvent with theme_toggle event', () => {
      analytics.themeToggle('dark');
      expect(mockSendGAEvent).toHaveBeenCalledWith('event', 'theme_toggle', {
        theme: 'dark',
      });
    });
  });

  describe('SSR safety', () => {
    it('methods do not throw when called', () => {
      // In a browser environment (jsdom), all methods should execute without error
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

    it('all methods call sendGAEvent when window is defined (browser)', () => {
      mockSendGAEvent.mockClear();

      analytics.navClick('Home');
      analytics.ctaClick('cta', '/dest');
      analytics.formStart('form');
      analytics.formSubmit('form');
      analytics.formError('form', 'err');
      analytics.mobileMenuToggle('open');
      analytics.projectClick('slug');
      analytics.experienceClick('slug');
      analytics.themeToggle('light');

      // Each method should have called sendGAEvent once (9 total)
      expect(mockSendGAEvent).toHaveBeenCalledTimes(9);
    });
  });
});
