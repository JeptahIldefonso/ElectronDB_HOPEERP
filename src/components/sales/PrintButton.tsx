'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Printer } from 'lucide-react';

export function PrintButton() {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => window.print()}
      className="flex items-center gap-1.5"
    >
      <Printer className="h-4 w-4" />
      Print / Save PDF
    </Button>
  );
}
