// Lista de webs creadas por NetM: cada una aparece como una portada en proyectos.html.
//
// Para añadir una web nueva, copia un bloque y rellénalo:
//   titulo      Nombre del proyecto.
//   tipo        'comercios', 'eventos' o 'estudio'.
//   url         Dirección de la web publicada.
//   portada     Captura de la web (por ejemplo 'img/portadas/mi-cliente.jpg', unos 1600×1000 px).
//               Si se deja vacía, se dibuja una portada provisional con los colores de NetM.
//   anio        Año de entrega.
//   descripcion   Una frase corta.
//   descripcionEn La misma frase en inglés (opcional; si falta, sale la española).
//   descripcionEu La misma frase en euskera (opcional; si falta, sale la española).
(function () {
  const NetM = (window.NetM = window.NetM || {});

  NetM.PROYECTOS = [
    {
      titulo: 'NetM',
      tipo: 'estudio',
      url: 'index.html',
      portada: '',
      anio: 2026,
      descripcion: 'Nuestra propia web: páginas en 3D y un mar que reacciona al cursor.',
      descripcionEn: 'Our own website: 3D pages and a sea that reacts to the cursor.',
      descripcionEu: 'Gure webgunea: 3D orriak eta kurtsoreari erantzuten dion itsasoa.'
    }
  ];

  // Huecos "Tu web, aquí" que se intercalan mientras haya pocas webs; llevan al formulario.
  // Bájalo a medida que la lista crezca (0 para quitarlos).
  NetM.HUECOS_LIBRES = 9;
})();
