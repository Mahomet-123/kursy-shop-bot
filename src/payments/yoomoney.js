import { createHash } from 'node:crypto';

// Провайдер ЮMoney (бывш. Яндекс.Деньги).
// Приём через форму быстрой оплаты (quickpay) с методом СБП по умолчанию.
// Уведомления о платеже приходят на /yoomoney/webhook и проверяются по секрету.

const WALLET = process.env.YOOMONEY_WALLET || '';
const SECRET = process.env.YOOMONEY_SECRET || '';

export const name = 'yoomoney';

export async function createPayment(order) {
  if (!WALLET) {
    throw new Error('YOOMONEY_WALLET не задан в .env');
  }
  const params = new URLSearchParams({
    receiver: WALLET,
    amount: String(order.total),
    label: order.id, // наш orderId вернётся в уведомлении
    targets: `Заказ ${order.id}`,
    paymentType: 'SB', // СБП (Система быстрых платежей); покупатель может выбрать и карту
    'quickpay-form': 'shop',
  });
  const successURL = process.env.PUBLIC_URL;
  if (successURL) params.set('successURL', successURL);
  const payUrl = `https://yoomoney.ru/quickpay/confirm.xml?${params.toString()}`;
  return {
    provider: name,
    payUrl,
    providerOrderId: order.id,
  };
}

function sha(type, data) {
  return createHash(type).update(data, 'utf8').digest('hex');
}

// Возвращает { orderId, ok } или null, если подпись не прошла.
export function verifyNotification(body) {
  if (!body) return null;
  const {
    notification_type,
    operation_id,
    amount,
    currency,
    datetime,
    sender,
    codepro,
    label,
    sha1_hash,
    sha256_hash,
  } = body;

  if (!label) return null;
  if (codepro === 'true') return null; // код-платёж, не принимаем

  const base = [
    notification_type,
    operation_id,
    amount,
    currency,
    datetime,
    sender,
    codepro,
    SECRET,
    label,
  ].join('&');

  if (sha256_hash && sha('sha256', base) === sha256_hash) {
    return { orderId: label, ok: true };
  }
  if (sha1_hash && sha('sha1', base) === sha1_hash) {
    return { orderId: label, ok: true };
  }
  return null;
}
