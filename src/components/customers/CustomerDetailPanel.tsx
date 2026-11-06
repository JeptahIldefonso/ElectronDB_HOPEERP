'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { formatPHP, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { CustomerDetailData } from '@/lib/data/customers';

const EditCustomerModal = dynamic(
  () => import('./EditCustomerModal').then((mod) => mod.EditCustomerModal),
  { ssr: false }
);

const RecordCustomerPaymentModal = dynamic(
  () => import('./RecordCustomerPaymentModal').then((mod) => mod.RecordCustomerPaymentModal),
  { ssr: false }
);
import {
  X,
  Plus,
  Edit2,
  Receipt,
  User,
  CreditCard,
  ShoppingBag,
  Clock,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  FileText,
} from 'lucide-react';

interface CustomerDetailPanelProps {
  customerData: CustomerDetailData | null;
  onClose: () => void;
  userRole?: string;
  isDrawer?: boolean;
}

export function CustomerDetailPanel({
  customerData,
  onClose,
  userRole = 'sales',
  isDrawer = false,
}: CustomerDetailPanelProps) {
  const isAdmin = userRole.toLowerCase() === 'admin';
  const isSales = userRole.toLowerCase() === 'sales' || isAdmin;
  const isCashier = userRole.toLowerCase() === 'cashier' || isAdmin;

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);

  // Esc listener to close panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!customerData) {
    return (
      <div className="rounded-lg border border-[#DDE3DE] bg-white p-8 text-center text-xs text-[#52615B]">
        Select a customer to see their payment history.
      </div>
    );
  }

  const { customer, summary, paymentHistory, eligibleTransactions } = customerData;

  const content = (
    <div className="space-y-5">
      {/* 1. Header */}
      <div className="flex items-start justify-between border-b border-[#DDE3DE] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-[#52615B]">
              Customer #{customer.custNo}
            </span>
            <Badge variant="outline" className="font-mono text-[10px] border-[#DDE3DE] text-[#52615B]">
              {customer.payTerms}
            </Badge>
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold text-[#17231F] mt-1 leading-snug">
            {customer.custName}
          </h2>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#52615B] hover:text-[#17231F] hover:bg-[#F0F3F0] rounded-md transition-colors"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Role Action Buttons */}
      <div className="flex items-center gap-2">
        {isSales && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsEditOpen(true)}
            className="flex items-center gap-1.5 text-xs font-sans"
          >
            <Edit2 className="h-3.5 w-3.5 text-[#52615B]" />
            <span>Edit customer</span>
          </Button>
        )}

        {isCashier && (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setIsRecordPaymentOpen(true)}
            disabled={eligibleTransactions.length === 0}
            className="flex items-center gap-1.5 text-xs font-sans"
          >
            <Receipt className="h-3.5 w-3.5" />
            <span>Record Payment</span>
          </Button>
        )}
      </div>

      {/* 2. Card: Customer Information */}
      <div className="rounded-lg border border-[#DDE3DE] bg-[#FAFBFA] p-4 space-y-3">
        <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-[#52615B] block">
          Customer information
        </span>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <dt className="text-[#52615B] text-[11px]">Customer no.</dt>
            <dd className="font-mono font-medium text-[#17231F] mt-0.5">
              {customer.custNo}
            </dd>
          </div>

          <div>
            <dt className="text-[#52615B] text-[11px]">Payment term</dt>
            <dd className="font-mono font-medium text-[#17231F] mt-0.5">
              {customer.payTerms}
            </dd>
          </div>

          <div className="sm:col-span-2">
            <dt className="text-[#52615B] text-[11px]">Customer Name</dt>
            <dd className="font-medium text-[#17231F] mt-0.5">
              {customer.custName}
            </dd>
          </div>

          <div className="sm:col-span-2">
            <dt className="text-[#52615B] text-[11px]">Address</dt>
            <dd className="text-[#17231F] mt-0.5 leading-relaxed">
              {customer.address}
            </dd>
          </div>
        </dl>
      </div>

      {/* 3. Card: Payment Summary */}
      <div className="rounded-lg border border-[#DDE3DE] bg-white p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-[#52615B]">
            Payment summary
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-1">
          <div>
            <span className="text-[11px] text-[#52615B] block">Orders placed</span>
            <span className="text-base font-semibold font-mono text-[#17231F] mt-0.5 block">
              {summary.ordersPlaced}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-[#52615B] block">Total paid</span>
            <span className="text-base font-semibold font-mono text-[#17231F] mt-0.5 block">
              {formatPHP(summary.totalPaid)}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-[#52615B] block">Payment count</span>
            <span className="text-base font-semibold font-mono text-[#17231F] mt-0.5 block">
              {summary.paymentCount}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-[#52615B] block">Unpaid orders</span>
            <span className="mt-0.5 block">
              {summary.unpaidOrders > 0 ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-[#FBF2DD] text-[#956316] border border-[#F0E4C3]">
                  {summary.unpaidOrders} awaiting
                </span>
              ) : (
                <span className="text-xs font-mono text-[#52615B]">0</span>
              )}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-[#52615B] block">Last payment</span>
            <span className="text-xs font-medium text-[#17231F] mt-0.5 block">
              {summary.lastPaymentDate ? (
                <>
                  {formatDate(summary.lastPaymentDate)}{' '}
                  <span className="text-[10px] font-mono text-[#52615B]">
                    (OR #{summary.lastPaymentOrNo})
                  </span>
                </>
              ) : (
                '-'
              )}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-[#52615B] block">Customer since</span>
            <span className="text-xs font-medium text-[#17231F] mt-0.5 block">
              {summary.customerSince ? formatDate(summary.customerSince) : '-'}
            </span>
          </div>
        </div>

        <p className="text-[10px] text-[#52615B] border-t border-[#E9EDEA] pt-2 mt-2 leading-relaxed">
          Orders and dates come from this customer&apos;s sales. Only PAYMENT columns are entered here.
        </p>
      </div>

      {/* 4. Table: Payment History */}
      <div className="rounded-lg border border-[#DDE3DE] bg-white overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-[#DDE3DE] bg-[#FAFBFA] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-3.5 w-3.5 text-[#52615B]" />
            <span className="text-xs font-semibold text-[#17231F]">
              Payment history ({paymentHistory.length})
            </span>
          </div>
          <span className="text-[10px] text-[#52615B]">Read-only records</span>
        </div>

        {paymentHistory.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#52615B]">
            No payments recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-[#FAFBFA] border-b border-[#DDE3DE] text-[#17231F] z-10 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">OR No.</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3 text-right">Transaction no.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9EDEA]">
                {paymentHistory.map((p: any) => (
                  <tr key={p.orNo} className="hover:bg-[#F5F6F4] transition-colors">
                    <td className="py-2.5 px-3 text-[#17231F] whitespace-nowrap">
                      {formatDate(p.payDate)}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-medium text-[#17231F] whitespace-nowrap">
                      #{p.orNo}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-[#17231F] text-right whitespace-nowrap">
                      {formatPHP(p.amount)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#245B48] text-right whitespace-nowrap">
                      #{p.transNo}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Customer Modal */}
      {isSales && (
        <EditCustomerModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          customer={customer}
        />
      )}

      {/* Record Payment Modal */}
      {isCashier && (
        <RecordCustomerPaymentModal
          isOpen={isRecordPaymentOpen}
          onClose={() => setIsRecordPaymentOpen(false)}
          custNo={customer.custNo}
          custName={customer.custName}
          eligibleTransactions={eligibleTransactions}
        />
      )}
    </div>
  );

  // In Drawer Mode (Mobile / Tablet < 1280px)
  if (isDrawer) {
    return (
      <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-[2px] transition-opacity">
        <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
          <div className="w-screen max-w-lg bg-white p-6 shadow-xl overflow-y-auto">
            {content}
          </div>
        </div>
      </div>
    );
  }

  // Desktop inline column
  return (
    <div className="rounded-lg border border-[#DDE3DE] bg-white p-5 shadow-sm sticky top-6">
      {content}
    </div>
  );
}
