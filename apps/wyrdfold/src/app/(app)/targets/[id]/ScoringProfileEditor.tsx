'use client';

import { useCallback, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@danieljoffe/shared-ui/Card';
import { Text } from '@danieljoffe/shared-ui/Text';
import { Badge } from '@danieljoffe/shared-ui/Badge';
import { Input } from '@danieljoffe/shared-ui/Input';
import { Spinner } from '@danieljoffe/shared-ui/Spinner';
import Button from '@/components/Button';
import { extractApiError } from '@/lib/extractApiError';
import { useToast } from '@/state/Toast/ToastProvider';
import type {
  JobTarget,
  ScoringProfile,
  CategoryProfile,
  SeniorityProfile,
  DomainProfile,
  NegativeProfile,
} from '../types';
import { emptyScoringProfile } from '../types';

interface ScoringProfileEditorProps {
  target: JobTarget;
  onSaved: () => void;
}

function weightBadgeVariant(w: number): 'default' | 'info' | 'brand' {
  if (w === 1) return 'default';
  if (w === 2) return 'info';
  return 'brand';
}

export default function ScoringProfileEditor({
  target,
  onSaved,
}: ScoringProfileEditorProps) {
  const [profile, setProfile] = useState<ScoringProfile>(
    () => target.scoring_profile ?? emptyScoringProfile()
  );
  const [saving, setSaving] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newKeywordByCategory, setNewKeywordByCategory] = useState<
    Record<string, string>
  >({});
  const [newSenioritySignal, setNewSenioritySignal] = useState('');
  const [newDomainSignal, setNewDomainSignal] = useState('');
  const [newNegativeKeyword, setNewNegativeKeyword] = useState('');
  const { toast } = useToast();

  const isDirty = useMemo(
    () => JSON.stringify(profile) !== JSON.stringify(target.scoring_profile),
    [profile, target.scoring_profile]
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/targets/${target.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scoring_profile: profile }),
      });
      if (!res.ok) throw new Error(await extractApiError(res, 'Save failed'));
      toast({ variant: 'success', title: 'Scoring profile saved' });
      onSaved();
    } catch (err) {
      toast({
        variant: 'error',
        title:
          err instanceof Error ? err.message : 'Failed to save scoring profile',
      });
    } finally {
      setSaving(false);
    }
  }, [target.id, profile, toast, onSaved]);

  // ---- Category operations ----

  const addCategory = useCallback(() => {
    const name = newCategoryName.trim().toLowerCase().replace(/\s+/g, '_');
    if (!name || profile.categories[name]) return;
    setProfile(prev => ({
      ...prev,
      categories: {
        ...prev.categories,
        [name]: { keywords: {}, weight: 1.0 },
      },
    }));
    setNewCategoryName('');
  }, [newCategoryName, profile.categories]);

  const removeCategory = useCallback((name: string) => {
    setProfile(prev => {
      const { [name]: _, ...rest } = prev.categories;
      return { ...prev, categories: rest };
    });
  }, []);

  const updateCategoryWeight = useCallback(
    (catName: string, weight: number) => {
      setProfile(prev => ({
        ...prev,
        categories: {
          ...prev.categories,
          [catName]: { ...prev.categories[catName], weight },
        },
      }));
    },
    []
  );

  // ---- Keyword operations ----

  const addKeyword = useCallback(
    (catName: string) => {
      const raw = (newKeywordByCategory[catName] ?? '').trim().toLowerCase();
      if (!raw || profile.categories[catName]?.keywords[raw] !== undefined)
        return;
      setProfile(prev => ({
        ...prev,
        categories: {
          ...prev.categories,
          [catName]: {
            ...prev.categories[catName],
            keywords: { ...prev.categories[catName].keywords, [raw]: 2 },
          },
        },
      }));
      setNewKeywordByCategory(prev => ({ ...prev, [catName]: '' }));
    },
    [newKeywordByCategory, profile.categories]
  );

  const removeKeyword = useCallback((catName: string, keyword: string) => {
    setProfile(prev => {
      const { [keyword]: _, ...rest } = prev.categories[catName].keywords;
      return {
        ...prev,
        categories: {
          ...prev.categories,
          [catName]: { ...prev.categories[catName], keywords: rest },
        },
      };
    });
  }, []);

  const cycleKeywordWeight = useCallback((catName: string, keyword: string) => {
    setProfile(prev => {
      const current = prev.categories[catName].keywords[keyword];
      const next = current >= 3 ? 1 : current + 1;
      return {
        ...prev,
        categories: {
          ...prev.categories,
          [catName]: {
            ...prev.categories[catName],
            keywords: {
              ...prev.categories[catName].keywords,
              [keyword]: next,
            },
          },
        },
      };
    });
  }, []);

  // ---- Seniority operations ----

  const updateSeniority = useCallback((updates: Partial<SeniorityProfile>) => {
    setProfile(prev => ({
      ...prev,
      seniority: { ...prev.seniority, ...updates },
    }));
  }, []);

  const addSenioritySignal = useCallback(() => {
    const signal = newSenioritySignal.trim();
    if (!signal || profile.seniority.signals.includes(signal)) return;
    updateSeniority({ signals: [...profile.seniority.signals, signal] });
    setNewSenioritySignal('');
  }, [newSenioritySignal, profile.seniority.signals, updateSeniority]);

  const removeSenioritySignal = useCallback(
    (signal: string) => {
      updateSeniority({
        signals: profile.seniority.signals.filter(s => s !== signal),
      });
    },
    [profile.seniority.signals, updateSeniority]
  );

  // ---- Domain operations ----

  const updateDomain = useCallback((updates: Partial<DomainProfile>) => {
    setProfile(prev => ({
      ...prev,
      domain: { ...prev.domain, ...updates },
    }));
  }, []);

  const addDomainSignal = useCallback(() => {
    const signal = newDomainSignal.trim();
    if (!signal || profile.domain.signals.includes(signal)) return;
    updateDomain({ signals: [...profile.domain.signals, signal] });
    setNewDomainSignal('');
  }, [newDomainSignal, profile.domain.signals, updateDomain]);

  const removeDomainSignal = useCallback(
    (signal: string) => {
      updateDomain({
        signals: profile.domain.signals.filter(s => s !== signal),
      });
    },
    [profile.domain.signals, updateDomain]
  );

  // ---- Negative operations ----

  const updateNegative = useCallback((updates: Partial<NegativeProfile>) => {
    setProfile(prev => ({
      ...prev,
      negative: { ...prev.negative, ...updates },
    }));
  }, []);

  const addNegativeKeyword = useCallback(() => {
    const kw = newNegativeKeyword.trim().toLowerCase();
    if (!kw || profile.negative.keywords.includes(kw)) return;
    updateNegative({ keywords: [...profile.negative.keywords, kw] });
    setNewNegativeKeyword('');
  }, [newNegativeKeyword, profile.negative.keywords, updateNegative]);

  const removeNegativeKeyword = useCallback(
    (kw: string) => {
      updateNegative({
        keywords: profile.negative.keywords.filter(k => k !== kw),
      });
    },
    [profile.negative.keywords, updateNegative]
  );

  const totalKeywords = useMemo(
    () =>
      Object.values(profile.categories).reduce(
        (sum, c) => sum + Object.keys(c.keywords).length,
        0
      ),
    [profile.categories]
  );

  return (
    <div className='flex flex-col gap-4'>
      {/* ---- Categories ---- */}
      <Card>
        <CardHeader>
          <div className='flex items-baseline justify-between gap-2'>
            <CardTitle>Categories</CardTitle>
            <Text variant='meta' className='text-text-tertiary'>
              {Object.keys(profile.categories).length} categories ·{' '}
              {totalKeywords} keywords
            </Text>
          </div>
          <Text variant='meta' className='text-text-secondary'>
            Group keywords by theme. Each keyword gets a 1–3 weight (click to
            cycle); category weight scales the whole group.
          </Text>
        </CardHeader>
        <CardContent className='flex flex-col gap-3'>
          {Object.entries(profile.categories).map(
            ([catName, cat]: [string, CategoryProfile]) => (
              <div
                key={catName}
                className='rounded-lg border border-border p-4 flex flex-col gap-3'
              >
                <div className='flex items-center justify-between gap-2'>
                  <Text variant='label' as='span'>
                    {catName}
                  </Text>
                  <div className='flex items-center gap-2'>
                    <label className='flex items-center gap-1 text-xs text-text-secondary'>
                      Weight:
                      <input
                        type='number'
                        aria-label={`Weight for ${catName} category`}
                        value={cat.weight}
                        onChange={e =>
                          updateCategoryWeight(
                            catName,
                            parseFloat(e.target.value) || 0
                          )
                        }
                        step={0.1}
                        min={0}
                        // Chrome's a11y tree reports ``aria-valuemax="0"``
                        // when ``max`` is omitted on ``<input type=number>``
                        // — screen readers then announce "max reached" on
                        // every value > 0 and keyboard arrow-step gets the
                        // wrong upper limit. ``max=10`` keeps the editor's
                        // useful range while making the SR announcement
                        // honest. (WCAG 2.1 SC 4.1.2.)
                        max={10}
                        className='w-16 rounded border border-border bg-surface px-2 py-1 text-xs text-text-primary'
                      />
                    </label>
                    <Button
                      name={`target-cat-delete-${catName}`}
                      variant='bare'
                      size='sm'
                      iconOnly
                      onClick={() => removeCategory(catName)}
                      aria-label={`Remove ${catName} category`}
                      className='text-text-tertiary hover:text-error'
                    >
                      <Trash2 className='size-3.5' />
                    </Button>
                  </div>
                </div>

                <div className='flex flex-wrap gap-2'>
                  {Object.entries(cat.keywords).map(([kw, weight]) => (
                    <span
                      key={kw}
                      className='group flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs'
                    >
                      <button
                        type='button'
                        onClick={() => cycleKeywordWeight(catName, kw)}
                        className='flex items-center gap-1 transition-colors hover:text-brand-500'
                        aria-label={`Cycle weight for ${kw}`}
                      >
                        <span className='text-text-primary'>{kw}</span>
                        <Badge variant={weightBadgeVariant(weight)} size='sm'>
                          {weight}
                        </Badge>
                      </button>
                      <button
                        type='button'
                        onClick={() => removeKeyword(catName, kw)}
                        className='ml-0.5 text-text-tertiary hover:text-error'
                        aria-label={`Remove ${kw}`}
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>

                <div className='flex items-center gap-2'>
                  <input
                    type='text'
                    placeholder='Add keyword'
                    aria-label={`Add keyword to ${catName}`}
                    value={newKeywordByCategory[catName] ?? ''}
                    onChange={e =>
                      setNewKeywordByCategory(prev => ({
                        ...prev,
                        [catName]: e.target.value,
                      }))
                    }
                    onKeyDown={e => {
                      if (e.key === 'Enter') addKeyword(catName);
                    }}
                    className='flex-1 rounded border border-border bg-surface px-2 py-1 text-xs text-text-primary placeholder:text-text-tertiary'
                  />
                  <Button
                    name={`target-kw-add-${catName}`}
                    variant='outline'
                    size='sm'
                    onClick={() => addKeyword(catName)}
                  >
                    <Plus className='size-3' aria-hidden />
                  </Button>
                </div>
              </div>
            )
          )}

          <div className='flex items-center gap-2'>
            <input
              type='text'
              placeholder='New category name'
              aria-label='New category name'
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') addCategory();
              }}
              className='flex-1 rounded border border-border bg-surface px-2 py-1 text-sm text-text-primary placeholder:text-text-tertiary'
            />
            <Button
              name='target-cat-add'
              variant='outline'
              size='sm'
              onClick={addCategory}
            >
              <Plus className='size-4' aria-hidden />
              <span>Add Category</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ---- Seniority ---- */}
      <Card>
        <CardHeader>
          <div className='flex items-baseline justify-between gap-2'>
            <CardTitle>Seniority</CardTitle>
            <Text variant='meta' className='text-text-tertiary'>
              {profile.seniority.signals.length} signals
            </Text>
          </div>
          <Text variant='meta' className='text-text-secondary'>
            What level you&rsquo;re aiming for and the language that signals it
            in a posting.
          </Text>
        </CardHeader>
        <CardContent className='flex flex-col gap-3'>
          <div className='max-w-xs'>
            <Input
              label='Level'
              value={profile.seniority.level ?? ''}
              onChange={e =>
                updateSeniority({
                  level: e.target.value || null,
                })
              }
              placeholder='e.g. senior, staff'
              size='sm'
            />
          </div>
          <TagList
            label='Signals'
            items={profile.seniority.signals}
            newValue={newSenioritySignal}
            onNewValueChange={setNewSenioritySignal}
            onAdd={addSenioritySignal}
            onRemove={removeSenioritySignal}
          />
        </CardContent>
      </Card>

      {/* ---- Domain ---- */}
      <Card>
        <CardHeader>
          <div className='flex items-baseline justify-between gap-2'>
            <CardTitle>Domain</CardTitle>
            <Text variant='meta' className='text-text-tertiary'>
              {profile.domain.signals.length} signals
            </Text>
          </div>
          <Text variant='meta' className='text-text-secondary'>
            Industry / problem-space cues. Multiplier applied to the bucket as a
            whole.
          </Text>
        </CardHeader>
        <CardContent className='flex flex-col gap-3'>
          <label className='flex items-center gap-1 text-xs text-text-secondary'>
            Weight:
            <input
              type='number'
              aria-label='Domain weight'
              value={profile.domain.weight}
              onChange={e =>
                updateDomain({
                  weight: parseFloat(e.target.value) || 0,
                })
              }
              step={0.1}
              // See category-weight block above — explicit bounds keep
              // the a11y tree honest.
              min={0}
              max={10}
              className='w-16 rounded border border-border bg-surface px-2 py-1 text-xs text-text-primary'
            />
          </label>
          <TagList
            label='Signals'
            items={profile.domain.signals}
            newValue={newDomainSignal}
            onNewValueChange={setNewDomainSignal}
            onAdd={addDomainSignal}
            onRemove={removeDomainSignal}
          />
        </CardContent>
      </Card>

      {/* ---- Negative ---- */}
      <Card>
        <CardHeader>
          <div className='flex items-baseline justify-between gap-2'>
            <CardTitle>Penalties</CardTitle>
            <Text variant='meta' className='text-text-tertiary'>
              {profile.negative.keywords.length} keywords
            </Text>
          </div>
          <Text variant='meta' className='text-text-secondary'>
            Keywords that should drag a posting&rsquo;s score down (e.g.
            misaligned tech, role types).
          </Text>
        </CardHeader>
        <CardContent className='flex flex-col gap-3'>
          <label className='flex items-center gap-1 text-xs text-text-secondary'>
            Weight:
            <input
              type='number'
              aria-label='Negative keywords weight'
              value={profile.negative.weight}
              onChange={e =>
                updateNegative({
                  weight: parseFloat(e.target.value) || 0,
                })
              }
              step={1}
              // Penalty weights are always negative (drag the score
              // down). See category-weight block for the broader a11y
              // rationale on explicit bounds.
              min={-100}
              max={0}
              className='w-16 rounded border border-border bg-surface px-2 py-1 text-xs text-text-primary'
            />
          </label>
          <TagList
            label='Keywords'
            items={profile.negative.keywords}
            newValue={newNegativeKeyword}
            onNewValueChange={setNewNegativeKeyword}
            onAdd={addNegativeKeyword}
            onRemove={removeNegativeKeyword}
          />
        </CardContent>
      </Card>

      {/* Sticky save bar — only visible while there are unsaved changes.
          Sits above any other bottom-fixed UI (jobs batch bar reserves
          its own space at the route level). */}
      {isDirty && (
        <div
          className='sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-elevated px-4 py-2.5 shadow-lg'
          role='status'
          aria-live='polite'
        >
          <Text variant='caption' className='text-warning'>
            Unsaved changes
          </Text>
          <Button
            name='target-profile-save'
            variant='primary'
            size='sm'
            onClick={handleSave}
            disabled={saving}
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
      )}
    </div>
  );
}

