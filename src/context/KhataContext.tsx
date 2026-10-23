import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  Customer,
  CustomerWithSummary,
  DashboardStats,
  Transaction,
  TransactionWithBalance,
} from '../types/khata';
import {
  calculateCustomerBalance,
  calculateDashboardStats,
  computeRunningBalances,
  paiseToRupees,
  rupeesToPaise,
} from '../utils/accounting';
import { DEMO_CUSTOMERS, DEMO_TRANSACTIONS } from '../utils/demoData';

const CUSTOMERS_KEY = 'khata_voice_easy_customers_v1';
const TRANSACTIONS_KEY = 'khata_voice_easy_transactions_v1';

export type ActiveView = 'overview' | 'customers' | 'add-entry' | 'transactions';

interface KhataContextType {
  customers: Customer[];
  transactions: Transaction[];
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  selectedCustomerId: string | null;
  setSelectedCustomerId: (id: string | null) => void;
  selectedCustomer: CustomerWithSummary | null;
  selectedCustomerTransactions: TransactionWithBalance[];
  stats: DashboardStats;
  addCustomer: (data: { name: string; phone?: string; notes?: string }) => Customer;
  updateCustomer: (id: string, data: { name: string; phone?: string; notes?: string }) => void;
  deleteCustomer: (id: string) => void;
  addTransaction: (data: {
    customerId?: string;
    customerName: string;
    type: 'credit' | 'payment';
    amountRupees: number;
    description: string;
    date: string;
    notes?: string;
  }) => { transaction: Transaction; customer: Customer };
  updateTransaction: (
    id: string,
    data: {
      type: 'credit' | 'payment';
      amountRupees: number;
      description: string;
      date: string;
      notes?: string;
    }
  ) => void;
  deleteTransaction: (id: string) => void;
  loadDemoData: () => void;
  clearDemoData: () => void;
  exportToCSV: () => void;
  allTransactionsWithRunning: TransactionWithBalance[];
}

const KhataContext = createContext<KhataContextType | undefined>(undefined);

