import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reset Password | ElectronDB ERP',
  description: 'Reset your ElectronDB ERP account password.',
};

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
