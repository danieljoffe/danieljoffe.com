type EventParams = Record<string, string | number | boolean>;

function trackEvent(eventName: string, params?: EventParams) {
  // Skip during SSR
  if (typeof window === 'undefined') return;

  window.gtag?.('event', eventName, params ?? {});
}

export const analytics = {
  // Navigation events
  navClick: (label: string) => trackEvent('nav_click', { link_label: label }),

  // CTA events
  ctaClick: (ctaName: string, destination: string) =>
    trackEvent('cta_click', { cta_name: ctaName, destination }),

  // Form events. form_start fires when the form scrolls into view (impression);
  // form_engage fires on first field focus (the real "started filling it in").
  formStart: (formName: string) =>
    trackEvent('form_start', { form_name: formName }),
  formEngage: (formName: string) =>
    trackEvent('form_engage', { form_name: formName }),
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

  // Site search (⌘K command palette)
  searchOpen: () => trackEvent('search_open'),
  search: (query: string, destination: string) =>
    trackEvent('search', { search_term: query, destination }),

  // 404s — surfaces broken inbound links by path
  notFound: (path: string) => trackEvent('not_found', { page_path: path }),
};
