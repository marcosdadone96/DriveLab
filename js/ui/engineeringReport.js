/**
 * Bloques HTML: pasos de cálculo (plegados), reductor, estrategias, unidades SI.
 */

import {
  requiredGearRatio,
  suggestGearboxFamily,
  buildThreeMotorStrategies,
  renderMotorStrategiesHtml,
  TYPICAL_MOTOR_NOMINAL_RPM,
} from '../modules/gearboxMotorAdvice.js';
import { shaftSizingFromDrive } from '../modules/shaftSizing.js';
import { getCurrentLang } from '../config/locales.js';

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {string} u
 * @param {number} v
 */
function formatStepValue(v, u) {
  const unit = u || '';
  if (!Number.isFinite(v)) return '—';
  switch (unit) {
    case '°':
      return `${v.toFixed(2)}°`;
    case 'N·m':
      return `${v.toFixed(2)}\u00A0N·m`;
    case 'kW':
      return `${v.toFixed(2)}\u00A0kW`;
    case 'N':
      return `${v.toFixed(2)}\u00A0N`;
    case 'm':
      return `${v.toFixed(2)}\u00A0m`;
    case 'm/s':
      return `${v.toFixed(2)}\u00A0m/s`;
    case 'm/s²':
    case 'm/s2':
      return `${v.toFixed(2)}\u00A0m/s²`;
    case 'kg/s':
      return `${v.toFixed(2)}\u00A0kg/s`;
    case 's':
      return `${v.toFixed(2)}\u00A0s`;
    case 'kg':
      return `${v.toFixed(2)}\u00A0kg`;
    case 'W':
      return `${v.toFixed(2)}\u00A0W`;
    case '%':
      return `${v.toFixed(2)}\u00A0%`;
    case 'min⁻¹':
    case '1/min':
      return `${v.toFixed(2)}\u00A0min⁻¹`;
    default:
      return `${v.toFixed(2)} ${escapeHtml(unit)}`.trim();
  }
}

/**
 * @param {{ steps?: Array<{ title: string; formula: string; substitution: string; value: number; unit: string; meaning: string }> }} r
 */
export function renderDetailedStepsTable(r, lang = getCurrentLang()) {
  if (!r.steps || !r.steps.length) return '';
  const en = lang === 'en';
  const lblSubst = en ? 'Substituted values' : 'Datos sustituidos';
  const lblOut = en ? 'Result' : 'Resultado';
  const sumTitle = en ? 'Optional step-by-step breakdown' : 'Desglose paso a paso (opcional)';
  const sumHint = en
    ? `${r.steps.length} steps \u00b7 SI units`
    : `${r.steps.length} pasos \u00b7 magnitudes SI`;
  const lead = en
    ? 'Detail for auditing the model. Most users stay with the drum summary and motor recommendations.'
    : 'Detalle para quien quiera auditar el modelo. Lo habitual es quedarse con el resumen de tambor y las recomendaciones de motor.';
  const cards = r.steps
    .map(
      (s, i) => `
    <article class="step-card" style="--step-i: ${i}">
      <div class="step-card__connector" aria-hidden="true"></div>
      <header class="step-card__top">
        <span class="step-card__badge">${i + 1}</span>
        <h4 class="step-card__title">${escapeHtml(s.title)}</h4>
      </header>
      <div class="step-card__formula" role="math"><code>${escapeHtml(s.formula)}</code></div>
      <div class="step-card__subst">
        <span class="step-card__subst-label">${lblSubst}</span>
        <div class="step-card__subst-val">${escapeHtml(s.substitution)}</div>
      </div>
      <div class="step-card__out">
        <span class="step-card__out-label">${lblOut}</span>
        <span class="step-card__out-num">${formatStepValue(s.value, s.unit)}</span>
      </div>
      <p class="step-card__meaning">${escapeHtml(s.meaning)}</p>
    </article>`,
    )
    .join('');

  return `
    <details class="eng-expand eng-expand--steps">
      <summary class="eng-expand__summary">
        <span class="eng-expand__summary-title">${sumTitle}</span>
        <span class="eng-expand__summary-hint">${sumHint}</span>
      </summary>
      <div class="eng-expand__body">
        <p class="eng-expand__lead">${lead}</p>
        <div class="step-flow" role="list">${cards}</div>
      </div>
    </details>`;
}

/**
 * @param {number} drumRpm
 * @param {number} torqueDesign_Nm
 * @param {number} powerMotor_kW
 * @param {{ shaftLabel?: string; shaftOutLabel?: string; motorSubtitle?: string } | undefined} [opts]
 */
