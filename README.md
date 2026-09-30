# kursy-shop-bot

Telegram-бот для продажи обучающих материалов с оплатой через **СБП (ЮMoney)** и
**ручным подтверждением выдачи администратором**.

- 📚 Каталог из 131 материала в 13 категориях (данные в `data/catalog.json`)
- 🛒 Корзина, оформление заказа, суммирование позиций
- 💳 Оплата через СБП/карту (ЮMoney) или демо-режим для теста
- ✅ Админ получает уведомление о платеже и **вручную подтверждает выдачу** → покупателю приходят ссылки на материалы
- 🌐 Лендинг для GitHub Pages (генерируется из каталога)

## Быстрый старт (локально, демо-режим)

```bash
npm install
cp .env.example .env        # PAYMENT_PROVIDER=demo уже задан
npm run build:landing        # сгенерировать docs/index.html
npm start
```

Бот запустится в режиме **long polling**. Чтобы он заработал, в `.env` нужен
`TELEGRAM_BOT_TOKEN` (от [@BotFather](https://t.me/BotFather)) и `ADMIN_CHAT_ID`
(твой id — узнай у [@userinfobot](https://t.me/userinfobot)).

В демо-режиме после нажатия «Купить» бот покажет кнопку «Я оплатил (демо)» —
это имитирует оплату, дальше срабатывает выдача. Логика полностью идентична
реальной, кроме отсутствия денег.

## Включение реальной оплаты через СБП (ЮMoney)

По закону приём СБП/карт требует статуса **ИП или самозанятого** (нужен чек 54-ФЗ).

1. **Статус:** зарегистрируйся как **самозанятый** бесплатно в приложении
   «Мой налог» (или на сайте ФНС) за пару минут.
2. **ЮMoney для самозанятых (ЮSelf):** в [@yoomoney](https://t.me/yoomoney) включи
   приём платежей, укажи, что ты самозанятый — чеки 54-ФЗ пробиваются автоматически.
3. В настройках кошелька → **Уведомления** задай **Секретное слово** и укажи
   URL уведомления: `https://<твой-домен>/yoomoney/webhook`.
4. Заполни `.env`:
   ```
   PAYMENT_PROVIDER=yoomoney
   YOOMONEY_WALLET=41001112223344
   YOOMONEY_SECRET=твоё_секретное_слово
   ```
5. Запусти бота с публичным URL (см. деплой) — оплата через СБП заработает.

> Альтернатива ЮMoney — ЮKassa (для ИП) или Prodamus. Провайдер легко
> добавляется в `src/payments/`: реализуй `createPayment()` и `verifyNotification()`
> и зарегистрируй в `src/payments/index.js`.

## Деплой на Render (бесплатно, 24/7 + публичный URL для вебхуков)

1. Залей репозиторий на GitHub (см. ниже).
2. В Render создай **New → Web Service** из этого репозитория.
3. `render.yaml` уже настроен (Node 22, `npm install` / `npm start`, healthcheck `/health`).
4. В Environment задай: `TELEGRAM_BOT_TOKEN`, `ADMIN_CHAT_ID`, `PAYMENT_PROVIDER`,
   `YOOMONEY_WALLET`, `YOOMONEY_SECRET`. `PUBLIC_URL` Render подставит сам
   через `RENDER_EXTERNAL_URL`.
5. После деплоя бот включит Telegram-webhook на `https://<app>.onrender.com/telegram`,
   а ЮMoney-уведомления придут на `https://<app>.onrender.com/yoomoney/webhook`.

## GitHub Pages (лендинг)

Лендинг генерируется скриптом и лежит в `docs/index.html`:

```bash
npm run build:landing
git add docs/index.html && git commit -m "landing" && git push
```

В настройках репозитория → **Pages** → Source: `main` / `/docs`.
Перед генерацией задай `BOT_USERNAME` (юзернейм бота без @), чтобы кнопка
«Открыть бота» вела на `t.me/<BOT_USERNAME>`.

## Структура

```
src/
  bot.js            # логика бота (grammY): каталог, корзина, админ-выдача
  server.js         # Express: вебхук Telegram + /yoomoney/webhook + long polling
  catalog.js        # загрузка data/catalog.json
  store.js          # JSON-хранилище заказов (data/orders.json)
  payments/
    index.js        # фабрика провайдеров (PAYMENT_PROVIDER)
    demo.js         # эмуляция оплаты
    yoomoney.js     # ЮMoney (СБП) quickpay + проверка уведомления
scripts/build-landing.js  # генератор docs/index.html
data/catalog.json   # 131 материал (категория, цена, ссылка)
render.yaml         # конфиг Render
```

## Переменные окружения (.env)

| Переменная | Назначение |
|---|---|
| `TELEGRAM_BOT_TOKEN` | токен бота от BotFather |
| `ADMIN_CHAT_ID` | id чата админа (кому приходят заказы на подтверждение) |
| `PAYMENT_PROVIDER` | `demo` или `yoomoney` |
| `YOOMONEY_WALLET` | номер кошелька ЮMoney |
| `YOOMONEY_SECRET` | секретное слово уведомлений ЮMoney |
| `PUBLIC_URL` | публичный https-адрес (Render ставит сам) |
| `PORT` | порт (Render ставит сам) |
