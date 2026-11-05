// ============================================
// Bloom & Petal — логика интернет-магазина
// ============================================

const grid = document.getElementById('product-grid');
const filterButtons = document.querySelectorAll('.filter-btn[data-filter]');

// ---------- Toast-уведомления ----------

const TOAST_DURATION = 2000;

const toastContainer = document.createElement('div');
toastContainer.className = 'toast-container';
toastContainer.setAttribute('role', 'status');
toastContainer.setAttribute('aria-live', 'polite');
document.body.appendChild(toastContainer);

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <svg class="toast__icon" width="20" height="20" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5"></path>
    </svg>
    <span></span>
  `;
  toast.querySelector('span').textContent = message;
  toastContainer.appendChild(toast);

  // Принудительный reflow: браузер фиксирует начальное состояние,
  // после чего добавление класса запускает плавный переход
  void toast.offsetWidth;
  toast.classList.add('toast--visible');

  setTimeout(() => {
    toast.classList.remove('toast--visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    // Страховка, если transitionend не придёт (например, при prefers-reduced-motion)
    setTimeout(() => toast.remove(), 400);
  }, TOAST_DURATION);
}

// ---------- Hero: проверка фонового изображения ----------

(() => {
  const HERO_IMAGE = 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?q=80&w=2070';
  const probe = new Image();
  probe.onerror = () => document.querySelector('.hero__bg')?.classList.add('hero__bg--fallback');
  probe.src = HERO_IMAGE;
})();

let products = [];
let activeCategory = 'all';
let searchQuery = '';
let sortOrder = 'default';
let onlyFavorites = false;

// ---------- Избранное ----------

const FAV_KEY = 'bloom-petal-favorites';

function readFavorites() {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

function writeFavorites(ids) {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(ids));
  } catch (e) {
    console.error('Не удалось сохранить избранное:', e);
  }
  updateFavUI();
}

function toggleFavorite(id) {
  const ids = readFavorites();
  const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
  writeFavorites(next);
}

function updateFavUI() {
  const ids = readFavorites();
  const favCount = document.getElementById('fav-count');
  const favFilter = document.getElementById('fav-filter');

  if (favCount) favCount.textContent = ids.length ? `· ${ids.length}` : '';
  if (favFilter) {
    favFilter.setAttribute('aria-pressed', String(onlyFavorites));
    if (onlyFavorites) favFilter.classList.add('active');
    else favFilter.classList.remove('active');
  }

  document.querySelectorAll('.product-card__fav').forEach((btn) => {
    const isFav = ids.includes(Number(btn.dataset.favId));
    btn.setAttribute('aria-pressed', String(isFav));
    btn.setAttribute('aria-label', isFav ? 'Убрать из избранного' : 'В избранное');
    btn.querySelector('svg').setAttribute('fill', isFav ? 'currentColor' : 'none');
  });
}

// ---------- Фильтрация и сортировка ----------

function getVisibleProducts() {
  const favs = readFavorites();
  const q = searchQuery.trim().toLowerCase();

  let list = products.filter((product) => {
    const byCategory = activeCategory === 'all' || product.category === activeCategory;
    const byFav = !onlyFavorites || favs.includes(product.id);
    const bySearch = !q
      || product.name.toLowerCase().includes(q)
      || product.description.toLowerCase().includes(q);
    return byCategory && byFav && bySearch;
  });

  if (sortOrder === 'asc') list = [...list].sort((a, b) => a.price - b.price);
  if (sortOrder === 'desc') list = [...list].sort((a, b) => b.price - a.price);

  return list;
}

function updateCounts() {
  document.querySelectorAll('[data-count]').forEach((el) => {
    const key = el.dataset.count;
    const total = key === 'all'
      ? products.length
      : products.filter((p) => p.category === key).length;
    el.textContent = total;
  });
}

function renderFiltered() {
  const list = getVisibleProducts();
  const empty = document.getElementById('catalog-empty');
  const emptyText = document.getElementById('catalog-empty-text');

  if (list.length === 0) {
    grid.innerHTML = '';
    if (empty) {
      if (onlyFavorites && readFavorites().length === 0) {
        emptyText.textContent = 'Нажмите на сердечко у понравившегося букета, чтобы сохранить его здесь.';
      } else {
        emptyText.textContent = 'Попробуйте изменить запрос или сбросить фильтры.';
      }
      empty.hidden = false;
    }
    return;
  }

  if (empty) empty.hidden = true;
  renderProducts(list);
}

// ---------- Карточки товаров ----------

function renderProducts(list) {
  grid.innerHTML = '';

  list.forEach((product) => {
    const card = document.createElement('article');
    card.className = 'product-card';
    const isFav = readFavorites().includes(product.id);
    const badgeClass = product.badge && product.badge.startsWith('-')
      ? 'product-card__badge product-card__badge--sale'
      : 'product-card__badge';

    // Все данные товара экранируются: даже если в products.json попадёт
    // HTML или скрипт, он отобразится как текст, а не выполнится
    const name = Safe.html(product.name);
    const image = Safe.html(product.image);
    const badge = Safe.html(product.badge);

    card.innerHTML = `
      <div class="product-card__image-wrap">
        <img class="product-card__image" src="${image}" alt="${name}" loading="lazy">
        ${badge ? `<span class="${badgeClass}">${badge}</span>` : ''}
        <button class="product-card__fav" type="button" data-fav-id="${Number(product.id)}"
                aria-pressed="${isFav}" aria-label="${isFav ? 'Убрать из избранного' : 'В избранное'}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}"
               stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true">
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"></path>
          </svg>
        </button>
      </div>
      <div class="product-card__body">
        <h3 class="product-card__title">${name}</h3>
        <div class="product-card__price-row">
          <p class="product-card__price">${formatPrice(product.price)}</p>
          ${product.oldPrice ? `<span class="product-card__old-price">${formatPrice(product.oldPrice)}</span>` : ''}
        </div>
        <button class="btn btn--primary product-card__btn" type="button" data-add-to-cart>Добавить в корзину</button>
        <button class="product-card__details" type="button" data-details>Подробнее</button>
      </div>
    `;

    attachImageFallback(card.querySelector('.product-card__image'));

    const addBtn = card.querySelector('[data-add-to-cart]');
    addBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      if (CartStore.add(product) === 0) {
        showToast(`В корзине уже максимум — ${CartStore.MAX_QTY} шт.`);
        return;
      }
      showToast('Товар добавлен в корзину');
      addBtn.textContent = '✓ Добавлено';
      addBtn.classList.add('product-card__btn--added');
      setTimeout(() => {
        addBtn.textContent = 'Добавить в корзину';
        addBtn.classList.remove('product-card__btn--added');
      }, 1500);
    });

    const favBtn = card.querySelector('[data-fav-id]');
    favBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      toggleFavorite(product.id);
      if (onlyFavorites) renderFiltered();
    });

    const detailsBtn = card.querySelector('[data-details]');
    detailsBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      openModal(product);
    });

    card.addEventListener('click', () => openModal(product));
    grid.appendChild(card);
  });

  updateFavUI();
}

// ---------- Загрузка данных ----------

Catalog.load()
  .then((data) => {
    products = data;
    updateCounts();
    renderFiltered();
  })
  .catch((error) => {
    console.error(error);
    grid.innerHTML = '<p class="grid__error">Не удалось загрузить товары. Попробуйте позже.</p>';
  });

// ---------- Фильтры ----------

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    filterButtons.forEach((btn) => {
      btn.classList.remove('active');
      btn.setAttribute('aria-selected', 'false');
    });
    button.classList.add('active');
    button.setAttribute('aria-selected', 'true');

    activeCategory = button.dataset.filter;
    renderFiltered();
  });
});

// ---------- Поиск, сортировка, избранное ----------

const searchInput = document.getElementById('catalog-search');
if (searchInput) {
  searchInput.addEventListener('input', (event) => {
    searchQuery = event.target.value;
    renderFiltered();
  });
}

const sortSelect = document.getElementById('catalog-sort');
if (sortSelect) {
  sortSelect.addEventListener('change', (event) => {
    sortOrder = event.target.value;
    renderFiltered();
  });
}

const favFilterBtn = document.getElementById('fav-filter');
if (favFilterBtn) {
  favFilterBtn.addEventListener('click', () => {
    onlyFavorites = !onlyFavorites;
    updateFavUI();
    renderFiltered();
  });
}

const resetBtn = document.getElementById('catalog-reset');
if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    activeCategory = 'all';
    searchQuery = '';
    sortOrder = 'default';
    onlyFavorites = false;

    if (searchInput) searchInput.value = '';
    if (sortSelect) sortSelect.value = 'default';
    filterButtons.forEach((btn) => {
      const isAll = btn.dataset.filter === 'all';
      btn.classList.toggle('active', isAll);
      btn.setAttribute('aria-selected', String(isAll));
    });

    updateFavUI();
    renderFiltered();
  });
}

// ---------- Модальное окно ----------

const modal = document.createElement('div');
modal.className = 'modal';
modal.innerHTML = `
  <div class="modal__overlay" data-close></div>
  <div class="modal__dialog" role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <button class="modal__close" type="button" data-close aria-label="Закрыть">&times;</button>
    <img class="modal__image" src="" alt="">
    <div class="modal__content">
      <span class="modal__category"></span>
      <h3 class="modal__title" id="modal-title"></h3>
      <div class="modal__price-row">
        <span class="modal__price"></span>
        <span class="modal__old-price"></span>
      </div>
      <p class="modal__desc"></p>
      <div class="modal__actions">
        <div class="modal__qty">
          <button type="button" class="qty-btn" data-qty="dec" aria-label="Меньше">&minus;</button>
          <span class="qty-value" data-qty-value>1</span>
          <button type="button" class="qty-btn" data-qty="inc" aria-label="Больше">+</button>
        </div>
        <button class="btn btn--primary modal__add" type="button">Добавить в корзину</button>
        <button class="modal__fav" type="button" aria-pressed="false" aria-label="В избранное">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true">
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"></path>
          </svg>
        </button>
      </div>
    </div>
  </div>
