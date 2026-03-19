interface Stat {
  label: string;
  value: string | number;
  subtitle?: string;
}

interface StatsRowProps {
  stats: Stat[];
}

export default function StatsRow({ stats }: StatsRowProps) {
  return (
    <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
      {stats.map(stat => (
        <div
          key={stat.label}
          className='rounded-lg border border-border bg-surface-elevated p-6'
        >
          <p className='text-sm text-text-secondary'>{stat.label}</p>
          <p className='text-3xl font-bold mt-1'>{stat.value}</p>
          {stat.subtitle && (
            <p className='text-xs text-text-tertiary mt-1'>{stat.subtitle}</p>
          )}
        </div>
      ))}
    </div>
  );
}
