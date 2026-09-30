import 'dotenv/config';
import { Bot, InlineKeyboard, session } from 'grammy';
import { getCategories, getItem, getItems, getCategoryNames } from './catalog.js';
import * as store from './store.js';
import { payments } from './payments/index.js';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_CHAT_ID;

if (!TOKEN) {
  console.warn('[bot] TELEGRAM_BOT_TOKEN не задан — бот не запускается (работает только веб-сервер).');
}

export const bot = TOKEN ? new Bot(TOKEN) : null;

const fmt = (n) => `${n.toLocaleString('ru-RU')} ₽`;

// ---------- Клавиатуры ----------
function categoriesKeyboard() {
  const kb = new InlineKeyboard();
  for (const cat of getCategoryNames()) kb.text(cat, `cat:${cat}`).row();
  kb.text('🛒 Корзина', 'cart');
  return kb;
}

function categoryKeyboard(cat) {
  const items = (getCategories()[cat] || []);
  const kb = new InlineKeyboard();
  for (const it of items) kb.text(`#${it.id} ${it.title} — ${fmt(it.price)}`, `item:${it.id}`).row();
  kb.text('◀️ К категориям', 'back:cats').row();
  kb.text('🛒 Корзина', 'cart');
  return kb;
}

function itemKeyboard(id) {
  return new InlineKeyboard()
    .text('🛒 В корзину', `add:${id}`)
    .text('💳 Купить', `buy:${id}`).row()
    .text('◀️ Назад', `back:item:${id}`);
}

function cartKeyboard() {
  return new InlineKeyboard()
    .text('💳 Оплатить', 'checkout')
    .text('🗑 Очистить', 'clearcart').row()
    .text('📚 В каталог', 'back:cats');
}

// ---------- Заказ / оплата ----------
async function payItems(ctx, list) {
  if (!list.length) return ctx.reply('Нечего покупать.');
  const total = list.reduce((s, x) => s + x.item.price * x.qty, 0);
  const orderItems = list.map((x) => ({
    id: x.item.id, title: x.item.title, price: x.item.price, qty: x.qty, url: x.item.url,
  }));
  const order = store.createOrder({
    userId: ctx.from.id,
    username: ctx.from.username || ctx.from.first_name,
    items: orderItems, total, provider: payments.name,
  });
  const pay = await payments.createPayment(order);
  store.updateOrder(order.id, { providerOrderId: pay.providerOrderId });

  if (payments.name === 'demo') {
    await ctx.reply(
      `🧾 Заказ ${order.id} на сумму ${fmt(total)} (демо-режим оплаты).\nНажми кнопку, чтобы имитировать оплату — дальше сработает выдача.`,
      { reply_markup: new InlineKeyboard().text('💳 Я оплатил (демо)', `pay_demo:${order.id}`) },
    );
  } else {
    await ctx.reply(
      `🧾 Заказ ${order.id} на сумму ${fmt(total)}.\nОплати по кнопке (СБП или карта). Как только получу подтверждение — пришлю материалы.`,
      { reply_markup: new InlineKeyboard().url('💳 Оплатить', pay.payUrl) },
    );
  }
  ctx.session.cart = {};
}

async function showCart(ctx) {
  const cart = ctx.session.cart || {};
  const ids = Object.keys(cart).map(Number);
  if (!ids.length) {
    return ctx.reply('🛒 Корзина пуста. Загляни в каталог!', { reply_markup: categoriesKeyboard() });
  }
  const items = getItems(ids);
  let text = '🛒 Твоя корзина:\n';
  let total = 0;
  for (const it of items) {
    const qty = cart[it.id] || 1;
    text += `• ${it.title} — ${fmt(it.price)} ×${qty}\n`;
    total += it.price * qty;
  }
  text += `\nИтого: ${fmt(total)}`;
  await ctx.reply(text, { reply_markup: cartKeyboard() });
}

// ---------- Админ ----------
function isAdmin(ctx) {
  return Boolean(ADMIN_ID) && String(ctx.from.id) === String(ADMIN_ID);
}

