/**
 * Plegado inicial: una sola vez por carga de página (no en cada recálculo),
 * para que al recargar (p. ej. al salir de Pro) no queden <details> abiertos por HTML o inyecciones.
 */

let foldedOnceThisLoad = false;

/**
 * Cierra todos los <details> dentro de .app-main.
 * Idempotente por navegación: el flag se reinicia al recargar la página.
 */
export function foldAllMachineDetailsOncePerPageLoad() {
  if (foldedOnceThisLoad) return;
  foldedOnceThisLoad = true;
  const main = document.querySelector('.app-main');
  if (!main) return;
  main.querySelectorAll('details').forEach((d) => {
    if (d instanceof HTMLDetailsElement) d.open = false;
  });
}
