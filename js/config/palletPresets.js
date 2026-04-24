/**
 * Paletas habituales (dimensiones nominales en mm). Referencia orientativa para huella sobre rodillos.
 */

/** @typedef {{ id: string, label: string, length_mm: number | null, width_mm: number | null }} PalletPreset */

/** @type {PalletPreset[]} */
export const PALLET_PRESETS = [
  { id: 'eur1', label: 'EUR 1 (800\u00d71200 mm)', length_mm: 1200, width_mm: 800 },
  { id: 'eur2', label: 'EUR 2 (1200\u00d71000 mm)', length_mm: 1200, width_mm: 1000 },
  { id: 'eur6', label: 'Media EUR (800\u00d7600 mm)', length_mm: 800, width_mm: 600 },
  { id: 'ind1000', label: 'Industrial (1000\u00d71200 mm)', length_mm: 1200, width_mm: 1000 },
  { id: 'us48x40', label: 'US 48x40 in (1219\u00d71016 mm)', length_mm: 1219, width_mm: 1016 },
  { id: 'custom', label: 'Personalizado (L\u00d7W mm)', length_mm: null, width_mm: null },
];

/**
 * @param {string} id
 * @returns {PalletPreset}
 */
export function getPalletPresetById(id) {
  return PALLET_PRESETS.find((p) => p.id === id) || PALLET_PRESETS[0];
}
