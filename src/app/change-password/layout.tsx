import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Change Password | ElectronDB ERP',
  description: 'Update your ElectronDB ERP account password.',
};

export default function ChangePasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
