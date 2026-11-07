import React from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/app/actions/auth';
import { canAccess } from '@/lib/permissions';
import { getSaleDetailData } from '@/lib/data/sales';
import { formatPHP, formatDate } from '@/lib/utils';
import { PrintButton } from '@/components/sales/PrintButton';
import { SaleRecordPaymentButton } from '@/components/sales/SaleRecordPaymentButton';
import { BRAND } from '@/lib/brand';
import { ArrowLeft, CreditCard, Receipt, ExternalLink, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ transNo: string }>;
}

export default async function SaleDetailPage({ params }: PageProps) {
  const { transNo: rawTransNo } = await params;
  const transNo = rawTransNo ? decodeURIComponent(rawTransNo).trim() : '';

  if (!transNo) {
    notFound();
  }

  const [user, saleData] = await Promise.all([
    getCurrentUser(),
    getSaleDetailData(transNo),
  ]);

  if (!user) {
    redirect('/login');
  }

  if (!canAccess(user.role, 'sales', user.rights || [])) {
    redirect('/?denied=1');
  }

  if (!saleData) {
    notFound();
  }

  const { sale, items, payments } = saleData;
  const role = (user?.role || '').toLowerCase();
  const canRecordPayment =
    role === 'superadmin' ||
    role === 'admin' ||
    role === 'cashier' ||
    Boolean(user?.rights?.some((r) => r.includes('sale') || r.includes('payment')));

  return (
    <div className="max-w-4xl mx-auto space-y-6 pt-2 sm:pt-4">
      {/* Top Action Controls (Hidden when printed) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#DDE3DE]">
        <Link
          href="/sales"
          className="inline-flex items-center gap-1.5 text-xs text-[#52615B] hover:text-[#17231F] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Sales</span>
        </Link>

        <div className="flex items-center gap-2">
          {canRecordPayment && (
            <SaleRecordPaymentButton transNo={sale.transNo} />
          )}
          <PrintButton />
        </div>
      </div>

      {/* Sale Detail Document (Sales Invoice) */}
      <div className="bg-white rounded-lg border border-[#DDE3DE] shadow-sm p-8 sm:p-10 print:border-none print:shadow-none print:p-0 text-[#17231F]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-6 border-b-2 border-[#17231F]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold tracking-tight text-[#17231F]">
                {BRAND.name}
              </span>
              <span className="rounded bg-[#EAF2ED] border border-[#CCD5CD] px-2 py-0.5 text-[10px] font-sans font-semibold text-[#245B48]">
                SALES INVOICE
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
              Transaction #{sale.transNo}
            </h1>
            <div className="mt-1 text-xs text-[#52615B]">
              <span>Sales Date: </span>
              <span className="font-semibold text-[#17231F]">{formatDate(sale.salesDate)}</span>
            </div>
          </div>
        </div>

        {/* Customer & Staff Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-5 border-b border-[#DDE3DE] text-xs">
          <div>
            <span className="text-[#7A8781] block mb-1 font-medium">Billed To</span>
            <div className="font-bold text-sm text-[#17231F]">{sale.custName}</div>
            <div className="text-xs text-[#52615B] mt-0.5">Customer #{sale.custNo}</div>
            <div className="text-xs text-[#52615B] mt-1 leading-relaxed">{sale.custAddress}</div>
            <div className="mt-1">
              <span className="text-[#52615B]">Payment terms: </span>
              <Badge variant="outline" className="font-mono text-[10px] border-[#DDE3DE] text-[#52615B]">
                {sale.payTerms}
              </Badge>
            </div>
          </div>

          <div className="sm:text-right">
            <span className="text-[#7A8781] block mb-1 font-medium">Employee Representative</span>
            <div className="font-bold text-sm text-[#17231F]">
              <span className="font-mono text-[#52615B] font-normal mr-1">#{sale.empNo}</span>
              {sale.repName}
            </div>
            <div className="text-xs text-[#52615B] mt-1">
              Department: <strong>{sale.deptName}</strong> ({sale.deptCode})
            </div>
          </div>
        </div>

        {/* Purchased Items Table */}
        <div className="py-6">
          <h2 className="text-sm font-semibold text-[#17231F] mb-3 flex items-center gap-1.5">
            <ShoppingBag className="h-4 w-4 text-[#52615B]" />
            <span>Sales Detail ({items.length})</span>
          </h2>
          <div className="overflow-x-auto rounded-md border border-[#DDE3DE]">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#DDE3DE] bg-[#FAFBFA] text-[#17231F] font-semibold">
                  <th className="py-2.5 px-3">Item Description</th>
                  <th className="py-2.5 px-3 text-center">Unit</th>
                  <th className="py-2.5 px-3 text-right">Quantity</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9EDEA] font-sans">
                {items.map((item) => (
                  <tr key={item.prodCode} className="hover:bg-[#F5F6F4]">
                    <td className="py-2.5 px-3 max-w-sm">
                      <div className="font-medium text-[#17231F]">{item.description}</div>
                      <div className="text-[#52615B] font-mono text-[11px]">{item.prodCode}</div>
                    </td>
                    <td className="py-2.5 px-3 text-center text-[#52615B] font-mono">{item.unit}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#17231F] font-medium">
                      {item.quantity}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#52615B]">
                      {formatPHP(item.unitPrice)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-[#17231F]">
                      {formatPHP(item.lineAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Grand Total */}
          <div className="mt-4 pt-4 border-t border-[#DDE3DE] flex justify-between items-center text-xs">
            <p className="text-[11px] text-[#52615B]">
              Unit prices are the prices in effect on the sale date.
            </p>
            <div className="w-64 space-y-2">
              <div className="flex justify-between font-bold text-sm text-[#17231F] pt-2 border-t border-[#CCD5CD]">
                <span>Total:</span>
                <span className="font-mono tabular-nums">{formatPHP(sale.totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Linked Official Receipts */}
        <div className="pt-6 border-t border-[#DDE3DE] print:hidden">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#17231F] flex items-center gap-1.5">
              <Receipt className="h-4 w-4 text-[#52615B]" />
              <span>Official Receipts ({payments.length})</span>
            </h2>
            {canRecordPayment && (
              <SaleRecordPaymentButton transNo={sale.transNo} />
            )}
          </div>

          {payments.length === 0 ? (
            <div className="rounded-md border border-dashed border-[#CCD5CD] p-4 text-center text-xs text-[#52615B]">
              No official receipts recorded for this sale.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-[#DDE3DE]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#DDE3DE] bg-[#FAFBFA] text-[#17231F] font-semibold">
                    <th className="py-2.5 px-3">OR #</th>
                    <th className="py-2.5 px-3">Payment date</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3 text-center">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E9EDEA] font-sans">
                  {payments.map((p) => (
                    <tr key={p.orNo} className="hover:bg-[#F5F6F4]">
                      <td className="py-2.5 px-3 font-semibold text-[#245B48] font-mono">
                        <Link href={`/receipts/${p.orNo}`} className="underline hover:text-[#1C4939]">
                          OR #{p.orNo}
                        </Link>
                      </td>
                      <td className="py-2.5 px-3 text-[#17231F] font-sans tabular-nums">
                        {formatDate(p.payDate)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-[#17231F]">
                        {formatPHP(p.amount)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Link
                          href={`/receipts/${p.orNo}`}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-[#245B48] hover:underline"
                        >
                          <span>Print OR</span>
                          <ExternalLink className="w-3 h-3 text-[#245B48]" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
