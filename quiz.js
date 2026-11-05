// ============================================
// Bloom & Petal — «Подбор букета за 3 вопроса»
// Подключается после script.js и использует его общие функции:
// Catalog, Safe, formatPrice, attachImageFallback (common.js),
// CartStore (cart-store.js), openModal и showToast (script.js).
// Без inline-стилей и inline-скриптов — совместимо с CSP сайта.
// ============================================

(() => {
  const root = document.querySelector('[data-quiz]');
  if (!root || typeof Catalog === 'undefined' || typeof Safe === 'undefined') return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const esc = (value) => Safe.html(value);

  // ---------- Вопросы ----------

  const QUESTIONS = [
    {
      key: 'who',
      title: 'Кому дарим цветы?',
      hint: 'От этого зависит характер букета.',
      options: [
        { value: 'love', label: 'Любимому человеку', note: 'Признание и романтика', chip: 'Для любимых', icon: 'heart' },
        { value: 'mom', label: 'Маме или бабушке', note: 'Тепло и благодарность', chip: 'Для мамы', icon: 'tulip' },
        { value: 'friend', label: 'Подруге или коллеге', note: 'Внимание без пафоса', chip: 'Для друзей и коллег', icon: 'users' },
        { value: 'self', label: 'Себе, для дома', note: 'Уют, который не увянет', chip: 'Для дома', icon: 'home' },
      ],
    },
    {
      key: 'why',
      title: 'Какой повод?',
      hint: 'Подскажем, что будет уместно.',
      options: [
        { value: 'birthday', label: 'День рождения', note: 'Праздничный акцент', chip: 'День рождения', icon: 'gift' },
        { value: 'romance', label: 'Свидание или годовщина', note: 'Особенный вечер', chip: 'Романтика', icon: 'rings' },
        { value: 'cozy', label: 'Просто так', note: 'Для настроения и уюта', chip: 'Просто так', icon: 'cup' },
        { value: 'newyear', label: 'Новый год', note: 'Зимние праздники', chip: 'Новый год', icon: 'snow' },
      ],
    },
    {
      key: 'mood',
      title: 'Какое настроение ближе?',
      hint: 'Выберите палитру — остальное подберём мы.',
      options: [
        { value: 'pastel', label: 'Нежное', note: 'Пудровые и пастельные тона', chip: 'Нежные тона', swatch: 'pastel' },
        { value: 'bright', label: 'Яркое', note: 'Сочные, насыщенные цвета', chip: 'Яркие тона', swatch: 'bright' },
        { value: 'white', label: 'Светлое', note: 'Белый, крем и лаконичность', chip: 'Светлые тона', swatch: 'white' },
        { value: 'vintage', label: 'Винтажное', note: 'Приглушённые природные оттенки', chip: 'Винтаж', swatch: 'vintage' },
      ],
    },
  ];

  // Вес ответа: повод важнее всего (новогодний венок не дарят на свидание)
  const WEIGHTS = { why: 3, mood: 2.5, who: 2 };

  // ---------- Теги товаров (id из products.json) ----------
  // who — кому, why — повод, mood — палитра, flower — ключ для «языка цветов».
  // Новый товар без тегов не потеряется: теги угадаются по названию и описанию.

  const PROFILES = {
    1: { who: ['love', 'mom', 'self'], why: ['birthday', 'romance', 'cozy'], mood: ['white', 'vintage'], flower: 'rose-cream' },
    2: { who: ['love', 'mom', 'friend'], why: ['birthday', 'romance'], mood: ['pastel'], flower: 'rose-pink' },
    3: { who: ['mom', 'friend', 'self'], why: ['birthday', 'cozy'], mood: ['pastel', 'white'], flower: 'mix-pastel' },
    4: { who: ['friend', 'self', 'mom'], why: ['birthday', 'cozy'], mood: ['vintage'], flower: 'mix-vintage' },
    5: { who: ['love'], why: ['romance', 'birthday'], mood: ['bright'], flower: 'rose-red' },
    6: { who: ['mom', 'friend'], why: ['birthday', 'cozy'], mood: ['bright'], flower: 'tulip' },
    7: { who: ['mom', 'self', 'friend'], why: ['newyear'], mood: ['bright'], flower: 'amaryllis' },
    8: { who: ['friend', 'self'], why: ['cozy', 'birthday'], mood: ['vintage', 'bright'], flower: 'dried' },
    9: { who: ['friend', 'self'], why: ['cozy', 'birthday'], mood: ['bright'], flower: 'mix' },
    10: { who: ['love', 'mom'], why: ['romance', 'birthday'], mood: ['white'], flower: 'peony' },
    11: { who: ['love', 'mom', 'self'], why: ['romance', 'cozy'], mood: ['pastel', 'bright'], flower: 'peony' },
    12: { who: ['mom', 'friend', 'love'], why: ['birthday', 'cozy'], mood: ['pastel', 'vintage'], flower: 'rose-pastel' },
    13: { who: ['love', 'friend'], why: ['romance', 'birthday'], mood: ['pastel', 'white'], flower: 'rose-pastel' },
    14: { who: ['self', 'friend'], why: ['cozy'], mood: ['white', 'pastel'], flower: 'orchid' },
    15: { who: ['friend', 'mom', 'self'], why: ['cozy', 'birthday', 'newyear'], mood: ['white', 'bright'], flower: 'orchid' },
    16: { who: ['self', 'mom', 'friend'], why: ['cozy'], mood: ['pastel'], flower: 'hydrangea' },
    17: { who: ['friend', 'self'], why: ['cozy', 'birthday'], mood: ['bright'], flower: 'mix' },
    18: { who: ['love', 'mom', 'friend'], why: ['romance', 'newyear'], mood: ['pastel', 'bright'], flower: 'rose-dome' },
    19: { who: ['self', 'friend'], why: ['cozy'], mood: ['vintage', 'bright'], flower: 'mix' },
    20: { who: ['mom', 'friend', 'self'], why: ['birthday', 'cozy'], mood: ['pastel'], flower: 'lily' },
  };

  // ---------- Язык цветов ----------

  const FLOWER_MEANINGS = {
    'rose-red': 'Алая роза — признание в любви и страсть.',
    'rose-pink': 'Розовая роза — нежность, восхищение и благодарность.',
    'rose-cream': 'Кремовая роза — очарование и искренняя признательность.',
    'rose-pastel': 'Розы пастельных оттенков — симпатия и бережная нежность.',
    'rose-dome': 'Роза под куполом — образ из «Красавицы и Чудовища»: любовь, которую бережно хранят.',
    rose: 'Роза — главный цветок признаний, а её оттенок уточняет, о чём букет.',
    peony: 'Пион — символ благополучия, удачи и счастливой любви.',
    tulip: 'Тюльпан — весна, обновление и искренняя радость.',
    orchid: 'Орхидея — утончённость, гармония и восхищение.',
    hydrangea: 'Гортензия — благодарность за понимание и искренность чувств.',
    lily: 'Лилия — чистота и благородство, а розовая — ещё и восхищение.',
    amaryllis: 'Амариллис — гордость и сияющая красота: недаром он цветёт к зимним праздникам.',
    dried: 'Сухоцветы — символ постоянства и тёплых воспоминаний.',
    'mix-pastel': 'Пастельная палитра — забота и мягкость без громких слов.',
    'mix-vintage': 'Винтажные оттенки — ностальгия, уют и вкус к деталям.',
    mix: 'В смешанной композиции каждый цветок добавляет своё слово — выходит целое пожелание.',
  };

  const FLOWER_PATTERNS = [
    [/пион/, 'peony'],
    [/тюльпан/, 'tulip'],
    [/орхиде/, 'orchid'],
    [/гортенз/, 'hydrangea'],
    [/лили/, 'lily'],
    [/амарилл/, 'amaryllis'],
    [/сухоцвет/, 'dried'],
    [/(алы|красн)[а-яё]* роз/, 'rose-red'],
    [/роз/, 'rose'],
  ];

  function guessProfile(product) {
    const text = `${product.name} ${product.description}`.toLowerCase();
    const has = (re) => re.test(text);

    const mood = [];
    if (has(/пастел|нежн|розов|пудр|лаванд/)) mood.push('pastel');
    if (has(/алы|красн|ярк|красочн|сочн/)) mood.push('bright');
    if (has(/бел|крем|беж|молочн/)) mood.push('white');
    if (has(/винтаж|сухоцвет|дерев|состар|ретро/)) mood.push('vintage');

    const why = has(/рождеств|новогод|венок|зимн|ёлоч|елов/) ? ['newyear'] : ['birthday', 'cozy'];
    if (has(/роз|пион|романт/)) why.push('romance');

    const flower = (FLOWER_PATTERNS.find(([re]) => re.test(text)) || [null, 'mix'])[1];

    return {
      who: has(/роз|пион|лили/) ? ['love', 'mom', 'friend'] : ['friend', 'self', 'mom'],
      why,
      mood: mood.length ? mood : ['pastel'],
      flower,
    };
  }

  const profileFor = (product) => PROFILES[product.id] || guessProfile(product);

  // ---------- Подбор ----------

  function scoreProduct(product, answers) {
    const profile = profileFor(product);
    // Порядок совпадений — как в вопросах: кому → повод → настроение
    const matched = QUESTIONS.map((q) => q.key).filter((key) => profile[key].includes(answers[key]));
    let score = matched.reduce((sum, key) => sum + WEIGHTS[key], 0);
    if (product.badge === 'Хит') score += 0.4;
    else if (product.badge) score += 0.2;
    return { product, profile, matched, score };
  }

  // Жадный выбор со штрафом за повтор цветка: три разные идеи вместо трёх похожих букетов
  function pickTop(products, answers, count = 3) {
    const pool = products.map((product) => scoreProduct(product, answers));
    const family = (item) => item.profile.flower.split('-')[0];
    const picked = [];

    while (picked.length < count && pool.length) {
      let bestIndex = 0;
      let bestValue = -Infinity;
      pool.forEach((item, index) => {
        const repeats = picked.filter((p) => family(p) === family(item)).length;
        const value = item.score - repeats * 1.5;
        if (value > bestValue) {
          bestValue = value;
          bestIndex = index;
        }
      });
      picked.push(pool.splice(bestIndex, 1)[0]);
    }
    return picked;
  }

  const optionOf = (question, value) => question.options.find((opt) => opt.value === value);

  // ---------- Разметка ----------

  const ICONS = {
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>',
    tulip: '<path d="M7 4.5V8a5 5 0 0 0 10 0V4.5l-2.6 2.2L12 3.5 9.6 6.7 7 4.5Z"/><path d="M12 13v8"/><path d="M12 18.2c-2.6 0-4.6-1.5-5.2-4.2"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    home: '<path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z"/>',
    gift: '<path d="M20 12v9H4v-9"/><path d="M2 7h20v5H2z"/><path d="M12 21V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7Z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7Z"/>',
    rings: '<circle cx="8.8" cy="14.6" r="5.4"/><circle cx="15.2" cy="14.6" r="5.4"/><path d="m10.4 4.6 1.6-2.1 1.6 2.1-1.6 2z"/>',
    cup: '<path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z"/><path d="M6 2v3M10 2v3M14 2v3"/>',
    snow: '<path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7"/><path d="m9.5 4.3 2.5 2.4 2.5-2.4M9.5 19.7l2.5-2.4 2.5 2.4"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    back: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  };

  const icon = (name) =>
    `<svg class="quiz__svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name]}</svg>`;

  const PETAL_PATH = 'M12 2.5C7.4 6.5 5 10.2 5 13.6a7 7 0 0 0 14 0c0-3.4-2.4-7.1-7-11.1Z';

  // Цветок-линия, который «рисуется» над результатом
  const BLOOM_SVG = `
    <svg class="quiz__bloom" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <path class="quiz__bloom-stem" pathLength="1" d="M32 28c0 9.5-1.2 18 0 30"/>
      <path class="quiz__bloom-leaf" pathLength="1" d="M32 47c3.5-5.5 9.5-7.2 14-5.4-3 5.2-8.5 7.6-14 5.4Z"/>
      <g class="quiz__bloom-petals">
        ${[0, 72, 144, 216, 288].map((angle) => `
          <path class="quiz__bloom-petal" pathLength="1" transform="rotate(${angle} 32 22)"
                d="M32 22C26.5 18 26.5 10 32 6c5.5 4 5.5 12 0 16Z"/>`).join('')}
      </g>
      <circle class="quiz__bloom-core" pathLength="1" cx="32" cy="22" r="3"/>
    </svg>`;

  root.innerHTML = `
    <div class="quiz__top">
      <button class="quiz__back" type="button" data-quiz-back hidden>
        ${icon('back')}<span data-quiz-back-label>Назад</span>
      </button>
      <div class="quiz__bud" aria-hidden="true">
        <span class="quiz__bud-petals">
          ${QUESTIONS.map(() => `<svg class="quiz__bud-petal" viewBox="0 0 24 24" focusable="false"><path d="${PETAL_PATH}"/></svg>`).join('')}
        </span>
        <span class="quiz__bud-label" data-quiz-step-label></span>
      </div>
    </div>
    <div class="quiz__viewport" data-quiz-viewport></div>
  `;

  const refs = {
    viewport: root.querySelector('[data-quiz-viewport]'),
    back: root.querySelector('[data-quiz-back]'),
    backLabel: root.querySelector('[data-quiz-back-label]'),
    stepLabel: root.querySelector('[data-quiz-step-label]'),
    petals: [...root.querySelectorAll('.quiz__bud-petal')],
  };

  const state = { step: 0, answers: {}, results: [], busy: false };

  function buildQuestion(index) {
    const question = QUESTIONS[index];
    const chosen = state.answers[question.key];
    const headingId = `quiz-heading-${index + 1}`;
    const screen = document.createElement('div');
    screen.className = 'quiz__screen';

    screen.innerHTML = `
      <h3 class="quiz__title" id="${headingId}" tabindex="-1" data-quiz-heading>
        <span class="quiz__counter">Вопрос ${index + 1} из ${QUESTIONS.length}</span>
        ${esc(question.title)}
      </h3>
      <p class="quiz__hint">${esc(question.hint)}</p>
      <div class="quiz__options" role="group" aria-labelledby="${headingId}">
        ${question.options.map((opt) => `
          <button class="quiz__option" type="button" data-quiz-value="${esc(opt.value)}"
                  aria-pressed="${opt.value === chosen}">
            ${opt.swatch
              ? `<span class="quiz__swatch quiz__swatch--${esc(opt.swatch)}" aria-hidden="true"></span>`
              : `<span class="quiz__icon" aria-hidden="true">${icon(opt.icon)}</span>`}
            <span class="quiz__text">
              <span class="quiz__label">${esc(opt.label)}</span>
              <span class="quiz__note">${esc(opt.note)}</span>
            </span>
            <span class="quiz__check" aria-hidden="true">${icon('check')}</span>
          </button>`).join('')}
      </div>
    `;
    return screen;
  }

  function resultCard({ product, profile, matched }, index) {
    const name = esc(product.name);
    const chips = matched.map((key) => {
      const question = QUESTIONS.find((q) => q.key === key);
      return `<li class="quiz-result__chip">${icon('check')}${esc(optionOf(question, state.answers[key]).chip)}</li>`;
    }).join('');
    const meaning = FLOWER_MEANINGS[profile.flower] || FLOWER_MEANINGS.mix;

    return `
      <li class="quiz-result" data-quiz-id="${Number(product.id)}">
        <button class="quiz-result__media" type="button" data-quiz-action="details" tabindex="-1" aria-hidden="true">
          <img src="${esc(product.image)}" alt="" width="600" height="400" loading="lazy">
          ${index === 0 ? '<span class="quiz-result__badge">Лучшее совпадение</span>' : ''}
        </button>
        <div class="quiz-result__body">
          <h4 class="quiz-result__title">${name}</h4>
          ${chips ? `<ul class="quiz-result__chips" aria-label="Совпадает с ответами">${chips}</ul>` : ''}
          <p class="quiz-result__meaning">
            <span class="quiz-result__meaning-label">Язык цветов</span>
            ${esc(meaning)}
          </p>
          <div class="quiz-result__price-row">
            <span class="quiz-result__price">${formatPrice(product.price)}</span>
            ${product.oldPrice ? `<span class="quiz-result__old-price">${formatPrice(product.oldPrice)}</span>` : ''}
          </div>
          <button class="btn btn--primary quiz-result__add" type="button" data-quiz-action="add">
            <span data-quiz-add-label>В корзину</span><span class="quiz__sr-only">: ${name}</span>
          </button>
          <button class="quiz-result__details" type="button" data-quiz-action="details">
            Подробнее<span class="quiz__sr-only"> о товаре «${name}»</span>
          </button>
        </div>
      </li>
    `;
  }

  async function buildResults() {
    const screen = document.createElement('div');
    screen.className = 'quiz__screen quiz__screen--results';

    let picks = [];
    try {
      picks = pickTop(await Catalog.load(), state.answers, 3);
    } catch (error) {
      console.error(error);
    }
    state.results = picks.map((pick) => pick.product);

    const summary = QUESTIONS
      .map((q) => optionOf(q, state.answers[q.key]))
      .filter(Boolean)
      .map((opt) => opt.chip)
      .join(' · ');

    const finish = `
      <div class="quiz__finish">
        <button class="btn btn--outline" type="button" data-quiz-restart>Пройти заново</button>
        <a class="quiz__to-catalog" href="#catalog">Смотреть весь каталог</a>
      </div>`;

    if (!picks.length) {
      screen.innerHTML = `
        <div class="quiz__result-head">
          <h3 class="quiz__title" tabindex="-1" data-quiz-heading>Не удалось загрузить каталог</h3>
          <p class="quiz__summary">Обновите страницу и попробуйте ещё раз.</p>
        </div>
        ${finish}`;
      return screen;
    }

    screen.innerHTML = `
      <div class="quiz__result-head">
        ${BLOOM_SVG}
        <h3 class="quiz__title" tabindex="-1" data-quiz-heading>Ваш букет распустился</h3>
        <p class="quiz__summary">${esc(summary)}</p>
      </div>
      <ul class="quiz__results">
        ${picks.map(resultCard).join('')}
      </ul>
      ${finish}
    `;

    if (typeof attachImageFallback === 'function') {
      screen.querySelectorAll('img').forEach(attachImageFallback);
    }
    return screen;
  }

  // ---------- Переходы ----------

  function updateChrome() {
    const done = state.step >= QUESTIONS.length;
    refs.back.hidden = state.step === 0;
    refs.backLabel.textContent = done ? 'Изменить ответы' : 'Назад';
    refs.stepLabel.textContent = done ? 'Готово' : `${state.step + 1} / ${QUESTIONS.length}`;
    refs.petals.forEach((petal, index) => {
      petal.classList.toggle('is-done', index < state.step);
      petal.classList.toggle('is-current', index === state.step);
    });
    root.classList.toggle('quiz--done', done);
  }

  // Ждём конца CSS-анимации; таймер — страховка, если событие не придёт
  function animationDone(el, timeout) {
    return new Promise((resolve) => {
      const finish = (event) => {
        if (event && event.target !== el) return;
        el.removeEventListener('animationend', finish);
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(finish, timeout);
      el.addEventListener('animationend', finish);
    });
  }

  // Плавная смена высоты карточки, когда вопрос сменяется результатами
  let heightToken = 0;
  function smoothHeight(fromHeight) {
    const el = refs.viewport;
    const toHeight = el.offsetHeight;
    if (reduceMotion.matches || Math.abs(toHeight - fromHeight) < 4) return;

    const token = ++heightToken;
    el.style.height = `${fromHeight}px`;
    el.classList.add('is-resizing');
    void el.offsetHeight; // фиксируем стартовую высоту перед переходом
    el.style.height = `${toHeight}px`;

    const finish = (event) => {
      if (event && (event.target !== el || event.propertyName !== 'height')) return;
      el.removeEventListener('transitionend', finish);
      if (token !== heightToken) return;
      el.classList.remove('is-resizing');
      el.style.height = '';
    };
    el.addEventListener('transitionend', finish);
    setTimeout(finish, 700);
  }

  // Фокус на заголовок нового шага: скринридер прочитает вопрос,
  // а на телефоне карточка подтянется, если её верх ушёл под шапку
  function focusHeading(screen) {
    const heading = screen.querySelector('[data-quiz-heading]');
    if (!heading) return;
    heading.focus({ preventScroll: true });

    const offset = (document.querySelector('.header')?.offsetHeight || 0) + 16;
    const top = root.getBoundingClientRect().top;
    if (top < offset) {
      window.scrollTo({
        top: window.scrollY + top - offset,
        behavior: reduceMotion.matches ? 'auto' : 'smooth',
      });
    }
  }

  async function go(step, direction) {
    if (state.busy) return;
    state.busy = true;
    root.dataset.dir = direction;

    try {
      const current = refs.viewport.firstElementChild;
      const fromHeight = refs.viewport.offsetHeight;

      if (current && !reduceMotion.matches) {
        current.classList.add('is-leaving');
        await animationDone(current, 350);
      }

      state.step = step;
      const screen = step < QUESTIONS.length ? buildQuestion(step) : await buildResults();
      refs.viewport.replaceChildren(screen);
      updateChrome();
      smoothHeight(fromHeight);
      focusHeading(screen);
    } finally {
      state.busy = false;
    }
  }

  function choose(button) {
    if (state.busy) return;
    const question = QUESTIONS[state.step];
    state.answers[question.key] = button.dataset.quizValue;

    const screen = button.closest('.quiz__screen');
    screen.querySelectorAll('[data-quiz-value]').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn === button));
    });
    screen.classList.add('is-chosen');

    // Короткая пауза, чтобы выбор успел «отметиться» галочкой
    state.busy = true;
    setTimeout(() => {
      state.busy = false;
      go(state.step + 1, 'forward');
    }, reduceMotion.matches ? 0 : 320);
  }

  // ---------- Действия с товарами ----------

  const addTimers = new WeakMap();

  function addToCart(product, button) {
    if (typeof CartStore === 'undefined') return;
    const notify = (message) => {
      if (typeof showToast === 'function') showToast(message);
    };

    if (CartStore.add(product) === 0) {
      notify(`В корзине уже максимум — ${CartStore.MAX_QTY} шт.`);
      return;
    }
    notify('Товар добавлен в корзину');

    const label = button.querySelector('[data-quiz-add-label]');
    label.textContent = '✓ Добавлено';
    button.classList.add('quiz-result__add--done');
    clearTimeout(addTimers.get(button));
    addTimers.set(button, setTimeout(() => {
      label.textContent = 'В корзину';
      button.classList.remove('quiz-result__add--done');
    }, 1500));
  }

  function showDetails(product, trigger) {
    if (typeof openModal !== 'function') return;
    // Клик по фото: фокус переводим на «Подробнее», чтобы модалка вернула его туда
    if (trigger.classList.contains('quiz-result__media')) {
      trigger.closest('.quiz-result')?.querySelector('.quiz-result__details')?.focus({ preventScroll: true });
    }
    openModal(product);
  }

  root.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    const option = target.closest('[data-quiz-value]');
    if (option) {
      choose(option);
      return;
    }

    if (target.closest('[data-quiz-back]')) {
      go(Math.max(0, state.step - 1), 'back');
      return;
    }

    if (target.closest('[data-quiz-restart]')) {
      if (state.busy) return;
      state.answers = {};
      go(0, 'back');
      return;
    }

    const action = target.closest('[data-quiz-action]');
    if (action) {
      const id = Number(action.closest('[data-quiz-id]')?.dataset.quizId);
      const product = state.results.find((item) => item.id === id);
      if (!product) return;
      if (action.dataset.quizAction === 'add') addToCart(product, action);
      else showDetails(product, action);
    }
  });

  // ---------- Старт ----------

  refs.viewport.append(buildQuestion(0));
  updateChrome();

  // Первая анимация стартует, когда блок появится на экране
  if (!reduceMotion.matches && 'IntersectionObserver' in window) {
    root.classList.add('quiz--waiting');
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      root.classList.remove('quiz--waiting');
      observer.disconnect();
    }, { threshold: 0.2 });
    observer.observe(root);
  }
})();
