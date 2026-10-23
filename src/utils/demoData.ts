import { Customer, Transaction } from '../types/khata';

export const DEMO_CUSTOMERS: Customer[] = [
  {
    id: 'cust-sharma',
    name: 'Sharma Ji',
    phone: '+91 98201 44521',
    notes: 'Regular customer, Flat 402. Settles account weekly.',
    createdAt: '2026-10-10T08:30:00.000Z',
  },
  {
    id: 'cust-patel',
    name: 'Patel Brothers',
    phone: '+91 97123 88920',
    notes: 'Tea stall & sweets shop opposite bus depot.',
    createdAt: '2026-10-11T09:00:00.000Z',
  },
  {
    id: 'cust-verma',
    name: 'Verma Provisions',
    phone: '+91 94150 12345',
    notes: 'Neighborhood tailoring shop. Always prompt UPI settlements.',
    createdAt: '2026-10-12T10:15:00.000Z',
  },
  {
    id: 'cust-gupta',
    name: 'Gupta General Store',
    phone: '+91 99341 66789',
    notes: 'Maintains advance credit deposit for daily milk & bread.',
    createdAt: '2026-10-13T11:45:00.000Z',
  },
];

export const DEMO_TRANSACTIONS: Transaction[] = [
  // Sharma Ji: previous balance ₹500
  {
    id: 'tx-sharma-1',
    customerId: 'cust-sharma',
    customerName: 'Sharma Ji',
    type: 'credit',
    amountPaise: 50000, // ₹500
    description: 'Wheat flour 10kg & kitchen spices',
    date: '2026-10-18',
    notes: 'Opening credit for October week 3',
    createdAt: '2026-10-18T10:00:00.000Z',
  },

  // Patel Brothers: ₹1,800 credit, ₹1,000 payment, ₹650 credit -> ₹1,450 balance
  {
    id: 'tx-patel-1',
    customerId: 'cust-patel',
    customerName: 'Patel Brothers',
    type: 'credit',
    amountPaise: 180000, // ₹1,800
    description: 'Commercial sugar sack 50kg & tea dust',
    date: '2026-10-16',
    createdAt: '2026-10-16T09:30:00.000Z',
  },
  {
    id: 'tx-patel-2',
    customerId: 'cust-patel',
    customerName: 'Patel Brothers',
    type: 'payment',
    amountPaise: 100000, // ₹1,000
    description: 'Cash payment part-settlement',
    date: '2026-10-19',
    createdAt: '2026-10-19T14:20:00.000Z',
  },
  {
    id: 'tx-patel-3',
    customerId: 'cust-patel',
    customerName: 'Patel Brothers',
    type: 'credit',
    amountPaise: 65000, // ₹650
    description: 'Refined sunflower cooking oil 5L tin',
    date: '2026-10-21',
    createdAt: '2026-10-21T16:45:00.000Z',
  },

  // Verma Provisions: ₹850 credit, ₹850 payment -> ₹0 Settled
  {
    id: 'tx-verma-1',
    customerId: 'cust-verma',
    customerName: 'Verma Provisions',
    type: 'credit',
    amountPaise: 85000, // ₹850
    description: 'Detergent powder, bath soaps & biscuits',
    date: '2026-10-17',
    createdAt: '2026-10-17T11:10:00.000Z',
  },
  {
    id: 'tx-verma-2',
    customerId: 'cust-verma',
    customerName: 'Verma Provisions',
    type: 'payment',
    amountPaise: 85000, // ₹850
    description: 'Full account clearance via UPI (PhonePe)',
    date: '2026-10-22',
    createdAt: '2026-10-22T17:05:00.000Z',
  },

  // Gupta General Store: ₹300 credit, ₹500 payment -> -₹200 (₹200 Advance)
  {
    id: 'tx-gupta-1',
    customerId: 'cust-gupta',
    customerName: 'Gupta General Store',
    type: 'credit',
    amountPaise: 30000, // ₹300
    description: 'Beverages, wafers & namkeen',
    date: '2026-10-15',
    createdAt: '2026-10-15T12:00:00.000Z',
  },
  {
    id: 'tx-gupta-2',
    customerId: 'cust-gupta',
    customerName: 'Gupta General Store',
    type: 'payment',
    amountPaise: 50000, // ₹500
    description: 'Advance deposit for upcoming week',
    date: '2026-10-20',
    createdAt: '2026-10-20T13:30:00.000Z',
  },
];
