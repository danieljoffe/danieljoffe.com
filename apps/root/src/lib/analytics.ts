type EventParams = Record<string, string | number | boolean>;

function trackEvent(eventName: string, params?: EventParams) {
  // Skip during SSR
  if (typeof window === 'undefined') return;

  window.gtag?.('event', eventName, params ?? {});
}

const FUNNEL_SESSION_KEY = 'audit_funnel_session_id';

function generateFunnelSessionId(): string {
  const id = `fs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  sessionStorage.setItem(FUNNEL_SESSION_KEY, id);
  return id;
}

function getFunnelSessionId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return sessionStorage.getItem(FUNNEL_SESSION_KEY) ?? undefined;
}

export const analytics = {
  // Navigation events
  navClick: (label: string) => trackEvent('nav_click', { link_label: label }),

  // CTA events
  ctaClick: (ctaName: string, destination: string) =>
    trackEvent('cta_click', { cta_name: ctaName, destination }),

  // Form events
  formStart: (formName: string) =>
    trackEvent('form_start', { form_name: formName }),
  formSubmit: (formName: string) =>
    trackEvent('form_submit', { form_name: formName }),
  formError: (formName: string, error: string) =>
    trackEvent('form_error', { form_name: formName, error_message: error }),

  // Engagement events
  mobileMenuToggle: (action: 'open' | 'close') =>
    trackEvent('mobile_menu_toggle', { action }),
  projectClick: (projectSlug: string) =>
    trackEvent('project_click', { project: projectSlug }),
  experienceClick: (experienceSlug: string) =>
    trackEvent('experience_click', { experience: experienceSlug }),
  blogClick: (blogSlug: string) => trackEvent('blog_click', { blog: blogSlug }),

  // Theme events
  themeToggle: (theme: 'light' | 'dark' | 'system') =>
    trackEvent('theme_toggle', { theme }),

  // Audit funnel events — all share a funnel_session_id for GA4 funnel analysis
  auditScanStarted: (url: string) => {
    const funnel_session_id = generateFunnelSessionId();
    trackEvent('audit_scan_started', { url, funnel_session_id });
  },
  auditScanCompleted: (scanId: string, grade: string) =>
    trackEvent('audit_scan_completed', {
      scan_id: scanId,
      grade,
      ...(getFunnelSessionId() && {
        funnel_session_id: getFunnelSessionId()!,
      }),
    }),
  auditScanFailed: (url: string, error: string) =>
    trackEvent('audit_scan_failed', {
      url,
      error_message: error,
      ...(getFunnelSessionId() && {
        funnel_session_id: getFunnelSessionId()!,
      }),
    }),
  auditEmailCaptured: (scanId: string) =>
    trackEvent('audit_email_captured', {
      scan_id: scanId,
      ...(getFunnelSessionId() && {
        funnel_session_id: getFunnelSessionId()!,
      }),
    }),
  auditCalendlyClicked: () =>
    trackEvent('audit_calendly_clicked', {
      ...(getFunnelSessionId() && {
        funnel_session_id: getFunnelSessionId()!,
      }),
    }),
  auditReportShared: (scanId: string) =>
    trackEvent('audit_report_shared', {
      scan_id: scanId,
      ...(getFunnelSessionId() && {
        funnel_session_id: getFunnelSessionId()!,
      }),
    }),
};
