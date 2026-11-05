// ============================================
// Bloom & Petal — страница корзины и оформление заказа
// ============================================

const cartContent = document.getElementById('cart-content');
const ORDER_ENDPOINT = (window.BLOOM_CONFIG && window.BLOOM_CONFIG.ORDER_ENDPOINT) || '';

let catalog = [];

// ---------- Отрисовка ----------

function renderEmpty() {
  cartContent.innerHTML = `
    <div class="cart-page__empty-state">
      <p class="cart-page__empty">Ваша корзина пуста</p>
      <a href="index.html#catalog" class="btn btn--primary">Перейти в каталог</a>
    </div>
  `;
}

function renderLayout() {
  cartContent.innerHTML = `
    <div id="cart-lines"></div>
    <section class="checkout" id="checkout" hidden aria-labelledby="checkout-title">
      <h2 class="checkout__title" id="checkout-title">Оформление заказа</h2>
      <form class="checkout__form" id="checkout-form" novalidate>
        <div class="checkout__grid">
          <label class="field">
            <span class="field__label">Имя *</span>
            <input class="field__input" name="name" type="text" autocomplete="name"
                   required minlength="2" maxlength="60">
          </label>
          <label class="field">
            <span class="field__label">Телефон *</span>
            <input class="field__input" name="phone" type="tel" autocomplete="tel"
                   placeholder="+7 900 000-00-00" required maxlength="20">
          </label>
          <label class="field">
            <span class="field__label">Способ получения *</span>
            <select class="field__input" name="delivery" required>
              <option value="courier">Курьер по Москве</option>
              <option value="russia">Доставка по России</option>
              <option value="pickup">Самовывоз — ул. Цветочная, 17</option>
            </select>
          </label>
          <label class="field">
            <span class="field__label">Желаемая дата</span>
            <input class="field__input" name="date" type="date">
          </label>
          <label class="field field--wide" data-address-field>
            <span class="field__label">Адрес доставки *</span>
            <input class="field__input" name="address" type="text" autocomplete="street-address"
                   maxlength="200" placeholder="Город, улица, дом, квартира">
          </label>
          <label class="field field--wide">
            <span class="field__label">Комментарий или текст открытки</span>
            <textarea class="field__input field__input--area" name="comment" rows="3" maxlength="500"></textarea>
          </label>
        </div>

        <!-- Ловушка для спам-ботов: человек это поле не видит -->
        <div class="checkout__trap" aria-hidden="true">
          <label>Сайт <input name="website" type="text" tabindex="-1" autocomplete="off"></label>
        </div>

        <label class="checkout__consent">
          <input type="checkbox" name="consent" required>
          <span>Я соглашаюсь на обработку персональных данных согласно
            <a href="privacy.html" target="_blank" rel="noopener">политике конфиденциальности</a></span>
        </label>

        <p class="checkout__error" id="checkout-error" role="alert" hidden></p>

        <div class="checkout__actions">
          <button class="btn btn--primary" type="submit" id="checkout-submit">Подтвердить заказ</button>
          <span class="checkout__note">Оплата при получении. Менеджер свяжется с вами для подтверждения.</span>
        </div>
      </form>
    </section>
  `;
  bindCheckout();
}

function renderLines() {
  const lines = CartStore.resolve(catalog);
  if (lines.length === 0) {
    renderEmpty();
    return;
  }

  const container = document.getElementById('cart-lines');
  const total = CartStore.total(lines);

  container.innerHTML = `
    <ul class="cart-list">
      ${lines.map(({ id, qty, product }) => {
        const name = Safe.html(product.name);
        return `
        <li class="cart-item" data-id="${Number(id)}">
          <img class="cart-item__image" src="${Safe.html(product.image)}" alt="${name}" loading="lazy">
          <div class="cart-item__info">
            <h3 class="cart-item__name">${name}</h3>
            <p class="cart-item__unit-price">${formatPrice(product.price)} за шт.</p>
            <div class="cart-item__qty">
              <button class="qty-btn" type="button" data-action="dec" aria-label="Уменьшить количество" ${qty <= 1 ? 'disabled' : ''}>&minus;</button>
              <span class="qty-value">${Number(qty)}</span>
              <button class="qty-btn" type="button" data-action="inc" aria-label="Увеличить количество" ${qty >= CartStore.MAX_QTY ? 'disabled' : ''}>+</button>
            </div>
          </div>
          <div class="cart-item__right">
            <p class="cart-item__subtotal">${formatPrice(product.price * qty)}</p>
            <button class="cart-item__remove" type="button" data-action="remove">Удалить</button>
          </div>
        </li>`;
      }).join('')}
    </ul>

    <div class="cart-summary">
      <div class="cart-summary__row">
        <span>Товаров:</span>
        <span>${CartStore.count(lines)} шт.</span>
      </div>
      <div class="cart-summary__row cart-summary__row--total">
        <span>Итого:</span>
        <span>${formatPrice(total)}</span>
      </div>
      <div class="cart-summary__actions">
        <button class="btn btn--primary cart-summary__checkout" type="button" id="checkout-btn">Оформить заказ</button>
        <button class="cart-summary__clear" type="button" id="clear-cart-btn">Очистить корзину</button>
      </div>
    </div>
  `;

  container.querySelectorAll('.cart-item').forEach((itemEl) => {
    attachImageFallback(itemEl.querySelector('.cart-item__image'));
    const id = Number(itemEl.dataset.id);

    itemEl.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        const qty = CartStore.qtyOf(id);
        if (action === 'inc') CartStore.setQty(id, qty + 1);
        if (action === 'dec') CartStore.setQty(id, qty - 1);
        if (action === 'remove') CartStore.remove(id);
        renderLines();
      });
    });
  });

  document.getElementById('clear-cart-btn').addEventListener('click', () => {
    if (confirm('Очистить корзину?')) {
      CartStore.clear();
      renderEmpty();
    }
  });

  document.getElementById('checkout-btn').addEventListener('click', () => {
    const checkout = document.getElementById('checkout');
    checkout.hidden = false;
    checkout.scrollIntoView({ behavior: 'smooth', block: 'start' });
    checkout.querySelector('input[name="name"]').focus({ preventScroll: true });
  });
}

