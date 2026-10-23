import React, { useState, useEffect } from 'react';
import { KhataProvider, useKhata } from './context/KhataContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { MobileNav } from './components/MobileNav';
import { OverviewDashboard } from './components/OverviewDashboard';
import { CustomersView } from './components/CustomersView';
import { AddEntryView } from './components/AddEntryView';
import { TransactionsView } from './components/TransactionsView';
import { CustomerDetailModal } from './components/CustomerDetailModal';
import { AlertCircle, Database, Trash2, CheckCircle2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const {
    activeView,
    setActiveView,
    selectedCustomerId,
    setSelectedCustomerId,
    selectedCustomer,
    loadDemoData,
    clearDemoData,
  } = useKhata();

  const [showLoadDemoConfirm, setShowLoadDemoConfirm] = useState(false);
  const [showClearDemoConfirm, setShowClearDemoConfirm] = useState(false);
  const [initialAddEntryText, setInitialAddEntryText] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleOpenCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
  };

  const handleRecordNewEntryForCustomer = (customerName: string) => {
    setInitialAddEntryText(`${customerName} `);
    setActiveView('add-entry');
    setSelectedCustomerId(null);
  };

  // Global keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }
      if (e.key === 'n' || e.key === 'N') {
        setActiveView('add-entry');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveView]);

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-stone-900 flex flex-col lg:flex-row antialiased">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-70 bg-[#164E35] text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-[#E6F3EC]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Desktop Sidebar */}
      <Sidebar
        onAddCustomerClick={() => {
          setActiveView('customers');
        }}
        onLoadDemoClick={() => setShowLoadDemoConfirm(true)}
        onClearDemoClick={() => setShowClearDemoConfirm(true)}
      />

      {/* Main View Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onLoadDemoClick={() => setShowLoadDemoConfirm(true)}
          onClearDemoClick={() => setShowClearDemoConfirm(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {activeView === 'overview' && (
            <OverviewDashboard
              onOpenCustomer={handleOpenCustomer}
              onOpenAddEntryForCustomer={handleRecordNewEntryForCustomer}
            />
          )}

          {activeView === 'customers' && (
            <CustomersView
              onOpenCustomer={handleOpenCustomer}
              onRecordNewEntry={handleRecordNewEntryForCustomer}
            />
          )}

          {activeView === 'add-entry' && (
            <AddEntryView
              initialText={initialAddEntryText}
              onEntrySaved={(customerId) => {
                showToast('Transaction saved and balances updated!');
              }}
            />
          )}

          {activeView === 'transactions' && (
            <TransactionsView
              onOpenCustomer={handleOpenCustomer}
              onRecordNewEntry={() => setActiveView('add-entry')}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav />

      {/* Customer Detail Drawer/Modal */}
      {selectedCustomer && (
        <CustomerDetailModal
          customer={selectedCustomer}
          onClose={() => setSelectedCustomerId(null)}
          onRecordNewEntry={(name) => {
            handleRecordNewEntryForCustomer(name);
          }}
        />
      )}

      {/* Confirm Load Demo Data Modal */}
      {showLoadDemoConfirm && (
        <div className="fixed inset-0 z-60 bg-stone-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#E6E0D2] max-w-sm w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-[#164E35]">
              <Database className="w-5 h-5" />
              <h4 className="font-bold text-sm">Load Demo Ledger Data?</h4>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              This will populate your khata ledger with fictional Indian retail customers (Sharma Ji, Patel Brothers, Verma Provisions, Gupta Store) and sample transactions for testing.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLoadDemoConfirm(false)}
                className="px-3 py-1.5 rounded-lg border text-xs font-semibold text-stone-700 hover:bg-[#FAF7F2]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  loadDemoData();
                  setShowLoadDemoConfirm(false);
                  showToast('Demo data loaded successfully!');
                }}
                className="px-4 py-1.5 rounded-lg bg-[#164E35] text-white text-xs font-bold hover:bg-[#103325]"
              >
                Load Demo Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Clear Data Modal */}
      {showClearDemoConfirm && (
        <div className="fixed inset-0 z-60 bg-stone-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#E6E0D2] max-w-sm w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-[#9E3E23]">
              <Trash2 className="w-5 h-5" />
              <h4 className="font-bold text-sm">Clear All Ledger Data?</h4>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              This will erase all customer records and transaction entries from this browser's local storage. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearDemoConfirm(false)}
                className="px-3 py-1.5 rounded-lg border text-xs font-semibold text-stone-700 hover:bg-[#FAF7F2]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  clearDemoData();
                  setShowClearDemoConfirm(false);
                  showToast('All ledger data cleared.');
                }}
                className="px-4 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700"
              >
                Clear All Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <KhataProvider>
      <AppContent />
    </KhataProvider>
  );
}
