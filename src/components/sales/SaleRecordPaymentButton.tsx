'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { CreditCard } from 'lucide-react';
import { RecordPaymentDialog } from '@/components/payments/RecordPaymentDialog';

interface SaleRecordPaymentButtonProps {
  transNo: string | number;
}

export function SaleRecordPaymentButton({ transNo }: SaleRecordPaymentButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="gap-1.5 text-xs font-sans cursor-pointer"
      >
        <CreditCard className="h-3.5 w-3.5 text-[#52615B]" />
        <span>Record payment</span>
      </Button>

      {isOpen && (
        <RecordPaymentDialog
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          fixedTransNo={transNo}
        />
      )}
    </>
  );
}
