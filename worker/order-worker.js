// ============================================
// Bloom & Petal — приём заказов (Cloudflare Worker)
//
// Принимает заказ с сайта, проверяет данные, САМ пересчитывает сумму
// по products.json и отправляет заказ в Telegram.
// Токен бота хранится только здесь, в секретах Cloudflare, а не на сайте.
//
// Переменные (Settings → Variables and Secrets):
//   TELEGRAM_BOT_TOKEN — секрет, токен от @BotFather
//   TELEGRAM_CHAT_ID   — секрет, id чата, куда приходят заказы
//   ALLOWED_ORIGIN     — https://feshjfewjfbw-bit.github.io (через запятую можно несколько)
//   PRODUCTS_URL       — https://feshjfewjfbw-bit.github.io/flower-shop/products.json
// ============================================

const MAX_BODY_BYTES = 10_000;
const MAX_QTY = 20;
const MAX_LINES = 30;
const DELIVERY = {
  courier: 'Курьер по Москве',
  russia: 'Доставка по России',
  pickup: 'Самовывоз',
};

// Простое ограничение частоты: не больше 5 заказов в минуту с одного IP.
// Работает в пределах одного экземпляра воркера — базовая защита от флуда.
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > RATE_LIMIT;
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });
}

// Убираем управляющие символы и обрезаем длину
function clean(value, max) {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/g, '')
    .trim()
    .slice(0, max);
}

function todayInMoscow() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow' }).format(new Date());
}

function validateCustomer(raw) {
  const c = raw && typeof raw === 'object' ? raw : {};
  const customer = {
    name: clean(c.name, 60),
    phone: clean(c.phone, 20),
    delivery: clean(c.delivery, 20),
    address: clean(c.address, 200),
    date: clean(c.date, 10),
    comment: clean(c.comment, 500),
  };
  const digits = customer.phone.replace(/\D/g, '');

  if (customer.name.length < 2) return { error: 'name' };
  if (digits.length < 10 || digits.length > 15) return { error: 'phone' };
  if (!DELIVERY[customer.delivery]) return { error: 'delivery' };
  if (customer.delivery !== 'pickup' && customer.address.length < 5) return { error: 'address' };
  if (customer.delivery === 'pickup') customer.address = '';
  if (customer.date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(customer.date)) return { error: 'date' };
    if (customer.date <= todayInMoscow()) return { error: 'date' };
  }
  if (c.consent !== true) return { error: 'consent' };
  return { customer };
}

function validateItems(raw) {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_LINES) return null;
  const byId = new Map();
  for (const item of raw) {
    const id = Number(item && item.id);
    const qty = Number(item && item.qty);
    if (!Number.isInteger(id) || id <= 0) return null;
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) return null;
    byId.set(id, Math.min(MAX_QTY, (byId.get(id) || 0) + qty));
  }
  return [...byId].map(([id, qty]) => ({ id, qty }));
}

async function loadProducts(url) {
  const response = await fetch(url, { cf: { cacheTtl: 300, cacheEverything: true } });
  if (!response.ok) throw new Error(`products.json: HTTP ${response.status}`);
  const data = await response.json();
  const map = new Map();
  for (const p of Array.isArray(data) ? data : []) {
    const id = Number(p.id);
    const price = Number(p.price);
    if (Number.isInteger(id) && Number.isFinite(price) && price > 0) {
      map.set(id, { id, price, name: clean(p.name, 120) });
    }
  }
  return map;
}

function makeOrderId() {
  const date = todayInMoscow().replace(/-/g, '').slice(2);
  const bytes = crypto.getRandomValues(new Uint8Array(3));
  const suffix = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  return `${date}-${suffix}`;
}

const rub = (n) => `${n.toLocaleString('ru-RU')} ₽`;

function buildMessage(orderId, customer, lines, total) {
  const rows = [
    `🌸 Новый заказ №${orderId}`,
    '',
    ...lines.map((l) => `• ${l.name} × ${l.qty} = ${rub(l.price * l.qty)}`),
    '',
    `Итого: ${rub(total)} (оплата при получении)`,
    '',
    `Имя: ${customer.name}`,
    `Телефон: ${customer.phone}`,
    `Получение: ${DELIVERY[customer.delivery]}`,
  ];
  if (customer.address) rows.push(`Адрес: ${customer.address}`);
  if (customer.date) rows.push(`Дата: ${customer.date.split('-').reverse().join('.')}`);
  if (customer.comment) rows.push('', `Комментарий: ${customer.comment}`);
  return rows.join('\n');
}

export default {
  async fetch(request, env) {
    const allowed = String(env.ALLOWED_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
    const origin = request.headers.get('Origin') || '';
    const originOk = allowed.includes(origin);
    const cors = originOk
      ? {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
          Vary: 'Origin',
        }
      : { Vary: 'Origin' };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: originOk ? 204 : 403, headers: cors });
    }
    if (request.method !== 'POST') return json({ ok: false, error: 'method' }, 405, cors);
    if (!originOk) return json({ ok: false, error: 'origin' }, 403, cors);
    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID || !env.PRODUCTS_URL) {
      return json({ ok: false, error: 'config' }, 500, cors);
    }

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (rateLimited(ip)) return json({ ok: false, error: 'rate' }, 429, cors);

    const text = await request.text();
    if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
      return json({ ok: false, error: 'size' }, 413, cors);
    }

    let body;
    try {
      body = JSON.parse(text);
    } catch (e) {
      return json({ ok: false, error: 'json' }, 400, cors);
    }

    // Заполненное поле-ловушка = бот. Делаем вид, что всё хорошо, но ничего не шлём.
    if (body && body.website) return json({ ok: true, orderId: makeOrderId() }, 200, cors);

    const { customer, error } = validateCustomer(body && body.customer);
    if (error) return json({ ok: false, error }, 400, cors);

    const items = validateItems(body && body.items);
    if (!items) return json({ ok: false, error: 'items' }, 400, cors);

    let products;
    try {
      products = await loadProducts(env.PRODUCTS_URL);
    } catch (e) {
      return json({ ok: false, error: 'catalog' }, 502, cors);
    }

    // Цены берём только из каталога — то, что прислал браузер, игнорируем
    const lines = [];
    for (const { id, qty } of items) {
      const product = products.get(id);
      if (!product) return json({ ok: false, error: 'items' }, 400, cors);
      lines.push({ ...product, qty });
    }
    const total = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
    const orderId = makeOrderId();

    const tg = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: buildMessage(orderId, customer, lines, total),
        disable_web_page_preview: true,
      }),
    });
    if (!tg.ok) return json({ ok: false, error: 'telegram' }, 502, cors);

    return json({ ok: true, orderId, total }, 200, cors);
  },
};
