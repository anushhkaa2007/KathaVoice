import React from 'react';
import { PlusCircle, BookOpen, Menu, X, Users, LayoutDashboard, ReceiptText, Database, Trash2 } from 'lucide-react';
import { useKhata, ActiveView } from '../context/KhataContext';
import { formatINR } from '../utils/accounting';

interface HeaderProps {
  onLoadDemoClick: () => void;
  onClearDemoClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onLoadDemoClick, onClearDemoClick }) => {
  const { activeView, setActiveView, stats, setSelectedCustomerId } = useKhata();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const viewTitles: Record<ActiveView, { title: string; subtitle: string }> = {
    overview: {
      title: 'Overview Dashboard',
      subtitle: 'Real-time retail credit balances, monthly turnover, and top accounts',
    },
    customers: {
      title: 'Customer Accounts',
      subtitle: 'Individual khata books, full ledgers, and WhatsApp payment reminders',
    },
    'add-entry': {
      title: 'Add Entry — Dictation & Natural Language',
      subtitle: 'Speak naturally with Wispr Flow, review structured details, and save safely',
    },
    transactions: {
      title: 'Transactions Ledger',
      subtitle: 'Complete chronological history with running balances and CSV export',
    },
  };

  const currentMeta = viewTitles[activeView];

  return (
    <>
      <header className="sticky top-0 z-30 bg-[#FFFFFF] border-b border-[#E6E0D2] px-4 sm:px-6 py-3.5">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Mobile Title or Desktop View Title */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-stone-700 hover:text-stone-900 hover:bg-[#F5F2EB] rounded-lg"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="lg:hidden font-canto text-lg font-bold text-[#103325]">
                  Katha Voice Easy
                </span>
                <span className="hidden lg:inline font-canto text-xl font-bold text-[#103325]">
                  {currentMeta.title}
                </span>
              </div>
              <p className="hidden sm:block text-xs text-stone-700">
                {currentMeta.subtitle}
              </p>
            </div>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2.5 sm:gap-4">
            {/* Quick Balance Chip */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#FAF7F2] border border-[#E6E0D2] text-xs">
              <span className="text-stone-700">Total Credit Due:</span>
              <span className="font-bold font-num text-[#9E3E23]">
                {formatINR(stats.totalOutstandingCreditPaise)}
              </span>
            </div>

            {/* Obvious Primary Button: + Add Entry */}
            {activeView !== 'add-entry' && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomerId(null);
                  setActiveView('add-entry');
                }}
                className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-lg bg-[#164E35] text-white text-xs sm:text-sm font-semibold hover:bg-[#103325] active:scale-[0.98] transition-all shadow-sm ring-1 ring-[#103325]"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Add Entry</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Dropdown Menu Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-3 pt-3 border-t border-[#E6E0D2] space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomerId(null);
                  setActiveView('overview');
                  setMobileMenuOpen(false);
                }}
                className={`p-2.5 rounded-md flex items-center gap-2 ${
                  activeView === 'overview' ? 'bg-[#164E35] text-white font-medium' : 'bg-[#FAF7F2] text-stone-700'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Overview</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedCustomerId(null);
                  setActiveView('customers');
                  setMobileMenuOpen(false);
                }}
                className={`p-2.5 rounded-md flex items-center gap-2 ${
                  activeView === 'customers' ? 'bg-[#164E35] text-white font-medium' : 'bg-[#FAF7F2] text-stone-700'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Customers</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedCustomerId(null);
                  setActiveView('add-entry');
                  setMobileMenuOpen(false);
                }}
                className={`p-2.5 rounded-md flex items-center gap-2 ${
                  activeView === 'add-entry' ? 'bg-[#164E35] text-white font-medium' : 'bg-[#FAF7F2] text-stone-700'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add Entry</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedCustomerId(null);
                  setActiveView('transactions');
                  setMobileMenuOpen(false);
                }}
                className={`p-2.5 rounded-md flex items-center gap-2 ${
                  activeView === 'transactions' ? 'bg-[#164E35] text-white font-medium' : 'bg-[#FAF7F2] text-stone-700'
                }`}
              >
                <ReceiptText className="w-4 h-4" />
                <span>Transactions</span>
              </button>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs text-stone-700 border-t border-[#E6E0D2]">
              <button
                type="button"
                onClick={() => {
                  onLoadDemoClick();
                  setMobileMenuOpen(false);
                }}
                className="text-[#164E35] font-medium flex items-center gap-1 py-1"
              >
                <Database className="w-3.5 h-3.5" />
                Load Demo Data
              </button>
              <button
                type="button"
                onClick={() => {
                  onClearDemoClick();
                  setMobileMenuOpen(false);
                }}
                className="text-[#9E3E23] font-medium flex items-center gap-1 py-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear Data
              </button>
            </div>
          </div>
        )}
      </header>
    </>
  );
};
