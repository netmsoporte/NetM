// Página de proyectos: las portadas se reparten desordenadas por una banda horizontal que avanza
// hacia la derecha con el scroll; cada portada se genera (aparece) justo cuando entra en pantalla.
(function () {
  const NetM = window.NetM;
  const { $, $$, EASE_OUT, t } = NetM;
  const LAYOUT_SEED = 2026;
  const COVER_RATIO = 0.625;
  const CARD_CHROME = 118;
  const TIPOS = { comercios: t('proj.type.comercios'), eventos: t('proj.type.eventos'), estudio: t('proj.type.estudio') };
  const ENTRADAS = { comercios: t('proj.entry.comercios'), eventos: t('proj.entry.eventos') };
  const MOCK_GRADIENTS = [
    ['#3b5bff', '#63e6d9'], ['#7d90ff', '#3b5bff'], ['#63e6d9', '#3b5bff'], ['#3b5bff', '#a97bff']
  ];

  // Generador pseudoaleatorio con semilla: el desorden es el mismo en cada visita.
  function createRandom(seed) {
    let state = seed >>> 0;
    return () => {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function entryFromHash() {
    const key = location.hash.replace('#', '');
    return ENTRADAS[key] ? key : '';
  }

  // Webs reales primero (las de la puerta por la que se ha entrado, delante) y huecos libres intercalados.
  function buildItems(entry) {
    const projects = (NetM.PROYECTOS || []).slice().sort((a, b) => Number(b.tipo === entry) - Number(a.tipo === entry));
    const freeSlots = Array.from({ length: NetM.HUECOS_LIBRES || 0 }, (_, index) => ({
      isFree: true,
      tipo: index % 2 === (entry === 'eventos' ? 0 : 1) ? 'eventos' : 'comercios'
    }));
    const items = [];
    const longest = Math.max(projects.length, freeSlots.length);
    for (let i = 0; i < longest; i += 1) {
      if (projects[i]) items.push(projects[i]);
      if (freeSlots[i]) items.push(freeSlots[i]);
    }
    return items;
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  // Portada provisional: una maqueta de web dibujada con los colores de NetM.
  function buildMockCover(item, index) {
    const [from, to] = MOCK_GRADIENTS[index % MOCK_GRADIENTS.length];
    const mock = el('div', item.isFree ? 'cover-mock is-free' : 'cover-mock');
    mock.style.setProperty('--from', from);
    mock.style.setProperty('--to', to);
    if (item.isFree) {
      mock.append(el('span', 'cover-plus', '+'), el('span', 'label cover-free-text', t('proj.free')));
      return mock;
    }
    mock.append(el('span', 'cover-mock-title', item.titulo), el('span', 'cover-mock-line'), el('span', 'cover-mock-line is-short'), el('span', 'cover-mock-button'));
    return mock;
  }

  function buildCard(item, index) {
    const slot = el('div', 'cover-slot');
    const card = el('a', 'cover glass');
    card.href = item.isFree ? 'index.html#contacto' : item.url;
    if (!item.isFree && /^https?:/.test(item.url)) {
      card.target = '_blank';
      card.rel = 'noopener';
    }

    const bar = el('div', 'cover-bar');
    bar.setAttribute('aria-hidden', 'true');
    bar.append(el('i'), el('i'), el('i'), el('span', 'cover-url', item.isFree ? t('proj.freeUrl') : item.url.replace(/^https?:\/\//, '')));

    const media = el('div', 'cover-media');
    if (item.portada) {
      const image = el('img');
      image.src = item.portada;
      image.alt = t('proj.coverAlt', { name: item.titulo });
      image.loading = 'lazy';
      image.decoding = 'async';
      image.width = 1600;
      image.height = 1000;
      media.append(image);
    } else {
      media.append(buildMockCover(item, index));
    }

    const caption = el('div', 'cover-caption');
    const title = el('h3', 'font-display text-2xl font-black leading-tight', item.isFree ? t('proj.freeTitle') : item.titulo);
    const meta = el('p', 'label mt-1.5 text-faint', item.isFree ? `${TIPOS[item.tipo]} · ${t('proj.freeMeta')}` : `${TIPOS[item.tipo] || item.tipo} · ${item.anio}`);
    caption.append(title, meta);
    const descripcion = NetM.localized(item, 'descripcion');
    if (descripcion) caption.append(el('p', 'mt-2 text-sm leading-snug text-mute', descripcion));

    card.append(bar, media, caption);
    slot.append(card);
    return slot;
  }

  // Reparte las portadas en dos bandas (arriba y abajo) con tamaños, giros y huecos distintos.
  function layoutScatter(scatter, slots) {
    const random = createRandom(LAYOUT_SEED);
    const top = 96;
    const bottom = innerHeight - 64;
    let x = Math.min(innerWidth * 0.06, 60);
    let lastWidth = 0;
    slots.forEach((slot, index) => {
      const width = Math.min(Math.max(innerWidth * (0.2 + random() * 0.11), 230), innerWidth * 0.78, 500);
      const height = width * COVER_RATIO + CARD_CHROME;
      const room = Math.max(bottom - top - height, 0);
      const band = index % 2 === 0 ? random() * 0.4 : 0.6 + random() * 0.4;
      slot.style.width = `${width}px`;
      slot.style.left = `${x}px`;
      slot.style.top = `${top + room * band}px`;
      slot.dataset.rotate = ((random() - 0.5) * 7).toFixed(2);
      slot.dataset.depth = (0.78 + random() * 0.44).toFixed(2);
      x += width * (0.74 + random() * 0.34);
      lastWidth = width;
    });
    scatter.style.width = `${x + lastWidth * 0.5}px`;
  }

  function initHorizontalScroll(section, track, slots) {
    const distance = () => Math.max(track.scrollWidth - innerWidth, 0);
    const progressBar = $('#scroll-progress');
    const trackTween = gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        pin: true,
        scrub: 0.8,
        end: () => `+=${distance()}`,
        invalidateOnRefresh: true,
        onUpdate: (self) => gsap.set(progressBar, { scaleX: self.progress })
      }
    });

    slots.forEach((slot) => {
      const card = slot.querySelector('.cover');
      const rotate = Number(slot.dataset.rotate);
      const depth = Number(slot.dataset.depth);
      gsap.set(card, { rotate });
      // Aparición: la portada se "genera" al entrar por la derecha y se deshace si se vuelve atrás.
      gsap.fromTo(card,
        { autoAlpha: 0, scale: 0.55, y: 70, rotate: rotate * 4 + (depth > 1 ? 12 : -12), filter: 'blur(14px)' },
        {
          autoAlpha: 1, scale: 1, y: 0, rotate, filter: 'blur(0px)', duration: 1.1, ease: EASE_OUT,
          scrollTrigger: { trigger: slot, containerAnimation: trackTween, start: 'left 96%', toggleActions: 'play none none reverse' }
        });
      // Profundidad: las portadas "cercanas" se mueven más deprisa que las lejanas.
      gsap.fromTo(slot, { x: () => (depth - 1) * innerWidth * 0.35 }, {
        x: () => (1 - depth) * innerWidth * 0.35,
        ease: 'none',
        scrollTrigger: { trigger: slot, containerAnimation: trackTween, start: 'left right', end: 'right left', scrub: true, invalidateOnRefresh: true }
      });
    });

    gsap.from('.intro-fx', { autoAlpha: 0, y: 24, duration: 1, stagger: 0.08, ease: EASE_OUT, delay: 0.5 });
    const scatter = $('#scatter');
    ScrollTrigger.addEventListener('refreshInit', () => layoutScatter(scatter, slots));
  }

  function init() {
    const entry = entryFromHash();
    if (entry) $('#entry-label').textContent = t('proj.entered', { name: ENTRADAS[entry] });
    const scatter = $('#scatter');
    const slots = buildItems(entry).map(buildCard);
    scatter.append(...slots);
    layoutScatter(scatter, slots);

    NetM.initInterface();
    NetM.playArrival();
    const section = $('#galeria');
    if (NetM.hasGsap() && !NetM.prefersReducedMotion) {
      initHorizontalScroll(section, $('#track'), slots);
    } else {
      // Sin animación: la banda se recorre con su propia barra de desplazamiento horizontal.
      section.classList.add('is-static');
      addEventListener('resize', () => layoutScatter(scatter, slots));
    }
  }

  init();
})();
