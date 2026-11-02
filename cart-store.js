// ============================================
// Bloom & Petal — корзина (localStorage)
// Общий модуль для index.html и cart.html
// ============================================

const CART_KEY = 'bloom-petal-cart';

const CartStore = {
  read() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      const items = raw ? JSON.parse(raw) : [];
      return Array.isArray(items) ? items : [];
    } catch (e) {
      console.error('Не удалось прочитать корзину:', e);
      return [];
    }
  },

  write(items) {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Не удалось сохранить корзину:', e);
    }
    this.updateBadge();
  },

  add(product, qty = 1) {
    const items = this.read();
    const existing = items.find((item) => item.id === product.id);
    if (existing) {
      existing.qty += qty;
    } else {
      items.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        qty,
      });
    }
    this.write(items);
    return items;
  },

  setQty(id, qty) {
    let items = this.read();
    const item = items.find((i) => i.id === id);
    if (!item) return items;
    item.qty = Math.max(1, qty);
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

  total(items = this.read()) {
    return items.reduce((sum, item) => sum + item.price * item.qty, 0);
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
