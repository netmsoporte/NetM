// Portada: entrada del titular, apariciones con el scroll, tarjetas que llegan desde los lados
// y el efecto de meterse dentro de una tarjeta para ir a la página de proyectos.
(function () {
  const NetM = window.NetM;
  const { $, $$, EASE_OUT } = NetM;
  const CARD_MARGIN = 80;
  const CARD_SCRUB = 0.6;

  function initIntro() {
    gsap.timeline({ defaults: { ease: EASE_OUT } })
      .from('.hero-line', { yPercent: 112, duration: 1.3, stagger: 0.12, onComplete: NetM.openHeroLines }, 0.15)
      .from('.hero-fx', { autoAlpha: 0, y: 18, duration: 0.9, stagger: 0.07, clearProps: 'all' }, 0.45);
  }

  function initReveals() {
    $$('.reveal').forEach((el) => {
      gsap.from(el, {
        opacity: 0, y: 30, duration: 0.9, ease: EASE_OUT, clearProps: 'opacity,transform',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true }
      });
    });
  }

  // Distancia hasta sacar la tarjeta entera por su lado de la pantalla (offsetLeft ignora transformaciones).
  function offscreenDistance(wrapper, direction) {
    let left = 0;
    for (let node = wrapper; node; node = node.offsetParent) left += node.offsetLeft;
    return direction < 0 ? -(left + wrapper.offsetWidth + CARD_MARGIN) : innerWidth - left + CARD_MARGIN;
  }

  // Cada tarjeta empieza fuera de la pantalla por su lado (data-slide="left" | "right") y entra
  // siguiendo al scroll: avanza solo mientras el usuario baja y retrocede si sube.
  // El scrub suaviza los saltos de la rueda del ratón, y mientras la tarjeta se mueve se apaga
  // su desenfoque de cristal, que es lo que más cuesta redibujar en cada fotograma.
  function initSlideCards() {
    $$('[data-slide]').forEach((wrapper) => {
      const direction = wrapper.dataset.slide === 'left' ? -1 : 1;
      gsap.fromTo(wrapper,
        { x: () => offscreenDistance(wrapper, direction), rotate: 9 * direction },
        {
          x: 0, rotate: 0, ease: 'none', force3D: true,
          scrollTrigger: { trigger: wrapper, start: 'top bottom', end: 'top 30%', scrub: CARD_SCRUB, invalidateOnRefresh: true },
          onUpdate() { wrapper.classList.toggle('is-sliding', this.progress() < 1); }
        });
    });
  }

  function initNavLogo() {
    const navLogo = $('#nav-logo');
    const observer = new IntersectionObserver(([entry]) => {
      navLogo.classList.toggle('opacity-0', entry.isIntersecting);
    }, { rootMargin: '-64px 0px 0px' });
    observer.observe($('#hero-logo'));
  }

  // Pulsar en cualquier punto de una tarjeta abre la página de proyectos "desde dentro" de ella.
  // El enlace de la tarjeta lleva al mismo sitio, así que también funciona con teclado y sin JavaScript.
  function initDiveCards() {
    $$('[data-dive]').forEach((card) => {
      const link = card.querySelector('.card-link');
      card.addEventListener('click', (event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
        event.preventDefault();
        gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.3, overwrite: 'auto' });
        NetM.diveInto(card, link.href, card.dataset.dive, () => { if (NetM.sceneDive) NetM.sceneDive(true); });
      });
    });
    NetM.onRestore = () => { if (NetM.sceneDive) NetM.sceneDive(false); };
  }

  NetM.initInterface();
  initNavLogo();
  initDiveCards();
  if (NetM.hasGsap() && !NetM.prefersReducedMotion) {
    initIntro();
    initReveals();
    initSlideCards();
  }
  NetM.initForm();
  NetM.initComments();
  NetM.initScene();
  NetM.initAdsenseMenu();
})();
