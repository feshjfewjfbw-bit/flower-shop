// ============================================
// Bloom & Petal — кастомный курсор-лепесток
// Подключается на index.html и cart.html
// ============================================

(() => {
  // Только десктоп с настоящей мышью: на тач-устройствах и ≤768px не включаем
  const DESKTOP_QUERY = '(min-width: 769px) and (pointer: fine) and (hover: hover)';

  const TEXT_SELECTOR = 'p, h1, h2, h3, h4, h5, h6, li, dt, dd, blockquote, figcaption, label, span, em, strong, small';
  const FIELD_SELECTOR = 'input, textarea, select, [contenteditable="true"]';

  // Кликабельные элементы: лепесток увеличивается и становится контрастнее
  const INTERACTIVE_SELECTOR = 'a, button, summary, .product-card, .filter-btn, .qty-btn, .cart, [data-close], [role="button"]';

  const PETAL_EASING = 0.16; // лепесток догоняет плавнее — ощущение «живости»
  const DOT_EASING = 0.45;   // точка почти повторяет мышь

  let petal = null;
  let dot = null;

  let enabled = false;
  let rafId = null;

  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  let petalX = targetX;
  let petalY = targetY;
  let dotX = targetX;
  let dotY = targetY;

  // ---------- Отрисовка через requestAnimationFrame ----------

  function tick() {
    petalX += (targetX - petalX) * PETAL_EASING;
    petalY += (targetY - petalY) * PETAL_EASING;
    dotX += (targetX - dotX) * DOT_EASING;
    dotY += (targetY - dotY) * DOT_EASING;

    petal.style.transform = `translate3d(${petalX.toFixed(2)}px, ${petalY.toFixed(2)}px, 0)`;
    dot.style.transform = `translate3d(${dotX.toFixed(2)}px, ${dotY.toFixed(2)}px, 0)`;

    const settled =
      Math.abs(targetX - petalX) < 0.1 && Math.abs(targetY - petalY) < 0.1 &&
      Math.abs(targetX - dotX) < 0.1 && Math.abs(targetY - dotY) < 0.1;

    // Догнали мышь — останавливаем цикл, чтобы не тратить ресурсы впустую
    rafId = settled ? null : requestAnimationFrame(tick);
  }

  function startLoop() {
    if (rafId === null) rafId = requestAnimationFrame(tick);
  }

  // ---------- Состояние курсора ----------

  function setVisible(next) {
    petal.classList.toggle('cursor-petal--visible', next);
    dot.classList.toggle('cursor-dot--visible', next);
  }

  function setActive(next) {
    petal.classList.toggle('cursor-petal--active', next);
  }

  function onMouseMove(event) {
    targetX = event.clientX;
    targetY = event.clientY;

    const el = event.target instanceof Element ? event.target : null;
    const isField = Boolean(el?.closest(FIELD_SELECTOR));
    const isInteractive = !isField && Boolean(el?.closest(INTERACTIVE_SELECTOR));
    // Над обычным текстом остаётся системный I-beam, лепесток прячется
    const isText = !isField && !isInteractive && Boolean(el?.closest(TEXT_SELECTOR));

    // Инлайн-стиль сильнее класса, поэтому '' возвращает управление CSS
    petal.style.opacity = isText || isField ? '0' : '';
    dot.style.opacity = isText || isField ? '0' : '';

    setActive(isInteractive);
    setVisible(true);

    startLoop();
  }

  function hide() {
    setVisible(false);
    setActive(false);
  }

  // Уход мыши за пределы окна: relatedTarget === null
  function onMouseOut(event) {
    if (!event.relatedTarget) hide();
  }

  // ---------- Включение / выключение ----------

  function enable() {
    if (enabled) return;
    enabled = true;

    petal = document.createElement('div');
    petal.className = 'cursor-petal';
    petal.setAttribute('aria-hidden', 'true');
    // Лепесток с прожилкой
    petal.innerHTML = `
      <svg class="cursor-petal__shape" viewBox="0 0 24 24" focusable="false">
        <path d="M12 2.5C7.4 6.5 5 10.2 5 13.6a7 7 0 0 0 14 0c0-3.4-2.4-7.1-7-11.1Z"></path>
        <path class="cursor-petal__vein" d="M12 8.5v8.6"></path>
      </svg>
    `;

    dot = document.createElement('div');
    dot.className = 'cursor-dot';
    dot.setAttribute('aria-hidden', 'true');

    document.body.append(petal, dot);
    document.documentElement.classList.add('has-custom-cursor');

    petalX = dotX = targetX;
    petalY = dotY = targetY;
    petal.style.transform = `translate3d(${petalX}px, ${petalY}px, 0)`;
    dot.style.transform = `translate3d(${dotX}px, ${dotY}px, 0)`;

    document.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('mouseout', onMouseOut);
    document.addEventListener('mouseenter', startLoop);
    window.addEventListener('blur', hide);
  }

  function disable() {
    if (!enabled) return;
    enabled = false;

    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseout', onMouseOut);
    document.removeEventListener('mouseenter', startLoop);
    window.removeEventListener('blur', hide);

    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    document.documentElement.classList.remove('has-custom-cursor');
    petal.remove();
    dot.remove();
    petal = dot = null;
  }

  const media = window.matchMedia(DESKTOP_QUERY);
  if (media.matches) enable();

  // Смена размера окна или устройства ввода — переоцениваем условия
  const onMediaChange = (event) => (event.matches ? enable() : disable());
  if (media.addEventListener) media.addEventListener('change', onMediaChange);
  else media.addListener(onMediaChange);
})();
