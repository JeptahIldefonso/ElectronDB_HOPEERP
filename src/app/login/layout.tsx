import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In | ElectronDB ERP',
  description: 'Sign in to your ElectronDB ERP account.',
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