export function renderGearboxSummaryHtml(drumRpm, torqueDesign_Nm, powerMotor_kW, opts) {
  const lang = opts?.lang ?? getCurrentLang();
  const en = lang === 'en';
  const shaftLabel = opts?.shaftLabel ?? (en ? 'drum' : 'tambor');
  const shaftOutLabel =
    opts?.shaftOutLabel ?? (en ? 'Gearbox output / drum' : 'Salida reductor / tambor');
  const motorSubtitle =
    opts?.motorSubtitle ??
    (en
      ? 'Reference: ~4-pole induction motor, 50\u00A0Hz supply.'
      : 'Referencias a motor as\u00edncrono ~4 polos, red 50\u00A0Hz.');
  const i = requiredGearRatio(drumRpm);
  const fam = suggestGearboxFamily(i, lang);
  const shafts =
    Number.isFinite(torqueDesign_Nm) && torqueDesign_Nm > 0 && Number.isFinite(i) && i > 0
      ? shaftSizingFromDrive({ torqueDrum_Nm: torqueDesign_Nm, ratio: i })
      : null;

  const shaftBlock =
    shafts && Number.isFinite(shafts.dMotor_suggest_mm)
      ? en
        ? `
      <div class="shaft-snap">
        <div class="shaft-snap__title">Shafts \u2014 indicative minimum diameter (torsion)</div>
        <p class="shaft-snap__note">Reference shear stress \u2248 ${(shafts.tau_used_Pa / 1e6).toFixed(0)}\u00A0MPa (solid shaft); no keyway or detailed fatigue. Upsize to a commercial size and validate with the manufacturer.</p>
        <dl class="shaft-snap__dl">
          <div><dt>Motor shaft (before gearbox)</dt><dd>\u2265 ${shafts.dMotor_min_mm.toFixed(1)}\u00A0mm \u2192 typical use \u2265 <strong>${shafts.dMotor_suggest_mm.toFixed(0)}\u00A0mm</strong> <span class="shaft-snap__torque">(T \u2248 ${shafts.torqueMotor_Nm.toFixed(2)}\u00A0N\u00b7m)</span></dd></div>
          <div><dt>${escapeHtml(shaftOutLabel)}</dt><dd>\u2265 ${shafts.dGearboxOut_min_mm.toFixed(1)}\u00A0mm \u2192 typical use \u2265 <strong>${shafts.dGearboxOut_suggest_mm.toFixed(0)}\u00A0mm</strong> <span class="shaft-snap__torque">(design torque at ${escapeHtml(shaftLabel)})</span></dd></div>
        </dl>
      </div>`
        : `
      <div class="shaft-snap">
        <div class="shaft-snap__title">Ejes \u2014 di\u00e1metro m\u00ednimo orientativo (torsi\u00f3n)</div>
        <p class="shaft-snap__note">Tensi\u00f3n tangencial de referencia \u2248 ${(shafts.tau_used_Pa / 1e6).toFixed(0)}\u00A0MPa en eje macizo; sin llave ni fatiga detallada. Subir a tama\u00f1o comercial y validar con fabricante.</p>
        <dl class="shaft-snap__dl">
          <div><dt>Eje motor (antes del reductor)</dt><dd>\u2265 ${shafts.dMotor_min_mm.toFixed(1)}\u00A0mm \u2192 uso com\u00fan \u2265 <strong>${shafts.dMotor_suggest_mm.toFixed(0)}\u00A0mm</strong> <span class="shaft-snap__torque">(par \u2248 ${shafts.torqueMotor_Nm.toFixed(2)}\u00A0N\u00b7m)</span></dd></div>
          <div><dt>${escapeHtml(shaftOutLabel)}</dt><dd>\u2265 ${shafts.dGearboxOut_min_mm.toFixed(1)}\u00A0mm \u2192 uso com\u00fan \u2265 <strong>${shafts.dGearboxOut_suggest_mm.toFixed(0)}\u00A0mm</strong> <span class="shaft-snap__torque">(par de dise\u00f1o en ${escapeHtml(shaftLabel)})</span></dd></div>
        </dl>
      </div>`
      : '';

  const titleGear = en ? 'Gearbox: ratio and indicative family' : 'Reductor: relaci\u00f3n y familia orientativa';
  const lblDrumN = en ? `Speed (${escapeHtml(shaftLabel)})` : `Velocidad de giro (${escapeHtml(shaftLabel)})`;
  const lblMotN = en ? 'Reference motor speed' : 'Velocidad de giro motor de referencia';
  const lblRatio = en ? 'Approximate ratio <var>i</var>' : 'Relaci\u00f3n aproximada <var>i</var>';
  const lblFam = en ? 'Suggested family' : 'Familia sugerida';
  const lblT = en ? `Design torque (${escapeHtml(shaftLabel)})` : `Par de dise\u00f1o (${escapeHtml(shaftLabel)})`;
  const lblP = en ? 'Indicative motor shaft power' : 'Potencia de eje motor orientativa';
  const dash = '\u2014';

  return `
    <div class="eng-block eng-block--gear eng-block--pop">
      <div class="eng-block__head">
        <h3 class="eng-block__title">${titleGear}</h3>
        <p class="eng-block__subtitle">${escapeHtml(motorSubtitle)}</p>
      </div>
      <dl class="gear-dl">
        <div><dt>${lblDrumN}</dt><dd>${drumRpm.toFixed(2)}\u00A0min\u207b\u00b9</dd></div>
        <div><dt>${lblMotN}</dt><dd>${TYPICAL_MOTOR_NOMINAL_RPM}\u00A0min\u207b\u00b9</dd></div>
        <div><dt>${lblRatio}</dt><dd>${Number.isFinite(i) ? i.toFixed(2) : dash}\u00A0: 1</dd></div>
        <div><dt>${lblFam}</dt><dd><strong>${escapeHtml(fam.type)}</strong></dd></div>
        <div><dt>${lblT}</dt><dd>${torqueDesign_Nm.toFixed(1)}\u00A0N\u00b7m</dd></div>
        <div><dt>${lblP}</dt><dd>${powerMotor_kW.toFixed(3)}\u00A0kW</dd></div>
      </dl>
      ${shaftBlock}
      <p class="eng-note">${escapeHtml(fam.note)}</p>
    </div>`;
}

