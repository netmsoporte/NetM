// Webs con AdSense: aparecen en el desplegable que se abre al pulsar las páginas 3D de la portada.
//
// Para añadir una web nueva, copia un bloque y rellénalo:
//   nombre      Nombre de la web.
//   url         Dirección de la web publicada (con https://).
//   descripcion   Una frase corta.
//   descripcionEn La misma frase en inglés (opcional; si falta, sale la española).
//   descripcionEu La misma frase en euskera (opcional; si falta, sale la española).
(function () {
  const NetM = (window.NetM = window.NetM || {});

  NetM.ADSENSE_SITES = [
    {
      nombre: 'Cuentas Claras',
      url: 'https://cuentasclarasya.com',
      descripcion: 'Calculadoras de sueldo y finanzas personales.',
      descripcionEn: 'Salary and personal finance calculators (in Spanish).',
      descripcionEu: 'Soldata eta finantza pertsonaletarako kalkulagailuak (gaztelaniaz).'
    }
  ];
})();
