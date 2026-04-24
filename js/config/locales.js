export const LOCALES = Object.freeze({
  es: Object.freeze({
    reportPremium: 'INFORME TÉCNICO PREMIUM',
    technicalMemo: 'Memoria técnica',
    masterEdition: 'MechAssist Master Edition',
    projectData: 'Datos del proyecto',
    project: 'Proyecto',
    preparedFor: 'Preparado para',
    leadEngineer: 'Ingeniero responsable',
    offerRef: 'Referencia de oferta',
    shaftPower: 'Potencia de eje',
    designTorque: 'Par de dise�o',
    massFlowRate: 'Caudal m�sico',
    verdict: 'Veredicto',
    calcValue: 'valor de c�lculo',
    serviceFactorApplied: 'con factor de servicio',
    estimated: 'estimado',
    requiresAction: 'requiere acci�n',
    baseDesignOk: 'apto para dise�o base',
    page2: 'P�G 2 � Diagrama y datos de entrada',
    page3: 'P�G 3 � Memoria de c�lculo detallada',
    page4: 'P�G 4 � Selecci�n comercial y anexos',
    page3Title: 'Desglose de c�lculo (fuerzas y potencia)',
    beltStress: 'An�lisis de tensi�n de banda',
    peakForce: 'Fuerza de pico',
    pdfLoadError: 'No se pudo cargar el generador PDF (jsPDF). Compruebe la conexi�n a Internet o int�ntelo m�s tarde.',
    unnamedProject: 'Proyecto sin nombre',
    endClient: 'Cliente final',
    mechAssistEngineering: 'Ingeniería MechAssist',
    diagramCaptureError: 'No se pudo capturar el diagrama en esta ejecuci�n.',
    inputParameters: 'Par�metros de entrada',
    selectedBeltStrength: 'Resistencia banda seleccionada',
    notSpecified: 'No indicada',
    utilizationIndex: '�ndice utilizaci�n',
    validation: 'Validaci�n',
    pendingMissingStrength: 'Pendiente (falta resistencia)',
    suitableWithMargin: 'APTO con margen',
    reviewBeltSelection: 'REVISAR selecci�n de banda',
    recommendedCommercialSelection: 'Selecci�n comercial recomendada',
    unavailableForCalc: 'No disponible para este c�lculo.',
    energyEfficiencyStudy: 'Estudio de eficiencia energ�tica',
    annualConsumption: 'Consumo estimado anual',
    consideringHoursPerDay: 'considerando',
    hoursPerDay: 'h/d�a',
    operatingCostEstimated: 'Coste operativo estimado',
    tariff: 'tarifa',
    glossaryMethodology: 'Glosario y metodolog�a normativa',
    defaultMethodology:
      'Se aplica un enfoque simplificado alineado con ISO 5048 / DIN 22101 para estimar fuerzas resistentes, potencia y par en r�gimen y arranque. La memoria debe validarse con datos finales de fabricante, layout mec�nico definitivo y condiciones de operaci�n reales.',
    legalDisclaimerTitle: 'Descargo de responsabilidad',
    defaultLegalDisclaimer:
      'Este documento es una simulaci�n t�cnico-econ�mica preliminar. No sustituye ingenier�a de detalle, certificaciones legales ni la validaci�n en campo por instalador/fabricante autorizado. El receptor asume la verificaci�n final de normativa local, seguridad funcional y dimensionado definitivo.',
    engineerSignature: 'Firma del Ingeniero',
    companyStamp: 'Sello de Empresa',
    reference: 'Referencia',
    reportFileBase: 'informe-tecnico',
    verdictSuitable: 'APTO',
    verdictReview: 'REVISAR',
  }),
  en: Object.freeze({
    reportPremium: 'PREMIUM TECHNICAL REPORT',
    technicalMemo: 'Technical memo',
    masterEdition: 'MechAssist Master Edition',
    projectData: 'Project data',
    project: 'Project',
    preparedFor: 'Prepared for',
    leadEngineer: 'Lead engineer',
    offerRef: 'Offer reference',
    shaftPower: 'Shaft Power',
    designTorque: 'Design Torque',
    massFlowRate: 'Mass Flow Rate',
    verdict: 'Verdict',
    calcValue: 'calculated value',
    serviceFactorApplied: 'with service factor',
    estimated: 'estimated',
    requiresAction: 'action required',
    baseDesignOk: 'suitable for base design',
    page2: 'PG 2 � Diagram and input data',
    page3: 'PG 3 � Detailed calculation memo',
    page4: 'PG 4 � Commercial selection and annexes',
    page3Title: 'Calculation breakdown (forces and power)',
    beltStress: 'Belt stress analysis',
    peakForce: 'Peak Force',
    pdfLoadError: 'Could not load PDF generator (jsPDF). Check your Internet connection or try again later.',
    unnamedProject: 'Unnamed project',
    endClient: 'End customer',
    mechAssistEngineering: 'MechAssist Engineering',
    diagramCaptureError: 'Could not capture the diagram in this run.',
    inputParameters: 'Input Parameters',
    selectedBeltStrength: 'Selected belt strength',
    notSpecified: 'Not specified',
    utilizationIndex: 'Utilization index',
    validation: 'Validation',
    pendingMissingStrength: 'Pending (missing strength)',
    suitableWithMargin: 'SUITABLE with margin',
    reviewBeltSelection: 'REVIEW belt selection',
    recommendedCommercialSelection: 'Recommended commercial selection',
    unavailableForCalc: 'Not available for this calculation.',
    energyEfficiencyStudy: 'Energy efficiency study',
    annualConsumption: 'Estimated annual consumption',
    consideringHoursPerDay: 'considering',
    hoursPerDay: 'h/day',
    operatingCostEstimated: 'Estimated operating cost',
    tariff: 'tariff',
    glossaryMethodology: 'Glossary and normative methodology',
    defaultMethodology:
      'A simplified approach aligned with ISO 5048 / DIN 22101 is applied to estimate resisting forces, power, and torque in steady and startup conditions. The memo must be validated with final manufacturer data, definitive mechanical layout, and real operating conditions.',
    legalDisclaimerTitle: 'Disclaimer',
    defaultLegalDisclaimer:
      'This document is a preliminary techno-economic simulation. It does not replace detailed engineering, legal certifications, or field validation by an authorized installer/manufacturer. The recipient assumes final verification of local regulations, functional safety, and final sizing.',
    engineerSignature: 'Engineer Signature',
    companyStamp: 'Company Stamp',
    reference: 'Reference',
    reportFileBase: 'technical-report',
    verdictSuitable: 'SUITABLE',
    verdictReview: 'REVIEW',
  }),
});

/** @type {string} */
export const HOME_LANG_STORAGE_KEY = 'mdr-home-lang';

export function getCurrentLang() {
  try {
    return localStorage.getItem(HOME_LANG_STORAGE_KEY) === 'en' ? 'en' : 'es';
  } catch (_) {
    return 'es';
  }
}

/**
 * @param {'es'|'en'} lang
 */
export function setCurrentLang(lang) {
  try {
    localStorage.setItem(HOME_LANG_STORAGE_KEY, lang === 'en' ? 'en' : 'es');
  } catch (_) {
    /* ignore */
  }
}

export function t(key, lang = getCurrentLang()) {
  const table = LOCALES[lang] || LOCALES.es;
  return table[key] || key;
}

export function formatNumberLocale(value, digits = 2, lang = getCurrentLang()) {
  const locale = lang === 'en' ? 'en-US' : 'es-ES';
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(value) || 0);
}

export function formatDateTimeLocale(date, lang = getCurrentLang()) {
  const locale = lang === 'en' ? 'en-US' : 'es-ES';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

