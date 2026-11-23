// Comentarios de la portada: se guardan en Firebase (Firestore) y se publican con la cuenta de Google.
//
// Puesta en marcha (una sola vez, gratis con el plan Spark):
//   1. Entra en https://console.firebase.google.com con netmsoporte@gmail.com y crea un proyecto "netm".
//   2. Compilación → Authentication → Comenzar → Método de acceso → Google → Habilitar → Guardar.
//      En Configuración → Dominios autorizados, añade el dominio donde se publique la web
//      (localhost ya viene puesto para las pruebas).
//   3. Compilación → Firestore Database → Crear base de datos → ubicación europe-west → modo producción.
//      En la pestaña Reglas, pega el contenido de firestore.rules (en la raíz del repo) y Publica.
//   4. Configuración del proyecto (rueda dentada) → Tus apps → icono web </> → registra "netm-web".
//      Copia los valores de firebaseConfig que te enseña y pégalos abajo, en FIREBASE_CONFIG.
//
// Estos valores no son secretos: identifican el proyecto. Lo que protege los comentarios son las
// reglas de firestore.rules (solo el autor edita sus 15 primeros minutos; borran el autor y el admin).
// Mientras apiKey esté vacío, la caja muestra solo el mensaje fijo de NetM.
(function () {
  const NetM = (window.NetM = window.NetM || {});

  NetM.FIREBASE_CONFIG = {
    apiKey: '',
    authDomain: '',
    projectId: '',
    appId: ''
  };

  // Cuenta que puede borrar cualquier comentario. Si se cambia, hay que cambiarla también en firestore.rules.
  NetM.COMMENTS_ADMIN_EMAIL = 'netmsoporte@gmail.com';
})();
