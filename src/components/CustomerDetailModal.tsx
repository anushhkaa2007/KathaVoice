import React, { useState } from 'react';
import {
  X,
  Phone,
  Calendar,
  CreditCard,
  PlusCircle,
  Edit2,
  Trash2,
  Share2,
  MessageCircle,
  Copy,
  Check,
  ArrowUpRight,
  ArrowDownLeft,
  AlertCircle,
  FileText,
  UserCheck,
} from 'lucide-react';
import { CustomerWithSummary, TransactionWithBalance } from '../types/khata';
import { useKhata } from '../context/KhataContext';
import { formatINR, paiseToRupees, rupeesToPaise } from '../utils/accounting';

interface CustomerDetailModalProps {
  customer: CustomerWithSummary;
  onClose: () => void;
  onRecordNewEntry: (customerName: string) => void;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  customer,
  onClose,
  onRecordNewEntry,
}) => {
  const {
    selectedCustomerTransactions,
    updateTransaction,
    deleteTransaction,
    deleteCustomer,
    updateCustomer,
  } = useKhata();

  const [activeTab, setActiveTab] = useState<'all' | 'credit' | 'payment'>('all');
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithBalance | null>(null);
  const [confirmDeleteTxId, setConfirmDeleteTxId] = useState<string | null>(null);
  const [confirmDeleteCustomer, setConfirmDeleteCustomer] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [copiedReminder, setCopiedReminder] = useState(false);
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [customerForm, setCustomerForm] = useState({
    name: customer.name,
    phone: customer.phone || '',
    notes: customer.notes || '',
  });

  // Filter customer transactions
  const filteredTransactions = selectedCustomerTransactions.filter((tx) => {
    if (activeTab === 'all') return true;
    return tx.type === activeTab;
  });

  // Edit transaction form state
  const [editForm, setEditForm] = useState({
    type: 'credit' as 'credit' | 'payment',
    amountRupees: 0,
    description: '',
    date: '',
    notes: '',
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

  const handleSaveCustomerEdits = () => {
    if (!customerForm.name.trim()) return;
    updateCustomer(customer.id, {
      name: customerForm.name.trim(),
      phone: customerForm.phone.trim() || undefined,
      notes: customerForm.notes.trim() || undefined,
    });
    setIsEditingCustomer(false);
  };

  // WhatsApp Payment Reminder draft
  const reminderMessage = `Namaste ${customer.name},\nThis is a friendly update regarding your khata ledger account at our store.\n\nCurrent Outstanding Balance: ${formatINR(
    customer.balancePaise
  )}\nAs of: ${new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })}\n\nPlease kindly clear the pending dues at your earliest convenience via cash or UPI.\nThank you!`;

  const handleCopyReminder = () => {
    navigator.clipboard.writeText(reminderMessage);
    setCopiedReminder(true);
    setTimeout(() => setCopiedReminder(false), 2500);
  };

  const handleOpenWhatsApp = () => {
    const phoneDigits = (customer.phone || '').replace(/[^0-9]/g, '');
    const encoded = encodeURIComponent(reminderMessage);
    const url = phoneDigits
      ? `https://api.whatsapp.com/send?phone=${phoneDigits}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(url, '_blank');
  };

  const isDue = customer.balancePaise > 0;
  const isAdvance = customer.balancePaise < 0;
  const isSettled = customer.balancePaise === 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="customer-detail-title"
    >
      <div className="bg-[#FFFFFF] border border-[#E6E0D2] rounded-2xl w-full max-w-4xl shadow-xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-[#FAF7F2] border-b border-[#E6E0D2] flex items-start justify-between gap-4 shrink-0">
          <div className="flex-1 min-w-0">
            {isEditingCustomer ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                  placeholder="Customer Name"
                  className="w-full px-3 py-1.5 text-base font-bold bg-white border border-[#D5CEBE] rounded-lg"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                    placeholder="Phone Number (+91...)"
                    className="px-3 py-1 text-xs bg-white border border-[#D5CEBE] rounded-lg font-num"
                  />
                  <input
                    type="text"
                    value={customerForm.notes}
                    onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })}
                    placeholder="Notes (e.g. Flat 402)"
                    className="px-3 py-1 text-xs bg-white border border-[#D5CEBE] rounded-lg"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSaveCustomerEdits}
                    className="px-3 py-1 bg-[#164E35] text-white rounded text-xs font-semibold"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingCustomer(false)}
                    className="px-3 py-1 bg-white border border-[#D5CEBE] text-stone-700 rounded text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 id="customer-detail-title" className="font-canto text-2xl font-bold text-[#103325] truncate">
                    {customer.name}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsEditingCustomer(true)}
                    className="text-stone-600 hover:text-[#164E35] p-1 rounded hover:bg-stone-200"
                    title="Edit Customer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-stone-600 mt-1">
                  {customer.phone && (
                    <span className="flex items-center gap-1 font-num">
                      <Phone className="w-3.5 h-3.5 text-stone-600" />
                      {customer.phone}
                    </span>
                  )}
                  {customer.notes && (
                    <span className="text-stone-600 truncate max-w-md">
                      • {customer.notes}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-[#F5F2EB]"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Balance Banner & Top Actions */}
        <div className="px-5 sm:px-6 py-4 bg-[#FFFFFF] border-b border-[#E6E0D2] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-xs text-stone-600 font-medium uppercase tracking-wider">
                Current Net Balance
              </div>
              <div
                className={`text-2xl sm:text-3xl font-bold font-num tracking-tight mt-0.5 ${
                  isDue ? 'text-[#9E3E23]' : isAdvance ? 'text-[#164E35]' : 'text-stone-700'
                }`}
              >
                {formatINR(customer.balancePaise, { absolute: true })}
                <span className="text-sm font-sans font-semibold ml-2">
                  {isDue ? '(Customer Owes Due)' : isAdvance ? '(Customer Advance / Deposit)' : '(Settled)'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {isDue && (
              <button
                type="button"
                onClick={() => setShowReminderModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[#FAF7F2] border border-[#D5CEBE] text-stone-800 hover:bg-[#F5F2EB] transition-colors"
              >
                <Share2 className="w-3.5 h-3.5 text-[#164E35]" />
                <span>WhatsApp Reminder</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onRecordNewEntry(customer.name)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-[#164E35] text-white hover:bg-[#103325] transition-colors shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Record Transaction</span>
            </button>
          </div>
        </div>

        {/* Ledger Navigation Filter Tabs */}
        <div className="px-5 sm:px-6 py-2.5 bg-[#FAF7F2] border-b border-[#E6E0D2] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                activeTab === 'all'
                  ? 'bg-white shadow-xs text-[#164E35] border border-[#D5CEBE]'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              All ({selectedCustomerTransactions.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('credit')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                activeTab === 'credit'
                  ? 'bg-white shadow-xs text-[#9E3E23] border border-[#D5CEBE]'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Credit Purchases / Udhari
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('payment')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                activeTab === 'payment'
                  ? 'bg-white shadow-xs text-[#164E35] border border-[#D5CEBE]'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Payments Received / Jama
            </button>
          </div>

          <div className="text-[11px] text-stone-600 hidden sm:block">
            Automatic Running Balance Ledger
          </div>
        </div>

        {/* Transaction History Table */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {filteredTransactions.length === 0 ? (
            <div className="py-16 text-center text-stone-600">
              <FileText className="w-8 h-8 mx-auto text-stone-600 mb-2 opacity-50" />
              <p className="text-sm font-medium">No transactions in this view</p>
              <p className="text-xs text-stone-600 mt-1">
                Record a credit purchase or payment for {customer.name}
              </p>
            </div>
          ) : (
            <div className="border border-[#E6E0D2] rounded-xl overflow-hidden bg-white shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF7F2] text-stone-600 uppercase tracking-wider font-semibold border-b border-[#E6E0D2]">
                  <tr>
                    <th className="py-3 px-3 sm:px-4">Date</th>
                    <th className="py-3 px-3 sm:px-4">Type</th>
                    <th className="py-3 px-3 sm:px-4">Items / Details</th>
                    <th className="py-3 px-3 sm:px-4 text-right">Amount</th>
                    <th className="py-3 px-3 sm:px-4 text-right">Running Balance</th>
                    <th className="py-3 px-3 sm:px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E0D2]">
                  {filteredTransactions.map((tx) => {
                    const isCredit = tx.type === 'credit';
                    return (
                      <tr key={tx.id} className="hover:bg-[#FAF7F2] transition-colors">
                        <td className="py-3 px-3 sm:px-4 font-num text-stone-700 whitespace-nowrap">
                          {tx.date}
                        </td>
                        <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
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
                            {isCredit ? 'Credit (Udhari)' : 'Payment (Jama)'}
                          </span>
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-stone-900 font-medium max-w-xs truncate">
                          <div>{tx.description}</div>
                          {tx.notes && (
                            <div className="text-[10px] text-stone-600 truncate">{tx.notes}</div>
                          )}
                        </td>
                        <td
                          className={`py-3 px-3 sm:px-4 text-right font-bold font-num whitespace-nowrap ${
                            isCredit ? 'text-[#9E3E23]' : 'text-[#164E35]'
                          }`}
                        >
                          {isCredit ? '+' : '-'}
                          {formatINR(tx.amountPaise, { absolute: true })}
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-right font-num font-semibold text-stone-800 whitespace-nowrap">
                          {formatINR(tx.runningBalancePaise)}
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
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
                              onClick={() => setConfirmDeleteTxId(tx.id)}
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
          )}
        </div>

        {/* Footer info & Delete Customer */}
        <div className="p-4 bg-[#FAF7F2] border-t border-[#E6E0D2] flex items-center justify-between text-xs text-stone-600 shrink-0">
          <div>
            Total Purchases: <strong className="text-stone-900">{formatINR(customer.totalCreditPaise)}</strong> • Total Payments: <strong className="text-stone-900">{formatINR(customer.totalPaymentPaise)}</strong>
          </div>

          <button
            type="button"
            onClick={() => setConfirmDeleteCustomer(true)}
            className="text-[#9E3E23] hover:underline flex items-center gap-1 text-[11px]"
          >
            <Trash2 className="w-3 h-3" />
            Delete Customer Account
          </button>
        </div>
      </div>

      {/* Edit Transaction Modal */}
      {editingTransaction && (
        <div className="fixed inset-0 z-60 bg-stone-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#E6E0D2] max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3 border-[#E6E0D2]">
              <h4 className="font-bold text-stone-900 text-sm">Edit Transaction</h4>
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

      {/* Confirm Delete Transaction Dialog */}
      {confirmDeleteTxId && (
        <div className="fixed inset-0 z-60 bg-stone-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#E6E0D2] max-w-sm w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-[#9E3E23]">
              <AlertCircle className="w-5 h-5" />
              <h4 className="font-bold text-sm">Delete Transaction Entry?</h4>
            </div>
            <p className="text-xs text-stone-600">
              Are you sure you want to delete this transaction? The customer balance and running ledger will be automatically recalculated.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteTxId(null)}
                className="px-3 py-1.5 rounded-lg border text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteTransaction(confirmDeleteTxId);
                  setConfirmDeleteTxId(null);
                }}
                className="px-4 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Customer Account Dialog */}
      {confirmDeleteCustomer && (
        <div className="fixed inset-0 z-60 bg-stone-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#E6E0D2] max-w-sm w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <h4 className="font-bold text-sm">Delete Customer Account?</h4>
            </div>
            <p className="text-xs text-stone-600">
              This will permanently delete <strong>{customer.name}</strong> and all associated transaction records.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteCustomer(false)}
                className="px-3 py-1.5 rounded-lg border text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteCustomer(customer.id);
                  setConfirmDeleteCustomer(false);
                  onClose();
                }}
                className="px-4 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Payment Reminder Modal */}
      {showReminderModal && (
        <div className="fixed inset-0 z-60 bg-stone-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#E6E0D2] max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3 border-[#E6E0D2]">
              <div className="flex items-center gap-2 text-[#164E35]">
                <MessageCircle className="w-5 h-5" />
                <h4 className="font-bold text-sm">Payment Reminder Draft</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowReminderModal(false)}
                className="text-stone-600 hover:text-stone-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-[#FAF7F2] border border-[#D5CEBE] rounded-lg text-xs font-mono whitespace-pre-wrap text-stone-800 leading-relaxed max-h-48 overflow-y-auto">
              {reminderMessage}
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={handleCopyReminder}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#D5CEBE] text-xs font-semibold text-stone-700 hover:bg-[#FAF7F2]"
              >
                {copiedReminder ? (
                  <>
                    <Check className="w-4 h-4 text-[#164E35]" />
                    <span className="text-[#164E35]">Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#25D366] text-white text-xs font-bold hover:bg-[#20BA59]"
              >
                <Share2 className="w-4 h-4" />
                <span>Send via WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
