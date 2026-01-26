import { sendGAEvent } from '@/app/home/GoogleAnalytics';

type EventParams = Record<string, string | number | boolean>;

function trackEvent(eventName: string, params?: EventParams) {
  // Skip during SSR
  if (typeof window === 'undefined') return;

  // sendGAEvent pushes arguments to dataLayer, mimicking gtag('event', name, params)
  sendGAEvent(
    'event' as unknown as object,
    eventName as unknown as object,
    params as object
  );
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

  // Theme events
  themeToggle: (theme: 'light' | 'dark') =>
    trackEvent('theme_toggle', { theme }),
};
