import React, { useState } from 'react';
import {
  Search,
  Download,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Edit2,
  Trash2,
  FileSpreadsheet,
  AlertCircle,
  X,
  CreditCard,
  PlusCircle,
} from 'lucide-react';
import { useKhata } from '../context/KhataContext';
import { TransactionWithBalance } from '../types/khata';
import { formatINR, paiseToRupees } from '../utils/accounting';

interface TransactionsViewProps {
  onOpenCustomer: (customerId: string) => void;
  onRecordNewEntry: () => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  onOpenCustomer,
  onRecordNewEntry,
}) => {
  const {
    allTransactionsWithRunning,
    updateTransaction,
    deleteTransaction,
    exportToCSV,
  } = useKhata();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'credit' | 'payment'>('all');
  const [dateFilter, setDateFilter] = useState('');

  // Editing modal state
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithBalance | null>(null);
  const [editForm, setEditForm] = useState({
    type: 'credit' as 'credit' | 'payment',
    amountRupees: 0,
    description: '',
    date: '',
    notes: '',
  });

  // Deletion confirm modal
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Filter transactions
  const filteredTransactions = allTransactionsWithRunning.filter((tx) => {
    // Type filter
    if (typeFilter !== 'all' && tx.type !== typeFilter) return false;

    // Date filter
    if (dateFilter && tx.date !== dateFilter) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCustomer = tx.customerName.toLowerCase().includes(q);
      const matchDesc = tx.description.toLowerCase().includes(q);
      const matchNotes = tx.notes ? tx.notes.toLowerCase().includes(q) : false;
      const matchDate = tx.date.includes(q);
      if (!matchCustomer && !matchDesc && !matchNotes && !matchDate) return false;
    }

    return true;
  });

  const handleStartEdit = (tx: TransactionWithBalance) => {
    setEditingTransaction(tx);
    setEditForm({
      type: tx.type,
      amountRupees: paiseToRupees(tx.amountPaise),
      description: tx.description,
      date: tx.date,
      notes: tx.notes || '',
    });
  };

  const handleSaveEdit = () => {
    if (!editingTransaction) return;
    if (editForm.amountRupees <= 0) return;

    updateTransaction(editingTransaction.id, {
      type: editForm.type,
      amountRupees: editForm.amountRupees,
      description: editForm.description,
      date: editForm.date,
      notes: editForm.notes,
    });

    setEditingTransaction(null);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Banner */}
      <div className="bg-[#FFFFFF] border border-[#E6E0D2] rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 laser-paper">
        <div>
          <h2 className="font-canto text-2xl font-bold text-[#103325]">
            Master Ledger & Transactions
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
            Full chronological record of credit sales and payment receipts with running balances
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={exportToCSV}
            disabled={allTransactionsWithRunning.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#FAF7F2] border border-[#D5CEBE] text-stone-800 text-xs sm:text-sm font-semibold hover:bg-[#F5F2EB] disabled:opacity-40 transition-colors"
          >
            <Download className="w-4 h-4 text-[#164E35]" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={onRecordNewEntry}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#164E35] text-white text-xs sm:text-sm font-semibold hover:bg-[#103325] transition-colors shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Add Entry</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[#FFFFFF] border border-[#E6E0D2] rounded-xl p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-700" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer, items, notes..."
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-[#FAF7F2] border border-[#D5CEBE] rounded-lg text-stone-900 placeholder:text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#164E35] focus:bg-white"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Type Filter Buttons */}
          <div className="flex items-center gap-1 bg-[#FAF7F2] p-1 rounded-lg border border-[#D5CEBE] text-xs font-semibold">
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                typeFilter === 'all'
                  ? 'bg-white shadow-xs text-[#164E35]'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              All Types
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('credit')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                typeFilter === 'credit'
                  ? 'bg-white shadow-xs text-[#9E3E23]'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Credit (Udhari)
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('payment')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                typeFilter === 'payment'
                  ? 'bg-white shadow-xs text-[#164E35]'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Payments (Jama)
            </button>
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-[#FAF7F2] border border-[#D5CEBE] rounded-lg text-stone-900 font-num focus:outline-none focus:ring-1 focus:ring-[#164E35]"
            />
            {dateFilter && (
              <button
                type="button"
                onClick={() => setDateFilter('')}
                className="text-xs text-stone-600 hover:text-stone-900 px-1 py-1"
                title="Clear date filter"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Ledger Table (Desktop) & Cards (Mobile) */}
      <div className="bg-[#FFFFFF] border border-[#E6E0D2] rounded-xl shadow-xs overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="py-16 text-center text-stone-600">
            <CreditCard className="w-10 h-10 mx-auto text-stone-700 mb-2 opacity-50" />
            <h3 className="text-base font-semibold text-stone-800">No transactions found</h3>
            <p className="text-xs text-stone-600 mt-1 max-w-sm mx-auto">
              No ledger entries match the selected filters.
            </p>
          </div>
        ) : (
          <div>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF7F2] text-stone-600 uppercase tracking-wider font-semibold border-b border-[#E6E0D2]">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-right">Running Balance</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E0D2]">
                  {filteredTransactions.map((tx) => {
                    const isCredit = tx.type === 'credit';
                    return (
                      <tr key={tx.id} className="hover:bg-[#FAF7F2] transition-colors">
                        <td className="py-3.5 px-4 font-num text-stone-700 whitespace-nowrap">
                          {tx.date}
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-stone-900 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onOpenCustomer(tx.customerId)}
                            className="hover:text-[#164E35] hover:underline text-left"
                          >
                            {tx.customerName}
                          </button>
                        </td>

                        <td className="py-3.5 px-4 text-stone-900 font-medium max-w-md">
                          <div>{tx.description}</div>
                          {tx.notes && (
                            <div className="text-[10px] text-stone-600 truncate">{tx.notes}</div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                              isCredit
                                ? 'bg-[#FBECE8] text-[#9E3E23]'
                                : 'bg-[#E6F3EC] text-[#164E35]'
                            }`}
                          >
                            {isCredit ? (
                              <ArrowUpRight className="w-3 h-3 text-[#C25438]" />
                            ) : (
                              <ArrowDownLeft className="w-3 h-3 text-[#164E35]" />
                            )}
                            {isCredit ? 'Credit Purchase' : 'Payment Received'}
                          </span>
                        </td>

                        <td
                          className={`py-3.5 px-4 text-right font-bold font-num whitespace-nowrap ${
                            isCredit ? 'text-[#9E3E23]' : 'text-[#164E35]'
                          }`}
                        >
                          {isCredit ? '+' : '-'}
                          {formatINR(tx.amountPaise, { absolute: true })}
                        </td>

                        <td className="py-3.5 px-4 text-right font-num font-semibold text-stone-800 whitespace-nowrap">
                          {formatINR(tx.runningBalancePaise)}
                        </td>

                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(tx)}
                              className="p-1 text-stone-600 hover:text-[#164E35] rounded hover:bg-[#E6F3EC]"
                              title="Edit transaction"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(tx.id)}
                              className="p-1 text-stone-600 hover:text-red-700 rounded hover:bg-red-50"
                              title="Delete transaction"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
              {filteredTransactions.map((tx) => {
                const isCredit = tx.type === 'credit';
                return (
                  <div key={tx.id} className="p-4 space-y-2 hover:bg-[#FAF7F2]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <button
                          type="button"
                          onClick={() => onOpenCustomer(tx.customerId)}
                          className="text-sm font-bold text-stone-900 hover:text-[#164E35]"
                        >
                          {tx.customerName}
                        </button>
                        <div className="text-xs text-stone-600 mt-0.5">{tx.description}</div>
                      </div>

                      <div className="text-right">
                        <div
                          className={`text-base font-bold font-num ${
                            isCredit ? 'text-[#9E3E23]' : 'text-[#164E35]'
                          }`}
                        >
                          {isCredit ? '+' : '-'}
                          {formatINR(tx.amountPaise, { absolute: true })}
                        </div>
                        <span
                          className={`text-[10px] font-semibold uppercase ${
                            isCredit ? 'text-[#9E3E23]' : 'text-[#164E35]'
                          }`}
                        >
                          {isCredit ? 'Credit' : 'Payment'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-stone-600 pt-1 border-t border-[#E6E0D2]/60">
                      <span className="font-num">{tx.date}</span>
                      <span className="font-num font-medium text-stone-800">
                        Running Bal: {formatINR(tx.runningBalancePaise)}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(tx)}
                          className="p-1 text-stone-600 hover:text-[#164E35]"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(tx.id)}
                          className="p-1 text-stone-600 hover:text-red-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Edit Transaction Modal */}
      {editingTransaction && (
        <div className="fixed inset-0 z-60 bg-stone-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#E6E0D2] max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3 border-[#E6E0D2]">
              <h4 className="font-bold text-stone-900 text-sm">
                Edit Transaction for {editingTransaction.customerName}
              </h4>
              <button
                type="button"
                onClick={() => setEditingTransaction(null)}
                className="text-stone-600 hover:text-stone-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-stone-700">Type</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, type: 'credit' })}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold border ${
                      editForm.type === 'credit'
                        ? 'bg-[#FBECE8] border-[#C25438] text-[#9E3E23]'
                        : 'bg-white border-[#D5CEBE]'
                    }`}
                  >
                    Credit (Udhari)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, type: 'payment' })}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold border ${
                      editForm.type === 'payment'
                        ? 'bg-[#E6F3EC] border-[#164E35] text-[#164E35]'
                        : 'bg-white border-[#D5CEBE]'
                    }`}
                  >
                    Payment (Jama)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700">Amount (INR)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={editForm.amountRupees}
                  onChange={(e) =>
                    setEditForm({ ...editForm, amountRupees: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full mt-1 px-3 py-1.5 text-sm bg-white border border-[#D5CEBE] rounded-lg font-num font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700">Description</label>
                <input
                  type="text"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full mt-1 px-3 py-1.5 text-sm bg-white border border-[#D5CEBE] rounded-lg"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700">Date</label>
                <input
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                  className="w-full mt-1 px-3 py-1.5 text-sm bg-white border border-[#D5CEBE] rounded-lg font-num"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700">Notes (Optional)</label>
                <input
                  type="text"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full mt-1 px-3 py-1.5 text-sm bg-white border border-[#D5CEBE] rounded-lg"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E6E0D2]">
              <button
                type="button"
                onClick={() => setEditingTransaction(null)}
                className="px-3 py-1.5 rounded-lg border text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-4 py-1.5 rounded-lg bg-[#164E35] text-white text-xs font-bold"
              >
                Save & Recalculate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Deletion Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-60 bg-stone-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#E6E0D2] max-w-sm w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <h4 className="font-bold text-sm">Delete Transaction Entry?</h4>
            </div>
            <p className="text-xs text-stone-600">
              Deleting this record will automatically adjust the customer's balance and all subsequent running balances.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="px-3 py-1.5 rounded-lg border text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteTransaction(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
                className="px-4 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700"
              >
                Delete Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
