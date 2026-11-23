# NetM

Web de **NetM**, estudio de diseño y desarrollo web formado por cuatro estudiantes. Hacemos páginas a medida para comercios y eventos especiales, pensadas para el público que elige cada cliente.

Web publicada: **https://netmsoporte.github.io/NetM/**

## Qué hay dentro

| Archivo | Para qué sirve |
| --- | --- |
| `index.html` | Portada: escena 3D, servicios, opiniones, quiénes somos, filosofía y contacto |
| `proyectos.html` | Galería de webs hechas por NetM, con scroll horizontal |
| `legal.html` | Aviso legal, política de privacidad y política de cookies |
| `css/base.css` | Estilos comunes a todas las páginas |
| `js/` | Interfaz, escena 3D, formulario, comentarios, pie de página e idiomas |
| `js/lang/` | Textos en español (`es.js`), inglés (`en.js`) y euskera (`eu.js`) |
| `js/proyectos-data.js` | Lista de proyectos que salen en la galería |
| `js/adsense-data.js` | Webs que salen en el desplegable AdSense de la portada |
| `firestore.rules` | Reglas de seguridad de los comentarios (se pegan en Firebase) |

Es una web estática: HTML, CSS y JavaScript sin compilar. Funciona abriendo `index.html` con doble clic, salvo el inicio de sesión con Google de los comentarios, que necesita estar publicada.

## Publicación

La web se sirve con **GitHub Pages** desde la rama `main` (carpeta raíz). Cada `git push` a `main` la actualiza en uno o dos minutos. El archivo `.nojekyll` hace que GitHub la publique tal cual, sin procesarla.

## Puesta en marcha (una sola vez)

1. **Formulario de contacto (FormSubmit).** Envía el formulario una vez desde la web publicada. Llegará a netmsoporte@gmail.com un correo «Activate Form»: púlsalo y desde entonces cada mensaje llegará a la bandeja. Más detalles al principio de `js/form.js`.
2. **Comentarios (Firebase).** Sigue los pasos del principio de `js/comments-config.js`: crear el proyecto, activar el inicio de sesión con Google, crear Firestore, pegar `firestore.rules` y copiar la configuración. En *Authentication → Settings → Authorized domains* añade `netmsoporte.github.io`.

## Cómo cambiar cosas

- **Añadir un proyecto a la galería:** copia un bloque en `js/proyectos-data.js`.
- **Cambiar o traducir un texto:** el español está en el HTML; el inglés y el euskera, en `js/lang/en.js` y `js/lang/eu.js`, con la misma clave (`data-i18n="…"`).
- **Si añades un servicio externo** (analítica, anuncios, otra librería…) o algo que guarde datos en el navegador, actualiza `legal.html` en los tres idiomas. Si son cookies de analítica o publicidad, además hará falta un banner de consentimiento.
