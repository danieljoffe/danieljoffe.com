// Jest mock for recharts.
// Recharts' ResponsiveContainer relies on ResizeObserver / non-zero DOM
// dimensions, neither of which jsdom provides. The mock replaces each
// export with a pass-through component so specs can assert on surrounding
// markup without Recharts failing to mount.

const React = require('react');

const passThrough = displayName => {
  const Component = ({ children }) =>
    React.createElement('div', { 'data-chart-mock': displayName }, children);
  Component.displayName = displayName;
  return Component;
};

const empty = displayName => {
  const Component = () => null;
  Component.displayName = displayName;
  return Component;
};

module.exports = {
  __esModule: true,
  ResponsiveContainer: passThrough('ResponsiveContainer'),
  AreaChart: passThrough('AreaChart'),
  Area: empty('Area'),
  BarChart: passThrough('BarChart'),
  Bar: passThrough('Bar'),
  LineChart: passThrough('LineChart'),
  Line: empty('Line'),
  PieChart: passThrough('PieChart'),
  Pie: passThrough('Pie'),
  Cell: empty('Cell'),
  XAxis: empty('XAxis'),
  YAxis: empty('YAxis'),
  CartesianGrid: empty('CartesianGrid'),
  Tooltip: empty('Tooltip'),
  Legend: empty('Legend'),
};
