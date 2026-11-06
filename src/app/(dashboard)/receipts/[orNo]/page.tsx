import React from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/app/actions/auth';
import { canAccess } from '@/lib/permissions';
import { getOfficialReceipt } from '@/lib/data/payments';
import { formatPHP, formatDate } from '@/lib/utils';
import { PrintButton } from '@/components/sales/PrintButton';
import { BRAND } from '@/lib/brand';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ orNo: string }>;
}

export default async function ReceiptDetailPage({ params }: PageProps) {
  const { orNo: rawOrNo } = await params;
  const orNo = rawOrNo ? decodeURIComponent(rawOrNo).trim() : '';

  if (!orNo) {
    notFound();
  }

  const [user, receipt] = await Promise.all([
    getCurrentUser(),
    getOfficialReceipt(orNo),
  ]);

  if (!user) {
    redirect('/login');
  }

  if (!canAccess(user.role, 'payments', user.rights || [])) {
    redirect('/?denied=1');
  }

  if (!receipt) {
    notFound();
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pt-2 sm:pt-4">
      {/* Top Action Controls (Hidden on print) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#DDE3DE]">
        <Link
          href={`/customers?custNo=${receipt.customer.custNo}`}
          className="inline-flex items-center gap-1.5 text-xs text-[#52615B] hover:text-[#17231F] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Customers &amp; Payments</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link href={`/sales/${receipt.transNo}`}>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              <ExternalLink className="h-3.5 w-3.5 text-[#52615B]" />
              <span>View Sale #{receipt.transNo}</span>
            </Button>
          </Link>
          <PrintButton />
        </div>
      </div>

      {/* Official Receipt Document (Zero Debt / Zero Balance Vocabulary) */}
      <div className="bg-white rounded-lg border border-[#DDE3DE] shadow-sm p-8 sm:p-10 print:border-none print:shadow-none print:p-0 text-[#17231F]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-6 border-b-2 border-[#17231F]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold tracking-tight text-[#17231F]">
                {BRAND.name}
              </span>
              <span className="rounded bg-[#EAF2ED] border border-[#CCD5CD] px-2 py-0.5 text-[10px] font-sans font-semibold text-[#245B48]">
                OFFICIAL RECEIPT
              </span>
            </div>
            <p className="text-xs text-[#52615B] font-sans mt-1">
              Sales and Payments Monitoring System
            </p>
            <p className="text-xs text-[#7A8781]">
              Metro Manila, Philippines
            </p>
          </div>

          <div className="text-left sm:text-right">
            <h1 className="font-editorial italic text-2xl sm:text-3xl font-normal text-text tracking-tight">
              OR #{receipt.orNo}
            </h1>
            <div className="mt-1 text-xs text-[#52615B]">
              <span>Payment Date: </span>
              <span className="font-semibold text-[#17231F]">{formatDate(receipt.payDate)}</span>
            </div>
          </div>
        </div>

        {/* Customer & Transaction Reference Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-5 border-b border-[#DDE3DE] text-xs">
          <div>
            <span className="text-[#7A8781] block mb-1 font-medium">
              Received From
            </span>
            <div className="font-bold text-sm text-[#17231F]">{receipt.customer.custName}</div>
            <div className="text-xs text-[#52615B] mt-0.5">Customer #{receipt.customer.custNo}</div>
            <div className="text-xs text-[#52615B] mt-1 whitespace-pre-line">
              {receipt.customer.address}
            </div>
          </div>

          <div className="sm:text-right">
            <span className="text-[#7A8781] block mb-1 font-medium">
              Linked Sale Transaction
            </span>
            <div className="font-bold text-sm text-[#17231F] font-mono">
              Sale #{receipt.transNo}
            </div>
            <div className="text-xs text-[#52615B] mt-0.5">
              Sale Date: {formatDate(receipt.salesDate)}
            </div>
            <div className="text-xs text-[#52615B] mt-1">
              Sales Representative: {receipt.salesRep.empName} ({receipt.salesRep.deptName})
            </div>
          </div>
        </div>

        {/* Remittance Amount Box */}
        <div className="my-6 rounded-lg bg-[#FAFBFA] border border-[#DDE3DE] p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-xs font-medium text-[#7A8781] block">
              Payment Amount Received
            </span>
            <span className="text-xs text-[#52615B]">
              Official receipt for transaction #{receipt.transNo}
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-sans tabular-nums text-[#17231F]">
            {formatPHP(receipt.amount)}
          </div>
        </div>

        {/* Signatures */}
        <div className="pt-8 text-xs text-[#52615B] space-y-6">
          <div className="grid grid-cols-2 gap-8 pt-4 text-center">
            <div>
              <div className="border-b border-[#DDE3DE] pb-8 mb-2" />
              <div className="font-semibold text-[#17231F]">Authorized Cashier</div>
              <div className="text-[11px] text-[#7A8781]">Finance &amp; Cash Operations</div>
            </div>
            <div>
              <div className="border-b border-[#DDE3DE] pb-8 mb-2" />
              <div className="font-semibold text-[#17231F]">{receipt.customer.custName}</div>
              <div className="text-[11px] text-[#7A8781]">Authorized Client Representative</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
