// Internal named handles used only to build (and order) projectPageSlugs below.
// The display order of posts now lives in each MDX's `order` metadata field;
// this array's order backs AllowedProjectSlugs, the About list, and ItemLists.
const projectSlugs = {
  uiV1: 'ui-components-v1',
  uiV2: 'ui-components-v2',
  csPerformance: 'performance-case-study',
  csCLibrary: 'component-library-case-study',
  csCMSTooling: 'cms-tooling-case-study',
  csA11y: 'accessibility-serials-study-case',
  csModernPractice: 'portfolio-modern-practice-study-case',
  csLogisticsDashboard: 'logistics-dashboard-study-case',
  csContactForm: 'contact-form-case-study',
  csAppContext: 'appcontext-simplification-case-study',
  csJobPipeline: 'job-pipeline-case-study',
  csApiPerformance: 'api-performance-case-study',
  csAuditTool: 'audit-tool-case-study',
  csSharedUi: 'shared-ui-case-study',
  csWyrdFold: 'wyrdfold-case-study',
} as const;

export const projectPageSlugs = [...Object.values(projectSlugs)];
