import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const ORDERS_FILE = join(DATA_DIR, 'orders.json');

function ensure() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(ORDERS_FILE)) writeFileSync(ORDERS_FILE, '[]');
}

function readAll() {
  ensure();
  try {
    const txt = readFileSync(ORDERS_FILE, 'utf8').trim();
    return txt ? JSON.parse(txt) : [];
  } catch {
    return [];
  }
}

function writeAll(orders) {
  ensure();
  writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
}

let counter = 0;
function nextId() {
  counter += 1;
  return 'O' + Date.now().toString(36).toUpperCase() + counter.toString(36).toUpperCase();
}

export function createOrder({ userId, username, items, total, provider }) {
  const orders = readAll();
  const order = {
    id: nextId(),
    userId,
    username: username || null,
    items,
    total,
    provider,
    providerOrderId: null,
    status: 'pending_payment', // pending_payment -> claimed_paid -> delivered | rejected
    createdAt: new Date().toISOString(),
    paidAt: null,
    deliveredAt: null,
  };
  orders.push(order);
  writeAll(orders);
  return order;
}

export function getOrder(id) {
  return readAll().find((o) => o.id === id) || null;
}

export function updateOrder(id, patch) {
  const orders = readAll();
  const i = orders.findIndex((o) => o.id === id);
  if (i === -1) return null;
  orders[i] = { ...orders[i], ...patch };
  writeAll(orders);
  return orders[i];
}

export function listByStatus(status) {
  return readAll()
    .filter((o) => o.status === status)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function allOrders() {
  return readAll().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
