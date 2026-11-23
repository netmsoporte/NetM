// Ventanas emergentes de la portada (contacto, aviso de envío y comentarios): se abren grandes en el
// centro de la pantalla, guardan el foco dentro mientras están abiertas y se cierran con Escape,
// con el fondo o con cualquier elemento [data-dialog-close].
//
// Marcado: <div class="dialog" hidden> <div class="dialog-backdrop" data-dialog-close></div>
//          <div class="dialog-panel glass" role="dialog" aria-modal="true"> … </div> </div>
(function () {
  const NetM = (window.NetM = window.NetM || {});
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled])';
  const openDialogs = [];

  const animates = () => NetM.hasGsap() && !NetM.prefersReducedMotion;
  const isVisible = (element) => element.offsetParent !== null || element === document.activeElement;

  function trapFocus(element, event) {
    const items = Array.from(element.querySelectorAll(FOCUSABLE)).filter(isVisible);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function createDialog(element) {
    const panel = element.querySelector('.dialog-panel');
    const backdrop = element.querySelector('.dialog-backdrop');
    let returnFocus = null;
    const api = { element, isOpen: () => !element.hidden };

    api.open = (focusTarget) => {
      if (api.isOpen()) return;
      returnFocus = document.activeElement;
      element.hidden = false;
      openDialogs.push(api);
      document.documentElement.classList.add('is-modal-open');
      if (animates()) {
        gsap.timeline({ defaults: { ease: NetM.EASE_OUT } })
          .fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.45 }, 0)
          .fromTo(panel, { opacity: 0, y: 40, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.8, clearProps: 'transform' }, 0.04)
          .fromTo(element.querySelectorAll('.dialog-fx'), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.05, clearProps: 'all' }, 0.15);
      }
      const target = focusTarget || element.querySelector('[data-autofocus]') || element.querySelector(FOCUSABLE);
      if (target) target.focus({ preventScroll: true });
    };

    // restoreFocus: false cuando se cierra para abrir otra ventana (por ejemplo, el aviso de envío).
    api.close = ({ restoreFocus = true } = {}) => new Promise((resolve) => {
      if (!api.isOpen()) return resolve();
      const finish = () => {
        element.hidden = true;
        openDialogs.splice(openDialogs.indexOf(api), 1);
        if (!openDialogs.length) document.documentElement.classList.remove('is-modal-open');
        if (restoreFocus && returnFocus && returnFocus.focus) returnFocus.focus({ preventScroll: true });
        resolve();
      };
      if (!animates()) return finish();
      gsap.timeline({ onComplete: finish })
        .to(panel, { opacity: 0, y: 20, scale: 0.97, duration: 0.28, ease: 'power2.in' }, 0)
        .to(backdrop, { opacity: 0, duration: 0.32 }, 0.04);
    });

    element.querySelectorAll('[data-dialog-close]').forEach((control) => control.addEventListener('click', () => api.close()));
    return api;
  }

  addEventListener('keydown', (event) => {
    const top = openDialogs[openDialogs.length - 1];
    if (!top) return;
    if (event.key === 'Escape') top.close();
    if (event.key === 'Tab') trapFocus(top.element, event);
  });

  NetM.createDialog = createDialog;
})();
