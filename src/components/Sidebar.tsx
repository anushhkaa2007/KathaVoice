import {
  LayoutDashboard,
  Users,
  PlusCircle,
  ReceiptText,
  BookOpen,
  Mic,
  Database,
  Trash2,
  ExternalLink,
  LogOut,
  Store,
  UserCheck,
} from 'lucide-react';
import { useKhata } from '../context/KhataContext';
import { useAuth } from '../context/AuthContext';
import { formatINR } from '../utils/accounting';

interface SidebarProps {
  onAddCustomerClick: () => void;
  onClearDemoClick: () => void;
  onLoadDemoClick: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onAddCustomerClick,
  onClearDemoClick,
  onLoadDemoClick,
}) => {
  const { activeView, setActiveView, stats, setSelectedCustomerId } = useKhata();
  const { currentUser, logout } = useAuth();

  const navItems = [
    {
      id: 'overview' as const,
      label: 'Overview',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'customers' as const,
      label: 'Customers',
      icon: Users,
      badge: stats.customersWithOutstandingCount > 0 ? `${stats.customersWithOutstandingCount} Due` : null,
    },
    {
      id: 'add-entry' as const,
      label: 'Add Entry',
      icon: PlusCircle,
      isPrimary: true,
      badge: 'Voice / Wispr',
    },
    {
      id: 'transactions' as const,
      label: 'Transactions',
      icon: ReceiptText,
      badge: null,
    },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-72 bg-[#FFFFFF] border-r border-[#E6E0D2] min-h-screen p-5 select-none">
      {/* Brand & Khatabook Ledger Header */}
      <div className="pb-4 border-b border-[#E6E0D2]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#164E35] text-[#FFFFFF] flex items-center justify-center shadow-sm">
            <BookOpen className="w-5 h-5 text-[#E6F3EC]" />
          </div>
          <div className="min-w-0">
            <h1 className="font-canto text-xl font-bold tracking-tight text-[#103325] truncate">
              Katha Voice Easy
            </h1>
            <p className="text-[11px] text-stone-600 truncate">
              Retail Udhari & Credit Ledger
            </p>
          </div>
        </div>

        {/* Shop & Owner Identity Badge */}
        {currentUser && (
          <div className="mt-3.5 p-2.5 bg-[#FAF7F2] rounded-lg border border-[#E6E0D2]">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-[#164E35] shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-bold text-stone-900 truncate">
                  {currentUser.shopName}
                </div>
                <div className="text-[11px] text-stone-600 flex items-center gap-1 truncate">
                  <UserCheck className="w-3 h-3 text-[#164E35]" />
                  <span>{currentUser.fullName}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Total Outstanding Snapshot Pill */}
        <div className="mt-3 p-3 bg-[#FAF7F2] rounded-lg border border-[#E6E0D2]">
          <div className="flex items-center justify-between text-xs text-stone-700">
            <span>Total Credit Due</span>
            <span className="font-semibold text-stone-800">
              {stats.customersWithOutstandingCount} customers
            </span>
          </div>
          <div className="text-lg font-bold font-num text-[#9E3E23] mt-0.5">
            {formatINR(stats.totalOutstandingCreditPaise)}
          </div>
        </div>
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 py-5 space-y-1.5" aria-label="Main Navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          if (item.isPrimary) {
            return (
              <button
                key={item.id}
                onClick={() => {
                  setSelectedCustomerId(null);
                  setActiveView(item.id);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-lg text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-[#164E35] text-white shadow-sm ring-1 ring-[#103325]'
                    : 'bg-[#164E35]/10 text-[#164E35] hover:bg-[#164E35]/15 border border-[#164E35]/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </div>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-mono uppercase tracking-wider ${
                    isActive ? 'bg-[#FFFFFF]/20 text-white' : 'bg-[#164E35]/15 text-[#164E35]'
                  }`}
                >
                  {item.badge}
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => {
                setSelectedCustomerId(null);
                setActiveView(item.id);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#E6F3EC] text-[#164E35] font-semibold border-l-4 border-[#164E35]'
                  : 'text-stone-700 hover:bg-[#F5F2EB] hover:text-stone-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#164E35]' : 'text-stone-700'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#FBECE8] text-[#9E3E23] font-medium font-num">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Voice Dictation Guidance Card */}
      <div className="p-3.5 bg-[#FAF7F2] rounded-lg border border-[#E6E0D2] mb-4">
        <div className="flex items-start gap-2.5">
          <div className="p-1.5 rounded-md bg-[#164E35]/10 text-[#164E35] mt-0.5">
            <Mic className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <div className="font-semibold text-stone-900">Voice Input Options</div>
            <p className="text-stone-600 mt-0.5 leading-relaxed">
              Use the built-in browser mic, your mobile keyboard's microphone, or your optional Wispr Flow desktop shortcut. Voice is optional and manual typing is always available.
            </p>
          </div>
        </div>
      </div>

      {/* Demo Data & Persistence Controls */}
      <div className="pt-3 border-t border-[#E6E0D2] space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-700 px-1">
          Demo Ledger Data
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onLoadDemoClick}
            className="flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-medium bg-[#FFFFFF] border border-[#D5CEBE] text-stone-700 rounded-md hover:bg-[#F5F2EB] hover:text-stone-900 transition-colors"
            title="Load sample Indian retail customers and transactions"
          >
            <Database className="w-3.5 h-3.5 text-[#164E35]" />
            <span>Load Demo</span>
          </button>
          <button
            type="button"
            onClick={onClearDemoClick}
            className="flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-medium bg-[#FFFFFF] border border-[#D5CEBE] text-[#9E3E23] rounded-md hover:bg-[#FBECE8] transition-colors"
            title="Clear all stored customers and transactions"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
        <button
          type="button"
          onClick={() => logout()}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-[#9E3E23] hover:text-red-700 bg-[#FAF7F2] hover:bg-[#FBECE8] border border-[#E6E0D2] rounded-lg transition-colors"
          title="Sign out of your shop ledger"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>

        <p className="text-[10px] text-stone-600 px-1 text-center">
          Cloud Protected • Authenticated Ledger
        </p>
      </div>
    </aside>
  );
};
