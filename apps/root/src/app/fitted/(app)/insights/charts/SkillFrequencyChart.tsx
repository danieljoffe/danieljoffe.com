'use client';

import type { SkillFrequency } from '../types';
import { ChartFigure, type ChartColumn } from './ChartFigure';

interface SkillFrequencyChartProps {
  data: SkillFrequency[];
}

const COLUMNS: ChartColumn<SkillFrequency>[] = [
  { header: 'Skill', render: row => row.skill },
  { header: 'Matched', render: row => row.matched_count },
  { header: 'Missing', render: row => row.missing_count },
];

function SkillRow({ row, max }: { row: SkillFrequency; max: number }) {
  const total = row.matched_count + row.missing_count;
  const matchedPct = max === 0 ? 0 : (row.matched_count / max) * 100;
  const missingPct = max === 0 ? 0 : (row.missing_count / max) * 100;

  return (
    <li className='flex flex-col gap-1.5'>
      <div className='flex items-baseline justify-between gap-3'>
        <span className='text-sm font-medium text-text-primary truncate'>
          {row.skill}
        </span>
        <span className='text-xs text-text-secondary tabular-nums shrink-0'>
          {row.matched_count}/{total}
        </span>
      </div>
      <div className='flex h-2 w-full overflow-hidden rounded-full bg-surface-elevated'>
        <div
          className='h-full bg-success'
          style={{ width: `${matchedPct}%` }}
        />
        <div
          className='h-full bg-error/70'
          style={{ width: `${missingPct}%` }}
        />
      </div>
    </li>
  );
}

export default function SkillFrequencyChart({
  data,
}: SkillFrequencyChartProps) {
  if (data.length === 0) {
    return (
      <p className='text-sm text-text-secondary py-8 text-center'>
        No skill data yet. Analyze a few job postings to see which skills are
        showing up.
      </p>
    );
  }

  const max = data.reduce(
    (acc, row) => Math.max(acc, row.matched_count + row.missing_count),
    0
  );

  return (
    <ChartFigure
      ariaLabel='Skill mentions: matched versus missing skills across analyzed jobs'
      rows={data}
      columns={COLUMNS}
      rowKey={row => row.skill}
    >
      <div className='flex flex-col gap-3'>
        <div className='flex items-center gap-4 text-xs text-text-secondary'>
          <span className='inline-flex items-center gap-1.5'>
            <span className='size-2.5 rounded-sm bg-success' aria-hidden />
            Matched
          </span>
          <span className='inline-flex items-center gap-1.5'>
            <span className='size-2.5 rounded-sm bg-error/70' aria-hidden />
            Missing
          </span>
        </div>
        <ul className='flex max-h-[600px] flex-col gap-3 overflow-y-auto pr-1'>
          {data.map(row => (
            <SkillRow key={row.skill} row={row} max={max} />
          ))}
        </ul>
      </div>
    </ChartFigure>
  );
}
