/**
 * Resume style catalog — the client mirror of the backend preset model
 * (`app/models/user_profile.py` + `app/services/docx/style.py`).
 *
 * Users pick a `preset` (typography/spacing) and an `accent` (heading color).
 * The exact server typography is intentionally not exposed; the values here
 * are only for the in-browser preview approximation.
 */

export type ResumeStylePreset = 'modern' | 'classic' | 'compact' | 'executive';
export type ResumeStyleAccent =
  | 'slate'
  | 'navy'
  | 'black'
  | 'burgundy'
  | 'forest';

export interface ResumeStyleSettings {
  preset: ResumeStylePreset;
  accent: ResumeStyleAccent;
}

export const DEFAULT_RESUME_STYLE: ResumeStyleSettings = {
  preset: 'modern',
  accent: 'slate',
};

export const PRESET_OPTIONS: { value: ResumeStylePreset; label: string }[] = [
  { value: 'modern', label: 'Modern — Calibri, balanced' },
  { value: 'classic', label: 'Classic — Georgia serif' },
  { value: 'compact', label: 'Compact — dense, fits more' },
  { value: 'executive', label: 'Executive — airy, senior roles' },
];

export const ACCENT_OPTIONS: { value: ResumeStyleAccent; label: string }[] = [
  { value: 'slate', label: 'Slate' },
  { value: 'navy', label: 'Navy' },
  { value: 'black', label: 'Black (no color)' },
  { value: 'burgundy', label: 'Burgundy' },
  { value: 'forest', label: 'Forest' },
];

/** Heading/name color per accent — matches ACCENT_HEX server-side. */
export const ACCENT_HEX: Record<ResumeStyleAccent, string> = {
  slate: '#1F2937',
  navy: '#1E3A5F',
  black: '#000000',
  burgundy: '#6B1F2A',
  forest: '#1E4034',
};

interface PresetPreview {
  fontFamily: string;
  bodyPt: number;
  namePt: number;
  headingPt: number;
  lineHeight: number;
}

/** Approximate CSS rendering of each preset for the live sample. */
export const PRESET_PREVIEW: Record<ResumeStylePreset, PresetPreview> = {
  modern: {
    fontFamily: 'Calibri, "Segoe UI", sans-serif',
    bodyPt: 10.5,
    namePt: 20,
    headingPt: 12,
    lineHeight: 1.12,
  },
  classic: {
    fontFamily: 'Georgia, "Times New Roman", serif',
    bodyPt: 10.5,
    namePt: 22,
    headingPt: 13,
    lineHeight: 1.15,
  },
  compact: {
    fontFamily: 'Calibri, "Segoe UI", sans-serif',
    bodyPt: 10,
    namePt: 18,
    headingPt: 11,
    lineHeight: 1.0,
  },
  executive: {
    fontFamily: 'Helvetica, Arial, sans-serif',
    bodyPt: 11,
    namePt: 24,
    headingPt: 13,
    lineHeight: 1.2,
  },
};
