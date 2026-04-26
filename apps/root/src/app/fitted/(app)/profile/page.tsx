import type { Metadata } from 'next';
import ProfilePage from './ProfilePage';

export const metadata: Metadata = {
  title: 'Profile',
};

export default function FittedProfile() {
  return <ProfilePage />;
}
