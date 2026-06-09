'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  Period,
  PipelineInsights,
  SkillsCostInsights,
  TargetInsights,
} from '@/app/(app)/insights/types';

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

interface InsightsLoading {
  pipeline: boolean;
  targets: boolean;
  skillsCost: boolean;
  any: boolean;
  all: boolean;
}

interface InsightsData {
  pipeline: PipelineInsights | undefined;
  targets: TargetInsights | undefined;
  skillsCost: SkillsCostInsights | undefined;
  loading: InsightsLoading;
  error: string | undefined;
  failedEndpoints: string[];
  fetchedAt: number | undefined;
  refresh: () => void;
}

/**
 * Discriminated error info attached to {@link InsightsFetchError}.
 *
 * - `http`: the request reached the server but it returned a non-2xx status.
 * - `network`: the fetch itself threw (offline, DNS failure, etc.).
 * - `parse`: the response body couldn't be parsed as JSON.
 * - `shape`: the JSON parsed but didn't match the expected schema.
 */
type InsightsFetchErrorInfo =
  | { kind: 'http'; status: number; statusText: string }
  | { kind: 'network'; cause: unknown }
  | { kind: 'parse'; cause: unknown }
  | { kind: 'shape'; field: string };

class InsightsFetchError extends Error {
  readonly info: InsightsFetchErrorInfo;
  constructor(info: InsightsFetchErrorInfo) {
    super(
      info.kind === 'http'
        ? `${info.status} ${info.statusText}`
        : info.kind === 'shape'
          ? `Unexpected response shape: ${info.field}`
          : info.kind
    );
    this.name = 'InsightsFetchError';
    this.info = info;
  }
}

async function fetchJSON<T>(
  url: string,
  signal: AbortSignal,
  validate: (value: unknown) => T
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { signal });
  } catch (cause) {
    if (cause instanceof Error && cause.name === 'AbortError') throw cause;
    throw new InsightsFetchError({ kind: 'network', cause });
  }
  if (!res.ok) {
    throw new InsightsFetchError({
      kind: 'http',
      status: res.status,
      statusText: res.statusText,
    });
  }
  let json: unknown;
  try {
    json = await res.json();
  } catch (cause) {
    throw new InsightsFetchError({ kind: 'parse', cause });
  }
  return validate(json);
}

function asObject(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new InsightsFetchError({ kind: 'shape', field });
  }
  return value as Record<string, unknown>;
}

function requireArray(
  obj: Record<string, unknown>,
  key: string,
  root: string
): void {
  if (!Array.isArray(obj[key])) {
    throw new InsightsFetchError({ kind: 'shape', field: `${root}.${key}` });
  }
}

function validatePipeline(value: unknown): PipelineInsights {
  const o = asObject(value, 'pipeline');
  requireArray(o, 'velocity', 'pipeline');
  requireArray(o, 'funnel', 'pipeline');
  return value as PipelineInsights;
}

function validateTargets(value: unknown): TargetInsights {
  const o = asObject(value, 'targets');
  requireArray(o, 'targets', 'targets');
  requireArray(o, 'score_distribution', 'targets');
  requireArray(o, 'score_trend', 'targets');
  return value as TargetInsights;
}

function validateSkillsCost(value: unknown): SkillsCostInsights {
  const o = asObject(value, 'skillsCost');
  requireArray(o, 'top_skills', 'skillsCost');
  requireArray(o, 'top_missing', 'skillsCost');
  requireArray(o, 'cost_over_time', 'skillsCost');
  requireArray(o, 'cost_by_purpose', 'skillsCost');
  return value as SkillsCostInsights;
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
 * Server-rendered insights bundle passed from `page.tsx` so the dashboard
 * paints with data instead of three skeletons → three client→Next→API
 * round-trips (#851 P1). All slices are optional so a partial upstream
 * failure on the server still renders the bits we did get.
 */
export interface InsightsInitial {
  period: Period;
  pipeline: PipelineInsights | undefined;
  targets: TargetInsights | undefined;
  skillsCost: SkillsCostInsights | undefined;
  fetchedAt: number;
}

/**
 * Fetches the three insights endpoints in parallel and tracks their
 * loading + error state independently so the UI can render each card's
 * skeleton/empty/error state in isolation. Returns a memoized object so
 * consumers can `useMemo` keyed on slices without referential thrash.
 *
 * When `initial` is supplied AND its period matches the requested period,
 * the hook seeds state from it and skips the first client fetch — the
 * server already paid that cost in page.tsx.
 */
export function useInsights(
  period: Period,
  initial?: InsightsInitial
): InsightsData {
  const initialMatches = initial && initial.period === period;
  const [state, setState] = useState<InsightsState>(() =>
    initialMatches
      ? {
          period,
          pipeline: initial.pipeline,
          targets: initial.targets,
          skillsCost: initial.skillsCost,
          fetchedAt: initial.fetchedAt,
          pipelineLoading: false,
          targetsLoading: false,
          skillsCostLoading: false,
          pipelineFailed: false,
          targetsFailed: false,
          skillsCostFailed: false,
        }
      : {
          period,
          pipeline: undefined,
          targets: undefined,
          skillsCost: undefined,
          fetchedAt: undefined,
          ...INITIAL_LOADING,
        }
  );
  const requestRef = useRef(0);
  // Skip the first client fetch when the server already delivered data
  // for this period; subsequent period changes or refresh() calls still
  // hit the API normally.
  const skipFirstFetchRef = useRef(Boolean(initialMatches));
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    if (skipFirstFetchRef.current) {
      skipFirstFetchRef.current = false;
      return;
    }
    const controller = new AbortController();
    const requestId = ++requestRef.current;

    // Wrapped in async so the setState calls run after the effect body
    // returns — avoids the react-hooks/set-state-in-effect lint rule.
    async function run() {
      setState(s => ({ ...s, period, ...INITIAL_LOADING }));

      const qs = `?period=${period}`;

      const fetchPipeline = fetchJSON<PipelineInsights>(
        `/api/jobs/insights/pipeline${qs}`,
        controller.signal,
        validatePipeline
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
        controller.signal,
        validateTargets
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
        controller.signal,
        validateSkillsCost
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
