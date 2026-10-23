import { Customer, CustomerWithSummary, DashboardStats, ExtractedTransaction, Transaction, TransactionWithBalance } from '../types/khata';

/**
 * Converts INR rupees to integer paise.
 * Avoids floating point multiplication glitches (e.g. 340.50 -> 34050).
 */
export function rupeesToPaise(rupees: number | string): number {
  const num = typeof rupees === 'string' ? parseFloat(rupees) : rupees;
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

/**
 * Converts paise back to rupees.
 */
export function paiseToRupees(paise: number): number {
  return paise / 100;
}

/**
 * Formats paise as Indian currency with the ₹ symbol and Indian number grouping.
 * e.g., 12500000 paise -> ₹1,25,000
 * Handles negative balances appropriately (e.g., -₹200 or ₹200 Advance).
 */
export function formatINR(paise: number, options?: { showStatus?: boolean; absolute?: boolean }): string {
  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const rupees = absPaise / 100;

  // Format with en-IN locale for Indian numbering (lakhs, crores)
  const formatter = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: absPaise % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });

  const formatted = `₹${formatter.format(rupees)}`;

  if (options?.absolute) {
    return formatted;
  }

  if (options?.showStatus) {
    if (paise > 0) return `${formatted} Due`;
    if (paise < 0) return `${formatted} Advance`;
    return '₹0 Settled';
  }

  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Deterministically computes the balance for a single customer.
 * Balance = sum(credit purchases) - sum(payments received)
 */
export function calculateCustomerBalance(transactions: Transaction[]): {
  balancePaise: number;
  totalCreditPaise: number;
  totalPaymentPaise: number;
  transactionCount: number;
  lastTransactionDate?: string;
} {
  let totalCreditPaise = 0;
  let totalPaymentPaise = 0;
  let lastTransactionDate: string | undefined = undefined;

  // Sort chronologically ascending to find last transaction date
  const sorted = [...transactions].sort((a, b) => {
    const dateCmp = a.date.localeCompare(b.date);
    if (dateCmp !== 0) return dateCmp;
    return a.createdAt.localeCompare(b.createdAt);
  });

  for (const t of sorted) {
    if (t.type === 'credit') {
      totalCreditPaise += t.amountPaise;
    } else if (t.type === 'payment') {
      totalPaymentPaise += t.amountPaise;
    }
    lastTransactionDate = t.date;
  }

  const balancePaise = totalCreditPaise - totalPaymentPaise;

  return {
    balancePaise,
    totalCreditPaise,
    totalPaymentPaise,
    transactionCount: sorted.length,
    lastTransactionDate,
  };
}

/**
 * Computes chronological running balance for every transaction of a customer.
 * Running balance after a credit purchase = previous + amount
 * Running balance after a payment = previous - amount
 */
export function computeRunningBalances(customerTransactions: Transaction[]): TransactionWithBalance[] {
  // Sort chronologically ascending
  const sorted = [...customerTransactions].sort((a, b) => {
    const dateCmp = a.date.localeCompare(b.date);
    if (dateCmp !== 0) return dateCmp;
    return a.createdAt.localeCompare(b.createdAt);
  });

  let runningPaise = 0;
  const result: TransactionWithBalance[] = [];

  for (const tx of sorted) {
    if (tx.type === 'credit') {
      runningPaise += tx.amountPaise;
    } else {
      runningPaise -= tx.amountPaise;
    }
    result.push({
      ...tx,
      runningBalancePaise: runningPaise,
    });
  }

  // Return descending (most recent first) for display convenience
  return result.reverse();
}

/**
 * Computes overall dashboard statistics from customer records and transactions.
 * Derived strictly from actual transaction records.
 */
