// Pie de página común a todas las páginas. Se carga sin defer, justo antes de i18n.js, y se escribe
// en el lugar del propio <script>: así existe antes de que i18n.js traduzca y conecte el selector de idioma.
(function () {
  const script = document.currentScript;
  // En la portada los enlaces de sección son anclas; desde otras páginas llevan a la portada.
  const isHome = Boolean(document.getElementById('inicio'));
  const home = (hash) => (isHome ? hash : `index.html${hash}`);
  const LOGO = '<svg class="brand-mark" viewBox="150 96 212 320" aria-hidden="true"><defs><clipPath id="nm-foot"><rect x="150" y="96" width="212" height="320"/></clipPath></defs><g clip-path="url(#nm-foot)" fill="none" stroke-width="24"><path d="M362 80L256 256" stroke="#3b5bff"/><path d="M162 96V416M350 96V416M150 80L362 432" stroke="currentColor"/></g></svg>';
  const link = (href, key, text) => `<li><a class="footer-link" href="${href}" data-i18n="${key}">${text}</a></li>`;

  const html = `
  <footer class="site-footer relative z-10 border-t border-white/10">
    <div class="mx-auto max-w-[110rem] px-5 pb-8 pt-16 md:px-10 md:pt-24">
      <div class="grid gap-12 md:grid-cols-12 md:gap-8">
        <div class="md:col-span-5">
          <a href="${home('#inicio')}" class="brand text-4xl" aria-label="NetM" data-i18n-attr="aria-label:nav.home">${LOGO}<span class="brand-word">Net<b>M</b></span></a>
          <p class="mt-6 max-w-sm text-lg leading-relaxed text-ice/80" data-i18n="footer.about">Estudio de diseño y desarrollo web a medida para comercios y eventos especiales.</p>
          <a href="mailto:netmsoporte@gmail.com" class="footer-mail mt-8">
            <span class="label block text-mute" data-i18n="footer.write">Escríbenos</span>
            <span class="mt-2 inline-flex items-center gap-3 font-display text-[clamp(1.35rem,2.6vw,2rem)] font-bold">netmsoporte@gmail.com <span class="arrow text-aqua" aria-hidden="true">↗</span></span>
          </a>
        </div>

        <nav class="md:col-span-2 md:col-start-7" aria-labelledby="footer-studio">
          <p id="footer-studio" class="label mb-5 text-brandsoft" data-i18n="footer.studio">Estudio</p>
          <ul class="space-y-3">
            ${link(home('#servicios'), 'nav.services', 'Qué creamos')}
            ${link('proyectos.html', 'nav.projects', 'Proyectos')}
            ${link(home('#opiniones'), 'nav.reviews', 'Opiniones')}
            ${link(home('#nosotros'), 'nav.about', 'Quiénes somos')}
            ${link(home('#filosofia'), 'nav.philosophy', 'Filosofía')}
            ${link(home('#contacto'), 'nav.cta', 'Pide tu web')}
          </ul>
        </nav>

        <nav class="md:col-span-2" aria-labelledby="footer-legal">
          <p id="footer-legal" class="label mb-5 text-brandsoft" data-i18n="footer.legal">Legal</p>
          <ul class="space-y-3">
            ${link('legal.html#aviso-legal', 'legal.notice', 'Aviso legal')}
            ${link('legal.html#privacidad', 'legal.privacy', 'Política de privacidad')}
            ${link('legal.html#cookies', 'legal.cookies', 'Política de cookies')}
          </ul>
        </nav>

        <div class="md:col-span-2">
          <p class="label mb-5 text-brandsoft" data-i18n="lang.group">Idioma</p>
          <div class="lang-switch label" role="group" aria-label="Idioma" data-i18n-attr="aria-label:lang.group">
            <button type="button" data-lang="es" lang="es" aria-pressed="true">Español</button>
            <button type="button" data-lang="en" lang="en" aria-pressed="false">English</button>
            <button type="button" data-lang="eu" lang="eu" aria-pressed="false">Euskara</button>
          </div>
          <p class="mt-6 text-sm leading-relaxed text-mute" data-i18n="footer.noTracking">Sin cookies de publicidad ni de analítica.</p>
        </div>
      </div>

      <p class="footer-wordmark" aria-hidden="true">Net<b>M</b></p>

      <div class="flex flex-col gap-4 border-t border-white/10 pt-6 md:flex-row md:items-center md:justify-between">
        <p class="label text-mute">© <span id="year">2026</span> NetM · <span data-i18n="footer.rights">Todos los derechos reservados</span></p>
        <p class="label text-faint" data-i18n="footer.tagline">Diseño y desarrollo web</p>
        <button type="button" class="footer-top label inline-flex items-center gap-2 self-start text-mute md:self-auto" data-i18n-html="footer.top">Volver arriba <span class="arrow" aria-hidden="true">↑</span></button>
      </div>
    </div>
  </footer>`;

  script.insertAdjacentHTML('beforebegin', html);
  script.previousElementSibling.querySelector('.footer-top').addEventListener('click', () => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });
})();
