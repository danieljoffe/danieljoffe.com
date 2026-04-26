'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@danieljoffe.com/shared-ui/Badge';
import { Modal } from '@danieljoffe.com/shared-ui/Modal';
import { Spinner } from '@danieljoffe.com/shared-ui/Spinner';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import Button from '@/components/Button';
import { useToast } from '@/state/Toast/ToastProvider';
import type {
  LintViolation,
  TailoredResumePayload,
  TailoredResumeRecord,
  TailorResponse,
} from './types';

interface ResumeEditorProps {
  jobPostingId: string;
  companyName: string;
  jobTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onApproved: () => void;
}

export default function ResumeEditor({
  jobPostingId,
  companyName,
  jobTitle,
  isOpen,
  onClose,
  onApproved,
}: ResumeEditorProps) {
  const [record, setRecord] = useState<TailoredResumeRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [lintWarnings, setLintWarnings] = useState<LintViolation[]>([]);

  // Editable fields
  const [summary, setSummary] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [experience, setExperience] = useState<
    TailoredResumePayload['experience']
  >([]);
  const [dirty, setDirty] = useState(false);

  const { toast } = useToast();

  const loadResume = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/tailor/by-job/${jobPostingId}`);
      if (!res.ok) {
        toast({ variant: 'error', title: 'Failed to load resume' });
        onClose();
        return;
      }
      const data = (await res.json()) as TailoredResumeRecord;
      setRecord(data);
      setSummary(data.payload.summary);
      setSkills([...data.payload.skills]);
      setExperience(
        data.payload.experience.map(r => ({
          ...r,
          bullets: r.bullets.map(b => ({ ...b })),
        }))
      );
      setDirty(false);
    } catch {
      toast({ variant: 'error', title: 'Network error loading resume' });
      onClose();
    } finally {
      setLoading(false);
    }
  }, [jobPostingId, onClose, toast]);

  useEffect(() => {
    if (isOpen) {
      loadResume();
    }
  }, [isOpen, loadResume]);

  function markDirty() {
    setDirty(true);
  }

  async function handleSave() {
    if (!record) return;
    setSaving(true);
    setLintWarnings([]);
    try {
      const body: Record<string, unknown> = {};
      if (summary !== record.payload.summary) body['summary'] = summary;
      if (JSON.stringify(skills) !== JSON.stringify(record.payload.skills)) {
        body['skills'] = skills;
      }
      if (
        JSON.stringify(experience) !== JSON.stringify(record.payload.experience)
      ) {
        body['experience'] = experience;
      }

      if (Object.keys(body).length === 0) {
        toast({ variant: 'info', title: 'No changes to save' });
        setSaving(false);
        return;
      }

      const res = await fetch(`/api/jobs/tailor/${record.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.status === 422) {
        const err = await res.json();
        toast({ variant: 'error', title: 'Resume failed ATS lint check' });
        if (err.detail?.violations) {
          setLintWarnings(err.detail.violations as LintViolation[]);
        }
        return;
      }

      if (!res.ok) {
        toast({ variant: 'error', title: 'Failed to save changes' });
        return;
      }

      const data = (await res.json()) as TailorResponse;
      setRecord(data.record);
      setLintWarnings(data.lint_warnings);
      setDirty(false);
      toast({ variant: 'success', title: 'Draft saved' });
    } catch {
      toast({ variant: 'error', title: 'Network error saving draft' });
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove() {
    if (!record) return;
    /* eslint-disable no-alert -- personal tool, native confirm is fine */
    if (
      !window.confirm(
        'Approve and lock this resume? It cannot be edited after approval.'
      )
    )
      /* eslint-enable no-alert */
      return;

    setApproving(true);
    try {
      const res = await fetch(`/api/jobs/tailor/${record.id}/approve`, {
        method: 'POST',
      });
      if (!res.ok) {
        toast({ variant: 'error', title: 'Failed to approve resume' });
        return;
      }
      toast({ variant: 'success', title: 'Resume approved' });
      onApproved();
      onClose();
    } catch {
      toast({ variant: 'error', title: 'Network error approving resume' });
    } finally {
      setApproving(false);
    }
  }

  async function handleDownload() {
    if (!record) return;
    try {
      const res = await fetch(`/api/jobs/tailor/${record.id}/download`);
      if (!res.ok) {
        toast({ variant: 'error', title: 'Download failed' });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${companyName.replace(/\s+/g, '_')}_resume.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ variant: 'error', title: 'Network error downloading resume' });
    }
  }

  function handleClose() {
    /* eslint-disable no-alert -- personal tool, native confirm is fine */
    if (dirty && !window.confirm('You have unsaved changes. Discard them?'))
      /* eslint-enable no-alert */
      return;
    onClose();
  }

  function removeSkill(index: number) {
    setSkills(prev => prev.filter((_, i) => i !== index));
    markDirty();
  }

  function addSkill() {
    const trimmed = newSkill.trim();
    if (!trimmed || skills.includes(trimmed)) return;
    setSkills(prev => [...prev, trimmed]);
    setNewSkill('');
    markDirty();
  }

  function updateBullet(roleIndex: number, bulletIndex: number, text: string) {
    setExperience(prev =>
      prev.map((role, ri) =>
        ri === roleIndex
          ? {
              ...role,
              bullets: role.bullets.map((b, bi) =>
                bi === bulletIndex ? { ...b, text } : b
              ),
            }
          : role
      )
    );
    markDirty();
  }

  function removeBullet(roleIndex: number, bulletIndex: number) {
    setExperience(prev =>
      prev.map((role, ri) =>
        ri === roleIndex
          ? {
              ...role,
              bullets: role.bullets.filter((_, bi) => bi !== bulletIndex),
            }
          : role
      )
    );
    markDirty();
  }

  function addBullet(roleIndex: number) {
    setExperience(prev =>
      prev.map((role, ri) =>
        ri === roleIndex
          ? {
              ...role,
              bullets: [
                ...role.bullets,
                { text: '', source_outcome_ref: null },
              ],
            }
          : role
      )
    );
    markDirty();
  }

  const isApproved =
    record?.approved_at !== null && record?.approved_at !== undefined;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Review Resume \u2014 ${companyName} / ${jobTitle}`}
      size='xl'
      footer={
        <div className='flex gap-2 w-full justify-between'>
          <Button
            name='download-docx'
            variant='secondary'
            size='sm'
            onClick={handleDownload}
            disabled={loading}
          >
            Download .docx
          </Button>
          <div className='flex gap-2'>
            <Button
              name='save-draft'
              variant='outline'
              size='sm'
              onClick={handleSave}
              disabled={saving || loading || isApproved || !dirty}
            >
              {saving ? 'Saving...' : 'Save Draft'}
            </Button>
            <Button
              name='approve-resume'
              variant='primary'
              size='sm'
              onClick={handleApprove}
              disabled={approving || loading || isApproved || dirty}
            >
              {approving
                ? 'Approving...'
                : isApproved
                  ? 'Approved'
                  : 'Approve & Lock'}
            </Button>
          </div>
        </div>
      }
    >
      {loading ? (
        <div className='flex items-center justify-center py-12'>
          <Spinner size='lg' />
        </div>
      ) : (
        <div className='space-y-6 max-h-[60vh] overflow-y-auto'>
          {/* Lint warnings */}
          {lintWarnings.length > 0 && (
            <div className='rounded-md bg-warning/10 border border-warning/30 p-3'>
              <Text variant='caption' className='text-warning mb-1'>
                ATS Lint Warnings
              </Text>
              <ul className='list-disc list-inside space-y-1'>
                {lintWarnings.map((w, i) => (
                  <li key={i}>
                    <Text variant='meta' as='span'>
                      [{w.code}] {w.message}
                    </Text>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {isApproved && (
            <div className='rounded-md bg-success/10 border border-success/30 p-3'>
              <Text variant='body' className='text-success'>
                This resume has been approved and is locked for editing.
              </Text>
            </div>
          )}

          {/* Generation metadata */}
          {record && record.cost_usd > 0 && (
            <div className='flex flex-wrap gap-x-4 gap-y-1 rounded-md bg-surface-secondary px-3 py-2'>
              <Text variant='meta' as='span'>
                Cost: ${record.cost_usd.toFixed(4)}
              </Text>
              <Text variant='meta' as='span'>
                Tokens:{' '}
                {(record.input_tokens + record.output_tokens).toLocaleString()}
              </Text>
              {record.model && (
                <Text variant='meta' as='span'>
                  Model: {record.model}
                </Text>
              )}
              <Text variant='meta' as='span'>
                Latency: {(record.latency_ms / 1000).toFixed(1)}s
              </Text>
            </div>
          )}

          {/* Summary */}
          <div>
            <Text variant='caption' className='mb-1'>
              Summary
            </Text>
            <textarea
              aria-label='Summary'
              className='w-full rounded-md border border-border bg-surface p-3 text-sm font-mono resize-y min-h-[100px]'
              value={summary}
              onChange={e => {
                setSummary(e.target.value);
                markDirty();
              }}
              maxLength={600}
              disabled={isApproved}
            />
            <Text variant='meta' className='text-right'>
              {summary.length}/600
            </Text>
          </div>

          {/* Skills */}
          <div>
            <Text variant='caption' className='mb-1'>
              Skills
            </Text>
            <div className='flex flex-wrap gap-2 mb-2'>
              {skills.map((skill, i) => (
                <Badge key={`${skill}-${i}`} variant='info' size='sm'>
                  {skill}
                  {!isApproved && (
                    <button
                      type='button'
                      onClick={() => removeSkill(i)}
                      className='ml-1 text-xs opacity-60 hover:opacity-100'
                      aria-label={`Remove ${skill}`}
                    >
                      ×
                    </button>
                  )}
                </Badge>
              ))}
            </div>
            {!isApproved && (
              <div className='flex gap-2'>
                <input
                  type='text'
                  aria-label='New skill'
                  className='flex-1 rounded-md border border-border bg-surface px-3 py-1.5 text-sm'
                  value={newSkill}
                  onChange={e => setNewSkill(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addSkill();
                    }
                  }}
                  placeholder='Add skill...'
                />
                <Button
                  name='add-skill'
                  variant='outline'
                  size='sm'
                  onClick={addSkill}
                >
                  Add
                </Button>
              </div>
            )}
          </div>

          {/* Experience */}
          <div>
            <Text variant='caption' className='mb-2'>
              Experience
            </Text>
            <div className='space-y-4'>
              {experience.map((role, ri) => (
                <div
                  key={`${role.company}-${role.title}-${ri}`}
                  className='border border-border rounded-md p-3'
                >
                  <div className='flex items-baseline gap-2 mb-2'>
                    <Text variant='body' className='font-semibold'>
                      {role.title}
                    </Text>
                    <Text variant='meta'>at {role.company}</Text>
                    <Text variant='meta' className='ml-auto'>
                      {role.start} – {role.end ?? 'Present'}
                    </Text>
                  </div>
                  <ul className='space-y-2'>
                    {role.bullets.map((bullet, bi) => (
                      <li key={bi} className='flex gap-2 items-start'>
                        <span className='text-text-secondary mt-1.5'>•</span>
                        <input
                          type='text'
                          aria-label={`Bullet ${bi + 1} for ${role.title} at ${role.company}`}
                          className='flex-1 rounded border border-border bg-surface px-2 py-1 text-sm'
                          value={bullet.text}
                          onChange={e => updateBullet(ri, bi, e.target.value)}
                          disabled={isApproved}
                        />
                        {!isApproved && (
                          <button
                            type='button'
                            onClick={() => removeBullet(ri, bi)}
                            className='text-error text-xs px-1 hover:opacity-80'
                            aria-label='Remove bullet'
                          >
                            ×
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                  {!isApproved && (
                    <Button
                      name={`add-bullet-${ri}`}
                      variant='ghost'
                      size='sm'
                      onClick={() => addBullet(ri)}
                      className='mt-2'
                    >
                      + Add bullet
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Education (read-only) */}
          {record?.payload.education && record.payload.education.length > 0 && (
            <div>
              <Text variant='caption' className='mb-1'>
                Education
              </Text>
              {record.payload.education.map((edu, i) => (
                <div key={i} className='flex gap-2'>
                  <Text variant='body'>{edu.school}</Text>
                  {edu.degree && <Text variant='meta'>, {edu.degree}</Text>}
                  {edu.dates && <Text variant='meta'>({edu.dates})</Text>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
