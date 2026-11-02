// ============================================
// Bloom & Petal — страница корзины
// ============================================

const cartContent = document.getElementById('cart-content');

function renderCart() {
  const items = CartStore.read();

  if (items.length === 0) {
    cartContent.innerHTML = `
      <div class="cart-page__empty-state">
        <p class="cart-page__empty">Ваша корзина пуста</p>
        <a href="index.html#catalog" class="btn btn--primary">Перейти в каталог</a>
      </div>
    `;
    return;
  }

  const total = CartStore.total(items);

  cartContent.innerHTML = `
    <ul class="cart-list">
      ${items.map((item) => `
        <li class="cart-item" data-id="${item.id}">
          <img class="cart-item__image" src="${item.image}" alt="${item.name}" loading="lazy">
          <div class="cart-item__info">
            <h3 class="cart-item__name">${item.name}</h3>
            <p class="cart-item__unit-price">${item.price.toLocaleString('ru-RU')} ₽ за шт.</p>
            <div class="cart-item__qty">
              <button class="qty-btn" data-action="dec" aria-label="Уменьшить количество">&minus;</button>
              <span class="qty-value">${item.qty}</span>
              <button class="qty-btn" data-action="inc" aria-label="Увеличить количество">+</button>
            </div>
          </div>
          <div class="cart-item__right">
            <p class="cart-item__subtotal">${(item.price * item.qty).toLocaleString('ru-RU')} ₽</p>
            <button class="cart-item__remove" data-action="remove">Удалить</button>
          </div>
        </li>
      `).join('')}
    </ul>

    <div class="cart-summary">
      <div class="cart-summary__row">
        <span>Товаров:</span>
        <span>${CartStore.count(items)} шт.</span>
      </div>
      <div class="cart-summary__row cart-summary__row--total">
        <span>Итого:</span>
        <span>${total.toLocaleString('ru-RU')} ₽</span>
      </div>
      <div class="cart-summary__actions">
        <button class="btn btn--primary cart-summary__checkout" id="checkout-btn">Оформить заказ</button>
        <button class="cart-summary__clear" id="clear-cart-btn">Очистить корзину</button>
      </div>
    </div>
  `;

  bindCartEvents();
}

function bindCartEvents() {
  cartContent.querySelectorAll('.cart-item').forEach((itemEl) => {
    const id = Number(itemEl.dataset.id);

    itemEl.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        const items = CartStore.read();
        const item = items.find((i) => i.id === id);
        if (!item) return;

        if (action === 'inc') CartStore.setQty(id, item.qty + 1);
        if (action === 'dec') CartStore.setQty(id, item.qty - 1);
        if (action === 'remove') CartStore.remove(id);

        renderCart();
      });
    });
  });

  document.getElementById('clear-cart-btn')?.addEventListener('click', () => {
    if (confirm('Очистить корзину?')) {
      CartStore.clear();
      renderCart();
    }
  });

  document.getElementById('checkout-btn')?.addEventListener('click', () => {
    alert('Спасибо за заказ! Менеджер свяжется с вами.');
    CartStore.clear();
    renderCart();
  });
}

renderCart();
