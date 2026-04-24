export const I18N_LABELS = Object.freeze({
  es: Object.freeze({
    massFlow: 'Caudal m\u00e1sico',
    designTorque: 'Par dise\u00f1o',
    shaftPower: 'Potencia de eje',
    requiredTorque: 'Par requerido',
    resultsMain: 'Resultados principales',
    serviceFactor: 'Factor de servicio',
    motorPower: 'Potencia motor',
    speed: 'Velocidad',
    mountingType: 'Tipo de montaje',
  }),
  en: Object.freeze({
    massFlow: 'Mass Flow Rate',
    designTorque: 'Design Torque',
    shaftPower: 'Shaft Power',
    requiredTorque: 'Required Torque',
    resultsMain: 'Main Results',
    serviceFactor: 'Service Factor',
    motorPower: 'Motor Power',
    speed: 'Speed',
    mountingType: 'Mounting Type',
  }),
});

export function getCurrentLang() {
  try {
    const raw = localStorage.getItem('mdr-home-lang');
    return raw === 'en' ? 'en' : 'es';
  } catch (_) {
    return 'es';
  }
}

export function getI18nLabels() {
  return I18N_LABELS[getCurrentLang()] || I18N_LABELS.es;
}

