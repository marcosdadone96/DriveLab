/**
 * Feature flags — MechAssist
 * ---------------------------------------------------------------------------
 * Freemium: un calculador gratuito y el otro Pro (`whichCalculatorIsFree`).
 * Pruebas sin tocar código: `?freeTool=flat|inclined`, sesión Pro `?pro=1`, o botones en la pantalla de bloqueo.
 * Ver `js/services/accessTier.js` y `js/ui/conveyorAppEntry.js`.
 *
 * Futuro (placeholders):
 * - gearmotorDatabase, pdfExport, userAuth, stripePayments (Checkout solo servidor)
 */
export const FEATURES = Object.freeze({
  /**
   * Calculador incluido en el plan gratuito. El otro requiere Pro (`accessTier` + paywall).
   * Pruebe la otra asignación con `?freeTool=flat` o `?freeTool=inclined` en la URL.
   */
  whichCalculatorIsFree: 'flat',

  /** Si true, toda la app se comporta como Pro (solo desarrollo). */
  devSimulatePremium: false,

  /** Barra en cabecera de calculadoras: plan, estrategia y enlaces ?pro=1 / ?freeTool= */
  showTierSwitcherInDev: true,

  /** @deprecated Use accessTier.isPremiumEffective() para cobros reales. */
  isPremium: false,

  /** Advanced motor/gearmotor selection tables and vendor specs */
  motorSelectionAdvanced: true,

  /** Detailed safety / service factor optimization suggestions */
  safetyOptimization: true,

  /** Panel lateral Smart Dashboard (IA Advisor + coste simulado + filtro stock) */
  smartLabDashboard: true,

  /** Placeholder: API remota de catálogo motorreductores */
  gearmotorDatabase: false,

  /**
   * Motorreductores paramétricos: familias/tallas/relaciones → filas generadas (ver gearmotorParametricRegistry.js).
   * Desactive si prefiere solo las filas demo estáticas en gearmotorCatalog.js.
   */
  parametricGearmotors: true,

  /** Tope de filas generadas al expandir el registro paramétrico (protección rendimiento). */
  parametricGearmotorMaxModels: 8000,

  /** Placeholder: export calculation sheet to PDF */
  pdfExport: false,

  /** Placeholder: user accounts */
  userLogin: false,

  /** Placeholder: Stripe — client should only receive publishable key; Checkout via backend */
  stripePayments: false,

  /**
   * URL de donacion (Ko-fi, PayPal.me, enlace Stripe, etc.) para el pie de las calculadoras gratuitas del laboratorio.
   * Cadena vacia: se muestra el texto de apoyo sin boton externo.
   */
  labDonationUrl: '',

  /**
   * Enlaces de compra Amazon / panel laboratorio: ver `js/config/labAffiliate.js` (tag Associates, dominio).
   */

  /**
   * Monetization matrix (prepared, opt-in by flag).
   * Keep all false until rollout. Each machine can enable Pro gates independently.
   */
  monetization: Object.freeze({
    flat: Object.freeze({
      scenarioCompare: false,
      advancedMotorCompare: false,
      premiumPresets: false,
    }),
    roller: Object.freeze({
      scenarioCompare: false,
      advancedMotorCompare: false,
      premiumPresets: false,
    }),
    carLift: Object.freeze({
      scenarioCompare: false,
      advancedMotorCompare: false,
      safetyChecklist: false,
    }),
  }),
});

/**
 * Helper for template / DOM: show element only if feature is on.
 * @param {keyof typeof FEATURES} key
 * @returns {boolean}
 */
export function isFeatureEnabled(key) {
  return FEATURES[key] === true;
}
