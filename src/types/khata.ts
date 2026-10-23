export type TransactionType = 'credit' | 'payment';

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  notes?: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  customerId: string;
  customerName: string;
  type: TransactionType;
  /** Amount in integer paise (1 INR = 100 paise) to prevent floating-point calculation errors */
  amountPaise: number;
  description: string;
  date: string; // YYYY-MM-DD
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TransactionWithBalance extends Transaction {
  /** Running balance for this customer immediately following this transaction (in paise) */
  runningBalancePaise: number;
}

export interface CustomerWithSummary extends Customer {
  /** Outstanding balance in paise: > 0 means customer owes money (Udhari), < 0 means customer has an advance deposit (Jama credit) */
  balancePaise: number;
  totalCreditPaise: number;
  totalPaymentPaise: number;
  transactionCount: number;
  lastTransactionDate?: string;
}

export interface ExtractedTransaction {
  customerName: string;
  type: TransactionType;
  amountRupees: number;
  description: string;
  date: string; // YYYY-MM-DD
  notes?: string;
  matchedCustomerId?: string;
  isNewCustomer?: boolean;
  ambiguities?: string[];
}

export interface ExtractionResponse {
  transactions: ExtractedTransaction[];
  ambiguities: string[];
  rawSummary: string;
  extractedBy: 'gemini' | 'rules';
}

export interface DashboardStats {
  totalOutstandingCreditPaise: number;
  customersWithOutstandingCount: number;
  creditAddedThisMonthPaise: number;
  paymentsReceivedThisMonthPaise: number;
  totalSettledCustomersCount: number;
  totalAdvanceCustomersCount: number;
  topDebtors: CustomerWithSummary[];
  recentTransactions: TransactionWithBalance[];
}
