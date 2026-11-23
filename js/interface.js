// Interfaz compartida por todas las páginas: letras que reaccionan al cursor, círculo que lo sigue,
// brillo de fondo, tarjetas con inclinación 3D y la transición de "meterse dentro" de una tarjeta.
(function () {
  const NetM = (window.NetM = window.NetM || {});
  const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const EASE_OUT = 'power4.out';
  const CURSOR_STRETCH = 0.00016;
  const CURSOR_MAX_STRETCH = 0.32;
  const DIVE_STORAGE_KEY = 'netm-dive';
  const DIVE_SECONDS = 1.05;

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const hasGsap = () => Boolean(window.gsap && window.ScrollTrigger);

  function setYear() {
    const year = $('#year');
    if (year) year.textContent = new Date().getFullYear();
  }

  function initTiltCards() {
    $$('.tilt-card').forEach((card) => {
      gsap.set(card, { transformPerspective: 1100 });
      card.addEventListener('pointermove', (event) => {
        const rect = card.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width;
        const py = (event.clientY - rect.top) / rect.height;
        card.style.setProperty('--mx', `${px * 100}%`);
        card.style.setProperty('--my', `${py * 100}%`);
        gsap.to(card, { rotateY: (px - 0.5) * 9, rotateX: (0.5 - py) * 9, duration: 0.6, ease: 'power3.out', overwrite: 'auto' });
      });
      card.addEventListener('pointerleave', () => {
        gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.9, ease: EASE_OUT, overwrite: 'auto' });
      });
    });
  }

  function splitTextNode(node) {
    const fragment = document.createDocumentFragment();
    node.textContent.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) return fragment.append(' ');
      const word = document.createElement('span');
      word.className = 'word';
      word.setAttribute('aria-hidden', 'true');
      Array.from(part).forEach((character) => {
        const char = document.createElement('span');
        char.className = 'char';
        char.textContent = character;
        word.append(char);
      });
      fragment.append(word);
    });
    node.replaceWith(fragment);
  }

  function splitHeading(heading) {
    const label = heading.textContent.replace(/\s+/g, ' ').trim();
    const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    textNodes.filter((node) => node.textContent.trim()).forEach(splitTextNode);
    const screenReaderText = document.createElement('span');
    screenReaderText.className = 'sr-only';
    screenReaderText.textContent = label;
    heading.append(screenReaderText);
    heading.classList.add('split-text');
  }

  // Reparte el degradado del texto líquido entre sus letras, ya que cada una se mueve por separado.
  function paintLiquidChars() {
    const stops = [[99, 230, 217], [79, 107, 255], [169, 123, 255]];
    $$('.liquid-text').forEach((element) => {
      const chars = element.querySelectorAll('.char');
      if (!chars.length) return;
      chars.forEach((char, index) => {
        const position = (index / Math.max(chars.length - 1, 1)) * (stops.length - 1);
        const base = Math.min(Math.floor(position), stops.length - 2);
        const t = position - base;
        const color = stops[base].map((value, channel) => Math.round(value + (stops[base + 1][channel] - value) * t));
        char.style.setProperty('--char-color', `rgb(${color.join(',')})`);
      });
      element.classList.add('is-split');
    });
  }

  // Las letras cercanas al cursor se apartan, giran y se encienden en el azul del logo.
  function initLetterHover() {
    const headings = $$('h1, h2, h3, dt').filter((heading) => !heading.closest('[data-no-split]'));
    headings.forEach(splitHeading);
    paintLiquidChars();
    const groups = headings.map((heading) => ({
      heading,
      fontSize: parseFloat(getComputedStyle(heading).fontSize),
      isMeasured: false,
      chars: Array.from(heading.querySelectorAll('.char')).map((el) => ({ el, x: 0, y: 0, r: 0, heat: 0 }))
    }));
    const pointer = { x: -9999, y: -9999 };
    let running = false;
    let previous = 0;

    const measureGroup = (group) => {
      group.fontSize = parseFloat(getComputedStyle(group.heading).fontSize);
      group.chars.forEach((char) => {
        char.centerX = char.el.offsetLeft + char.el.offsetWidth / 2;
        char.centerY = char.el.offsetTop + char.el.offsetHeight / 2;
      });
      group.isMeasured = true;
    };
    const invalidateMeasures = () => groups.forEach((group) => { group.isMeasured = false; });
    addEventListener('resize', invalidateMeasures);
    if (document.fonts) document.fonts.ready.then(invalidateMeasures);

    const updateGroup = (group, follow) => {
      const rect = group.heading.getBoundingClientRect();
      if (rect.bottom < -80 || rect.top > innerHeight + 80 || rect.right < -80 || rect.left > innerWidth + 80) return false;
      if (!group.isMeasured) measureGroup(group);
      const radius = Math.max(group.fontSize * 1.25, 70);
      const isNear = pointer.x > rect.left - radius && pointer.x < rect.right + radius
        && pointer.y > rect.top - radius && pointer.y < rect.bottom + radius;
      let isActive = false;
      group.chars.forEach((char) => {
        let targetX = 0;
        let targetY = 0;
        let targetR = 0;
        let targetHeat = 0;
        if (isNear) {
          const dx = rect.left + char.centerX - pointer.x;
          const dy = rect.top + char.centerY - pointer.y;
          const distance = Math.hypot(dx, dy) || 1;
          const force = Math.max(1 - distance / radius, 0) ** 2;
          targetX = (dx / distance) * force * group.fontSize * 0.16;
          targetY = (dy / distance) * force * group.fontSize * 0.16 - force * group.fontSize * 0.08;
          targetR = force * Math.sign(dx) * 9;
          targetHeat = Math.min(force * 1.6, 1);
        }
        char.x += (targetX - char.x) * follow;
        char.y += (targetY - char.y) * follow;
        char.r += (targetR - char.r) * follow;
        char.heat += (targetHeat - char.heat) * follow;
        if (Math.abs(char.heat) < 0.002 && !targetHeat) {
          if (char.heat !== 0) {
            char.x = 0; char.y = 0; char.r = 0; char.heat = 0;
            char.el.style.removeProperty('transform');
            char.el.style.removeProperty('--heat');
          }
          return;
        }
        isActive = true;
        if (Math.abs(targetX - char.x) < 0.01 && Math.abs(targetY - char.y) < 0.01 && Math.abs(targetHeat - char.heat) < 0.002) return;
        char.el.style.transform = `translate(${char.x.toFixed(2)}px,${char.y.toFixed(2)}px) rotate(${char.r.toFixed(2)}deg) scale(${(1 + char.heat * 0.1).toFixed(3)})`;
        char.el.style.setProperty('--heat', char.heat.toFixed(3));
      });
      return isActive;
    };

    const tick = (now) => {
      const dt = Math.min(Math.max((now - previous) / 1000, 0.001), 0.05);
      previous = now;
      const follow = 1 - Math.exp(-dt * 14);
      const isActive = groups.map((group) => updateGroup(group, follow)).some(Boolean);
      if (isActive || pointer.x > -9000) {
        requestAnimationFrame(tick);
      } else {
        running = false;
      }
    };
    const wake = () => {
      if (running) return;
      running = true;
      previous = performance.now();
      requestAnimationFrame(tick);
    };
    addEventListener('pointermove', (event) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      wake();
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => { pointer.x = -9999; pointer.y = -9999; });
  }

  function openHeroLines() {
    $$('.line').forEach((line) => line.classList.add('is-open'));
  }

  // Círculo que sigue al ratón con retardo y se estira con la velocidad. El puntero normal se mantiene.
  function initCursorCircle() {
    const circle = $('#cursor-circle');
    if (!circle) return;
    const target = { x: 0, y: 0 };
    const position = { x: 0, y: 0 };
    let isVisible = false;
    let size = 1;
    let targetSize = 1;
    let previous = performance.now();

    const tick = (now) => {
      const dt = Math.min(Math.max((now - previous) / 1000, 0.001), 0.05);
      previous = now;
      const follow = 1 - Math.exp(-dt * 11);
      const stepX = (target.x - position.x) * follow;
      const stepY = (target.y - position.y) * follow;
      position.x += stepX;
      position.y += stepY;
      size += (targetSize - size) * (1 - Math.exp(-dt * 9));
      const stretch = Math.min(Math.hypot(stepX, stepY) / dt * CURSOR_STRETCH, CURSOR_MAX_STRETCH);
      const angle = Math.atan2(stepY, stepX);
      circle.style.transform = `translate(${position.x.toFixed(1)}px, ${position.y.toFixed(1)}px) rotate(${angle.toFixed(3)}rad) scale(${(size * (1 + stretch)).toFixed(3)}, ${(size * (1 - stretch * 0.55)).toFixed(3)})`;
      requestAnimationFrame(tick);
    };

    addEventListener('pointermove', (event) => {
      target.x = event.clientX;
      target.y = event.clientY;
      if (!isVisible) {
        isVisible = true;
        position.x = target.x;
        position.y = target.y;
        previous = performance.now();
        requestAnimationFrame(tick);
      }
      circle.style.opacity = '1';
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => { circle.style.opacity = '0'; });
    addEventListener('pointerover', (event) => {
      const element = event.target instanceof Element ? event.target : null;
      const isField = Boolean(element && element.closest('input, textarea'));
      const isLink = Boolean(element && element.closest('a, button, label'));
      targetSize = isField ? 0.35 : isLink ? 1.7 : 1;
      circle.classList.toggle('is-over-link', isLink || isField);
    }, { passive: true });
  }

  function initPointerGlow() {
    const glow = $('#pointer-glow');
    if (!glow || !canHover || prefersReducedMotion) return;
    addEventListener('pointermove', (event) => {
      glow.style.opacity = '1';
      glow.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`;
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => { glow.style.opacity = '0'; });
  }

  // ── Transición entre páginas ──────────────────────────────────────────────
  function readDive() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(DIVE_STORAGE_KEY) || 'null');
      sessionStorage.removeItem(DIVE_STORAGE_KEY);
      return saved;
    } catch (error) {
      return null;
    }
  }

  function saveDive(title) {
    try {
      sessionStorage.setItem(DIVE_STORAGE_KEY, JSON.stringify({ title, at: Date.now() }));
    } catch (error) {
      // Sin almacenamiento la página de destino simplemente aparece sin el velo de llegada.
    }
  }

  function setVeilInset(veil, rect, radius) {
    veil.style.setProperty('--t', `${rect.top}px`);
    veil.style.setProperty('--r', `${innerWidth - rect.right}px`);
    veil.style.setProperty('--b', `${innerHeight - rect.bottom}px`);
    veil.style.setProperty('--l', `${rect.left}px`);
    veil.style.setProperty('--radius', `${radius}px`);
  }

  // El velo nace con la forma de la tarjeta pulsada y crece hasta tapar la pantalla; entonces se navega.
  function diveInto(card, url, title, onStart) {
    const veil = $('#dive-veil');
    if (!veil || !hasGsap() || prefersReducedMotion) {
      location.href = url;
      return;
    }
    const rect = card.getBoundingClientRect();
    const veilTitle = veil.querySelector('.dive-veil-title');
    if (veilTitle) veilTitle.textContent = title;
    setVeilInset(veil, rect, 2);
    veil.classList.add('is-active');
    if (onStart) onStart();
    const inset = { t: rect.top, r: innerWidth - rect.right, b: innerHeight - rect.bottom, l: rect.left, radius: 2 };
    gsap.timeline({ onComplete: () => { saveDive(title); location.href = url; } })
      .to(card, { scale: 1.06, duration: DIVE_SECONDS, ease: 'power3.inOut' }, 0)
      .to(inset, {
        t: 0, r: 0, b: 0, l: 0, radius: 0, duration: DIVE_SECONDS, ease: 'expo.inOut',
        onUpdate: () => setVeilInset(veil, { top: inset.t, right: innerWidth - inset.r, bottom: innerHeight - inset.b, left: inset.l }, inset.radius)
      }, 0)
      .fromTo(veilTitle, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.6, ease: EASE_OUT }, DIVE_SECONDS * 0.55);
  }

  // En la página de destino el velo empieza a pantalla completa y se abre desde el centro.
  function playArrival() {
    const veil = $('#dive-veil');
    const saved = readDive();
    document.documentElement.classList.remove('is-arriving');
    if (!veil || !saved || !hasGsap() || prefersReducedMotion) return false;
    const veilTitle = veil.querySelector('.dive-veil-title');
    if (veilTitle) {
      veilTitle.textContent = saved.title || '';
      veilTitle.style.opacity = '1';
    }
    veil.classList.add('is-active');
    const inset = { y: 0, x: 0 };
    gsap.timeline({ onComplete: () => veil.classList.remove('is-active') })
      .to(veilTitle, { opacity: 0, y: -30, duration: 0.55, ease: 'power2.in' }, 0.15)
      .to(inset, {
        y: innerHeight / 2, x: innerWidth / 2, duration: 1, ease: 'expo.inOut',
        onUpdate: () => setVeilInset(veil, { top: inset.y, right: innerWidth - inset.x, bottom: innerHeight - inset.y, left: inset.x }, 0)
      }, 0.35);
    return true;
  }

  // Al volver con el botón "atrás", el navegador puede restaurar la página con el velo aún puesto.
  addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    const veil = $('#dive-veil');
    if (veil) veil.classList.remove('is-active');
    $$('[data-dive]').forEach((card) => { card.style.transform = ''; });
    if (NetM.onRestore) NetM.onRestore();
  });

  function initInterface() {
    setYear();
    if (canHover && !prefersReducedMotion) {
      initLetterHover();
      initCursorCircle();
    }
    initPointerGlow();
    if (!hasGsap() || prefersReducedMotion) openHeroLines();
    if (hasGsap()) gsap.registerPlugin(ScrollTrigger);
    if (hasGsap() && !prefersReducedMotion && canHover) initTiltCards();
    document.documentElement.classList.remove('pre-intro');
  }

  Object.assign(NetM, {
    $, $$, prefersReducedMotion, canHover, EASE_OUT, hasGsap,
    initInterface, openHeroLines, diveInto, playArrival
  });
})();