function adminOrderText(o) {
  let t = `🆕 Заказ ${o.id}\nОт: ${o.username || o.userId} (id ${o.userId})\nСумма: ${fmt(o.total)} (${o.provider})\nМатериалы:\n`;
  for (const it of o.items) t += `• #${it.id} ${it.title} (×${it.qty || 1})\n`;
  return t;
}

async function showAdminPending(ctx) {
  const pending = store.listByStatus('paid');
  if (!pending.length) return ctx.reply('📭 Нет заказов, ожидающих выдачи.');
  for (const o of pending) {
    const kb = new InlineKeyboard()
      .text('✅ Подтвердить выдачу', `adm:approve:${o.id}`)
      .text('❌ Отклонить', `adm:reject:${o.id}`).row();
    await ctx.reply(adminOrderText(o), { reply_markup: kb });
  }
}

async function deliverToBuyer(order) {
  let text = `🎁 Спасибо за покупку! Заказ ${order.id} оплачен и подтверждён.\nВот твои материалы:\n\n`;
  for (const it of order.items) text += `📎 ${it.title}:\n${it.url}\n\n`;
  text += 'Если ссылка не открывается — напиши в поддержку.';
  try {
    await bot.api.sendMessage(order.userId, text);
  } catch (e) {
    console.error('deliver error', e.message);
  }
}

export async function notifyAdmin(order) {
  if (!bot || !ADMIN_ID) {
    console.log('[notify] админ недоступен, заказ', order.id);
    return;
  }
  const kb = new InlineKeyboard()
    .text('✅ Подтвердить выдачу', `adm:approve:${order.id}`)
    .text('❌ Отклонить', `adm:reject:${order.id}`).row();
  try {
    await bot.api.sendMessage(ADMIN_ID, '💰 Получена оплата!\n' + adminOrderText(order), { reply_markup: kb });
  } catch (e) {
    console.error('notify error', e.message);
  }
}

export async function onPaymentConfirmed(orderId) {
  const order = store.getOrder(orderId);
  if (!order || order.status !== 'pending_payment') return;
  store.updateOrder(orderId, { status: 'paid', paidAt: new Date().toISOString() });
  await notifyAdmin(order);
}

