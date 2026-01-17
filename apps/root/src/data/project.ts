export const projectSlugs = {
  uiV1: 'ui-components-v1',
  csPerformance: 'performance-case-study',
  csCLibrary: 'component-library-case-study',
  csCMSTooling: 'cms-tooling-case-study',
  csA11y: 'accessibility-serials-study-case',
  csModernPractice: 'portfolio-modern-practice-study-case',
  csLogisticsDashboard: 'logistics-dashboard-study-case',
} as const;

export const projectPageSlugs = [...Object.values(projectSlugs)];
