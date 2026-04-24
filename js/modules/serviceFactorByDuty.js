/**
 * Factor de servicio orientado a tipo de carga (engranajes / accionamientos; valores habituales para orientar motorreductor).
 * Referencia de orden de magnitud: tablas de aplicación AGMA 9005-F / práctica ISO para servicio no uniforme.
 * No sustituye la ficha del fabricante del reductor.
 */

/** @typedef {'uniform'|'moderate'|'heavy'|'custom'} LoadDutyClass */

export const LOAD_DUTY_OPTIONS = Object.freeze([
  {
    id: 'uniform',
    label: 'Carga uniforme (ligero)',
    hint: 'Arranque suave, carga estable — SF típ. 1,0–1,2',
    sf: 1.15,
  },
  {
    id: 'moderate',
    label: 'Choque moderado',
    hint: 'Variaciones de carga o arranques frecuentes — SF típ. 1,2–1,5',
    sf: 1.35,
  },
  {
    id: 'heavy',
    label: 'Choque pesado',
    hint: 'Impactos, bloqueos ocasionales o alta irregularidad — SF típ. 1,5–2,0+',
    sf: 1.75,
  },
  {
    id: 'custom',
    label: 'Personalizado (editar factor en datos esenciales)',
    hint: 'Active esta opción y edite el campo numérico «Factor de servicio» en Datos esenciales',
    sf: null,
  },
]);

/** UI copy when language is English (same `id` keys as LOAD_DUTY_OPTIONS). */
export const LOAD_DUTY_OPTIONS_EN = Object.freeze({
  uniform: {
    label: 'Uniform load (light)',
    hint: 'Smooth starts, stable load — typical SF 1.0–1.2',
  },
  moderate: {
    label: 'Moderate shock',
    hint: 'Load swings or frequent starts — typical SF 1.2–1.5',
  },
  heavy: {
    label: 'Heavy shock',
    hint: 'Impacts, occasional stalls, or high irregularity — typical SF 1.5–2.0+',
  },
  custom: {
    label: 'Custom (edit service factor in essentials)',
    hint: 'Select this option and edit the numeric Service factor field in the essentials section',
  },
});

/**
 * @param {LoadDutyClass} duty
 * @param {number} customSf — usado solo si duty === 'custom'
 */
export function resolveServiceFactor(duty, customSf) {
  if (duty === 'custom') {
    const s = Number(customSf);
    if (!Number.isFinite(s)) return 1.25;
    return Math.max(1, s);
  }
  const row = LOAD_DUTY_OPTIONS.find((o) => o.id === duty);
  return row?.sf ?? 1.25;
}
