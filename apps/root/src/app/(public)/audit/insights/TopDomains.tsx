import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import type { DomainEntry } from './types';

interface TopDomainsProps {
  domains: DomainEntry[];
}

function getGradeColor(grade: string | null): string {
  if (!grade) return 'text-muted';
  if (grade === 'A') return 'text-green-500';
  if (grade === 'B') return 'text-indigo-400';
  if (grade === 'C') return 'text-amber-500';
  if (grade === 'D') return 'text-rose-400';
  return 'text-red-500';
}

export default function TopDomains({ domains }: TopDomainsProps) {
  const hasData = domains.length > 0;

  return (
    <section aria-labelledby='domains-heading' className='w-full py-16'>
      <div className='max-w-4xl mx-auto w-full px-4 sm:px-6'>
        <Heading variant='section' as='h2' id='domains-heading'>
          Most Audited Domains
        </Heading>
        <Text variant='body' className='mt-2 mb-6'>
          {hasData
            ? 'The domains scanned most frequently through the audit tool.'
            : 'Domain rankings will appear as more sites are scanned.'}
        </Text>

        {hasData && (
          <div className='rounded-lg border border-border overflow-hidden'>
            <table className='w-full text-left'>
              <thead className='bg-surface-secondary'>
                <tr>
                  <th className='px-4 py-3 text-sm font-medium text-muted'>
                    Domain
                  </th>
                  <th className='px-4 py-3 text-sm font-medium text-muted text-right'>
                    Scans
                  </th>
                  <th className='px-4 py-3 text-sm font-medium text-muted text-right'>
                    Latest Grade
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-border'>
                {domains.map(d => (
                  <tr key={d.domain} className='bg-surface-elevated'>
                    <td className='px-4 py-3 text-sm text-foreground font-mono truncate max-w-[200px]'>
                      {d.domain}
                    </td>
                    <td className='px-4 py-3 text-sm text-muted text-right'>
                      {d.scanCount.toLocaleString()}
                    </td>
                    <td
                      className={`px-4 py-3 text-sm font-bold text-right ${getGradeColor(d.latestGrade)}`}
                    >
                      {d.latestGrade ?? 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
