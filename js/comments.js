// Caja de comentarios de la portada. El primer comentario (el de NetM) está escrito en el HTML y
// siempre va fijado arriba; el resto llega en directo desde Firestore (ver comments-config.js).
// Cada comentario se publica con la cuenta de Google de quien lo escribe; la sesión queda iniciada
// para que pueda editarlo durante 15 minutos o borrarlo cuando quiera. El admin borra cualquiera.
(function () {
  const NetM = window.NetM;
  const { $, t } = NetM;
  const SDK_BASE = 'https://www.gstatic.com/firebasejs/10.14.1/';
  const COLLECTION = 'comentarios';
  const EDIT_WINDOW_MS = 15 * 60 * 1000;
  const MAX_COMMENTS = 100;
  const MAX_NAME = 80;
  const DELETE_CONFIRM_MS = 4000;
  const REFRESH_MS = 30000;
  const DEFAULT_SCORE = 8;
  const CANCELLED_SIGN_IN = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request'];

  const state = { auth: null, db: null, user: null, isAdmin: false, comments: [], editingId: null };

  const isConfigured = () => Boolean(NetM.FIREBASE_CONFIG && NetM.FIREBASE_CONFIG.apiKey);

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`No se ha podido cargar ${src}`));
      document.head.append(script);
    });
  }

  // El SDK solo se descarga si los comentarios están configurados.
  async function loadFirebase() {
    await loadScript(`${SDK_BASE}firebase-app-compat.js`);
    await Promise.all([loadScript(`${SDK_BASE}firebase-auth-compat.js`), loadScript(`${SDK_BASE}firebase-firestore-compat.js`)]);
    const app = firebase.initializeApp(NetM.FIREBASE_CONFIG);
    state.auth = app.auth();
    state.db = app.firestore();
    state.auth.useDeviceLanguage();
  }

  // ── Presentación ──────────────────────────────────────────────────────────
  function setBoxState(message) {
    $('#comments-state').textContent = message || '';
  }

  function formatWhen(date) {
    const seconds = Math.round((date.getTime() - Date.now()) / 1000);
    const relative = new Intl.RelativeTimeFormat(NetM.locale, { numeric: 'auto' });
    if (Math.abs(seconds) < 60) return relative.format(0, 'second');
    if (Math.abs(seconds) < 3600) return relative.format(Math.round(seconds / 60), 'minute');
    if (Math.abs(seconds) < 86400) return relative.format(Math.round(seconds / 3600), 'hour');
    return new Intl.DateTimeFormat(NetM.locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  }

  function buildScore(score) {
    const wrapper = el('span', 'comment-score');
    wrapper.setAttribute('aria-label', t('c.score', { n: score }));
    const bar = el('span', 'comment-score-bar');
    bar.setAttribute('aria-hidden', 'true');
    bar.style.setProperty('--score', String(score / 10));
    const value = el('span', 'label text-ice', `${score}/10`);
    value.setAttribute('aria-hidden', 'true');
    wrapper.append(bar, value);
    return wrapper;
  }

  const editMinutesLeft = (comment) => Math.ceil((comment.creado.getTime() + EDIT_WINDOW_MS - Date.now()) / 60000);

  function buildActions(comment) {
    const isOwner = Boolean(state.user && state.user.uid === comment.uid);
    if (!isOwner && !state.isAdmin) return null;
    const actions = el('div', 'mt-3 flex flex-wrap gap-x-5 gap-y-2');
    const minutes = editMinutesLeft(comment);
    if (isOwner && minutes > 0) {
      const edit = el('button', 'comment-action label', t('c.edit', { min: minutes }));
      edit.type = 'button';
      edit.addEventListener('click', () => openComposer(comment));
      actions.append(edit);
    }
    const remove = el('button', 'comment-action is-danger label', isOwner ? t('c.delete') : t('c.adminDelete'));
    remove.type = 'button';
    remove.addEventListener('click', () => confirmDelete(remove, comment));
    actions.append(remove);
    return actions;
  }

  function buildComment(comment) {
    const item = el('li', 'comment');
    const isOwner = Boolean(state.user && state.user.uid === comment.uid);
    const avatar = el('span', 'comment-avatar', (comment.nombre.trim()[0] || '?').toUpperCase());
    avatar.setAttribute('aria-hidden', 'true');

    const body = el('div', 'min-w-0 flex-1');
    const head = el('p', 'flex flex-wrap items-center gap-x-3 gap-y-1');
    head.append(el('span', 'font-semibold', comment.nombre));
    if (isOwner) head.append(el('span', 'comment-badge label', t('c.you')));
    head.append(buildScore(comment.nota));
    const when = el('time', 'label text-faint', formatWhen(comment.creado));
    when.dateTime = comment.creado.toISOString();
    head.append(when);
    if (comment.editado) head.append(el('span', 'label text-faint', `· ${t('c.edited')}`));

    // textContent: lo que escribe la gente nunca se interpreta como HTML.
    body.append(head, el('p', 'comment-text mt-2 leading-relaxed text-ice/85', comment.texto));
    const actions = buildActions(comment);
    if (actions) body.append(actions);
    item.append(avatar, body);
    return item;
  }

  function renderSummary() {
    const total = state.comments.length;
    $('#comments-summary').hidden = total === 0;
    if (!total) return;
    const average = state.comments.reduce((sum, comment) => sum + comment.nota, 0) / total;
    $('#comments-average').textContent = new Intl.NumberFormat(NetM.locale, { maximumFractionDigits: 1 }).format(average);
    $('#comments-count').textContent = total === 1 ? t('c.count1') : t('c.countN', { n: total });
  }

  function renderList() {
    const list = $('#comments-list');
    list.querySelectorAll('.comment:not(.is-pinned)').forEach((item) => item.remove());
    list.append(...state.comments.map(buildComment));
    renderSummary();
  }

  function renderSession() {
    const session = $('#comment-session');
    session.hidden = !state.user;
    if (!state.user) return;
    $('#comment-session-name').textContent = state.user.displayName || state.user.email || t('c.anonymous');
    $('#comment-session-admin').hidden = !state.isAdmin;
  }

  function confirmDelete(button, comment) {
    if (button.dataset.armed !== 'true') {
      button.dataset.armed = 'true';
      button.textContent = t('c.confirmDelete');
      setTimeout(() => {
        if (!button.isConnected) return;
        button.dataset.armed = 'false';
        button.textContent = state.user && state.user.uid === comment.uid ? t('c.delete') : t('c.adminDelete');
      }, DELETE_CONFIRM_MS);
      return;
    }
    button.disabled = true;
    state.db.collection(COLLECTION).doc(comment.id).delete().catch((error) => {
      console.error('Error al borrar el comentario:', error);
      button.disabled = false;
      setBoxState(t('c.deleteError'));
    });
  }

  // ── Ventana para escribir ─────────────────────────────────────────────────
  let composer = null;

  function setComposerStatus(message) {
    const status = $('#comment-status');
    status.textContent = message || '';
    status.classList.toggle('form-alert', Boolean(message));
  }

  function paintScore(value) {
    const range = $('#comment-score');
    range.style.setProperty('--fill', `${((value - 1) / 9) * 100}%`);
    range.setAttribute('aria-valuetext', t('c.score', { n: value }));
    $('#comment-score-value').textContent = value;
  }

  function updateSubmitLabel() {
    const label = state.editingId ? t('c.save') : state.user ? t('c.publish') : t('c.publishGoogle');
    $('#comment-submit-label').textContent = label;
  }

  function openComposer(comment) {
    state.editingId = comment ? comment.id : null;
    $('#comment-title').textContent = comment ? t('c.editTitle') : t('c.newTitle');
    $('#comment-text').value = comment ? comment.texto : '';
    $('#comment-score').value = comment ? comment.nota : DEFAULT_SCORE;
    paintScore(Number($('#comment-score').value));
    setComposerStatus('');
    updateSubmitLabel();
    composer.open($('#comment-score'));
  }

  function readComposer() {
    const texto = $('#comment-text').value.trim();
    const nota = Number($('#comment-score').value);
    if (!texto) throw new Error(t('c.emptyText'));
    return { texto, nota: Math.min(Math.max(Math.round(nota), 1), 10) };
  }

  async function signIn() {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await state.auth.signInWithPopup(provider);
    } catch (error) {
      console.error('Error al iniciar sesión con Google:', error);
      throw new Error(CANCELLED_SIGN_IN.includes(error.code) ? t('c.signInCancelled') : t('c.signInError'));
    }
  }

  async function saveComment(content) {
    const { FieldValue } = firebase.firestore;
    const collection = state.db.collection(COLLECTION);
    if (state.editingId) {
      const comment = state.comments.find((item) => item.id === state.editingId);
      if (!comment || editMinutesLeft(comment) <= 0) throw new Error(t('c.editExpired'));
      await collection.doc(state.editingId).update({ ...content, editado: FieldValue.serverTimestamp() });
      return;
    }
    const nombre = (state.user.displayName || t('c.anonymous')).trim().slice(0, MAX_NAME);
    await collection.add({ uid: state.user.uid, nombre, ...content, creado: FieldValue.serverTimestamp(), editado: null });
  }

  async function submitComment(event) {
    event.preventDefault();
    const submit = $('#comment-submit');
    let content;
    try {
      content = readComposer();
    } catch (error) {
      return setComposerStatus(error.message);
    }
    if (!state.db) return setComposerStatus(t('c.offline'));
    submit.disabled = true;
    setComposerStatus('');
    try {
      if (!state.user) await signIn();
      await saveComment(content);
      await composer.close();
    } catch (error) {
      if (!error.message || error.code) console.error('Error al guardar el comentario:', error);
      setComposerStatus(error.code ? t('c.saveError') : error.message);
    } finally {
      submit.disabled = false;
      updateSubmitLabel();
    }
  }

  function initComposer() {
    composer = NetM.createDialog($('#comment-dialog'));
    const range = $('#comment-score');
    range.addEventListener('input', () => paintScore(Number(range.value)));
    $('#comment-form').addEventListener('submit', submitComment);
    $('#comment-open').addEventListener('click', () => openComposer(null));
  }

  // ── Datos ─────────────────────────────────────────────────────────────────
  function toComment(doc) {
    const data = doc.data({ serverTimestamps: 'estimate' });
    return {
      id: doc.id,
      uid: data.uid,
      nombre: String(data.nombre || t('c.anonymous')),
      texto: String(data.texto || ''),
      nota: Number(data.nota) || 1,
      creado: data.creado ? data.creado.toDate() : new Date(),
      editado: Boolean(data.editado)
    };
  }

  function listenComments() {
    setBoxState(t('c.loading'));
    state.db.collection(COLLECTION).orderBy('creado', 'desc').limit(MAX_COMMENTS).onSnapshot((snapshot) => {
      state.comments = snapshot.docs.map(toComment);
      setBoxState('');
      renderList();
    }, (error) => {
      console.error('Error al leer los comentarios:', error);
      setBoxState(t('c.loadError'));
    });
  }

  function listenSession() {
    state.auth.onAuthStateChanged((user) => {
      state.user = user;
      state.isAdmin = Boolean(user && user.emailVerified && user.email === NetM.COMMENTS_ADMIN_EMAIL);
      renderSession();
      renderList();
      updateSubmitLabel();
    });
    $('#comment-sign-out').addEventListener('click', () => state.auth.signOut());
  }

  async function initComments() {
    if (!$('#opiniones')) return;
    initComposer();
    if (!isConfigured()) return setBoxState(t('c.offline'));
    try {
      await loadFirebase();
    } catch (error) {
      console.error('Error al cargar Firebase:', error);
      return setBoxState(t('c.loadError'));
    }
    listenSession();
    listenComments();
    // Los minutos que quedan para editar y las fechas relativas se refrescan solos.
    setInterval(() => { if (!document.hidden) renderList(); }, REFRESH_MS);
  }

  NetM.initComments = initComments;
})();
