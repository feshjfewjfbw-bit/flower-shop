# Bloom & Petal — исправленная версия

## Что изменено

| Файл | Что сделано |
|---|---|
| `common.js` (новый) | Экранирование данных (`Safe.html`), фильтр ссылок (`Safe.url`), проверка `products.json`, общее мобильное меню |
| `cart-store.js` | В корзине хранится только `{id, qty}`; цена и название берутся из каталога; лимит 20 шт.; мусор из localStorage отбрасывается |
| `script.js` | Данные товаров экранируются; убраны inline-`onerror`; фокус в модалке (Tab не выходит из окна, Esc возвращает фокус) |
| `cart.js` | Новая форма заказа с проверкой полей и отправкой на сервер; корзина очищается **только** после успешной отправки |
| `config.js` (новый) | Адрес сервера заказов (`ORDER_ENDPOINT`) |
| `index.html`, `cart.html` | Content-Security-Policy и Referrer-Policy; в `cart.html` добавлена кнопка мобильного меню |
| `privacy.html` (новый) | Шаблон политики конфиденциальности (нужно заполнить поля в [скобках]) |
| `style.css` | Стили формы заказа, видимый фокус, стили страницы политики |
| `worker/order-worker.js` (новый) | Сервер заказов для Cloudflare Workers → Telegram |

## 1. Обновить сайт

1. Скопируйте все файлы из этого архива (кроме папки `worker` и README.md) в репозиторий `flower-shop` с заменой.
2. Удалите лишние файлы: `heroes.json` (данные Dota 2) и `images` (это текстовый файл, а не папка).
3. Отправьте изменения:

```
git rm heroes.json images
git add .
git commit -m "Security fixes, checkout form, mobile menu on cart page"
git push
```

Сайт сразу заработает. Пока сервер заказов не подключён, форма честно скажет «онлайн-оформление пока не подключено» и не очистит корзину.

## 2. Подключить приём заказов в Telegram (≈15 минут, бесплатно)

**Telegram-бот**
1. Напишите [@BotFather](https://t.me/BotFather) → `/newbot` → получите **токен**. Никому его не показывайте и не вставляйте в файлы сайта.
2. Напишите своему боту любое сообщение (или добавьте его в группу, куда должны приходить заказы).
3. Откройте у себя в браузере `https://api.telegram.org/bot<ТОКЕН>/getUpdates` и найдите `"chat":{"id": ...}` — это **chat id**.

**Cloudflare Worker**
1. Зарегистрируйтесь на [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Create Worker**, имя например `bloom-orders` → **Deploy**.
2. **Edit code** → замените весь код содержимым `worker/order-worker.js` → **Deploy**.
3. **Settings → Variables and Secrets** → добавьте:

| Имя | Тип | Значение |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Secret | токен бота |
| `TELEGRAM_CHAT_ID` | Secret | chat id |
| `ALLOWED_ORIGIN` | Text | `https://feshjfewjfbw-bit.github.io` |
| `PRODUCTS_URL` | Text | `https://feshjfewjfbw-bit.github.io/flower-shop/products.json` |

4. Скопируйте адрес воркера (вида `https://bloom-orders.<ваш-логин>.workers.dev`) и вставьте его в `config.js`:

```js
ORDER_ENDPOINT: 'https://bloom-orders.<ваш-логин>.workers.dev',
```

5. `git commit` + `git push`, затем оформите тестовый заказ — он должен прийти в Telegram.

### Что делает сервер
- Принимает запросы только с вашего сайта (CORS + проверка Origin).
- Проверяет все поля, количество (1–20) и существование товаров.
- **Сам пересчитывает сумму по `products.json`** — подмена цены в браузере ни на что не влияет.
- Отсекает ботов (скрытое поле-ловушка) и ограничивает частоту: не больше 5 заказов в минуту с одного IP.

## Важно

- **Сменили домен или адрес воркера?** Обновите `ALLOWED_ORIGIN` в Cloudflare и `connect-src` в мета-теге CSP в `index.html`, `cart.html`, `privacy.html`. Воркеры на `*.workers.dev` уже разрешены.
- **Добавили картинки с другого сайта?** Добавьте его домен в `img-src` в том же мета-теге, иначе браузер их заблокирует.
- **Политика конфиденциальности** — это шаблон. Заполните поля в [скобках] и покажите юристу: Cloudflare и Telegram — зарубежные сервисы, а по 152-ФЗ это трансграничная передача персональных данных.
- Защиту от встраивания сайта в чужие страницы (clickjacking) на GitHub Pages включить нельзя: для этого нужны HTTP-заголовки, а значит, свой домен через Cloudflare.