export function calculateDashboardStats(
  customers: Customer[],
  transactions: Transaction[],
  referenceDate: Date = new Date()
): DashboardStats {
  // Customer summaries
  const customerMap = new Map<string, Transaction[]>();
  for (const c of customers) {
    customerMap.set(c.id, []);
  }

  for (const t of transactions) {
    const list = customerMap.get(t.customerId);
    if (list) {
      list.push(t);
    } else {
      customerMap.set(t.customerId, [t]);
    }
  }

  const customerSummaries: CustomerWithSummary[] = customers.map((c) => {
    const txs = customerMap.get(c.id) || [];
    const stats = calculateCustomerBalance(txs);
    return {
      ...c,
      ...stats,
    };
  });

  let totalOutstandingCreditPaise = 0;
  let customersWithOutstandingCount = 0;
  let totalSettledCustomersCount = 0;
  let totalAdvanceCustomersCount = 0;

  for (const cs of customerSummaries) {
    if (cs.balancePaise > 0) {
      totalOutstandingCreditPaise += cs.balancePaise;
      customersWithOutstandingCount += 1;
    } else if (cs.balancePaise === 0) {
      totalSettledCustomersCount += 1;
    } else {
      totalAdvanceCustomersCount += 1;
    }
  }

  // Current month credit added & payments received
  const currentYearMonth = `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, '0')}`;
  let creditAddedThisMonthPaise = 0;
  let paymentsReceivedThisMonthPaise = 0;

  for (const t of transactions) {
    if (t.date.startsWith(currentYearMonth)) {
      if (t.type === 'credit') {
        creditAddedThisMonthPaise += t.amountPaise;
      } else if (t.type === 'payment') {
        paymentsReceivedThisMonthPaise += t.amountPaise;
      }
    }
  }

  // Top debtors (highest positive outstanding balance)
  const topDebtors = [...customerSummaries]
    .filter((c) => c.balancePaise > 0)
    .sort((a, b) => b.balancePaise - a.balancePaise)
    .slice(0, 5);

  // Recent transactions with running balances per customer
  const transactionsByCustomer = new Map<string, TransactionWithBalance[]>();
  for (const c of customers) {
    const txs = customerMap.get(c.id) || [];
    transactionsByCustomer.set(c.id, computeRunningBalances(txs));
  }

  const allWithRunning: TransactionWithBalance[] = [];
  for (const txList of transactionsByCustomer.values()) {
    allWithRunning.push(...txList);
  }

  allWithRunning.sort((a, b) => {
    const dateCmp = b.date.localeCompare(a.date);
    if (dateCmp !== 0) return dateCmp;
    return b.createdAt.localeCompare(a.createdAt);
  });

  return {
    totalOutstandingCreditPaise,
    customersWithOutstandingCount,
    creditAddedThisMonthPaise,
    paymentsReceivedThisMonthPaise,
    totalSettledCustomersCount,
    totalAdvanceCustomersCount,
    topDebtors,
    recentTransactions: allWithRunning.slice(0, 8),
  };
}

/**
 * Validates a transaction input before saving.
 */
