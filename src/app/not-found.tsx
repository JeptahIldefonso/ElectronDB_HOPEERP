import Link from 'next/link';
import { ArrowLeft, FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { BRAND } from '@/lib/brand';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100">
          <FileQuestion className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Page Not Found</h1>
          <p className="text-sm text-slate-500">
            The page you are looking for does not exist or has been relocated within {BRAND.name}.
          </p>
        </div>
        <div>
          <Link href="/">
            <Button variant="primary" className="inline-flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Return to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
