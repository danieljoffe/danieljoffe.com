import type { Metadata } from 'next';
import SettingsPage from './SettingsPage';

export const metadata: Metadata = {
  title: 'Settings',
};

export default function FittedSettings() {
  return <SettingsPage />;
}
