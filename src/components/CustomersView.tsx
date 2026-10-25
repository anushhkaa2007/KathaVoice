import React, { useState } from 'react';
import {
  Users,
  Search,
  PlusCircle,
  Phone,
  ChevronRight,
  TrendingUp,
  BookCheck,
  CheckCircle,
  Plus,
  X,
  CreditCard,
  ArrowUpRight,
} from 'lucide-react';
import { useKhata } from '../context/KhataContext';
import { CustomerWithSummary } from '../types/khata';
import { formatINR, paiseToRupees } from '../utils/accounting';

interface CustomersViewProps {
  onOpenCustomer: (customerId: string) => void;
  onRecordNewEntry: (customerName: string) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  onOpenCustomer,
  onRecordNewEntry,
}) => {
  const { customers, stats, addCustomer, allTransactionsWithRunning } = useKhata();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'due' | 'settled' | 'advance'>('all');
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: '',
    phone: '',
    notes: '',
  });
  const [formError, setFormError] = useState('');

  // Map each customer with their latest balance and summary
  const customerSummaries: CustomerWithSummary[] = customers.map((c) => {
    const txs = allTransactionsWithRunning.filter((t) => t.customerId === c.id);
    let totalCreditPaise = 0;
    let totalPaymentPaise = 0;
    let lastDate: string | undefined = undefined;

    for (const t of txs) {
      if (t.type === 'credit') totalCreditPaise += t.amountPaise;
      else totalPaymentPaise += t.amountPaise;
      if (!lastDate || t.date > lastDate) lastDate = t.date;
    }

    return {
      ...c,
      balancePaise: totalCreditPaise - totalPaymentPaise,
      totalCreditPaise,
      totalPaymentPaise,
      transactionCount: txs.length,
      lastTransactionDate: lastDate,
    };
  });

  // Filter customers
  const filteredCustomers = customerSummaries.filter((c) => {
    // Search query
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone && c.phone.includes(searchQuery)) ||
      (c.notes && c.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    // Filter tab
    if (filterTab === 'due') return c.balancePaise > 0;
    if (filterTab === 'settled') return c.balancePaise === 0;
    if (filterTab === 'advance') return c.balancePaise < 0;
    return true;
  });

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerForm.name.trim()) {
      setFormError('Customer name is required.');
      return;
    }

    try {
      const created = await addCustomer({
        name: newCustomerForm.name.trim(),
        phone: newCustomerForm.phone.trim() || undefined,
        notes: newCustomerForm.notes.trim() || undefined,
      });

      setNewCustomerForm({ name: '', phone: '', notes: '' });
      setFormError('');
      setShowAddCustomerModal(false);
      onOpenCustomer(created.id);
    } catch (err: any) {
      setFormError(err.message || 'Failed to create customer');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Top Banner & Summary */}
      <div className="bg-[#FFFFFF] border border-[#E6E0D2] rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 laser-paper">
        <div>
          <h2 className="font-canto text-2xl font-bold text-[#103325]">
            Customer Khata Accounts
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
            Manage individual ledger accounts, check live balances, and record payments
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddCustomerModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#164E35] text-white text-xs sm:text-sm font-semibold hover:bg-[#103325] transition-colors shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Customer</span>
        </button>
      </div>

      {/* Search Bar & Filter Tabs */}
      <div className="bg-[#FFFFFF] border border-[#E6E0D2] rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-700" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer name or phone..."
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-[#FAF7F2] border border-[#D5CEBE] rounded-lg text-stone-900 placeholder:text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#164E35] focus:bg-white"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filterTab === 'all'
                ? 'bg-[#164E35] text-white shadow-xs'
                : 'bg-[#FAF7F2] text-stone-700 hover:bg-[#F5F2EB]'
            }`}
          >
            All Accounts ({customerSummaries.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('due')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filterTab === 'due'
                ? 'bg-[#9E3E23] text-white shadow-xs'
                : 'bg-[#FAF7F2] text-stone-700 hover:bg-[#F5F2EB]'
            }`}
          >
            Outstanding Dues ({customerSummaries.filter((c) => c.balancePaise > 0).length})
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('settled')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filterTab === 'settled'
                ? 'bg-[#164E35] text-white shadow-xs'
                : 'bg-[#FAF7F2] text-stone-700 hover:bg-[#F5F2EB]'
            }`}
          >
            Settled ({customerSummaries.filter((c) => c.balancePaise === 0).length})
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('advance')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filterTab === 'advance'
                ? 'bg-[#164E35] text-white shadow-xs'
                : 'bg-[#FAF7F2] text-stone-700 hover:bg-[#F5F2EB]'
            }`}
          >
            Advances ({customerSummaries.filter((c) => c.balancePaise < 0).length})
          </button>
        </div>
      </div>

      {/* Customer List (Table on Desktop, Cards on Mobile) */}
      <div className="bg-[#FFFFFF] border border-[#E6E0D2] rounded-xl shadow-xs overflow-hidden">
        {filteredCustomers.length === 0 ? (
          <div className="py-16 text-center text-stone-600">
            <Users className="w-10 h-10 mx-auto text-stone-700 mb-2 opacity-50" />
            <h3 className="text-base font-semibold text-stone-800">No customers found</h3>
            <p className="text-xs text-stone-600 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No customers matched "${searchQuery}". Try a different search.`
                : 'Add your first customer account or click "Load Demo Data".'}
            </p>
            <button
              type="button"
              onClick={() => setShowAddCustomerModal(true)}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#164E35] text-white text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Customer</span>
            </button>
          </div>
        ) : (
          <div>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF7F2] text-stone-600 uppercase tracking-wider font-semibold border-b border-[#E6E0D2]">
                  <tr>
                    <th className="py-3 px-5">Customer Name</th>
                    <th className="py-3 px-5">Phone / Contact</th>
                    <th className="py-3 px-5">Last Transaction</th>
                    <th className="py-3 px-5 text-center">Entries</th>
                    <th className="py-3 px-5 text-right">Current Balance</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E0D2]">
                  {filteredCustomers.map((cust) => {
                    const isDue = cust.balancePaise > 0;
                    const isAdvance = cust.balancePaise < 0;
                    const isSettled = cust.balancePaise === 0;

                    return (
                      <tr
                        key={cust.id}
                        onClick={() => onOpenCustomer(cust.id)}
                        className="hover:bg-[#FAF7F2] transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-5 font-semibold text-stone-900 group-hover:text-[#164E35]">
                          <div>{cust.name}</div>
                          {cust.notes && (
                            <div className="text-[11px] text-stone-600 font-normal truncate max-w-xs">
                              {cust.notes}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-5 font-num text-stone-600">
                          {cust.phone || <span className="text-stone-700 italic">No phone</span>}
                        </td>

                        <td className="py-3.5 px-5 font-num text-stone-600">
                          {cust.lastTransactionDate || 'No transactions yet'}
                        </td>

                        <td className="py-3.5 px-5 text-center font-num text-stone-700">
                          {cust.transactionCount}
                        </td>

                        <td className="py-3.5 px-5 text-right">
                          <div
                            className={`text-sm font-bold font-num ${
                              isDue ? 'text-[#9E3E23]' : isAdvance ? 'text-[#164E35]' : 'text-stone-700'
                            }`}
                          >
                            {formatINR(cust.balancePaise, { absolute: true })}
                          </div>
                          <div
                            className={`text-[10px] font-medium uppercase tracking-wider ${
                              isDue
                                ? 'text-[#9E3E23]'
                                : isAdvance
                                ? 'text-[#164E35]'
                                : 'text-stone-700'
                            }`}
                          >
                            {isDue ? 'Due (Owes)' : isAdvance ? 'Advance' : 'Settled'}
                          </div>
                        </td>

                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          <div
                            className="inline-flex items-center gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => onRecordNewEntry(cust.name)}
                              className="px-2.5 py-1 text-xs font-semibold rounded bg-[#E6F3EC] text-[#164E35] hover:bg-[#164E35] hover:text-white transition-colors"
                            >
                              + Entry
                            </button>
                            <button
                              type="button"
                              onClick={() => onOpenCustomer(cust.id)}
                              className="p-1 text-stone-600 hover:text-stone-900 rounded"
                              aria-label="View ledger"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden divide-y divide-[#E6E0D2]">
              {filteredCustomers.map((cust) => {
                const isDue = cust.balancePaise > 0;
                const isAdvance = cust.balancePaise < 0;

                return (
                  <div
                    key={cust.id}
                    onClick={() => onOpenCustomer(cust.id)}
                    className="p-4 hover:bg-[#FAF7F2] transition-colors cursor-pointer space-y-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-stone-900">{cust.name}</h4>
                        {cust.phone && (
                          <div className="text-xs text-stone-600 font-num mt-0.5">
                            {cust.phone}
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <div
                          className={`text-base font-bold font-num ${
                            isDue ? 'text-[#9E3E23]' : isAdvance ? 'text-[#164E35]' : 'text-stone-700'
                          }`}
                        >
                          {formatINR(cust.balancePaise, { absolute: true })}
                        </div>
                        <span
                          className={`text-[10px] font-semibold uppercase ${
                            isDue ? 'text-[#9E3E23]' : isAdvance ? 'text-[#164E35]' : 'text-stone-700'
                          }`}
                        >
                          {isDue ? 'Due' : isAdvance ? 'Advance' : 'Settled'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-stone-600 pt-1">
                      <span>{cust.transactionCount} ledger entries</span>
                      <span className="font-num">
                        {cust.lastTransactionDate ? `Last: ${cust.lastTransactionDate}` : 'No entries'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-60 bg-stone-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#E6E0D2] max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3 border-[#E6E0D2]">
              <h3 className="font-canto text-lg font-bold text-[#103325]">
                Add New Customer Account
              </h3>
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(false)}
                className="text-stone-600 hover:text-stone-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-2.5 rounded bg-red-50 text-red-700 text-xs border border-red-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateCustomer} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-stone-800">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={newCustomerForm.name}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
                  placeholder="e.g. Ramesh Kumar, Gupta Provisions"
                  className="w-full mt-1 px-3 py-2 text-sm bg-white border border-[#D5CEBE] rounded-lg text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#164E35]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-800">Phone Number (Optional)</label>
                <input
                  type="text"
                  value={newCustomerForm.phone}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full mt-1 px-3 py-2 text-sm bg-white border border-[#D5CEBE] rounded-lg text-stone-900 font-num focus:outline-none focus:ring-1 focus:ring-[#164E35]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-800">Notes / Address (Optional)</label>
                <textarea
                  rows={2}
                  value={newCustomerForm.notes}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, notes: e.target.value })}
                  placeholder="e.g. Flat 301, pays weekly"
                  className="w-full mt-1 px-3 py-2 text-sm bg-white border border-[#D5CEBE] rounded-lg text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#164E35]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E6E0D2]">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-3 py-1.5 rounded-lg border text-xs font-semibold text-stone-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#164E35] text-white text-xs font-bold hover:bg-[#103325]"
                >
                  Create Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
