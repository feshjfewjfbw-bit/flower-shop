// ============================================
// Bloom & Petal — корзина (localStorage)
// Общий модуль для index.html и cart.html.
//
// В корзине храним только { id, qty }. Название, цена и картинка всегда
// берутся из products.json — так цену нельзя подменить через localStorage,
// и она не «застывает», если вы поменяете её в каталоге.
// ============================================

const CART_KEY = 'bloom-petal-cart';
const CART_MAX_QTY = 20;

function normalizeQty(value) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return 1;
  return Math.min(CART_MAX_QTY, Math.max(1, n));
}

const CartStore = {
  MAX_QTY: CART_MAX_QTY,

  read() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];

      // Проверяем каждую запись: всё лишнее (name, price, image из старого
      // формата или подложенные данные) отбрасываем, дубли объединяем
      const byId = new Map();
      parsed.forEach((item) => {
        const id = Number(item && item.id);
        if (!Number.isInteger(id) || id <= 0) return;
        byId.set(id, normalizeQty((byId.get(id) || 0) + normalizeQty(item.qty)));
      });
      return [...byId].map(([id, qty]) => ({ id, qty }));
    } catch (e) {
      console.error('Не удалось прочитать корзину:', e);
      return [];
    }
  },

  write(items) {
    const clean = items.map(({ id, qty }) => ({ id, qty: normalizeQty(qty) }));
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(clean));
    } catch (e) {
      console.error('Не удалось сохранить корзину:', e);
    }
    this.updateBadge();
  },

  qtyOf(id) {
    const item = this.read().find((i) => i.id === id);
    return item ? item.qty : 0;
  },

  // Возвращает, сколько штук реально добавлено (с учётом лимита)
  add(product, qty = 1) {
    const items = this.read();
    const wanted = normalizeQty(qty);
    const existing = items.find((item) => item.id === product.id);
    const before = existing ? existing.qty : 0;
    const after = Math.min(CART_MAX_QTY, before + wanted);

    if (existing) existing.qty = after;
    else items.push({ id: product.id, qty: after });

    this.write(items);
    return after - before;
  },

  setQty(id, qty) {
    const items = this.read();
    const item = items.find((i) => i.id === id);
    if (!item) return items;
    item.qty = normalizeQty(qty);
    this.write(items);
    return items;
  },

  remove(id) {
    const items = this.read().filter((item) => item.id !== id);
    this.write(items);
    return items;
  },

  clear() {
    this.write([]);
    return [];
  },

  // Склеивает корзину с каталогом. Товары, которых больше нет в каталоге,
  // убираются из корзины.
  resolve(products) {
    const byId = new Map(products.map((p) => [p.id, p]));
    const items = this.read();
    const lines = items
      .filter((item) => byId.has(item.id))
      .map((item) => ({ ...item, product: byId.get(item.id) }));
    if (lines.length !== items.length) this.write(lines);
    return lines;
  },

  total(lines) {
    return lines.reduce((sum, line) => sum + line.product.price * line.qty, 0);
  },

  count(items = this.read()) {
    return items.reduce((sum, item) => sum + item.qty, 0);
  },

  updateBadge() {
    const badge = document.getElementById('cart-badge');
    if (!badge) return;
    const count = this.count();
    badge.textContent = count;
    badge.hidden = count === 0;
  },
};

document.addEventListener('DOMContentLoaded', () => CartStore.updateBadge());
