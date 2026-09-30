import * as manual from './manual.js';
import * as demo from './demo.js';
import * as yoomoney from './yoomoney.js';

// Фабрика провайдеров. Выбор через PAYMENT_PROVIDER в .env
//   manual   — ручное подтверждение по факту перевода (по умолчанию)
//   demo     — эмуляция оплаты для теста (без реквизитов)
//   yoomoney — реальный приём через ЮMoney (СБП/карты), если позже понадобится
const providerMap = { manual, demo, yoomoney };

const selected = (process.env.PAYMENT_PROVIDER || 'manual').toLowerCase();
export const payments = providerMap[selected] || manual;

if (!providerMap[selected]) {
  console.warn(`[payments] Неизвестный PAYMENT_PROVIDER="${selected}", используется manual`);
}
