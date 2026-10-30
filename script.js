// ============================================
// Bloom & Petal — логика интернет-магазина
// ============================================

const grid = document.getElementById('product-grid');
const filterButtons = document.querySelectorAll('.filter-btn');

let products = [];
let activeCategory = 'all';

// ---------- Карточки товаров ----------

function renderProducts(list) {
  grid.innerHTML = '';

  list.forEach((product) => {
    const card = document.createElement('article');
    card.className = 'product-card';
    card.innerHTML = `
      <img class="product-card__image" src="${product.image}" alt="${product.name}" loading="lazy">
      <div class="product-card__body">
        <h3 class="product-card__title">${product.name}</h3>
        <p class="product-card__price">${product.price.toLocaleString('ru-RU')} ₽</p>
        <button class="btn btn--primary product-card__btn">Подробнее</button>
      </div>
    `;

    card.addEventListener('click', () => openModal(product));
    grid.appendChild(card);
  });
}

// ---------- Загрузка данных ----------

fetch('products.json')
  .then((response) => {
    if (!response.ok) throw new Error('Не удалось загрузить products.json');
    return response.json();
  })
  .then((data) => {
    products = data;
    renderProducts(products);
  })
  .catch((error) => {
    console.error(error);
    grid.innerHTML = '<p class="grid__error">Не удалось загрузить товары. Попробуйте позже.</p>';
  });

// ---------- Фильтры ----------

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    filterButtons.forEach((btn) => btn.classList.remove('active'));
    button.classList.add('active');

    activeCategory = button.dataset.filter;
    const filtered = activeCategory === 'all'
      ? products
      : products.filter((product) => product.category === activeCategory);

    renderProducts(filtered);
  });
});

// ---------- Модальное окно ----------

const modal = document.createElement('div');
modal.className = 'modal';
modal.innerHTML = `
  <div class="modal__overlay" data-close></div>
  <div class="modal__dialog" role="dialog" aria-modal="true">
    <button class="modal__close" data-close aria-label="Закрыть">&times;</button>
    <img class="modal__image" src="" alt="">
    <div class="modal__content">
      <h3 class="modal__title"></h3>
      <p class="modal__desc"></p>
      <button class="btn btn--primary modal__add">Добавить в корзину</button>
    </div>
  </div>
`;
document.body.appendChild(modal);

const modalImage = modal.querySelector('.modal__image');
const modalTitle = modal.querySelector('.modal__title');
const modalDesc = modal.querySelector('.modal__desc');

function openModal(product) {
  modalImage.src = product.image;
  modalImage.alt = product.name;
  modalTitle.textContent = product.name;
  modalDesc.textContent = product.description;
  modal.classList.add('open');
}

function closeModal() {
  modal.classList.remove('open');
}

modal.querySelectorAll('[data-close]').forEach((el) => {
  el.addEventListener('click', closeModal);
});

modal.querySelector('.modal__add').addEventListener('click', () => {
  alert('Товар добавлен!');
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && modal.classList.contains('open')) {
    closeModal();
  }
});