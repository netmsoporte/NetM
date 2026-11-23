// Página legal: arranca la interfaz común y marca en el índice el apartado que se está leyendo.
(function () {
  const NetM = window.NetM;
  const { $$ } = NetM;

  function initActiveIndex() {
    const links = $$('.legal-index a');
    const byId = new Map(links.map((link) => [link.hash.slice(1), link]));
    const sections = $$('.legal-section').filter((section) => byId.has(section.id) && section.offsetParent !== null);
    const observer = new IntersectionObserver((entries) => {
      entries.filter((entry) => entry.isIntersecting).forEach((entry) => {
        links.forEach((link) => link.removeAttribute('aria-current'));
        byId.get(entry.target.id).setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    sections.forEach((section) => observer.observe(section));
  }

  NetM.initInterface();
  initActiveIndex();
})();
