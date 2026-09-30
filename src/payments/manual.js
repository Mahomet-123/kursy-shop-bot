// Ручной режим: прямые платежи НЕ подключены.
// Покупатель переводит деньги по реквизитам (СБП по номеру, карта и т.п.),
// затем нажимает «Я оплатил». Админ проверяет поступление и подтверждает выдачу.
// Реквизиты задаются в .env -> PAYMENT_DETAILS (многострочно, переносы через \n).

export const name = 'manual';

export async function createPayment(order) {
  const details = (process.env.PAYMENT_DETAILS || '').trim();
  return {
    provider: name,
    payUrl: null,
    requisites: details || 'Реквизиты для перевода уточните у продавца.',
  };
}

// Вебхуков нет — подтверждение ручное.
export function verifyNotification() {
  return null;
}
