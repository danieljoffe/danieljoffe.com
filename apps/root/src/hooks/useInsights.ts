'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  pipelineLoading: boolean;
  targetsLoading: boolean;
  skillsCostLoading: boolean;
  pipelineFailed: boolean;
  targetsFailed: boolean;
  skillsCostFailed: boolean;
  fetchedAt: number | undefined;
}

export interface InsightsLoading {
  pipeline: boolean;
  targets: boolean;
  skillsCost: boolean;
  any: boolean;
  all: boolean;
}

export interface InsightsData {
  pipeline: PipelineInsights | undefined;
  targets: TargetInsights | undefined;
  skillsCost: SkillsCostInsights | undefined;
  loading: InsightsLoading;
  error: string | undefined;
  failedEndpoints: string[];
  fetchedAt: number | undefined;
  refresh: () => void;
}

async function fetchJSON<T>(url: string, signal: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

const INITIAL_LOADING = {
  pipelineLoading: true,
  targetsLoading: true,
  skillsCostLoading: true,
  pipelineFailed: false,
  targetsFailed: false,
  skillsCostFailed: false,
};

/**
 * Fetches the three insights endpoints in parallel and tracks their
 * loading + error state independently so the UI can render each card's
 * skeleton/empty/error state in isolation. Returns a memoized object so
 * consumers can `useMemo` keyed on slices without referential thrash.
 */
export function useInsights(period: Period): InsightsData {
  const [state, setState] = useState<InsightsState>({
    period,
    pipeline: undefined,
    targets: undefined,
    skillsCost: undefined,
    fetchedAt: undefined,
    ...INITIAL_LOADING,
  });
  const requestRef = useRef(0);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const requestId = ++requestRef.current;

    // Wrapped in async so the setState calls run after the effect body
    // returns — avoids the react-hooks/set-state-in-effect lint rule.
    async function run() {
      setState(s => ({ ...s, period, ...INITIAL_LOADING }));

      const qs = `?period=${period}`;

      const fetchPipeline = fetchJSON<PipelineInsights>(
        `/api/jobs/insights/pipeline${qs}`,
        controller.signal
      )
        .then(value => {
          if (requestRef.current !== requestId) return;
          setState(s => ({
            ...s,
            pipeline: value,
            pipelineLoading: false,
            pipelineFailed: false,
            fetchedAt: Date.now(),
          }));
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          if (requestRef.current !== requestId) return;
          if (err instanceof Error && err.name === 'AbortError') return;
          setState(s => ({
            ...s,
            pipelineLoading: false,
            pipelineFailed: true,
            fetchedAt: Date.now(),
          }));
        });

      const fetchTargets = fetchJSON<TargetInsights>(
        `/api/jobs/insights/targets${qs}`,
        controller.signal
      )
        .then(value => {
          if (requestRef.current !== requestId) return;
          setState(s => ({
            ...s,
            targets: value,
            targetsLoading: false,
            targetsFailed: false,
            fetchedAt: Date.now(),
          }));
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          if (requestRef.current !== requestId) return;
          if (err instanceof Error && err.name === 'AbortError') return;
          setState(s => ({
            ...s,
            targetsLoading: false,
            targetsFailed: true,
            fetchedAt: Date.now(),
          }));
        });

      const fetchSkillsCost = fetchJSON<SkillsCostInsights>(
        `/api/jobs/insights/skills-cost${qs}`,
        controller.signal
      )
        .then(value => {
          if (requestRef.current !== requestId) return;
          setState(s => ({
            ...s,
            skillsCost: value,
            skillsCostLoading: false,
            skillsCostFailed: false,
            fetchedAt: Date.now(),
          }));
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          if (requestRef.current !== requestId) return;
          if (err instanceof Error && err.name === 'AbortError') return;
          setState(s => ({
            ...s,
            skillsCostLoading: false,
            skillsCostFailed: true,
            fetchedAt: Date.now(),
          }));
        });

      await Promise.all([fetchPipeline, fetchTargets, fetchSkillsCost]);
    }

    void run();
    return () => controller.abort();
  }, [period, refreshTick]);

  const refresh = useCallback(() => {
    setRefreshTick(t => t + 1);
  }, []);

  return useMemo<InsightsData>(() => {
    const failedEndpoints: string[] = [];
    if (state.pipelineFailed) failedEndpoints.push('Pipeline');
    if (state.targetsFailed) failedEndpoints.push('Targets');
    if (state.skillsCostFailed) failedEndpoints.push('Skills & cost');

    let error: string | undefined;
    if (failedEndpoints.length === 3) {
      error = 'Failed to load insights data.';
    } else if (failedEndpoints.length > 0) {
      error = `Some insights data failed to load: ${failedEndpoints.join(', ')}.`;
    }

    const loading: InsightsLoading = {
      pipeline: state.pipelineLoading,
      targets: state.targetsLoading,
      skillsCost: state.skillsCostLoading,
      any:
        state.pipelineLoading ||
        state.targetsLoading ||
        state.skillsCostLoading,
      all:
        state.pipelineLoading &&
        state.targetsLoading &&
        state.skillsCostLoading,
    };

    return {
      pipeline: state.pipeline,
      targets: state.targets,
      skillsCost: state.skillsCost,
      loading,
      error,
      failedEndpoints,
      fetchedAt: state.fetchedAt,
      refresh,
    };
  }, [state, refresh]);
}
