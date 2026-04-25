'use client';

import { useCallback, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@danieljoffe.com/shared-ui/Card';
import { Input } from '@danieljoffe.com/shared-ui/Input';
import { Spinner } from '@danieljoffe.com/shared-ui/Spinner';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import Button from '@/components/Button';
import { useToast } from '@/state/Toast/ToastProvider';
import type { JobTarget, ResumeEmphasis } from '../types';
import { emptyResumeEmphasis } from '../types';

interface ResumeEmphasisEditorProps {
  target: JobTarget;
  onSaved: () => void;
}

export default function ResumeEmphasisEditor({
  target,
  onSaved,
}: ResumeEmphasisEditorProps) {
  const [emphasis, setEmphasis] = useState<ResumeEmphasis>(
    () => target.resume_emphasis ?? emptyResumeEmphasis()
  );
  const [saving, setSaving] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [newOutcome, setNewOutcome] = useState('');
  const { toast } = useToast();

  const isDirty = useMemo(
    () => JSON.stringify(emphasis) !== JSON.stringify(target.resume_emphasis),
    [emphasis, target.resume_emphasis]
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/targets/${target.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume_emphasis: emphasis }),
      });
      if (!res.ok) throw new Error('Save failed');
      toast({ variant: 'success', title: 'Resume emphasis saved' });
      onSaved();
    } catch {
      toast({ variant: 'error', title: 'Failed to save resume emphasis' });
    } finally {
      setSaving(false);
    }
  }, [target.id, emphasis, toast, onSaved]);

  const addSkill = useCallback(() => {
    const skill = newSkill.trim();
    if (!skill || emphasis.focus_skills.includes(skill)) return;
    setEmphasis(prev => ({
      ...prev,
      focus_skills: [...prev.focus_skills, skill],
    }));
    setNewSkill('');
  }, [newSkill, emphasis.focus_skills]);

  const removeSkill = useCallback((skill: string) => {
    setEmphasis(prev => ({
      ...prev,
      focus_skills: prev.focus_skills.filter(s => s !== skill),
    }));
  }, []);

  const addOutcome = useCallback(() => {
    const outcome = newOutcome.trim();
    if (!outcome || emphasis.focus_outcomes.includes(outcome)) return;
    setEmphasis(prev => ({
      ...prev,
      focus_outcomes: [...prev.focus_outcomes, outcome],
    }));
    setNewOutcome('');
  }, [newOutcome, emphasis.focus_outcomes]);

  const removeOutcome = useCallback((outcome: string) => {
    setEmphasis(prev => ({
      ...prev,
      focus_outcomes: prev.focus_outcomes.filter(o => o !== outcome),
    }));
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <CardTitle>Resume Emphasis</CardTitle>
          <Button
            name='target-emphasis-save'
            variant='primary'
            size='sm'
            onClick={handleSave}
            disabled={saving || !isDirty}
          >
            {saving ? (
              <>
                <Spinner size='sm' />
                <span>Saving...</span>
              </>
            ) : (
              'Save'
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className='flex flex-col gap-5'>
        {/* Focus Skills */}
        <div className='flex flex-col gap-2'>
          <Text variant='label' as='span'>
            Focus Skills
          </Text>
          <div className='flex flex-wrap gap-1.5'>
            {emphasis.focus_skills.map(skill => (
              <span
                key={skill}
                className='flex items-center gap-1 rounded-full bg-surface-secondary px-2.5 py-1 text-xs text-text-primary'
              >
                {skill}
                <button
                  type='button'
                  onClick={() => removeSkill(skill)}
                  className='text-text-tertiary hover:text-error'
                  aria-label={`Remove ${skill}`}
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
          <div className='flex items-center gap-2'>
            <input
              type='text'
              placeholder='Add skill'
              aria-label='Add skill to emphasize'
              value={newSkill}
              onChange={e => setNewSkill(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') addSkill();
              }}
              className='flex-1 rounded border border-border bg-surface px-2 py-1 text-xs text-text-primary placeholder:text-text-tertiary'
            />
            <Button
              name='target-skill-add'
              variant='outline'
              size='sm'
              onClick={addSkill}
            >
              <Plus className='size-3' aria-hidden />
            </Button>
          </div>
        </div>

        {/* Focus Outcomes */}
        <div className='flex flex-col gap-2'>
          <Text variant='label' as='span'>
            Focus Outcomes
          </Text>
          <div className='flex flex-wrap gap-1.5'>
            {emphasis.focus_outcomes.map(outcome => (
              <span
                key={outcome}
                className='flex items-center gap-1 rounded-full bg-surface-secondary px-2.5 py-1 text-xs text-text-primary'
              >
                {outcome}
                <button
                  type='button'
                  onClick={() => removeOutcome(outcome)}
                  className='text-text-tertiary hover:text-error'
                  aria-label={`Remove ${outcome}`}
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
          <div className='flex items-center gap-2'>
            <input
              type='text'
              placeholder='Add outcome'
              aria-label='Add focus outcome'
              value={newOutcome}
              onChange={e => setNewOutcome(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') addOutcome();
              }}
              className='flex-1 rounded border border-border bg-surface px-2 py-1 text-xs text-text-primary placeholder:text-text-tertiary'
            />
            <Button
              name='target-outcome-add'
              variant='outline'
              size='sm'
              onClick={addOutcome}
            >
              <Plus className='size-3' aria-hidden />
            </Button>
          </div>
        </div>

        {/* Tone */}
        <Input
          label='Tone'
          placeholder='e.g. technical, leadership-focused, startup-friendly'
          value={emphasis.tone ?? ''}
          onChange={e =>
            setEmphasis(prev => ({
              ...prev,
              tone: e.target.value || null,
            }))
          }
        />

        {isDirty && (
          <Text variant='caption' as='p' className='text-warning'>
            Unsaved changes
          </Text>
        )}
      </CardContent>
    </Card>
  );
}