`;
modal.inert = true; // закрытое окно недоступно с клавиатуры
document.body.appendChild(modal);

const modalImage = modal.querySelector('.modal__image');
const modalTitle = modal.querySelector('.modal__title');
const modalDesc = modal.querySelector('.modal__desc');
const modalCategory = modal.querySelector('.modal__category');
const modalPrice = modal.querySelector('.modal__price');
const modalOldPrice = modal.querySelector('.modal__old-price');
const modalQtyValue = modal.querySelector('[data-qty-value]');
const modalFavBtn = modal.querySelector('.modal__fav');
const modalAddBtn = modal.querySelector('.modal__add');

let modalProduct = null;
let modalQty = 1;
let modalReturnFocus = null;

modalImage.addEventListener('error', () => {
  if (modalImage.src !== IMAGE_FALLBACK) modalImage.src = IMAGE_FALLBACK;
});

function updateModalPrice() {
  if (!modalProduct) return;
  const total = modalProduct.price * modalQty;
  modalAddBtn.textContent = `В корзину · ${total.toLocaleString('ru-RU')} ₽`;
}

function updateModalFav() {
  if (!modalProduct) return;
  const isFav = readFavorites().includes(modalProduct.id);
  modalFavBtn.setAttribute('aria-pressed', String(isFav));
  modalFavBtn.setAttribute('aria-label', isFav ? 'Убрать из избранного' : 'В избранное');
  modalFavBtn.querySelector('svg').setAttribute('fill', isFav ? 'currentColor' : 'none');
}

function openModal(product) {
  modalProduct = product;
  modalQty = 1;
  modalReturnFocus = document.activeElement;

  modalImage.src = product.image;
  modalImage.alt = product.name;
  modalTitle.textContent = product.name;
  modalDesc.textContent = product.description;
  modalCategory.textContent = product.category;
  modalPrice.textContent = formatPrice(product.price);
  modalOldPrice.textContent = product.oldPrice ? formatPrice(product.oldPrice) : '';
  modalOldPrice.hidden = !product.oldPrice;
  modalQtyValue.textContent = '1';
  modalAddBtn.textContent = 'Добавить в корзину';
  updateModalPrice();
  updateModalFav();

  modal.inert = false;
  modal.classList.add('open');
  modal.querySelector('.modal__close').focus();
}

modal.querySelectorAll('[data-qty]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const delta = btn.dataset.qty === 'inc' ? 1 : -1;
    modalQty = Math.min(CartStore.MAX_QTY, Math.max(1, modalQty + delta));
    modalQtyValue.textContent = String(modalQty);
    updateModalPrice();
  });
});

modalFavBtn.addEventListener('click', () => {
  if (!modalProduct) return;
  toggleFavorite(modalProduct.id);
  updateModalFav();
  if (onlyFavorites) renderFiltered();
});

modalAddBtn.addEventListener('click', () => {
  if (!modalProduct) return;
  const added = CartStore.add(modalProduct, modalQty);
  if (added === 0) {
    showToast(`В корзине уже максимум — ${CartStore.MAX_QTY} шт.`);
    return;
  }
  showToast(added < modalQty
    ? `Добавлено ${added} шт. — это максимум для одного товара`
    : 'Товар добавлен в корзину');
  modalAddBtn.textContent = '✓ Добавлено в корзину';
  setTimeout(() => {
    modalAddBtn.textContent = 'Добавить в корзину';
    closeModal();
  }, 1200);
});

function closeModal() {
  if (!modal.classList.contains('open')) return;
  modal.classList.remove('open');
  modal.inert = true;
  modalProduct = null;
  // Возвращаем фокус туда, откуда открыли окно
  if (modalReturnFocus && document.contains(modalReturnFocus)) modalReturnFocus.focus();
  modalReturnFocus = null;
}

modal.querySelectorAll('[data-close]').forEach((el) => {
  el.addEventListener('click', closeModal);
});

document.addEventListener('keydown', (event) => {
  if (!modal.classList.contains('open')) return;

  if (event.key === 'Escape') {
    closeModal();
    return;
  }

  // Tab не выходит за пределы открытого окна
  if (event.key === 'Tab') {
    const focusable = [...modal.querySelectorAll('button:not([disabled]), [href], input, select, textarea')];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});