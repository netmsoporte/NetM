// Idiomas de la web: español (el texto que ya está escrito en el HTML), inglés y euskera.
// Los textos de cada idioma están en js/lang/<idioma>.js, que se cargan justo antes de este archivo.
//
// Cómo se marca un texto traducible en el HTML:
//   data-i18n="clave"            cambia el texto del elemento.
//   data-i18n-html="clave"       cambia el contenido cuando lleva etiquetas propias (flechas, cursivas...).
//   data-i18n-attr="attr:clave"  cambia atributos; varios se separan con ";".
//   data-lang-block="es|en|eu"   bloque largo (páginas legales) que solo se ve en su idioma.
// Los scripts piden sus textos con NetM.t('clave') o NetM.t('clave', { n: 3 }).
//
// Se carga sin defer al final del <body>: traduce antes de que la página se pinte y antes de que
// interface.js trocee los titulares en letras. Por eso cambiar de idioma recarga la página.
// ?lang=en o ?lang=eu en la dirección abre directamente ese idioma (sirve para compartirlo).
(function () {
  const NetM = (window.NetM = window.NetM || {});
  const STORAGE_KEY = 'netm-lang';
  const DEFAULT_LANG = 'es';
  const LANGS = ['es', 'en', 'eu'];
  const LOCALES = { es: 'es-ES', en: 'en-GB', eu: 'eu-ES' };
  // Sufijo de los campos traducidos en los archivos de datos (descripcionEn, descripcionEu...).
  const FIELD_SUFFIX = { es: '', en: 'En', eu: 'Eu' };
  const DATA = NetM.LANG_DATA || {};

  function storeLang(value) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
      return true;
    } catch (error) {
      return false;
    }
  }

  function readStoredLang() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      return null;
    }
  }

  function detectLang() {
    const requested = new URLSearchParams(location.search).get('lang');
    if (LANGS.includes(requested)) {
      storeLang(requested);
      return requested;
    }
    const stored = readStoredLang();
    if (LANGS.includes(stored)) return stored;
    const browser = ((navigator.languages && navigator.languages[0]) || navigator.language || DEFAULT_LANG).toLowerCase();
    return LANGS.find((code) => browser.startsWith(code)) || DEFAULT_LANG;
  }

  const lang = detectLang();
  const scriptStrings = (code) => (DATA[code] && DATA[code].script) || {};
  const pageStrings = (DATA[lang] && DATA[lang].page) || {};

  function t(key, vars) {
    const text = scriptStrings(lang)[key] ?? scriptStrings(DEFAULT_LANG)[key] ?? key;
    if (!vars) return text;
    return text.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
  }

  // Campo de un objeto de datos en el idioma activo, con el español como respaldo.
  function localized(item, field) {
    return item[`${field}${FIELD_SUFFIX[lang]}`] || item[field];
  }

  // Dentro del bloque visible, data-anchor="id" hace que reciba las anclas de los enlaces (#privacidad...).
  function showLangBlocks() {
    document.querySelectorAll('[data-lang-block]').forEach((block) => {
      block.hidden = block.dataset.langBlock !== lang;
      if (block.hidden) return;
      block.querySelectorAll('[data-anchor]').forEach((element) => {
        const previous = document.getElementById(element.dataset.anchor);
        if (previous && previous !== element) previous.removeAttribute('id');
        element.id = element.dataset.anchor;
      });
    });
  }

  // Las traducciones del HTML salen de js/lang (texto fijo), nunca de lo que escriben los usuarios.
  function translatePage() {
    document.documentElement.lang = lang;
    showLangBlocks();
    if (lang === DEFAULT_LANG) return;
    document.querySelectorAll('[data-i18n]').forEach((element) => {
      const text = pageStrings[element.dataset.i18n];
      if (text != null) element.textContent = text;
    });
    document.querySelectorAll('[data-i18n-html]').forEach((element) => {
      const html = pageStrings[element.dataset.i18nHtml];
      if (html != null) element.innerHTML = html;
    });
    document.querySelectorAll('[data-i18n-attr]').forEach((element) => {
      element.dataset.i18nAttr.split(';').forEach((pair) => {
        const [attribute, key] = pair.split(':').map((part) => part.trim());
        const text = pageStrings[key];
        if (attribute && text != null) element.setAttribute(attribute, text);
      });
    });
  }

  // Al cambiar se recarga con ?lang= para que funcione también sin almacenamiento local.
  function setLang(next) {
    if (!LANGS.includes(next) || next === lang) return;
    storeLang(next);
    const url = new URL(location.href);
    url.searchParams.set('lang', next);
    location.replace(url);
  }

  function initSwitches() {
    document.querySelectorAll('[data-lang]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.lang === lang));
      button.addEventListener('click', () => setLang(button.dataset.lang));
    });
  }

  Object.assign(NetM, { lang, locale: LOCALES[lang], t, localized });
  translatePage();
  initSwitches();
})();
