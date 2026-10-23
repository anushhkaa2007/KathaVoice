import React from 'react';
import { LayoutDashboard, Users, PlusCircle, ReceiptText } from 'lucide-react';
import { useKhata, ActiveView } from '../context/KhataContext';

export const MobileNav: React.FC = () => {
  const { activeView, setActiveView, setSelectedCustomerId, stats } = useKhata();

  const tabs: { id: ActiveView; label: string; icon: React.ElementType; badge?: string | null }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'customers', label: 'Customers', icon: Users, badge: stats.customersWithOutstandingCount > 0 ? String(stats.customersWithOutstandingCount) : null },
    { id: 'add-entry', label: 'Add Entry', icon: PlusCircle },
    { id: 'transactions', label: 'Ledger', icon: ReceiptText },
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FFFFFF] border-t border-[#E6E0D2] px-2 py-1.5 flex items-center justify-around shadow-md"
      aria-label="Mobile Navigation"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeView === tab.id;
        const isAdd = tab.id === 'add-entry';

        if (isAdd) {
          return (
            <button
              key={tab.id}
              onClick={() => {
                setSelectedCustomerId(null);
                setActiveView(tab.id);
              }}
              className="flex flex-col items-center justify-center -mt-4"
              aria-label="Add transaction entry"
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-all ${
                  isActive
                    ? 'bg-[#103325] text-white ring-4 ring-[#E6F3EC]'
                    : 'bg-[#164E35] text-white hover:bg-[#103325]'
                }`}
              >
                <PlusCircle className="w-6 h-6" />
              </div>
              <span className={`text-[10px] mt-1 font-semibold ${isActive ? 'text-[#164E35]' : 'text-stone-700'}`}>
                Add Entry
              </span>
            </button>
          );
        }

        return (
          <button
            key={tab.id}
            onClick={() => {
              setSelectedCustomerId(null);
              setActiveView(tab.id);
            }}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg transition-colors relative ${
              isActive ? 'text-[#164E35] font-semibold' : 'text-stone-700 hover:text-stone-900'
            }`}
          >
            <div className="relative">
              <Icon className="w-5 h-5" />
              {tab.badge && (
                <span className="absolute -top-1.5 -right-2 bg-[#C25438] text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center font-num">
                  {tab.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
