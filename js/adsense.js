// Selector "AdSense": al pulsar las páginas 3D de la portada cae una gota sobre ellas y se abre,
// en el centro de la pantalla, la lista de webs de NetM.ADSENSE_SITES.
(function () {
  const NetM = window.NetM;
  const { $ } = NetM;
  // Tiempo para ver la gota antes de que el selector tape la escena.
  const OPEN_DELAY_MS = 320;
  // Cada cuánto cae una gota sola sobre las páginas para invitar a pulsarlas.
  const IDLE_DROP_MS = 4200;
  // Lo que ya responde al clic por su cuenta no abre el selector.
  const INTERACTIVE = 'a, button, input, textarea, select, label, [data-dive], #adsense-menu, .dialog';
  const FOCUSABLE = 'a[href], button';

  function createSiteRow(site, index) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.className = 'adsense-site';
    link.href = site.url;
    link.target = '_blank';
    link.rel = 'noopener';

    const number = document.createElement('span');
    number.className = 'adsense-site-number label text-brandsoft';
    number.textContent = String(index + 1).padStart(2, '0');

    const text = document.createElement('span');
    text.className = 'min-w-0';
    const name = document.createElement('span');
    name.className = 'adsense-site-name block font-display font-black';
    name.textContent = site.nombre;
    const domain = document.createElement('span');
    domain.className = 'label mt-2 block text-mute';
    domain.textContent = new URL(site.url).hostname;
    text.append(name, domain);
    const descripcion = NetM.localized(site, 'descripcion');
    if (descripcion) {
      const description = document.createElement('span');
      description.className = 'mt-3 block max-w-lg leading-relaxed text-ice/75';
      description.textContent = descripcion;
      text.append(description);
    }

    const visit = document.createElement('span');
    visit.className = 'adsense-site-visit label';
    visit.append(`${NetM.t('adsense.visit')} `);
    const arrow = document.createElement('span');
    arrow.className = 'arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '↗';
    visit.append(arrow);

    link.append(number, text, visit);
    item.append(link);
    return item;
  }

  function createModal(modal) {
    const panel = modal.querySelector('.adsense-panel');
    const list = modal.querySelector('.adsense-list');
    (NetM.ADSENSE_SITES || []).forEach((site, index) => list.append(createSiteRow(site, index)));
    const animates = () => NetM.hasGsap() && !NetM.prefersReducedMotion;
    let isOpen = false;
    let returnFocus = null;

    const open = () => {
      if (isOpen) return;
      isOpen = true;
      returnFocus = document.activeElement;
      modal.hidden = false;
      document.documentElement.classList.add('is-modal-open');
      if (animates()) {
        gsap.timeline({ defaults: { ease: NetM.EASE_OUT } })
          .fromTo(modal.querySelector('.adsense-backdrop'), { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0)
          .fromTo(panel, { opacity: 0, y: 40, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.9 }, 0.05)
          .fromTo(modal.querySelector('.adsense-rings'), { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.6, ease: 'expo.out' }, 0.05)
          .fromTo(modal.querySelectorAll('.adsense-fx, .adsense-site'),{ opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.06 }, 0.2);
      }
      const first = modal.querySelector('.adsense-site') || modal.querySelector('.adsense-close');
      first.focus({ preventScroll: true });
    };

    const close = () => {
      if (!isOpen) return;
      isOpen = false;
      const finish = () => {
        modal.hidden = true;
        document.documentElement.classList.remove('is-modal-open');
        if (returnFocus && returnFocus.focus) returnFocus.focus({ preventScroll: true });
      };
      if (animates()) {
        gsap.timeline({ onComplete: finish })
          .to(panel, { opacity: 0, y: 20, scale: 0.97, duration: 0.3, ease: 'power2.in' }, 0)
          .to(modal.querySelector('.adsense-backdrop'), { opacity: 0, duration: 0.35 }, 0.05);
      } else {
        finish();
      }
    };

    // El foco no sale del selector mientras está abierto.
    const trapFocus = (event) => {
      const items = Array.from(modal.querySelectorAll(FOCUSABLE));
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    modal.querySelectorAll('[data-adsense-close]').forEach((element) => element.addEventListener('click', close));
    addEventListener('keydown', (event) => {
      if (!isOpen) return;
      if (event.key === 'Escape') close();
      if (event.key === 'Tab') trapFocus(event);
    });
    return { open, isOpen: () => isOpen };
  }

  // Aviso "Pulsa" sobre la página delantera y gotas que caen solas hasta que se usa el selector.
  function initInvitation(modal) {
    const hint = $('#pages-hint');
    let wasUsed = false;
    const dismiss = () => {
      wasUsed = true;
      if (hint) hint.classList.add('is-dismissed');
    };
    if (!NetM.prefersReducedMotion) {
      setInterval(() => {
        const isHeroVisible = scrollY < innerHeight * 0.3;
        if (!wasUsed && isHeroVisible && !modal.isOpen() && !document.hidden && NetM.sceneDropRandom) NetM.sceneDropRandom();
      }, IDLE_DROP_MS);
    }
    return dismiss;
  }

  function initAdsenseMenu() {
    const element = $('#adsense-menu');
    if (!element) return;
    const modal = createModal(element);
    const dismissHint = initInvitation(modal);

    const isOverPages = (event) => {
      if (!NetM.scenePagesAt || modal.isOpen()) return false;
      const target = event.target instanceof Element ? event.target : null;
      return !(target && target.closest(INTERACTIVE)) && NetM.scenePagesAt(event.clientX, event.clientY);
    };

    addEventListener('click', (event) => {
      if (event.button !== 0 || !isOverPages(event)) return;
      NetM.sceneDropAt(event.clientX, event.clientY, 1);
      dismissHint();
      setTimeout(modal.open, NetM.prefersReducedMotion ? 0 : OPEN_DELAY_MS);
    });

    // Al entrar en las páginas con el ratón cae una gota pequeña y aparece la mano.
    let pending = null;
    let wasOver = false;
    addEventListener('pointermove', (event) => {
      if (pending || event.pointerType !== 'mouse') return;
      pending = requestAnimationFrame(() => {
        pending = null;
        const isOver = isOverPages(event);
        if (isOver && !wasOver) NetM.sceneDropAt(event.clientX, event.clientY, 0.45);
        wasOver = isOver;
        document.body.classList.toggle('is-over-pages', isOver);
      });
    }, { passive: true });
  }

  NetM.initAdsenseMenu = initAdsenseMenu;
})();
