'use client';

import { useCallback, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@danieljoffe.com/shared-ui/Card';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import { Badge } from '@danieljoffe.com/shared-ui/Badge';
import { Input } from '@danieljoffe.com/shared-ui/Input';
import { Spinner } from '@danieljoffe.com/shared-ui/Spinner';
import Button from '@/components/Button';
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
      if (!res.ok) throw new Error('Save failed');
      toast({ variant: 'success', title: 'Scoring profile saved' });
      onSaved();
    } catch {
      toast({ variant: 'error', title: 'Failed to save scoring profile' });
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

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <CardTitle>Scoring Profile</CardTitle>
          <Button
            name='target-profile-save'
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
      <CardContent className='flex flex-col gap-6'>
        {/* ---- Categories ---- */}
        <section className='flex flex-col gap-4'>
          <Heading variant='section' as='h3'>
            Categories
          </Heading>

          {Object.entries(profile.categories).map(
            ([catName, cat]: [string, CategoryProfile]) => (
              <div
                key={catName}
                className='rounded-lg border border-border p-4 flex flex-col gap-3'
              >
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <Text variant='label' as='span'>
                      {catName}
                    </Text>
                    <Badge variant='default' size='sm'>
                      {Object.keys(cat.keywords).length} keywords
                    </Badge>
                  </div>
                  <div className='flex items-center gap-2'>
                    <label className='flex items-center gap-1 text-xs text-text-secondary'>
                      Weight:
                      <input
                        type='number'
                        value={cat.weight}
                        onChange={e =>
                          updateCategoryWeight(
                            catName,
                            parseFloat(e.target.value) || 0
                          )
                        }
                        step={0.1}
                        min={0}
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
        </section>

        {/* ---- Seniority ---- */}
        <section className='flex flex-col gap-3'>
          <Heading variant='section' as='h3'>
            Seniority
          </Heading>
          <div className='flex items-center gap-3'>
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
        </section>

        {/* ---- Domain ---- */}
        <section className='flex flex-col gap-3'>
          <Heading variant='section' as='h3'>
            Domain
          </Heading>
          <label className='flex items-center gap-1 text-xs text-text-secondary'>
            Weight:
            <input
              type='number'
              value={profile.domain.weight}
              onChange={e =>
                updateDomain({
                  weight: parseFloat(e.target.value) || 0,
                })
              }
              step={0.1}
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
        </section>

        {/* ---- Negative ---- */}
        <section className='flex flex-col gap-3'>
          <Heading variant='section' as='h3'>
            Negative Keywords
          </Heading>
          <label className='flex items-center gap-1 text-xs text-text-secondary'>
            Weight:
            <input
              type='number'
              value={profile.negative.weight}
              onChange={e =>
                updateNegative({
                  weight: parseFloat(e.target.value) || 0,
                })
              }
              step={1}
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
        </section>

        {isDirty && (
          <Text variant='caption' as='p' className='text-warning'>
            Unsaved changes
          </Text>
        )}
      </CardContent>
    </Card>
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
