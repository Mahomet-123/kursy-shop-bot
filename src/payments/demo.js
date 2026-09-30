// Демо-провайдер: реальных денег не принимает.
// Оплата имитируется кнопкой "Я оплатил" в боте (callback pay_demo:<orderId>).

export const name = 'demo';

export async function createPayment(order) {
  // В демо-режиме внешней ссылки нет — бот покажет кнопку "Я оплатил".
  return {
    provider: name,
    payUrl: null,
    providerOrderId: order.id,
  };
}

// Демо не использует вебхуки. Проверка происходит по нажатию кнопки в боте.
export function verifyNotification() {
  return null;
}
