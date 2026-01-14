export const projectSlugs = {
  uiV1: 'ui-components-v1',
  csPerformance: 'performance-case-study',
  csCLibrary: 'component-library-case-study',
  csCMSTooling: 'cms-tooling-case-study',
  csA11y: 'a11y-serials-case-study',
  csModernPractice: 'modern-practice-case-study',
  csLogisticsDashboard: 'logistics-dashboard-case-study',
} as const;

export const projectPageSlugs = [...Object.values(projectSlugs)];