// ---------- Форма заказа ----------

function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function validate(data) {
  if (data.name.length < 2) return 'Укажите имя.';
  const digits = data.phone.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) return 'Проверьте номер телефона.';
  if (data.delivery !== 'pickup' && data.address.length < 5) return 'Укажите адрес доставки.';
  if (data.date && data.date < tomorrowISO()) return 'Дата доставки — не раньше завтрашнего дня.';
  if (!data.consent) return 'Нужно согласие на обработку персональных данных.';
  return '';
}

function bindCheckout() {
  const form = document.getElementById('checkout-form');
  const errorEl = document.getElementById('checkout-error');
  const submitBtn = document.getElementById('checkout-submit');
  const addressField = form.querySelector('[data-address-field]');
  const deliverySelect = form.elements.delivery;

  form.elements.date.min = tomorrowISO();

  const syncAddress = () => {
    const pickup = deliverySelect.value === 'pickup';
    addressField.hidden = pickup;
    form.elements.address.required = !pickup;
  };
  deliverySelect.addEventListener('change', syncAddress);
  syncAddress();

  const showError = (message) => {
    errorEl.textContent = message;
    errorEl.hidden = !message;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const data = {
      name: form.elements.name.value.trim(),
      phone: form.elements.phone.value.trim(),
      delivery: deliverySelect.value,
      address: deliverySelect.value === 'pickup' ? '' : form.elements.address.value.trim(),
      date: form.elements.date.value,
      comment: form.elements.comment.value.trim(),
      consent: form.elements.consent.checked,
    };

    const problem = validate(data);
    if (problem) {
      showError(problem);
      return;
    }

    if (!ORDER_ENDPOINT) {
      showError('Онлайн-оформление пока не подключено. Позвоните нам или напишите в Telegram — корзина сохранится.');
      return;
    }

    showError('');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Отправляем…';

    try {
      const response = await fetch(ORDER_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Цены не отправляем: сервер считает сумму сам по products.json
        body: JSON.stringify({
          customer: data,
          items: CartStore.read(),
          website: form.elements.website.value,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.error || `HTTP ${response.status}`);

      CartStore.clear();
      renderSuccess(result.orderId);
    } catch (e) {
      console.error('Не удалось отправить заказ:', e);
      showError('Не удалось отправить заказ. Проверьте интернет и попробуйте ещё раз или позвоните нам — корзина сохранена.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Подтвердить заказ';
    }
  });
}

function renderSuccess(orderId) {
  cartContent.innerHTML = `
    <div class="cart-page__empty-state checkout-success" role="status">
      <p class="cart-page__empty">Спасибо! Заказ <strong data-order-id></strong> принят.</p>
      <p class="checkout-success__text">Менеджер свяжется с вами для подтверждения.</p>
      <a href="index.html#catalog" class="btn btn--primary">Вернуться в каталог</a>
    </div>
  `;
  cartContent.querySelector('[data-order-id]').textContent = orderId ? `№${orderId}` : '';
}

// ---------- Старт ----------

if (CartStore.read().length === 0) {
  renderEmpty();
} else {
  Catalog.load()
    .then((data) => {
      catalog = data;
      renderLayout();
      renderLines();
    })
    .catch((error) => {
      console.error(error);
      cartContent.innerHTML = '<p class="cart-page__empty">Не удалось загрузить корзину. Обновите страницу.</p>';
    });
}
