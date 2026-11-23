// Formulario de contacto: se abre en una ventana grande en el centro de la pantalla y cada envío llega
// por correo a NetM a través de FormSubmit (formsubmit.co), con la foto adjunta si se ha añadido una.
// Cuando FormSubmit confirma que el correo ha llegado, aparece el aviso de "petición enviada".
//
// Puesta en marcha (una sola vez):
//   1. Escribe el correo de NetM en NETM_EMAIL.
//   2. Publica la web y envía el formulario una vez: FormSubmit manda a ese correo un email
//      "Activate Form". Pulsa el botón de activar. Desde entonces cada envío llega a la bandeja.
//   3. (Opcional) En ese email de activación viene un código aleatorio: si lo pones en lugar del
//      correo, la dirección deja de verse en el código de la web.
(function () {
  const NetM = (window.NetM = window.NetM || {});
  const NETM_EMAIL = 'netmsoporte@gmail.com';
  const FORM_ENDPOINT = NETM_EMAIL ? `https://formsubmit.co/ajax/${encodeURIComponent(NETM_EMAIL)}` : '';
  const FORM_TIMEOUT_MS = 15000;
  // Con foto el envío tarda más: se sube el archivo entero.
  const FORM_TIMEOUT_PHOTO_MS = 45000;
  const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
  const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  // Al pulsar "Salir" sin una web anterior a la que volver, se lleva al visitante aquí.
  const EXIT_URL = 'https://www.google.com';
  // Los correos llegan siempre en español, sea cual sea el idioma de la web.
  const FORM_TYPES = { comercio: 'Comercio', evento: 'Evento especial' };

  function showFormStatus(message, isError = false) {
    const status = NetM.$('#form-status');
    status.textContent = message;
    status.classList.toggle('form-alert', isError);
  }

  // Acepta "ejemplo.com" y le añade https://. Devuelve '' si está vacío y null si no es válida.
  function normalizeReference(value) {
    const text = value.trim();
    if (!text) return '';
    try {
      const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
      return url.hostname.includes('.') ? url.href : null;
    } catch (error) {
      return null;
    }
  }

  function checkPhoto(file) {
    if (!file || !file.size) return '';
    if (!PHOTO_TYPES.includes(file.type)) return NetM.t('form.photoType');
    if (file.size > PHOTO_MAX_BYTES) return NetM.t('form.photoTooBig');
    return '';
  }

  function buildPayload(data, reference, photo) {
    const tipo = FORM_TYPES[data.get('tipo')] || data.get('tipo');
    const payload = new FormData();
    payload.append('_subject', `Nueva solicitud web NetM: ${tipo} — ${data.get('nombre')}`);
    payload.append('_template', 'table');
    payload.append('_captcha', 'false');
    payload.append('Nombre', data.get('nombre'));
    payload.append('email', data.get('email'));
    payload.append('Tipo de web', tipo);
    payload.append('Página de referencia', reference || '(ninguna)');
    payload.append('Idea', data.get('mensaje') || '(sin detalles)');
    payload.append('Idioma de la web', NetM.lang === 'en' ? 'Inglés' : 'Español');
    payload.append('Consentimiento', 'Acepta que NetM use sus datos para responder');
    if (photo) payload.append('attachment', photo, photo.name);
    return payload;
  }

  // ── Foto adjunta ──────────────────────────────────────────────────────────
  function initPhotoField() {
    const input = NetM.$('#foto');
    const drop = NetM.$('#foto-drop');
    const preview = NetM.$('#foto-preview');
    const image = preview.querySelector('img');
    let objectUrl = '';

    const clear = () => {
      input.value = '';
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = '';
      image.removeAttribute('src');
      preview.hidden = true;
      drop.hidden = false;
    };

    const show = () => {
      const file = input.files[0];
      const problem = checkPhoto(file);
      if (!file || problem) {
        if (problem) showFormStatus(problem, true);
        return clear();
      }
      showFormStatus('');
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = URL.createObjectURL(file);
      image.src = objectUrl;
      NetM.$('#foto-name').textContent = file.name;
      preview.hidden = false;
      drop.hidden = true;
    };

    input.addEventListener('change', show);
    NetM.$('#foto-remove').addEventListener('click', () => { clear(); input.focus(); });
    ['dragenter', 'dragover'].forEach((type) => drop.addEventListener(type, (event) => {
      event.preventDefault();
      drop.classList.add('is-dragging');
    }));
    ['dragleave', 'drop'].forEach((type) => drop.addEventListener(type, () => drop.classList.remove('is-dragging')));
    drop.addEventListener('drop', (event) => {
      event.preventDefault();
      if (!event.dataTransfer.files.length) return;
      input.files = event.dataTransfer.files;
      show();
    });
    return clear;
  }

  function initCounter() {
    const textarea = NetM.$('#mensaje');
    const counter = NetM.$('#mensaje-count');
    const update = () => { counter.textContent = NetM.t('form.chars', { n: textarea.value.length, max: textarea.maxLength }); };
    textarea.addEventListener('input', update);
    update();
    return update;
  }

  // ── Aviso de "petición enviada" ───────────────────────────────────────────
  function leaveSite() {
    // Una pestaña que no abrió un script no se puede cerrar: se vuelve a la web anterior o se sale a otra.
    let cameFromOtherSite = false;
    try {
      cameFromOtherSite = Boolean(document.referrer) && new URL(document.referrer).origin !== location.origin;
    } catch (error) {
      cameFromOtherSite = false;
    }
    if (cameFromOtherSite) location.href = document.referrer;
    else location.href = EXIT_URL;
  }

  function initSentDialog() {
    const dialog = NetM.createDialog(NetM.$('#sent-dialog'));
    NetM.$('#sent-home').addEventListener('click', async () => {
      await dialog.close({ restoreFocus: false });
      scrollTo({ top: 0, behavior: NetM.prefersReducedMotion ? 'auto' : 'smooth' });
    });
    NetM.$('#sent-exit').addEventListener('click', leaveSite);
    return dialog;
  }

  // ── Envío ─────────────────────────────────────────────────────────────────
  async function postForm(payload, hasPhoto) {
    const response = await fetch(FORM_ENDPOINT, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: payload,
      signal: AbortSignal.timeout(hasPhoto ? FORM_TIMEOUT_PHOTO_MS : FORM_TIMEOUT_MS)
    });
    const result = await response.json().catch(() => ({}));
    // FormSubmit responde 200 con success "false" mientras el formulario no se ha activado.
    if (!response.ok || String(result.success) !== 'true') throw new Error(result.message || `HTTP ${response.status}`);
  }

  function validate(form, data) {
    if (!FORM_ENDPOINT) return { error: NetM.t('form.offline') };
    const reference = normalizeReference(String(data.get('referencia') || ''));
    if (reference === null) return { error: NetM.t('form.badUrl'), focus: '#referencia' };
    const photo = data.get('attachment');
    const photoProblem = checkPhoto(photo);
    if (photoProblem) return { error: photoProblem, focus: '#foto' };
    return { reference, photo: photo && photo.size ? photo : null };
  }

  function initForm() {
    const form = NetM.$('#contact-form');
    if (!form) return;
    const contactDialog = NetM.createDialog(NetM.$('#contact-dialog'));
    const sentDialog = initSentDialog();
    const clearPhoto = initPhotoField();
    const updateCounter = initCounter();
    const submit = NetM.$('#form-submit');

    NetM.$('#contact-open').addEventListener('click', () => contactDialog.open(NetM.$('#nombre')));
    NetM.$$('[data-project]').forEach((link) => {
      link.addEventListener('click', () => { form.elements.tipo.value = link.dataset.project; });
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const data = new FormData(form);
      if (data.get('web')) return; // Campo trampa relleno: es un bot.
      const checked = validate(form, data);
      if (checked.error) {
        showFormStatus(checked.error, true);
        if (checked.focus) NetM.$(checked.focus).focus();
        return;
      }
      submit.disabled = true;
      showFormStatus(NetM.t('form.sending'));
      try {
        await postForm(buildPayload(data, checked.reference, checked.photo), Boolean(checked.photo));
        form.reset();
        clearPhoto();
        updateCounter();
        showFormStatus('');
        await contactDialog.close({ restoreFocus: false });
        sentDialog.open();
      } catch (error) {
        console.error('Error al enviar el formulario:', error);
        showFormStatus(NetM.t('form.error'), true);
      } finally {
        submit.disabled = false;
      }
    });
  }

  NetM.initForm = initForm;
})();
