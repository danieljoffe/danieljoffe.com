'use client';

import { Text } from '@danieljoffe/shared-ui/Text';
import type { MissingSkill } from '../types';

interface TopSkillGapsProps {
  data: MissingSkill[];
}

export default function TopSkillGaps({ data }: TopSkillGapsProps) {
  if (data.length === 0) {
    return (
      <p className='text-sm text-text-secondary py-8 text-center'>
        No skill gaps yet — add a few job analyses to see ranked
        recommendations.
      </p>
    );
  }

  return (
    <ol className='divide-y divide-border'>
      {data.map((row, i) => (
        <li
          key={row.skill}
          className='flex items-center justify-between gap-4 py-3'
        >
          <div className='flex items-center gap-3 min-w-0'>
            <Text
              as='span'
              variant='meta'
              className='w-5 text-text-tertiary tabular-nums'
            >
              {i + 1}
            </Text>
            <Text
              as='span'
              variant='body'
              className='truncate font-medium text-text-primary'
            >
              {row.skill}
            </Text>
          </div>
          <div className='flex items-center gap-2 shrink-0 text-right'>
            <Text as='span' variant='meta' className='text-text-secondary'>
              Missing in {row.missing_count}{' '}
              {row.missing_count === 1 ? 'job' : 'jobs'}
            </Text>
            {row.avg_job_score !== null && (
              <span
                className='inline-flex items-center rounded-full bg-surface-tertiary px-2 py-0.5 text-xs font-medium text-text-primary tabular-nums'
                aria-label={`average job score ${Math.round(row.avg_job_score)}`}
              >
                avg {Math.round(row.avg_job_score)}
              </span>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
