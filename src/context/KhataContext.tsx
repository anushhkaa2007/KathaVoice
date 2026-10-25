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
import { useAuth } from './AuthContext';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase/config';

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
  loading: boolean;
  addCustomer: (data: { name: string; phone?: string; notes?: string }) => Promise<Customer>;
  updateCustomer: (id: string, data: { name: string; phone?: string; notes?: string }) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  addTransaction: (data: {
    customerId?: string;
    customerName: string;
    type: 'credit' | 'payment';
    amountRupees: number;
    description: string;
    date: string;
    notes?: string;
  }) => Promise<{ transaction: Transaction; customer: Customer }>;
  updateTransaction: (
    id: string,
    data: {
      type: 'credit' | 'payment';
      amountRupees: number;
      description: string;
      date: string;
      notes?: string;
    }
  ) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  loadDemoData: () => Promise<void>;
  clearDemoData: () => Promise<void>;
  exportToCSV: () => void;
  allTransactionsWithRunning: TransactionWithBalance[];
}

const KhataContext = createContext<KhataContextType | undefined>(undefined);

const GUEST_CUSTOMERS_KEY = 'katha_guest_customers';
const GUEST_TRANSACTIONS_KEY = 'katha_guest_transactions';

export const KhataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeView, setActiveView] = useState<ActiveView>('overview');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const isGuest = currentUser?.isGuest || currentUser?.uid === 'guest-local-user';

  // Sync data: Either via localStorage (guest/offline) or Firestore (authenticated user)
  useEffect(() => {
    if (!currentUser) {
      setCustomers([]);
      setTransactions([]);
      setSelectedCustomerId(null);
      setLoading(false);
      return;
    }

    if (isGuest) {
      // LocalStorage mode for demo guest
      try {
        const rawCust = localStorage.getItem(GUEST_CUSTOMERS_KEY);
        const rawTx = localStorage.getItem(GUEST_TRANSACTIONS_KEY);
        if (rawCust && rawTx) {
          setCustomers(JSON.parse(rawCust));
          setTransactions(JSON.parse(rawTx));
        } else {
          setCustomers(DEMO_CUSTOMERS);
          setTransactions(DEMO_TRANSACTIONS);
          localStorage.setItem(GUEST_CUSTOMERS_KEY, JSON.stringify(DEMO_CUSTOMERS));
          localStorage.setItem(GUEST_TRANSACTIONS_KEY, JSON.stringify(DEMO_TRANSACTIONS));
        }
      } catch (e) {
        console.warn('LocalStorage access warning:', e);
        setCustomers(DEMO_CUSTOMERS);
        setTransactions(DEMO_TRANSACTIONS);
      }
      setLoading(false);
      return;
    }

    // Authenticated Firestore subcollections
    setLoading(true);
    const customersRef = collection(db, 'users', currentUser.uid, 'customers');
    const transactionsRef = collection(db, 'users', currentUser.uid, 'transactions');

    let initialCheckDone = false;

    // Subscribe to customers
    const unsubCustomers = onSnapshot(
      customersRef,
      async (snapshot) => {
        const loadedCustomers: Customer[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          loadedCustomers.push({
            id: docSnap.id,
            userId: data.userId || currentUser.uid,
            name: data.name,
            phone: data.phone,
            notes: data.notes,
            createdAt: data.createdAt,
          });
        });

        // If new user with no customers, automatically seed demo data to get started
        if (!initialCheckDone && loadedCustomers.length === 0 && snapshot.metadata.fromCache === false) {
          initialCheckDone = true;
          try {
            const batch = writeBatch(db);
            DEMO_CUSTOMERS.forEach((c) => {
              const cRef = doc(db, 'users', currentUser.uid, 'customers', c.id);
              batch.set(cRef, {
                userId: currentUser.uid,
                name: c.name,
                ...(c.phone ? { phone: c.phone } : {}),
                ...(c.notes ? { notes: c.notes } : {}),
                createdAt: c.createdAt,
              });
            });
            DEMO_TRANSACTIONS.forEach((t) => {
              const tRef = doc(db, 'users', currentUser.uid, 'transactions', t.id);
              batch.set(tRef, {
                userId: currentUser.uid,
                customerId: t.customerId,
                customerName: t.customerName,
                type: t.type,
                amountPaise: t.amountPaise,
                description: t.description,
                date: t.date,
                ...(t.notes ? { notes: t.notes } : {}),
                createdAt: t.createdAt,
              });
            });
            await batch.commit();
          } catch (seedErr) {
            console.warn('Auto-seed notice:', seedErr);
          }
        }

        setCustomers(loadedCustomers);
      },
      (err) => {
        console.warn('Firestore customers listener notice:', err);
        setLoading(false);
      }
    );

    // Subscribe to transactions
    const unsubTransactions = onSnapshot(
      transactionsRef,
      (snapshot) => {
        const loadedTransactions: Transaction[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          loadedTransactions.push({
            id: docSnap.id,
            userId: data.userId || currentUser.uid,
            customerId: data.customerId,
            customerName: data.customerName,
            type: data.type,
            amountPaise: data.amountPaise,
            description: data.description,
            date: data.date,
            notes: data.notes,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          });
        });
        setTransactions(loadedTransactions);
        setLoading(false);
      },
      (err) => {
        console.warn('Firestore transactions listener notice:', err);
        setLoading(false);
      }
    );

    return () => {
      unsubCustomers();
      unsubTransactions();
    };
  }, [currentUser, isGuest]);

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

  const addCustomer = async ({
    name,
    phone,
    notes,
  }: {
    name: string;
    phone?: string;
    notes?: string;
  }): Promise<Customer> => {
    if (!currentUser) throw new Error('Must be signed in to add customers');

    const customerId = `cust-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const trimmedName = name.trim();

    const newCustomer: Customer = {
      id: customerId,
      userId: currentUser.uid,
      name: trimmedName,
      phone: phone?.trim() || undefined,
      notes: notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    if (isGuest) {
      const updated = [...customers, newCustomer];
      setCustomers(updated);
      localStorage.setItem(GUEST_CUSTOMERS_KEY, JSON.stringify(updated));
      return newCustomer;
    }

    const docRef = doc(db, 'users', currentUser.uid, 'customers', customerId);
    await setDoc(docRef, {
      userId: currentUser.uid,
      name: newCustomer.name,
      ...(newCustomer.phone ? { phone: newCustomer.phone } : {}),
      ...(newCustomer.notes ? { notes: newCustomer.notes } : {}),
      createdAt: newCustomer.createdAt,
    });

    return newCustomer;
  };

  const updateCustomer = async (
    id: string,
    data: { name: string; phone?: string; notes?: string }
  ) => {
    if (!currentUser) return;

    if (isGuest) {
      const updatedCusts = customers.map((c) =>
        c.id === id
          ? {
              ...c,
              name: data.name.trim(),
              phone: data.phone?.trim() || undefined,
              notes: data.notes?.trim() || undefined,
            }
          : c
      );
      const updatedTxs = transactions.map((t) =>
        t.customerId === id ? { ...t, customerName: data.name.trim() } : t
      );
      setCustomers(updatedCusts);
      setTransactions(updatedTxs);
      localStorage.setItem(GUEST_CUSTOMERS_KEY, JSON.stringify(updatedCusts));
      localStorage.setItem(GUEST_TRANSACTIONS_KEY, JSON.stringify(updatedTxs));
      return;
    }

    const docRef = doc(db, 'users', currentUser.uid, 'customers', id);
    await updateDoc(docRef, {
      name: data.name.trim(),
      ...(data.phone ? { phone: data.phone.trim() } : {}),
      ...(data.notes ? { notes: data.notes.trim() } : {}),
    });

    const customerTxs = transactions.filter((t) => t.customerId === id);
    if (customerTxs.length > 0) {
      const batch = writeBatch(db);
      customerTxs.forEach((t) => {
        const txRef = doc(db, 'users', currentUser.uid, 'transactions', t.id);
        batch.update(txRef, { customerName: data.name.trim() });
      });
      await batch.commit();
    }
  };

  const deleteCustomer = async (id: string) => {
    if (!currentUser) return;

    if (isGuest) {
      const updatedCusts = customers.filter((c) => c.id !== id);
      const updatedTxs = transactions.filter((t) => t.customerId !== id);
      setCustomers(updatedCusts);
      setTransactions(updatedTxs);
      localStorage.setItem(GUEST_CUSTOMERS_KEY, JSON.stringify(updatedCusts));
      localStorage.setItem(GUEST_TRANSACTIONS_KEY, JSON.stringify(updatedTxs));
      if (selectedCustomerId === id) setSelectedCustomerId(null);
      return;
    }

    const batch = writeBatch(db);
    const custRef = doc(db, 'users', currentUser.uid, 'customers', id);
    batch.delete(custRef);

    const customerTxs = transactions.filter((t) => t.customerId === id);
    customerTxs.forEach((t) => {
      const txRef = doc(db, 'users', currentUser.uid, 'transactions', t.id);
      batch.delete(txRef);
    });

    await batch.commit();
    if (selectedCustomerId === id) setSelectedCustomerId(null);
  };

  const addTransaction = async ({
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
  }): Promise<{ transaction: Transaction; customer: Customer }> => {
    if (!currentUser) throw new Error('Must be signed in to add transactions');

    let resolvedCustomer: Customer | undefined;

    if (customerId) {
      resolvedCustomer = customers.find((c) => c.id === customerId);
    }

    if (!resolvedCustomer) {
      const existing = customers.find(
        (c) => c.name.trim().toLowerCase() === customerName.trim().toLowerCase()
      );
      if (existing) {
        resolvedCustomer = existing;
      } else {
        resolvedCustomer = await addCustomer({ name: customerName.trim() });
      }
    }

    const txId = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const amountPaise = rupeesToPaise(amountRupees);

    const newTx: Transaction = {
      id: txId,
      userId: currentUser.uid,
      customerId: resolvedCustomer.id,
      customerName: resolvedCustomer.name,
      type,
      amountPaise,
      description: description.trim() || (type === 'credit' ? 'Credit purchase' : 'Payment received'),
      date: date || new Date().toISOString().split('T')[0],
      notes: notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    if (isGuest) {
      const updatedTxs = [newTx, ...transactions];
      setTransactions(updatedTxs);
      localStorage.setItem(GUEST_TRANSACTIONS_KEY, JSON.stringify(updatedTxs));
      return { transaction: newTx, customer: resolvedCustomer };
    }

    const txDocRef = doc(db, 'users', currentUser.uid, 'transactions', txId);
    await setDoc(txDocRef, {
      userId: currentUser.uid,
      customerId: newTx.customerId,
      customerName: newTx.customerName,
      type: newTx.type,
      amountPaise: newTx.amountPaise,
      description: newTx.description,
      date: newTx.date,
      ...(newTx.notes ? { notes: newTx.notes } : {}),
      createdAt: newTx.createdAt,
    });

    return { transaction: newTx, customer: resolvedCustomer };
  };

  const updateTransaction = async (
    id: string,
    data: {
      type: 'credit' | 'payment';
      amountRupees: number;
      description: string;
      date: string;
      notes?: string;
    }
  ) => {
    if (!currentUser) return;

    if (isGuest) {
      const updatedTxs = transactions.map((t) =>
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
      );
      setTransactions(updatedTxs);
      localStorage.setItem(GUEST_TRANSACTIONS_KEY, JSON.stringify(updatedTxs));
      return;
    }

    const docRef = doc(db, 'users', currentUser.uid, 'transactions', id);
    await updateDoc(docRef, {
      type: data.type,
      amountPaise: rupeesToPaise(data.amountRupees),
      description: data.description.trim(),
      date: data.date,
      ...(data.notes ? { notes: data.notes.trim() } : {}),
      updatedAt: new Date().toISOString(),
    });
  };

  const deleteTransaction = async (id: string) => {
    if (!currentUser) return;

    if (isGuest) {
      const updatedTxs = transactions.filter((t) => t.id !== id);
      setTransactions(updatedTxs);
      localStorage.setItem(GUEST_TRANSACTIONS_KEY, JSON.stringify(updatedTxs));
      return;
    }

    const docRef = doc(db, 'users', currentUser.uid, 'transactions', id);
    await deleteDoc(docRef);
  };

  const loadDemoData = async () => {
    if (!currentUser) return;

    if (isGuest) {
      setCustomers(DEMO_CUSTOMERS);
      setTransactions(DEMO_TRANSACTIONS);
      localStorage.setItem(GUEST_CUSTOMERS_KEY, JSON.stringify(DEMO_CUSTOMERS));
      localStorage.setItem(GUEST_TRANSACTIONS_KEY, JSON.stringify(DEMO_TRANSACTIONS));
      setSelectedCustomerId(null);
      return;
    }

    const batch = writeBatch(db);
    for (const c of DEMO_CUSTOMERS) {
      const cRef = doc(db, 'users', currentUser.uid, 'customers', c.id);
      batch.set(cRef, {
        userId: currentUser.uid,
        name: c.name,
        ...(c.phone ? { phone: c.phone } : {}),
        ...(c.notes ? { notes: c.notes } : {}),
        createdAt: c.createdAt,
      });
    }
    for (const t of DEMO_TRANSACTIONS) {
      const tRef = doc(db, 'users', currentUser.uid, 'transactions', t.id);
      batch.set(tRef, {
        userId: currentUser.uid,
        customerId: t.customerId,
        customerName: t.customerName,
        type: t.type,
        amountPaise: t.amountPaise,
        description: t.description,
        date: t.date,
        ...(t.notes ? { notes: t.notes } : {}),
        createdAt: t.createdAt,
      });
    }
    await batch.commit();
    setSelectedCustomerId(null);
  };

  const clearDemoData = async () => {
    if (!currentUser) return;

    if (isGuest) {
      setCustomers([]);
      setTransactions([]);
      localStorage.setItem(GUEST_CUSTOMERS_KEY, JSON.stringify([]));
      localStorage.setItem(GUEST_TRANSACTIONS_KEY, JSON.stringify([]));
      setSelectedCustomerId(null);
      return;
    }

    const batch = writeBatch(db);
    const custDocs = await getDocs(collection(db, 'users', currentUser.uid, 'customers'));
    custDocs.forEach((d) => batch.delete(d.ref));
    const txDocs = await getDocs(collection(db, 'users', currentUser.uid, 'transactions'));
    txDocs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    setSelectedCustomerId(null);
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
      `Khata_Ledger_${currentUser?.shopName ? currentUser.shopName.replace(/\s+/g, '_') : 'Shop'}_${new Date().toISOString().split('T')[0]}.csv`
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
        loading,
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