export const KhataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
      const saved = localStorage.getItem(CUSTOMERS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed reading customers from localStorage', e);
    }
    return DEMO_CUSTOMERS;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem(TRANSACTIONS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed reading transactions from localStorage', e);
    }
    return DEMO_TRANSACTIONS;
  });

  const [activeView, setActiveView] = useState<ActiveView>('overview');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Persist customers to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
    } catch (e) {
      console.error('Failed saving customers to localStorage', e);
    }
  }, [customers]);

  // Persist transactions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
    } catch (e) {
      console.error('Failed saving transactions to localStorage', e);
    }
  }, [transactions]);

  // Derive dashboard stats deterministically
  const stats = useMemo(() => {
    return calculateDashboardStats(customers, transactions);
  }, [customers, transactions]);

  // Selected customer details and running ledger
  const selectedCustomer = useMemo<CustomerWithSummary | null>(() => {
    if (!selectedCustomerId) return null;
    const c = customers.find((item) => item.id === selectedCustomerId);
    if (!c) return null;
    const customerTxs = transactions.filter((t) => t.customerId === c.id);
    const balanceInfo = calculateCustomerBalance(customerTxs);
    return {
      ...c,
      ...balanceInfo,
    };
  }, [selectedCustomerId, customers, transactions]);

  const selectedCustomerTransactions = useMemo<TransactionWithBalance[]>(() => {
    if (!selectedCustomerId) return [];
    const customerTxs = transactions.filter((t) => t.customerId === selectedCustomerId);
    return computeRunningBalances(customerTxs);
  }, [selectedCustomerId, transactions]);

  // All transactions with per-customer running balance
  const allTransactionsWithRunning = useMemo<TransactionWithBalance[]>(() => {
    const byCust = new Map<string, Transaction[]>();
    for (const c of customers) byCust.set(c.id, []);
    for (const t of transactions) {
      const list = byCust.get(t.customerId);
      if (list) list.push(t);
      else byCust.set(t.customerId, [t]);
    }

    const flat: TransactionWithBalance[] = [];
    for (const list of byCust.values()) {
      flat.push(...computeRunningBalances(list));
    }

    return flat.sort((a, b) => {
      const dateCmp = b.date.localeCompare(a.date);
      if (dateCmp !== 0) return dateCmp;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [customers, transactions]);

  const addCustomer = ({ name, phone, notes }: { name: string; phone?: string; notes?: string }): Customer => {
    const trimmedName = name.trim();
    const newCustomer: Customer = {
      id: `cust-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: trimmedName,
      phone: phone?.trim() || undefined,
      notes: notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    setCustomers((prev) => [newCustomer, ...prev]);
    return newCustomer;
  };

  const updateCustomer = (id: string, data: { name: string; phone?: string; notes?: string }) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...data, name: data.name.trim() } : c))
    );
    // Also update customerName in transactions for this customer
    setTransactions((prev) =>
      prev.map((t) => (t.customerId === id ? { ...t, customerName: data.name.trim() } : t))
    );
  };

  const deleteCustomer = (id: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    setTransactions((prev) => prev.filter((t) => t.customerId !== id));
    if (selectedCustomerId === id) {
      setSelectedCustomerId(null);
    }
  };

  const addTransaction = ({
    customerId,
    customerName,
    type,
    amountRupees,
    description,
    date,
    notes,
  }: {
    customerId?: string;
    customerName: string;
    type: 'credit' | 'payment';
    amountRupees: number;
    description: string;
    date: string;
    notes?: string;
  }): { transaction: Transaction; customer: Customer } => {
    let resolvedCustomer: Customer | undefined;

    if (customerId) {
      resolvedCustomer = customers.find((c) => c.id === customerId);
    }

    if (!resolvedCustomer) {
      // Find exact case-insensitive match
      const existing = customers.find(
        (c) => c.name.trim().toLowerCase() === customerName.trim().toLowerCase()
      );
      if (existing) {
        resolvedCustomer = existing;
      } else {
        // Create new customer record
        resolvedCustomer = {
          id: `cust-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: customerName.trim(),
          createdAt: new Date().toISOString(),
        };
        setCustomers((prev) => [resolvedCustomer!, ...prev]);
      }
    }

    const amountPaise = rupeesToPaise(amountRupees);
    const newTx: Transaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      customerId: resolvedCustomer.id,
      customerName: resolvedCustomer.name,
      type,
      amountPaise,
      description: description.trim() || (type === 'credit' ? 'Credit purchase' : 'Payment received'),
      date: date || new Date().toISOString().split('T')[0],
      notes: notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    setTransactions((prev) => [newTx, ...prev]);
    return { transaction: newTx, customer: resolvedCustomer };
  };

  const updateTransaction = (
    id: string,
    data: {
      type: 'credit' | 'payment';
      amountRupees: number;
      description: string;
      date: string;
      notes?: string;
    }
  ) => {
    setTransactions((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              type: data.type,
              amountPaise: rupeesToPaise(data.amountRupees),
              description: data.description.trim(),
              date: data.date,
              notes: data.notes?.trim() || undefined,
              updatedAt: new Date().toISOString(),
            }
          : t
      )
    );
  };

  const deleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const loadDemoData = () => {
    setCustomers(DEMO_CUSTOMERS);
    setTransactions(DEMO_TRANSACTIONS);
    setSelectedCustomerId(null);
  };

  const clearDemoData = () => {
    setCustomers([]);
    setTransactions([]);
    setSelectedCustomerId(null);
    try {
      localStorage.removeItem(CUSTOMERS_KEY);
      localStorage.removeItem(TRANSACTIONS_KEY);
    } catch (e) {
      console.warn('Failed clearing localStorage', e);
    }
  };

  const exportToCSV = () => {
    if (transactions.length === 0) return;

    const headers = [
      'Transaction ID',
      'Date',
      'Customer Name',
      'Type',
      'Amount (INR)',
      'Description',
      'Notes',
    ];

    const rows = allTransactionsWithRunning.map((t) => [
      `"${t.id}"`,
      `"${t.date}"`,
      `"${t.customerName.replace(/"/g, '""')}"`,
      `"${t.type === 'credit' ? 'Credit Purchase (Udhari)' : 'Payment Received (Jama)'}"`,
      paiseToRupees(t.amountPaise).toFixed(2),
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${(t.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `Khata_Ledger_Export_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <KhataContext.Provider
      value={{
        customers,
        transactions,
        activeView,
        setActiveView,
        selectedCustomerId,
        setSelectedCustomerId,
        selectedCustomer,
        selectedCustomerTransactions,
        stats,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        loadDemoData,
        clearDemoData,
        exportToCSV,
        allTransactionsWithRunning,
      }}
    >
      {children}
    </KhataContext.Provider>
  );
};

export const useKhata = () => {
  const context = useContext(KhataContext);
  if (!context) {
    throw new Error('useKhata must be used within a KhataProvider');
  }
  return context;
};