// ---------- Регистрация обработчиков ----------
if (bot) {
  bot.use(session({ initial: () => ({ cart: {} }) }));

  bot.command('start', async (ctx) => {
    await ctx.reply(
      '👋 Привет! Это магазин обучающих материалов.\n'
      + 'Выбери категорию, добавляй материалы в корзину и оплачивай через СБП.\n\n'
      + 'Команды:\n/catalog — каталог\n/cart — корзина\n/help — помощь',
      { reply_markup: categoriesKeyboard() },
    );
  });

  bot.command('catalog', async (ctx) => {
    await ctx.reply('📚 Выбери категорию:', { reply_markup: categoriesKeyboard() });
  });

  bot.command('cart', (ctx) => showCart(ctx));

  bot.command('help', (ctx) => ctx.reply(
    '🛟 Как пользоваться:\n'
    + '1. /catalog — выбери категорию\n'
    + '2. Открой материал → «🛒 В корзину» или «💳 Купить»\n'
    + '3. В корзине нажми «💳 Оплатить»\n'
    + '4. Оплати через СБП/карту\n'
    + '5. После подтверждения продавцом получишь ссылки на материалы',
  ));

  bot.command('admin', async (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply('⛔ Нет доступа.');
    await showAdminPending(ctx);
  });

  // Навигация
  bot.callbackQuery('back:cats', async (ctx) => {
    await ctx.editMessageText('📚 Выбери категорию:', { reply_markup: categoriesKeyboard() });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^cat:(.+)$/, async (ctx) => {
    const cat = ctx.match[1];
    await ctx.editMessageText(`📂 ${cat}:`, { reply_markup: categoryKeyboard(cat) });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^item:(\d+)$/, async (ctx) => {
    const it = getItem(Number(ctx.match[1]));
    if (!it) return ctx.answerCallbackQuery('Не найдено');
    await ctx.editMessageText(
      `📄 *${it.title}*\nКатегория: ${it.category}\nЦена: ${fmt(it.price)}`,
      { parse_mode: 'Markdown', reply_markup: itemKeyboard(it.id) },
    );
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^back:item:(\d+)$/, async (ctx) => {
    const it = getItem(Number(ctx.match[1]));
    const cat = it ? it.category : '';
    await ctx.editMessageText(`📂 ${cat}:`, { reply_markup: categoryKeyboard(cat) });
    await ctx.answerCallbackQuery();
  });

  // Корзина
  bot.callbackQuery('cart', async (ctx) => {
    await ctx.answerCallbackQuery();
    await showCart(ctx);
  });

  bot.callbackQuery(/^add:(\d+)$/, async (ctx) => {
    const id = Number(ctx.match[1]);
    ctx.session.cart[id] = (ctx.session.cart[id] || 0) + 1;
    await ctx.answerCallbackQuery('Добавлено в корзину 🛒');
  });

  bot.callbackQuery('clearcart', async (ctx) => {
    ctx.session.cart = {};
    await ctx.answerCallbackQuery('Корзина очищена');
  });

  bot.callbackQuery('checkout', async (ctx) => {
    const cart = ctx.session.cart || {};
    const ids = Object.keys(cart).map(Number);
    if (!ids.length) return ctx.answerCallbackQuery('Корзина пуста');
    const list = getItems(ids).map((it) => ({ item: it, qty: cart[it.id] || 1 }));
    await ctx.answerCallbackQuery();
    await payItems(ctx, list);
  });

  bot.callbackQuery(/^buy:(\d+)$/, async (ctx) => {
    const it = getItem(Number(ctx.match[1]));
    if (!it) return ctx.answerCallbackQuery('Не найдено');
    await ctx.answerCallbackQuery();
    await payItems(ctx, [{ item: it, qty: 1 }]);
  });

  // Демо-оплата
  bot.callbackQuery(/^pay_demo:(.+)$/, async (ctx) => {
    const id = ctx.match[1];
    const order = store.getOrder(id);
    if (!order || order.status !== 'pending_payment') return ctx.answerCallbackQuery('Заказ уже обработан');
    await ctx.answerCallbackQuery('Оплачено (демо) ✅');
    await onPaymentConfirmed(id);
    await ctx.editMessageText('✅ Оплата получена (демо-режим). Ожидай подтверждения выдачи от продавца.');
  });

  // Админ: подтверждение выдачи
  bot.callbackQuery(/^adm:approve:(.+)$/, async (ctx) => {
    if (!isAdmin(ctx)) return ctx.answerCallbackQuery('Нет доступа');
    const id = ctx.match[1];
    const order = store.getOrder(id);
    if (!order || order.status !== 'paid') return ctx.answerCallbackQuery('Уже обработан');
    store.updateOrder(id, { status: 'delivered', deliveredAt: new Date().toISOString() });
    await deliverToBuyer(order);
    await ctx.editMessageText(`✅ Выдано: ${id}`);
    await ctx.answerCallbackQuery('Выдано');
  });

  bot.callbackQuery(/^adm:reject:(.+)$/, async (ctx) => {
    if (!isAdmin(ctx)) return ctx.answerCallbackQuery('Нет доступа');
    const id = ctx.match[1];
    const order = store.getOrder(id);
    if (!order || order.status !== 'paid') return ctx.answerCallbackQuery('Уже обработан');
    store.updateOrder(id, { status: 'rejected' });
    try {
      await bot.api.sendMessage(order.userId, `К сожалению, заказ ${id} отклонён продавцом. Свяжитесь с поддержкой.`);
    } catch {}
    await ctx.editMessageText(`❌ Отклонено: ${id}`);
    await ctx.answerCallbackQuery('Отклонено');
  });

  bot.catch((err) => console.error('Bot error:', err));
}
