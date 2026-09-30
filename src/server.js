import 'dotenv/config';
import express from 'express';
import { bot, onPaymentConfirmed } from './bot.js';
import { payments } from './payments/index.js';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;
const PUBLIC_URL = (process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || '').replace(/\/$/, '');

app.get('/health', (_req, res) => res.json({ ok: true, provider: payments.name }));

// Уведомления от ЮMoney о платеже (СБП/карта)
app.post('/yoomoney/webhook', async (req, res) => {
  try {
    const verify = payments.verifyNotification;
    if (!verify) {
      res.status(200).send('provider has no webhook');
      return;
    }
    const result = verify(req.body || {});
    if (result && result.ok) {
      await onPaymentConfirmed(result.orderId);
      res.status(200).send('ok');
    } else {
      res.status(200).send('invalid');
    }
  } catch (e) {
    console.error('webhook error', e);
    res.status(500).send('error');
  }
});

if (bot) {
  if (PUBLIC_URL) {
    const webhookUrl = `${PUBLIC_URL}/telegram`;
    app.use('/telegram', (req, res) => bot.handleUpdate(req.body, res));
    bot.api.setWebhook(webhookUrl)
      .then(() => console.log('✅ Webhook установлен:', webhookUrl))
      .catch((e) => console.error('❌ Ошибка установки webhook:', e.message));
  } else {
    console.log('ℹ️ PUBLIC_URL не задан → режим long polling');
    bot.start({ dropPendingUpdates: true }).catch((e) => console.error('Ошибка запуска бота:', e));
  }
  app.listen(PORT, () => console.log(`🚀 Сервер на порту ${PORT}, провайдер: ${payments.name}`));
} else {
  // Без токена — только веб-сервер (тест лендинга / вебхука)
  app.listen(PORT, () => console.log(`🚀 Сервер (без бота) на порту ${PORT}`));
}
