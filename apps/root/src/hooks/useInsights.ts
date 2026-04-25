'use client';

import { useEffect, useRef, useState } from 'react';
import type {
  Period,
  PipelineInsights,
  SkillsCostInsights,
  TargetInsights,
} from '@/app/fitted/(app)/insights/types';

interface InsightsState {
  period: Period;
  pipeline: PipelineInsights | undefined;
  targets: TargetInsights | undefined;
  skillsCost: SkillsCostInsights | undefined;
  error: string | undefined;
}

interface InsightsData {
  pipeline: PipelineInsights | undefined;
  targets: TargetInsights | undefined;
  skillsCost: SkillsCostInsights | undefined;
  loading: boolean;
  error: string | undefined;
}

async function fetchJSON<T>(url: string, signal: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

/**
 * Fetches all 3 insights endpoints in parallel when the period changes.
 *
 * Loading state is derived (not set synchronously inside the effect) to
 * satisfy the react-hooks/set-state-in-effect lint rule.
 */
export function useInsights(period: Period): InsightsData {
  const [state, setState] = useState<InsightsState>({
    period,
    pipeline: undefined,
    targets: undefined,
    skillsCost: undefined,
    error: undefined,
  });
  const requestRef = useRef(0);

  // Loading is true when the requested period doesn't match the last fetched one
  const loading = state.period !== period || state.pipeline === undefined;

  useEffect(() => {
    const controller = new AbortController();
    const requestId = ++requestRef.current;

    async function doFetch() {
      const qs = `?period=${period}`;
      const results = await Promise.allSettled([
        fetchJSON<PipelineInsights>(
          `/api/jobs/insights/pipeline${qs}`,
          controller.signal
        ),
        fetchJSON<TargetInsights>(
          `/api/jobs/insights/targets${qs}`,
          controller.signal
        ),
        fetchJSON<SkillsCostInsights>(
          `/api/jobs/insights/skills-cost${qs}`,
          controller.signal
        ),
      ]);

      // Bail if a newer request superseded this one
      if (requestRef.current !== requestId) return;

      const [pipelineResult, targetsResult, skillsCostResult] = results;
      const failures = results.filter(r => r.status === 'rejected');

      let error: string | undefined;
      if (failures.length === results.length) {
        error = 'Failed to load insights data';
      } else if (failures.length > 0) {
        error = 'Some insights data failed to load';
      }

      setState({
        period,
        pipeline:
          pipelineResult.status === 'fulfilled'
            ? pipelineResult.value
            : undefined,
        targets:
          targetsResult.status === 'fulfilled'
            ? targetsResult.value
            : undefined,
        skillsCost:
          skillsCostResult.status === 'fulfilled'
            ? skillsCostResult.value
            : undefined,
        error,
      });
    }

    doFetch();

    return () => controller.abort();
  }, [period]);

  return {
    pipeline: state.pipeline,
    targets: state.targets,
    skillsCost: state.skillsCost,
    loading,
    error: state.error,
  };
}
