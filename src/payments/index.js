import * as demo from './demo.js';
import * as yoomoney from './yoomoney.js';

// Фабрика провайдеров. Выбор через PAYMENT_PROVIDER в .env
const providerMap = { demo, yoomoney };

const selected = (process.env.PAYMENT_PROVIDER || 'demo').toLowerCase();
export const payments = providerMap[selected] || demo;

if (selected !== 'demo' && selected !== 'yoomoney') {
  console.warn(`[payments] Неизвестный PAYMENT_PROVIDER="${selected}", используется demo`);
}