// ---- Reusable tag list sub-component ----

interface TagListProps {
  label: string;
  items: string[];
  newValue: string;
  onNewValueChange: (v: string) => void;
  onAdd: () => void;
  onRemove: (item: string) => void;
}

function TagList({
  label,
  items,
  newValue,
  onNewValueChange,
  onAdd,
  onRemove,
}: TagListProps) {
  return (
    <div className='flex flex-col gap-2'>
      <Text variant='label' as='span'>
        {label}
      </Text>
      <div className='flex flex-wrap gap-1.5'>
        {items.map(item => (
          <span
            key={item}
            className='flex items-center gap-1 rounded-full bg-surface-secondary px-2.5 py-1 text-xs text-text-primary'
          >
            {item}
            <button
              type='button'
              onClick={() => onRemove(item)}
              className='text-text-tertiary hover:text-error'
              aria-label={`Remove ${item}`}
            >
              &times;
            </button>
          </span>
        ))}
      </div>
      <div className='flex items-center gap-2'>
        <input
          type='text'
          placeholder={`Add ${label.toLowerCase()}`}
          aria-label={`Add ${label.toLowerCase()}`}
          value={newValue}
          onChange={e => onNewValueChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') onAdd();
          }}
          className='flex-1 rounded border border-border bg-surface px-2 py-1 text-xs text-text-primary placeholder:text-text-tertiary'
        />
        <Button
          name={`target-tag-add-${label.toLowerCase().replace(/\s+/g, '-')}`}
          variant='outline'
          size='sm'
          onClick={onAdd}
        >
          <Plus className='size-3' aria-hidden />
        </Button>
      </div>
    </div>
  );
}
