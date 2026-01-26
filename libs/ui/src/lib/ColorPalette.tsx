interface ColorInfo {
  name: string;
  var: string;
  hex: string;
  role: string;
  contrast?: string;
}

interface ColorGroup {
  name: string;
  colors: ColorInfo[];
}

const colorGroups: ColorGroup[] = [
  {
    name: 'Background',
    colors: [
      {
        name: 'Charcoal',
        var: 'background',
        hex: '#141517',
        role: 'Background',
      },
      {
        name: 'Graphite',
        var: 'background-alt',
        hex: '#1E2023',
        role: 'Background Alt',
      },
      {
        name: 'Slate',
        var: 'background-elevated',
        hex: '#262A2E',
        role: 'Background Elevated',
      },
    ],
  },
  {
    name: 'Foreground',
    colors: [
      {
        name: 'Ivory',
        var: 'foreground',
        hex: '#F5F4F1',
        role: 'Foreground',
        contrast: '15.9:1 AAA',
      },
      {
        name: 'Pewter',
        var: 'foreground-muted',
        hex: '#9A9B9E',
        role: 'Foreground Muted',
        contrast: '7.1:1 AAA',
      },
      {
        name: 'Smoke',
        var: 'foreground-subtle',
        hex: '#6B6D70',
        role: 'Foreground Subtle',
        contrast: '4.6:1 AA',
      },
    ],
  },
  {
    name: 'Accent',
    colors: [
      {
        name: 'Lavender',
        var: 'accent',
        hex: '#A99BC8',
        role: 'Accent',
        contrast: '5.8:1 AA',
      },
      {
        name: 'Bright Lavender',
        var: 'accent-hover',
        hex: '#BDB0D6',
        role: 'Accent Hover',
        contrast: '7.2:1 AAA',
      },
      {
        name: 'Deep Lavender',
        var: 'accent-active',
        hex: '#9588B5',
        role: 'Accent Active',
        contrast: '5.1:1 AA',
      },
      {
        name: 'Dark Lavender',
        var: 'accent-muted',
        hex: '#252330',
        role: 'Accent Muted',
      },
    ],
  },
  {
    name: 'Borders',
    colors: [
      { name: 'Ash', var: 'border', hex: '#2A2C2F', role: 'Border' },
      {
        name: 'Stone',
        var: 'border-strong',
        hex: '#3A3D42',
        role: 'Border Strong',
      },
    ],
  },
  {
    name: 'Semantic',
    colors: [
      {
        name: 'Mint',
        var: 'success',
        hex: '#5DB87D',
        role: 'Success',
        contrast: '9.8:1 AAA',
      },
      {
        name: 'Success Muted',
        var: 'success-muted',
        hex: '#1A2E22',
        role: 'Success Muted',
      },
      {
        name: 'Amber',
        var: 'warning',
        hex: '#D4A84B',
        role: 'Warning',
        contrast: '9.2:1 AAA',
      },
      {
        name: 'Warning Muted',
        var: 'warning-muted',
        hex: '#2E2921',
        role: 'Warning Muted',
      },
      {
        name: 'Salmon',
        var: 'destructive',
        hex: '#E07A6B',
        role: 'Error',
        contrast: '8.1:1 AAA',
      },
      {
        name: 'Error Muted',
        var: 'destructive-muted',
        hex: '#2E1F1D',
        role: 'Error Muted',
      },
      {
        name: 'Sky',
        var: 'info',
        hex: '#6BA8D4',
        role: 'Info',
        contrast: '8.4:1 AAA',
      },
      {
        name: 'Info Muted',
        var: 'info-muted',
        hex: '#1D252E',
        role: 'Info Muted',
      },
    ],
  },
];

export function ColorPalette() {
  return (
    <div className='space-y-8'>
      {colorGroups.map(group => (
        <div key={group.name}>
          <h3>{group.name}</h3>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
            {group.colors.map(color => (
              <div
                key={color.var}
                className='border border-border rounded-lg overflow-hidden bg-background-elevated'
              >
                <div
                  className='h-24 w-full'
                  style={{ backgroundColor: color.hex }}
                />
                <div className='p-4'>
                  <div className='font-semibold text-foreground mb-1'>
                    {color.name}
                  </div>
                  <div className='text-sm text-foreground-subtle mb-2'>
                    {color.role}
                  </div>
                  <code className='text-xs'>{color.hex}</code>
                  {color.contrast && (
                    <div className='text-xs text-foreground-muted mt-2'>
                      Contrast: {color.contrast}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