export function renderExplanationsList(explanations, lang = getCurrentLang()) {
  if (!explanations?.length) return '';
  const en = lang === 'en';
  const h = en ? 'Engineering rationale' : 'Razonamiento de ingenier\u00eda';
  return `
    <div class="eng-block eng-block--explain eng-block--pop">
      <h3 class="eng-block__title">${h}</h3>
      <ul class="eng-explain">${explanations.map((e) => `<li>${escapeHtml(e)}</li>`).join('')}</ul>
    </div>`;
}

/**
 * @param {object} r — resultado computeFlat, computeInclined o computeCentrifugalPump
 * @param {{ shaftLabel?: string; shaftOutLabel?: string; motorSubtitle?: string; motorStrategyLabels?: { designTorqueLabel?: string; drumSpeedLabel?: string } } | undefined} [gearOpts]
 */
export function renderFullEngineeringAside(r, gearOpts) {
  const lang = gearOpts?.lang ?? getCurrentLang();
  const en = lang === 'en';
  const n = r.drumRpm ?? 0;
  const T = r.torqueWithService_Nm ?? 0;
  const P = r.requiredMotorPower_kW ?? 0;
  const ratio = requiredGearRatio(n);
  const fam = suggestGearboxFamily(ratio, lang);
  const stratTitle = en ? 'Gearmotor strategies' : 'Estrategias de motorreductor';
  const stratSub = en
    ? 'Three typical approaches; <strong>shaft diameters</strong> from torsion (indicative).'
    : 'Tres enfoques t\u00edpicos; <strong>di\u00e1metros de eje</strong> por torsi\u00f3n (valores orientativos).';
  return (
    renderGearboxSummaryHtml(n, T, P, { ...gearOpts, lang }) +
    `<div class="eng-block eng-block--strategies eng-block--pop">
      <div class="eng-block__head">
        <h3 class="eng-block__title">${stratTitle}</h3>
        <p class="eng-block__subtitle">${stratSub}</p>
      </div>
      ${renderMotorStrategiesHtml(
        buildThreeMotorStrategies(
          {
            powerMotor_kW: P,
            torqueDrumDesign_Nm: T,
            drumRpm: n,
            ratio,
            gearboxHint: fam.type,
          },
          lang,
        ),
        lang,
        gearOpts?.motorStrategyLabels,
      )}
    </div>` +
    renderExplanationsList(r.explanations, lang) +
    renderDetailedStepsTable(r, lang)
  );
}


