import { analytics } from './analytics';

jest.mock('@next/third-parties/google', () => ({
  sendGAEvent: jest.fn(),
}));

import { sendGAEvent } from '@next/third-parties/google';

const mockedSendGAEvent = sendGAEvent as jest.MockedFunction<
  typeof sendGAEvent
>;

describe('analytics', () => {
  beforeEach(() => {
    mockedSendGAEvent.mockClear();
  });

  it('tracks nav click events', () => {
    analytics.navClick('About');
    expect(mockedSendGAEvent).toHaveBeenCalledWith('event', 'nav_click', {
      link_label: 'About',
    });
  });

  it('tracks CTA click events', () => {
    analytics.ctaClick('hire_me', '/about');
    expect(mockedSendGAEvent).toHaveBeenCalledWith('event', 'cta_click', {
      cta_name: 'hire_me',
      destination: '/about',
    });
  });

  it('tracks form start events', () => {
    analytics.formStart('contact');
    expect(mockedSendGAEvent).toHaveBeenCalledWith('event', 'form_start', {
      form_name: 'contact',
    });
  });

  it('tracks form submit events', () => {
    analytics.formSubmit('contact');
    expect(mockedSendGAEvent).toHaveBeenCalledWith('event', 'form_submit', {
      form_name: 'contact',
    });
  });

  it('tracks form error events', () => {
    analytics.formError('contact', 'Validation failed');
    expect(mockedSendGAEvent).toHaveBeenCalledWith('event', 'form_error', {
      form_name: 'contact',
      error_message: 'Validation failed',
    });
  });

  it('tracks mobile menu toggle events', () => {
    analytics.mobileMenuToggle('open');
    expect(mockedSendGAEvent).toHaveBeenCalledWith(
      'event',
      'mobile_menu_toggle',
      { action: 'open' }
    );
  });

  it('tracks project click events', () => {
    analytics.projectClick('my-project');
    expect(mockedSendGAEvent).toHaveBeenCalledWith('event', 'project_click', {
      project: 'my-project',
    });
  });

  it('tracks experience click events', () => {
    analytics.experienceClick('company-x');
    expect(mockedSendGAEvent).toHaveBeenCalledWith(
      'event',
      'experience_click',
      { experience: 'company-x' }
    );
  });

  it('tracks theme toggle events', () => {
    analytics.themeToggle('dark');
    expect(mockedSendGAEvent).toHaveBeenCalledWith('event', 'theme_toggle', {
      theme: 'dark',
    });
  });

  // Audit events
  it('tracks audit scan started events', () => {
    analytics.auditScanStarted('https://example.com');
    expect(mockedSendGAEvent).toHaveBeenCalledWith(
      'event',
      'audit_scan_started',
      { url: 'https://example.com' }
    );
  });

  it('tracks audit scan completed events', () => {
    analytics.auditScanCompleted('scan-123', 'B');
    expect(mockedSendGAEvent).toHaveBeenCalledWith(
      'event',
      'audit_scan_completed',
      { scan_id: 'scan-123', grade: 'B' }
    );
  });

  it('tracks audit scan failed events', () => {
    analytics.auditScanFailed('https://example.com', 'Timeout');
    expect(mockedSendGAEvent).toHaveBeenCalledWith(
      'event',
      'audit_scan_failed',
      { url: 'https://example.com', error_message: 'Timeout' }
    );
  });

  it('tracks audit email captured events', () => {
    analytics.auditEmailCaptured('scan-456');
    expect(mockedSendGAEvent).toHaveBeenCalledWith(
      'event',
      'audit_email_captured',
      { scan_id: 'scan-456' }
    );
  });

  it('tracks audit calendly clicked events', () => {
    analytics.auditCalendlyClicked();
    expect(mockedSendGAEvent).toHaveBeenCalledWith(
      'event',
      'audit_calendly_clicked',
      {}
    );
  });

  it('tracks audit report shared events', () => {
    analytics.auditReportShared('scan-789');
    expect(mockedSendGAEvent).toHaveBeenCalledWith(
      'event',
      'audit_report_shared',
      { scan_id: 'scan-789' }
    );
  });
});
