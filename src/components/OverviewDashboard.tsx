import React, { useState } from 'react';
import {
  TrendingUp,
  Users,
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  PlusCircle,
  Search,
  ChevronRight,
  BellRing,
  Sparkles,
  BookCheck,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { useKhata } from '../context/KhataContext';
import { formatINR, paiseToRupees } from '../utils/accounting';

interface OverviewDashboardProps {
  onOpenCustomer: (customerId: string) => void;
  onOpenAddEntryForCustomer?: (customerName: string) => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  onOpenCustomer,
  onOpenAddEntryForCustomer,
}) => {
  const { stats, setActiveView, setSelectedCustomerId } = useKhata();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter recent transactions
  const filteredRecentTransactions = stats.recentTransactions.filter((tx) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      tx.customerName.toLowerCase().includes(q) ||
      tx.description.toLowerCase().includes(q) ||
      tx.date.includes(q) ||
      (tx.notes && tx.notes.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Brand & Khatabook Ledger Banner */}
      <div className="bg-[#FFFFFF] border border-[#E6E0D2] rounded-xl p-5 sm:p-6 shadow-xs relative overflow-hidden laser-paper">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E6F3EC] text-[#164E35] text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Voice-Powered Retail Credit Ledger</span>
            </div>
            <h2 className="font-canto text-2xl sm:text-3xl font-bold tracking-tight text-[#103325]">
              Every udhari accounted for, in real-time.
            </h2>
            <p className="text-sm text-stone-600 leading-relaxed">
              Record daily purchases and payments in natural language using Wispr Flow dictation. All balances, running ledgers, and payment reminders stay accurate to the paise.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveView('add-entry')}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#164E35] text-white font-semibold text-sm hover:bg-[#103325] active:scale-[0.98] transition-all shadow-sm ring-1 ring-[#0A2118]"
            >
              <PlusCircle className="w-5 h-5 text-[#E6F3EC]" />
              <span>+ Add Entry</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('customers')}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#FFFFFF] border border-[#D5CEBE] text-stone-800 font-medium text-sm hover:bg-[#FAF7F2] transition-colors"
            >
              <Users className="w-4 h-4 text-[#164E35]" />
              <span>View Customers</span>
            </button>
          </div>
        </div>

        {/* Subtle timeline strip */}
        <div className="mt-5 pt-4 border-t border-[#E6E0D2] flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-stone-600">
          <div className="flex items-center gap-1.5">
            <BookCheck className="w-4 h-4 text-[#164E35]" />
            <span>Deterministic Paise Accounting</span>
          </div>
          <div className="flex items-center gap-1.5">
            <BellRing className="w-4 h-4 text-[#C25438]" />
            <span>Automated Payment Reminder Drafts</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#164E35]" />
            <span>Private Local Persistence</span>
          </div>
        </div>
      </div>

      {/* 4 Primary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Outstanding Credit */}
        <div className="bg-[#FFFFFF] border border-[#E6E0D2] rounded-xl p-5 shadow-xs relative ledger-rule-green">
          <div className="flex items-center justify-between text-xs font-medium text-stone-600">
            <span>Total Outstanding Credit</span>
            <div className="p-1.5 rounded-md bg-[#FBECE8] text-[#9E3E23]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold font-num text-[#9E3E23] tracking-tight">
              {formatINR(stats.totalOutstandingCreditPaise)}
            </div>
            <p className="text-xs text-stone-600 mt-1">
              Active udhari to be collected
            </p>
          </div>
          <div className="mt-4 pt-3 ledger-hairline flex items-center justify-between text-[11px] text-stone-600">
            <span>Settled Accounts</span>
            <span className="font-semibold text-stone-800 font-num">{stats.totalSettledCustomersCount}</span>
          </div>
        </div>

        {/* Card 2: Customers with Balance */}
        <div className="bg-[#FFFFFF] border border-[#E6E0D2] rounded-xl p-5 shadow-xs relative">
          <div className="flex items-center justify-between text-xs font-medium text-stone-600">
            <span>Customers with Balance</span>
            <div className="p-1.5 rounded-md bg-[#E6F3EC] text-[#164E35]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold font-num text-[#103325] tracking-tight">
              {stats.customersWithOutstandingCount}
            </div>
            <p className="text-xs text-stone-600 mt-1">
              Customers currently owing credit
            </p>
          </div>
          <div className="mt-4 pt-3 ledger-hairline flex items-center justify-between text-[11px] text-stone-600">
            <span>Advance Depositors</span>
            <span className="font-semibold text-stone-800 font-num">{stats.totalAdvanceCustomersCount}</span>
          </div>
        </div>

        {/* Card 3: Credit Added This Month */}
        <div className="bg-[#FFFFFF] border border-[#E6E0D2] rounded-xl p-5 shadow-xs relative">
          <div className="flex items-center justify-between text-xs font-medium text-stone-600">
            <span>Credit Added This Month</span>
            <div className="p-1.5 rounded-md bg-[#FAF7F2] text-stone-700 border border-[#E6E0D2]">
              <ArrowUpRight className="w-4 h-4 text-[#C25438]" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold font-num text-stone-900 tracking-tight">
              {formatINR(stats.creditAddedThisMonthPaise)}
            </div>
            <p className="text-xs text-stone-600 mt-1">
              Purchases given on udhari this month
            </p>
          </div>
          <div className="mt-4 pt-3 ledger-hairline flex items-center justify-between text-[11px] text-stone-600">
            <span>Ledger status</span>
            <span className="text-[#164E35] font-semibold">Active</span>
          </div>
        </div>

        {/* Card 4: Payments Received This Month */}
        <div className="bg-[#FFFFFF] border border-[#E6E0D2] rounded-xl p-5 shadow-xs relative">
          <div className="flex items-center justify-between text-xs font-medium text-stone-600">
            <span>Payments Received</span>
            <div className="p-1.5 rounded-md bg-[#E6F3EC] text-[#164E35]">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold font-num text-[#164E35] tracking-tight">
              {formatINR(stats.paymentsReceivedThisMonthPaise)}
            </div>
            <p className="text-xs text-stone-600 mt-1">
              Cash & UPI recovered this month
            </p>
          </div>
          <div className="mt-4 pt-3 ledger-hairline flex items-center justify-between text-[11px] text-stone-600">
            <span>Collections</span>
            <span className="text-[#164E35] font-semibold">Verified</span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Section: Recent Transactions + Top Outstanding Balances */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Searchable Recent Transactions */}
        <div className="lg:col-span-7 bg-[#FFFFFF] border border-[#E6E0D2] rounded-xl p-5 shadow-xs flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E6E0D2]">
            <div>
              <h3 className="font-canto text-lg font-bold text-[#103325]">
                Recent Transactions
              </h3>
              <p className="text-xs text-stone-600">
                Latest customer purchases & payment entries
              </p>
            </div>

            {/* Transaction Search Box */}
            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-700" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, item, date..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#FAF7F2] border border-[#D5CEBE] rounded-lg text-stone-900 placeholder:text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#164E35] focus:bg-white"
              />
            </div>
          </div>

          {/* Transactions List */}
          <div className="divide-y divide-[#E6E0D2] flex-1 overflow-y-auto max-h-[460px]">
            {filteredRecentTransactions.length === 0 ? (
              <div className="py-12 text-center text-stone-600">
                <ReceiptText className="w-8 h-8 mx-auto text-stone-700 mb-2 opacity-50" />
                <p className="text-sm font-medium">No recent transactions found</p>
                <p className="text-xs text-stone-600 mt-1">
                  Dictate or record your first entry using "+ Add Entry"
                </p>
              </div>
            ) : (
              filteredRecentTransactions.map((tx) => {
                const isCredit = tx.type === 'credit';
                return (
                  <div
                    key={tx.id}
                    onClick={() => onOpenCustomer(tx.customerId)}
                    className="py-3 px-2 flex items-center justify-between gap-3 hover:bg-[#FAF7F2] rounded-lg cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          isCredit
                            ? 'bg-[#FBECE8] text-[#9E3E23]'
                            : 'bg-[#E6F3EC] text-[#164E35]'
                        }`}
                      >
                        {isCredit ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownLeft className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-stone-900 group-hover:text-[#164E35] transition-colors truncate">
                            {tx.customerName}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              isCredit
                                ? 'bg-[#FBECE8] text-[#9E3E23]'
                                : 'bg-[#E6F3EC] text-[#164E35]'
                            }`}
                          >
                            {isCredit ? 'Credit Purchase' : 'Payment Received'}
                          </span>
                        </div>
                        <div className="text-xs text-stone-600 truncate mt-0.5">
                          {tx.description} • <span className="font-num">{tx.date}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className={`text-sm font-bold font-num ${
                          isCredit ? 'text-[#9E3E23]' : 'text-[#164E35]'
                        }`}
                      >
                        {isCredit ? '+' : '-'}
                        {formatINR(tx.amountPaise, { absolute: true })}
                      </div>
                      <div className="text-[11px] text-stone-600 font-num">
                        Bal: {formatINR(tx.runningBalancePaise)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-3 border-t border-[#E6E0D2] flex items-center justify-between text-xs text-stone-600">
            <span>Showing recent ledger activities</span>
            <button
              type="button"
              onClick={() => setActiveView('transactions')}
              className="text-[#164E35] font-semibold hover:underline inline-flex items-center gap-1"
            >
              <span>Full Ledger</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Column (5 cols): Top Customers with Highest Outstanding Balances */}
        <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#E6E0D2] rounded-xl p-5 shadow-xs flex flex-col">
          <div className="pb-4 border-b border-[#E6E0D2]">
            <h3 className="font-canto text-lg font-bold text-[#103325]">
              Highest Outstanding Balances
            </h3>
            <p className="text-xs text-stone-600">
              Customers with the largest unpaid credit (udhari)
            </p>
          </div>

          <div className="divide-y divide-[#E6E0D2] flex-1 py-1">
            {stats.topDebtors.length === 0 ? (
              <div className="py-12 text-center text-stone-600">
                <BookCheck className="w-8 h-8 mx-auto text-[#164E35] mb-2 opacity-60" />
                <p className="text-sm font-medium">All accounts settled!</p>
                <p className="text-xs text-stone-600 mt-1">
                  No customers currently owe outstanding balances.
                </p>
              </div>
            ) : (
              stats.topDebtors.map((customer, idx) => {
                return (
                  <div
                    key={customer.id}
                    className="py-3 px-2 flex items-center justify-between gap-3 hover:bg-[#FAF7F2] rounded-lg transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-[#FAF7F2] border border-[#D5CEBE] text-stone-700 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <div
                          onClick={() => onOpenCustomer(customer.id)}
                          className="text-sm font-semibold text-stone-900 group-hover:text-[#164E35] cursor-pointer truncate"
                        >
                          {customer.name}
                        </div>
                        <div className="text-xs text-stone-600">
                          {customer.phone || 'No phone'} • {customer.transactionCount} entries
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <div className="text-sm font-bold font-num text-[#9E3E23]">
                          {formatINR(customer.balancePaise)}
                        </div>
                        <span className="text-[10px] text-stone-700 font-medium">Due</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenCustomer(customer.id)}
                        className="p-1.5 text-stone-700 hover:text-stone-900 hover:bg-[#E6F3EC] rounded-md transition-colors"
                        aria-label={`View ledger for ${customer.name}`}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Payment Collection Tip */}
          <div className="mt-4 p-3 bg-[#FAF7F2] rounded-lg border border-[#E6E0D2] flex items-center justify-between gap-2">
            <div className="text-xs text-stone-700">
              <span className="font-semibold text-stone-900">Need to collect?</span> Click on any customer to generate a pre-filled WhatsApp reminder draft.
            </div>
            <button
              type="button"
              onClick={() => setActiveView('customers')}
              className="text-xs font-semibold text-[#164E35] hover:underline shrink-0"
            >
              Customers &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function ReceiptText(props: any) {
  return <CreditCard {...props} />;
}