export function validateTransactionInput(input: {
  customerId?: string;
  customerName?: string;
  type?: string;
  amountRupees?: number | string;
  date?: string;
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!input.customerId && (!input.customerName || !input.customerName.trim())) {
    errors.push('Customer name is required.');
  }

  if (input.type !== 'credit' && input.type !== 'payment') {
    errors.push('Transaction type must be either credit purchase or payment received.');
  }

  const amount = typeof input.amountRupees === 'string' ? parseFloat(input.amountRupees) : input.amountRupees;
  if (amount === undefined || isNaN(amount) || amount <= 0) {
    errors.push('Amount must be a positive number greater than ₹0.');
  }

  if (!input.date || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    errors.push('Transaction date must be a valid date in YYYY-MM-DD format.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Finds customer name match candidates.
 * Returns exact match or similar matches without auto-merging.
 */
export function findCustomerMatch(
  queryName: string,
  existingCustomers: Customer[]
): {
  exactMatch?: Customer;
  closeMatches: Customer[];
} {
  const clean = (s: string) =>
    s
      .toLowerCase()
      .replace(/[\s.,_-]/g, '')
      .replace(/(ji|bhai|bhaiya|uncle|shop|kirana|store|provisions)$/, '');

  const qClean = clean(queryName);
  let exactMatch: Customer | undefined;
  const closeMatches: Customer[] = [];

  for (const c of existingCustomers) {
    const cClean = clean(c.name);
    if (c.name.trim().toLowerCase() === queryName.trim().toLowerCase()) {
      exactMatch = c;
      continue;
    }
    if (qClean.length > 2 && (cClean.includes(qClean) || qClean.includes(cClean))) {
      closeMatches.push(c);
    }
  }

  return { exactMatch, closeMatches };
}

/**
 * Fallback deterministic NLP parser for voice/text transcripts in Indian retail context.
 * Understands phrases like:
 * - "Sharma ji took rice and oil worth 340 rupees today"
 * - "Received 200 payment from Sharma ji via UPI"
 * - "Patel brother bought 5kg sugar for ₹450"
 * - "Ramesh took biscuits for 120 and Verma paid 500"
 */
export function parseNaturalLanguageEntryDeterministic(
  text: string,
  todayStr: string = new Date().toISOString().split('T')[0]
): ExtractedTransaction[] {
  if (!text || !text.trim()) return [];

  // Check if there are multiple transactions.
  // We only split if clauses have distinct amounts or separate verbs (e.g. "Ramesh took X and Verma paid Y").
  // Never split on grocery lists like "rice and oil" or "sugar and soap".
  const rawSegments = text.split(/\s*[\n;]\s*/);
  const candidateClauses: string[] = [];

  for (const seg of rawSegments) {
    // Check if segment has "and" / "aur" connecting two distinct transactions
    const multiTxMatch = seg.match(/^(.+?)\s+\b(?:and|aur|also)\b\s+(.+)$/i);
    if (multiTxMatch) {
      const part1 = multiTxMatch[1];
      const part2 = multiTxMatch[2];
      const hasAmount1 = /[0-9]{2,}/.test(part1);
      const hasAmount2 = /[0-9]{2,}/.test(part2);
      if (hasAmount1 && hasAmount2) {
        candidateClauses.push(part1.trim(), part2.trim());
        continue;
      }
    }
    candidateClauses.push(seg.trim());
  }

  const extractedList: ExtractedTransaction[] = [];
  for (const clause of candidateClauses) {
    if (clause.length > 3) {
      const item = parseSingleClause(clause, todayStr);
      if (item) {
        extractedList.push(item);
      }
    }
  }

  return extractedList;
}

function parseSingleClause(rawText: string, todayStr: string): ExtractedTransaction | null {
  const text = rawText.trim();
  const lower = text.toLowerCase();

  // 1. Detect Amount
  // Patterns like: ₹340, 340 rupees, rs 340, worth 340, 340/-
  const amountMatch =
    text.match(/(?:₹|rs\.?|inr|worth|amount|for)\s*([0-9]+(?:\.[0-9]{1,2})?)/i) ||
    text.match(/([0-9]+(?:\.[0-9]{1,2})?)\s*(?:rupees|rs|inr|\/-)/i) ||
    text.match(/\b([0-9]{2,6})\b/);

  const amountRupees = amountMatch ? parseFloat(amountMatch[1]) : 0;
  if (!amountRupees || amountRupees <= 0) return null;

  // 2. Detect Transaction Type
  // Credit purchase indicators: took, bought, purchased, udhar, udhari, credit, khata, liya
  // Payment received indicators: paid, payment, received, jama, deposited, upi, cash, diya
  const isPayment =
    /\b(paid|payment|received|jama|jamaa|deposit|deposited|given back|returned|via upi|gpay|phonepe|paytm)\b/i.test(
      lower
    ) && !/\b(took|bought|purchased|udhar|udhari|credit)\b/i.test(lower);

  const type: 'credit' | 'payment' = isPayment ? 'payment' : 'credit';

  // 3. Extract Customer Name
  // Common prefixes / suffixes: Sharma ji, Patel brother, Verma provisions, Mr. Ramesh
  let customerName = 'Unknown Customer';
  const namePatterns = [
    /(?:from|to|for|by)\s+([A-Z][a-z]+(?:\s+(?:ji|bhai|bhaiya|brother|uncle|kumar|singh|sharma|patel|gupta|verma|kirana|store))?)/i,
    /^([A-Z][a-z]+(?:\s+(?:ji|bhai|bhaiya|brother|uncle|kumar|singh|sharma|patel|gupta|verma|kirana|store))?)\s+(?:took|bought|paid|gave|purchased|deposit)/i,
    /([A-Z][a-zA-Z\s]{2,20})\s+(?:took|paid|gave|bought)/i,
  ];

  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      customerName = match[1].trim();
      break;
    }
  }

  // Fallback if no capitalized name found: look before action verb
  if (customerName === 'Unknown Customer') {
    const splitByVerb = text.split(/\b(?:took|bought|paid|gave|received|deposited|jama|udhar)\b/i);
    if (splitByVerb.length > 1 && splitByVerb[0].trim().length > 1) {
      customerName = splitByVerb[0].replace(/^(from|to)\s+/i, '').trim();
    }
  }

  // 4. Extract Items / Description
  let description = '';
  if (type === 'credit') {
    const itemMatch =
      text.match(/(?:took|bought|purchased)\s+(.*?)\s+(?:worth|for|costing|amounting|today|yesterday|₹|[0-9])/i) ||
      text.match(/(?:for)\s+(.*?)\s+(?:worth|costing|amounting)/i);
    if (itemMatch && itemMatch[1]) {
      description = itemMatch[1].trim();
    } else {
      description = 'Groceries & provisions';
    }
  } else {
    description = lower.includes('upi')
      ? 'Payment received via UPI'
      : lower.includes('cash')
        ? 'Cash payment received'
        : 'Payment received';
  }

  // 5. Date detection (defaults to today)
  let date = todayStr;
  if (lower.includes('yesterday')) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    date = d.toISOString().split('T')[0];
  }

  return {
    customerName: customerName || 'Valued Customer',
    type,
    amountRupees,
    description: description.replace(/^(and|worth|for)\s+/i, '').trim() || (type === 'credit' ? 'Retail goods' : 'Payment'),
    date,
    notes: text,
  };
}
