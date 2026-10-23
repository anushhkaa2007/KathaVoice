import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rupeesToPaise,
  paiseToRupees,
  formatINR,
  calculateCustomerBalance,
  computeRunningBalances,
  calculateDashboardStats,
  validateTransactionInput,
  parseNaturalLanguageEntryDeterministic,
} from './accounting';
import { Customer, Transaction } from '../types/khata';

test('rupeesToPaise converts numbers safely without floating point drift', () => {
  assert.equal(rupeesToPaise(340), 34000);
  assert.equal(rupeesToPaise(340.5), 34050);
  assert.equal(rupeesToPaise('125000'), 12500000);
  assert.equal(paiseToRupees(34000), 340);
  assert.equal(paiseToRupees(34050), 340.5);
});

test('formatINR formats currency in Indian numbering with Rupee symbol', () => {
  const formatted1 = formatINR(12500000); // ₹1,25,000
  assert.match(formatted1, /1,25,000/);

  const formattedNegative = formatINR(-20000); // -₹200
  assert.match(formattedNegative, /-.*200/);

  const statusFormatAdvance = formatINR(-20000, { showStatus: true });
  assert.match(statusFormatAdvance, /Advance/);

  const statusFormatDue = formatINR(64000, { showStatus: true });
  assert.match(statusFormatDue, /Due/);

  const statusFormatZero = formatINR(0, { showStatus: true });
  assert.equal(statusFormatZero, '₹0 Settled');
});

test('calculateCustomerBalance: example 1 (₹500 previous + ₹340 purchase - ₹200 payment = ₹640 balance)', () => {
  const transactions: Transaction[] = [
    {
      id: 'tx-1',
      customerId: 'cust-sharma',
      customerName: 'Sharma Ji',
      type: 'credit',
      amountPaise: 50000, // ₹500 initial credit
      description: 'Previous opening balance',
      date: '2026-10-01',
      createdAt: '2026-10-01T10:00:00.000Z',
    },
    {
      id: 'tx-2',
      customerId: 'cust-sharma',
      customerName: 'Sharma Ji',
      type: 'credit',
      amountPaise: 34000, // ₹340 new purchase
      description: 'rice and oil',
      date: '2026-10-23',
      createdAt: '2026-10-23T11:00:00.000Z',
    },
    {
      id: 'tx-3',
      customerId: 'cust-sharma',
      customerName: 'Sharma Ji',
      type: 'payment',
      amountPaise: 20000, // ₹200 payment
      description: 'Cash payment',
      date: '2026-10-23',
      createdAt: '2026-10-23T12:00:00.000Z',
    },
  ];

  const result = calculateCustomerBalance(transactions);
  assert.equal(result.balancePaise, 64000); // ₹640
  assert.equal(result.totalCreditPaise, 84000); // ₹840
  assert.equal(result.totalPaymentPaise, 20000); // ₹200
  assert.equal(result.transactionCount, 3);
  assert.equal(result.lastTransactionDate, '2026-10-23');
});

test('calculateCustomerBalance: example 2 customer advance (₹300 balance - ₹500 payment = -₹200 advance)', () => {
  const transactions: Transaction[] = [
    {
      id: 'tx-1',
      customerId: 'cust-advance',
      customerName: 'Gupta Store',
      type: 'credit',
      amountPaise: 30000, // ₹300 credit
      description: 'Flour purchase',
      date: '2026-10-10',
      createdAt: '2026-10-10T10:00:00.000Z',
    },
    {
      id: 'tx-2',
      customerId: 'cust-advance',
      customerName: 'Gupta Store',
      type: 'payment',
      amountPaise: 50000, // ₹500 payment
      description: 'Advance payment via UPI',
      date: '2026-10-12',
      createdAt: '2026-10-12T11:00:00.000Z',
    },
  ];

  const result = calculateCustomerBalance(transactions);
  assert.equal(result.balancePaise, -20000); // -₹200 advance
  assert.equal(result.totalCreditPaise, 30000);
  assert.equal(result.totalPaymentPaise, 50000);
});

test('computeRunningBalances maintains step-by-step running ledger correctly', () => {
  const transactions: Transaction[] = [
    {
      id: 'tx-1',
      customerId: 'c1',
      customerName: 'Sharma Ji',
      type: 'credit',
      amountPaise: 50000, // +500 -> 500
      description: 'Opening',
      date: '2026-10-01',
      createdAt: '2026-10-01T09:00:00Z',
    },
    {
      id: 'tx-2',
      customerId: 'c1',
      customerName: 'Sharma Ji',
      type: 'credit',
      amountPaise: 34000, // +340 -> 840
      description: 'Rice and oil',
      date: '2026-10-23',
      createdAt: '2026-10-23T10:00:00Z',
    },
    {
      id: 'tx-3',
      customerId: 'c1',
      customerName: 'Sharma Ji',
      type: 'payment',
      amountPaise: 20000, // -200 -> 640
      description: 'Cash payment',
      date: '2026-10-23',
      createdAt: '2026-10-23T11:00:00Z',
    },
  ];

  const running = computeRunningBalances(transactions);
  // Returns descending: most recent first
  assert.equal(running[0].id, 'tx-3');
  assert.equal(running[0].runningBalancePaise, 64000);

  assert.equal(running[1].id, 'tx-2');
  assert.equal(running[1].runningBalancePaise, 84000);

  assert.equal(running[2].id, 'tx-1');
  assert.equal(running[2].runningBalancePaise, 50000);
});

test('validateTransactionInput rejects invalid or negative amounts', () => {
  const invalid = validateTransactionInput({
    customerName: 'Sharma Ji',
    type: 'credit',
    amountRupees: -50,
    date: '2026-10-23',
  });
  assert.equal(invalid.isValid, false);
  assert.ok(invalid.errors.length > 0);

  const missingName = validateTransactionInput({
    customerName: '',
    type: 'payment',
    amountRupees: 100,
    date: '2026-10-23',
  });
  assert.equal(missingName.isValid, false);

  const valid = validateTransactionInput({
    customerName: 'Sharma Ji',
    type: 'credit',
    amountRupees: 340,
    date: '2026-10-23',
  });
  assert.equal(valid.isValid, true);
  assert.equal(valid.errors.length, 0);
});

test('parseNaturalLanguageEntryDeterministic handles Sharma ji purchase and payment', () => {
  const parsedCredit = parseNaturalLanguageEntryDeterministic(
    'Sharma ji took rice and oil worth 340 rupees today',
    '2026-10-23'
  );
  assert.equal(parsedCredit.length, 1);
  assert.match(parsedCredit[0].customerName, /Sharma/i);
  assert.equal(parsedCredit[0].type, 'credit');
  assert.equal(parsedCredit[0].amountRupees, 340);
  assert.match(parsedCredit[0].description, /rice and oil/i);

  const parsedPayment = parseNaturalLanguageEntryDeterministic(
    'Received 200 payment from Sharma ji via UPI',
    '2026-10-23'
  );
  assert.equal(parsedPayment.length, 1);
  assert.match(parsedPayment[0].customerName, /Sharma/i);
  assert.equal(parsedPayment[0].type, 'payment');
  assert.equal(parsedPayment[0].amountRupees, 200);
});
