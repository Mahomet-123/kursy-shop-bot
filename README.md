# kursy-shop-bot

Telegram-бот для продажи обучающих материалов с **ручным подтверждением оплаты**:
покупатель переводит деньги по реквизитам (СБП), продавец проверяет поступление и
открывает доступ к материалам. Прямая интеграция платежей **не требуется**.

- 📚 Каталог из 131 материала в 13 категориях (данные в `data/catalog.json`)
- 🛒 Корзина, оформление заказа, суммирование позиций
- 💳 Ручная оплата: реквизиты → «Я оплатил» → проверка админом → выдача ссылок
- ✅ Админ получает уведомление о заявке и **вручную подтверждает выдачу**
- 🌐 Лендинг для GitHub Pages (генерируется из каталога)

## Быстрый старт (локально)

```bash
npm install
cp .env.example .env        # PAYMENT_PROVIDER=manual уже задан
npm run build:landing        # сгенерировать docs/index.html
npm start
```

Бот запустится в режиме **long polling**. Чтобы он заработал, в `.env` нужен
`TELEGRAM_BOT_TOKEN` (от [@BotFather](https://t.me/BotFather)) и `ADMIN_CHAT_ID`
(твой id — узнай у [@userinfobot](https://t.me/userinfobot)).

## Режим оплаты: ручное подтверждение (по умолчанию)

Прямые платежи не подключаются. Поток такой:

1. Покупатель выбирает материалы → «Оплатить».
2. Бот показывает **реквизиты для перевода** (`PAYMENT_DETAILS`) и сумму заказа.
3. Покупатель переводит деньги (СБП по номеру телефона / карта) и жмёт **«Я оплатил»**.
4. Тебе (админу) приходит уведомление: *«Клиент сообщил об оплате — проверь поступление»*.
5. Ты проверяешь поступление в банке и жмёшь **«✅ Подтвердить выдачу»** — покупатель
   получает ссылки на материалы. Либо **«❌ Отклонить»**, если перевода не было.

Задай реквизиты в `.env` (перенос строки — `\n`):

```
PAYMENT_PROVIDER=manual
PAYMENT_DETAILS=СБП (телефон): +7 900 000-00-00 (Т-Банк)\nКарта: 2200 0000 0000 0000
```

Команда `/admin` показывает очередь: заявки на проверку и заказы, ожидающие оплаты.

## (Опционально) Автоматизация оплаты через ЮMoney

Если позже захочешь автоприём СБП/карт без ручной проверки — нужен статус
**ИП или самозанятого** (чек 54-ФЗ). Провайдер уже готов в `src/payments/yoomoney.js`:

1. Зарегистрируйся как **самозанятый** («Мой налог») и включи приём платежей в
   ЮMoney (ЮSelf — чеки 54-ФЗ пробиваются автоматически).
2. В настройках кошелька → **Уведомления** задай **секретное слово** и URL
   `https://<твой-домен>/yoomoney/webhook`.
3. В `.env`: `PAYMENT_PROVIDER=yoomoney`, `YOOMONEY_WALLET=...`, `YOOMONEY_SECRET=...`.

> Альтернатива ЮMoney — ЮKassa (для ИП) или Prodamus. Провайдер легко
> добавляется в `src/payments/`: реализуй `createPayment()` и `verifyNotification()`
> и зарегистрируй в `src/payments/index.js`.

## Деплой на Render (бесплатно, 24/7 + публичный URL для вебхуков)

1. Залей репозиторий на GitHub (см. ниже).
2. В Render создай **New → Web Service** из этого репозитория.
3. `render.yaml` уже настроен (Node 22, `npm install` / `npm start`, healthcheck `/health`).
4. В Environment задай: `TELEGRAM_BOT_TOKEN`, `ADMIN_CHAT_ID`, `PAYMENT_PROVIDER=manual`,
   `PAYMENT_DETAILS`. `PUBLIC_URL` Render подставит сам через `RENDER_EXTERNAL_URL`.
5. После деплоя бот включит Telegram-webhook на `https://<app>.onrender.com/telegram`.
   (Эндпоинт `/yoomoney/webhook` нужен только если позже включишь автоплатежи.)

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
    manual.js       # ручная оплата: реквизиты + «Я оплатил» (по умолчанию)
    demo.js         # эмуляция оплаты (без реквизитов)
    yoomoney.js     # (опционально) ЮMoney quickpay + проверка уведомления
scripts/build-landing.js  # генератор docs/index.html
data/catalog.json   # 131 материал (категория, цена, ссылка)
render.yaml         # конфиг Render
```

## Переменные окружения (.env)

| Переменная | Назначение |
|---|---|
| `TELEGRAM_BOT_TOKEN` | токен бота от BotFather |
| `ADMIN_CHAT_ID` | id чата админа (кому приходят заказы на подтверждение) |
| `PAYMENT_PROVIDER` | `manual` (по умолчанию), `demo` или `yoomoney` |
| `PAYMENT_DETAILS` | реквизиты для перевода (для `manual`) |
| `YOOMONEY_WALLET` | номер кошелька ЮMoney (только для `yoomoney`) |
| `YOOMONEY_SECRET` | секретное слово уведомлений ЮMoney |
| `PUBLIC_URL` | публичный https-адрес (Render ставит сам) |
| `PORT` | порт (Render ставит сам) |
