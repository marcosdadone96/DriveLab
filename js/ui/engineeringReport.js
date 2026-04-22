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
      return `${v.toFixed(3)}\u00A0kW`;
    case 'N':
      return `${v.toFixed(1)}\u00A0N`;
    case 'm':
      return `${v.toFixed(3)}\u00A0m`;
    case 'm/s':
      return `${v.toFixed(3)}\u00A0m/s`;
    case 'm/s²':
    case 'm/s2':
      return `${v.toFixed(4)}\u00A0m/s²`;
    case 'kg/s':
      return `${v.toFixed(4)}\u00A0kg/s`;
    case 's':
      return `${v.toFixed(2)}\u00A0s`;
    case 'kg':
      return `${v.toFixed(3)}\u00A0kg`;
    case 'W':
      return `${v.toFixed(1)}\u00A0W`;
    case '%':
      return `${v.toFixed(1)}\u00A0%`;
    case 'min⁻¹':
    case '1/min':
      return `${v.toFixed(2)}\u00A0min⁻¹`;
    default:
      return `${v.toFixed(3)} ${escapeHtml(unit)}`.trim();
  }
}

/**
 * @param {{ steps?: Array<{ title: string; formula: string; substitution: string; value: number; unit: string; meaning: string }> }} r
 */
export function renderDetailedStepsTable(r) {
  if (!r.steps || !r.steps.length) return '';
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
        <span class="step-card__subst-label">Datos sustituidos</span>
        <div class="step-card__subst-val">${escapeHtml(s.substitution)}</div>
      </div>
      <div class="step-card__out">
        <span class="step-card__out-label">Resultado</span>
        <span class="step-card__out-num">${formatStepValue(s.value, s.unit)}</span>
      </div>
      <p class="step-card__meaning">${escapeHtml(s.meaning)}</p>
    </article>`,
    )
    .join('');

  return `
    <details class="eng-expand eng-expand--steps">
      <summary class="eng-expand__summary">
        <span class="eng-expand__summary-title">Desglose paso a paso (opcional)</span>
        <span class="eng-expand__summary-hint">${r.steps.length} pasos · magnitudes SI</span>
      </summary>
      <div class="eng-expand__body">
        <p class="eng-expand__lead">Detalle para quien quiera auditar el modelo. Lo habitual es quedarse con el resumen de tambor y las recomendaciones de motor.</p>
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
  const shaftLabel = opts?.shaftLabel ?? 'tambor';
  const shaftOutLabel = opts?.shaftOutLabel ?? 'Salida reductor / tambor';
  const motorSubtitle =
    opts?.motorSubtitle ?? 'Referencias a motor asíncrono ~4 polos, red 50\u00A0Hz.';
  const i = requiredGearRatio(drumRpm);
  const fam = suggestGearboxFamily(i);
  const shafts =
    Number.isFinite(torqueDesign_Nm) && torqueDesign_Nm > 0 && Number.isFinite(i) && i > 0
      ? shaftSizingFromDrive({ torqueDrum_Nm: torqueDesign_Nm, ratio: i })
      : null;

  const shaftBlock =
    shafts && Number.isFinite(shafts.dMotor_suggest_mm)
      ? `
      <div class="shaft-snap">
        <div class="shaft-snap__title">Ejes — diámetro mínimo orientativo (torsión)</div>
        <p class="shaft-snap__note">Tensión tangencial de referencia ≈ ${(shafts.tau_used_Pa / 1e6).toFixed(0)}\u00A0MPa en eje macizo; sin llave ni fatiga detallada. Subir a tamaño comercial y validar con fabricante.</p>
        <dl class="shaft-snap__dl">
          <div><dt>Eje motor (antes del reductor)</dt><dd>≥ ${shafts.dMotor_min_mm.toFixed(1)}\u00A0mm → uso común ≥ <strong>${shafts.dMotor_suggest_mm.toFixed(0)}\u00A0mm</strong> <span class="shaft-snap__torque">(par ≈ ${shafts.torqueMotor_Nm.toFixed(2)}\u00A0N·m)</span></dd></div>
          <div><dt>${escapeHtml(shaftOutLabel)}</dt><dd>≥ ${shafts.dGearboxOut_min_mm.toFixed(1)}\u00A0mm → uso común ≥ <strong>${shafts.dGearboxOut_suggest_mm.toFixed(0)}\u00A0mm</strong> <span class="shaft-snap__torque">(par de diseño en ${escapeHtml(shaftLabel)})</span></dd></div>
        </dl>
      </div>`
      : '';

  return `
    <div class="eng-block eng-block--gear eng-block--pop">
      <div class="eng-block__head">
        <h3 class="eng-block__title">Reductor: relación y familia orientativa</h3>
        <p class="eng-block__subtitle">${escapeHtml(motorSubtitle)}</p>
      </div>
      <dl class="gear-dl">
        <div><dt>Velocidad de giro (${escapeHtml(shaftLabel)})</dt><dd>${drumRpm.toFixed(2)}\u00A0min⁻¹</dd></div>
        <div><dt>Velocidad de giro motor de referencia</dt><dd>${TYPICAL_MOTOR_NOMINAL_RPM}\u00A0min⁻¹</dd></div>
        <div><dt>Relación aproximada <var>i</var></dt><dd>${Number.isFinite(i) ? i.toFixed(2) : '—'}\u00A0: 1</dd></div>
        <div><dt>Familia sugerida</dt><dd><strong>${escapeHtml(fam.type)}</strong></dd></div>
        <div><dt>Par de diseño (${escapeHtml(shaftLabel)})</dt><dd>${torqueDesign_Nm.toFixed(1)}\u00A0N·m</dd></div>
        <div><dt>Potencia de eje motor orientativa</dt><dd>${powerMotor_kW.toFixed(3)}\u00A0kW</dd></div>
      </dl>
      ${shaftBlock}
      <p class="eng-note">${escapeHtml(fam.note)}</p>
    </div>`;
}

export function renderExplanationsList(explanations) {
  if (!explanations?.length) return '';
  return `
    <div class="eng-block eng-block--explain eng-block--pop">
      <h3 class="eng-block__title">Razonamiento de ingeniería</h3>
      <ul class="eng-explain">${explanations.map((e) => `<li>${escapeHtml(e)}</li>`).join('')}</ul>
    </div>`;
}

/**
 * @param {object} r — resultado computeFlat, computeInclined o computeCentrifugalPump
 * @param {{ shaftLabel?: string; shaftOutLabel?: string; motorSubtitle?: string } | undefined} [gearOpts]
 */
export function renderFullEngineeringAside(r, gearOpts) {
  const n = r.drumRpm ?? 0;
  const T = r.torqueWithService_Nm ?? 0;
  const P = r.requiredMotorPower_kW ?? 0;
  return (
    renderGearboxSummaryHtml(n, T, P, gearOpts) +
    `<div class="eng-block eng-block--strategies eng-block--pop">
      <div class="eng-block__head">
        <h3 class="eng-block__title">Estrategias de motorreductor</h3>
        <p class="eng-block__subtitle">Tres enfoques típicos; <strong>diámetros de eje</strong> por torsión (valores orientativos).</p>
      </div>
      ${renderMotorStrategiesHtml(
        buildThreeMotorStrategies({
          powerMotor_kW: P,
          torqueDrumDesign_Nm: T,
          drumRpm: n,
          ratio: requiredGearRatio(n),
          gearboxHint: suggestGearboxFamily(requiredGearRatio(n)).type,
        }),
      )}
    </div>` +
    renderExplanationsList(r.explanations) +
    renderDetailedStepsTable(r)
  );
}


