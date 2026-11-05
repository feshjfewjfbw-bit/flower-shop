// ============================================
// Bloom & Petal — общие утилиты
// Безопасный вывод данных, загрузка каталога, мобильное меню.
// Подключается первым на всех страницах.
// ============================================

const IMAGE_FALLBACK = 'https://placehold.co/600x400/ece7dd/7f8c7f?text=Flowers';

const Safe = {
  // Экранирует строку перед вставкой в HTML-шаблон (защита от XSS)
  html(value) {
    return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[ch]));
  },

  // Пропускает только https-ссылки и ссылки на этот же сайт.
  // javascript:, data: и прочее заменяется запасным адресом.
  url(value, fallback = '') {
    try {
      const url = new URL(String(value ?? ''), window.location.href);
      const sameOrigin = url.origin === window.location.origin;
      return url.protocol === 'https:' || sameOrigin ? url.href : fallback;
    } catch (e) {
      return fallback;
    }
  },
};

// Запасная картинка без inline-атрибута onerror (его блокирует CSP)
function attachImageFallback(img) {
  if (!img) return;
  img.addEventListener('error', () => {
    if (img.src !== IMAGE_FALLBACK) img.src = IMAGE_FALLBACK;
  }, { once: true });
}

// ---------- Каталог: загрузка и проверка products.json ----------

const Catalog = {
  _promise: null,

  load() {
    if (!this._promise) {
      this._promise = fetch('products.json', { cache: 'no-cache' })
        .then((response) => {
          if (!response.ok) throw new Error('Не удалось загрузить products.json');
          return response.json();
        })
        .then((data) => (Array.isArray(data) ? data : [])
          .map(Catalog.normalize)
          .filter(Boolean));
    }
    return this._promise;
  },

  // Приводим товар к ожидаемому виду; битые записи отбрасываем
  normalize(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const id = Number(raw.id);
    const price = Number(raw.price);
    if (!Number.isInteger(id) || id <= 0 || !Number.isFinite(price) || price <= 0) return null;
    const oldPrice = Number(raw.oldPrice);
    return {
      id,
      price,
      oldPrice: Number.isFinite(oldPrice) && oldPrice > price ? oldPrice : null,
      name: String(raw.name ?? '').slice(0, 120),
      category: String(raw.category ?? ''),
      description: String(raw.description ?? ''),
      badge: raw.badge ? String(raw.badge).slice(0, 20) : '',
      image: Safe.url(raw.image, IMAGE_FALLBACK),
    };
  },
};

function formatPrice(value) {
  return `${Number(value).toLocaleString('ru-RU')} ₽`;
}

// ---------- Мобильное меню (общее для всех страниц) ----------

(() => {
  const navToggle = document.getElementById('nav-toggle');
  const navEl = document.getElementById('nav');
  if (!navToggle || !navEl) return;

  const setNavOpen = (open) => {
    navEl.classList.toggle('is-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  };

  navToggle.addEventListener('click', () => {
    setNavOpen(!navEl.classList.contains('is-open'));
  });

  navEl.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setNavOpen(false));
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && navEl.classList.contains('is-open')) {
      setNavOpen(false);
      navToggle.focus();
    }
  });
})();
