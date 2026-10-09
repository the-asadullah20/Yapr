/**
 * Report categories and block action helpers
 */
export const REPORT_CATEGORIES = [
  'Spam or misleading',
  'Harassment or hate speech',
  'Violence or harmful content',
  'Impersonation',
  'Copyright infringement',
] as const;

export type ReportCategory = (typeof REPORT_CATEGORIES)[number];
