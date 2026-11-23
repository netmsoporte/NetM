// Paleta y tipografías de NetM para Tailwind (se carga justo después del CDN de Tailwind).
// Red de seguridad: el texto del hero nunca queda oculto si GSAP no llega a cargar.
setTimeout(function () { document.documentElement.classList.remove('pre-intro'); }, 3000);
if (window.tailwind) tailwind.config = {
  theme: {
    extend: {
      colors: {
        ink: '#050d1c',
        ice: '#e6f4f6',
        mute: '#a9bcc7',
        faint: '#8398a6',
        aqua: '#63e6d9',
        violet: '#a97bff',
        brand: '#3b5bff',
        brandsoft: '#7d90ff'
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Instrument Sans"', 'system-ui', 'sans-serif'],
        mono: ['"DM Mono"', 'ui-monospace', 'monospace']
      }
    }
  }
};
