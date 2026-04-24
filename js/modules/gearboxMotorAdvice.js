/**
 * Relación de reducción, tipo de reductor orientativo y tres estrategias de motorreductor.
 * Orientación de ingeniería — siempre validar con catálogo del fabricante.
 */

import { shaftSizingFromDrive } from './shaftSizing.js';
import { getCurrentLang } from '../config/locales.js';

/** RPM síncronos de referencia (4 polos, red 50 Hz ≈ 1500 min⁻¹ síncrono; asíncrono ~1450–1480). */
export const TYPICAL_MOTOR_SYNC_RPM = 1500;
export const TYPICAL_MOTOR_NOMINAL_RPM = 1455;

/**
 * @param {number} drumRpm
 * @param {number} [motorRpmNominal]
 */
export function requiredGearRatio(drumRpm, motorRpmNominal = TYPICAL_MOTOR_NOMINAL_RPM) {
  if (!Number.isFinite(drumRpm) || drumRpm <= 0) return NaN;
  return motorRpmNominal / drumRpm;
}

/**
 * @param {number} ratio
 * @returns {{ type: string; note: string }}
 */
export function suggestGearboxFamily(ratio, lang = getCurrentLang()) {
  const en = lang === 'en';
  if (!Number.isFinite(ratio) || ratio <= 0) {
    return {
      type: '\u2014',
      note: en ? 'Drum speed is not valid.' : 'Velocidad de giro del tambor no v\u00e1lida.',
    };
  }
  if (ratio > 70) {
    return en
      ? {
          type: 'Worm-wheel or multi-stage high ratio',
          note: 'Very high ratios: lower gearbox efficiency, self-locking can help on inclines; more heat to shed.',
        }
      : {
          type: 'Sinf\u00edn-corona o multicuerpo alto \u00edndice',
          note: 'Ratios muy altos: rendimiento \u03b7 menor, autoblocante \u00fatil en inclinaci\u00f3n; disipa m\u00e1s calor.',
        };
  }
  if (ratio > 35) {
    return en
      ? {
          type: '2–3 stage helical or bevel-helical',
          note: 'Common balance in conveying: good efficiency and life.',
        }
      : {
          type: 'Helicoidal 2\u20133 etapas o bevel-helicoidal',
          note: 'Equilibrio habitual en transporte: buena \u03b7 y vida \u00fatil.',
        };
  }
  if (ratio > 12) {
    return en
      ? {
          type: 'Two-stage helical or planetary',
          note: 'Planetary if you need compact size and high torque.',
        }
      : {
          type: 'Helicoidal 2 etapas o planetario',
          note: 'Planetario si se busca masa/tama\u00f1o reducido y alto par.',
        };
  }
  return en
    ? {
        type: '1–2 stage helical or coaxial',
        note: 'Moderate ratio: often a 4-pole motor with a compact gearbox.',
      }
    : {
        type: 'Helicoidal 1\u20132 etapas o coaxial',
        note: 'Ratio moderado: posible motor de 4 polos directo con reductor compacto.',
      };
}

/**
 * Tres propuestas conceptuales (no sustituyen selección de catálogo).
 * @param {object} p
 * @param {number} p.powerMotor_kW
 * @param {number} p.torqueDrumDesign_Nm — par en tambor con márgenes
 * @param {number} p.drumRpm
 * @param {number} p.ratio
 * @param {string} p.gearboxHint
 */
export function buildThreeMotorStrategies(p, lang = getCurrentLang()) {
  const en = lang === 'en';
  const P = Math.max(0, p.powerMotor_kW || 0);
  const T = Math.max(0, p.torqueDrumDesign_Nm || 0);
  const n = Math.max(0.01, p.drumRpm || 0.01);
  const i = Number.isFinite(p.ratio) ? p.ratio : 0;
  const gb = p.gearboxHint || '';

  return en
    ? [
        {
          id: 'balanced',
          title: '1. Balanced solution (reference)',
          motor_kW: Math.max(0.25, P * 1.0),
          philosophy:
            'IE3 4-pole motor + helical/bevel-helical gearbox (e.g. SEW R/K, Nord SK, Bonfiglioli A, Motovario H). Good trade-off of efficiency, cost, and availability.',
          gearbox: i > 40 ? 'K / SK two-stage bevel-helical' : 'R / H helical',
          brands: 'SEW-Eurodrive (R/K), Nord (SK), Bonfiglioli (A), Motovario (H)',
          torque_Nm: T,
          drum_rpm: n,
          ratio: i,
          risks:
            'For S4/S5 duty or very frequent starts, upsize frame or review gearbox thermal capacity.',
        },
        {
          id: 'efficiency',
          title: '2. Maximum operating efficiency',
          motor_kW: Math.max(0.25, P * 1.05),
          philosophy:
            'IE4/IE5 + high-efficiency gearbox (two-stage helical or premium planetary). Lower energy long-term; higher upfront cost.',
          gearbox: i > 30 ? 'Premium planetary or two-stage helical (I²t class)' : 'Coaxial helical (SIMOGEAR D, Lenze)',
          brands: 'Siemens Simogear, SEW-Eurodrive (IE4), Nord, Bonfiglioli (A)',
          torque_Nm: T,
          drum_rpm: n,
          ratio: i,
          risks:
            'Ensure the duty point is not so lightly loaded that motor power factor or efficiency suffers.',
        },
        {
          id: 'cost',
          title: '3. Cost-focused (initial price)',
          motor_kW: Math.max(0.25, P * 1.08),
          philosophy:
            'Standard IE3 + worm or helical-worm when ratio is high; lower purchase price, more gearbox loss and possibly more cooling.',
          gearbox: i > 50 ? 'Worm (Motovario NMRV, Bonfiglioli VF, etc.)' : 'Standard-duty helical input',
          brands: 'Motovario (NMRV), Bonfiglioli (VF), Motovario (H)',
          torque_Nm: T,
          drum_rpm: n,
          ratio: i,
          risks:
            'Worm overheating risk at high continuous duty; check output torque and S1 time in the catalog.',
        },
      ]
    : [
        {
          id: 'balanced',
          title: '1. Soluci\u00f3n equilibrada (referencia)',
          motor_kW: Math.max(0.25, P * 1.0),
          philosophy:
            'Motor IE3 4 polos + reductor helicoidal/bevel-helicoidal (p. ej. SEW R/K, Nord SK, Bonfiglioli A, Motovario H). Buen compromiso \u03b7, coste y stock.',
          gearbox: i > 40 ? 'K / SK bevel-helicoidal 2 etapas' : 'R / H helicoidal',
          brands: 'SEW-Eurodrive (R/K), Nord (SK), Bonfiglioli (A), Motovario (H)',
          torque_Nm: T,
          drum_rpm: n,
          ratio: i,
          risks:
            'Si el ciclo es S4/S5 o arranques muy frecuentes, subir un escal\u00f3n de marco o revisar t\u00e9rmica del reductor.',
        },
        {
          id: 'efficiency',
          title: '2. M\u00e1xima eficiencia operativa',
          motor_kW: Math.max(0.25, P * 1.05),
          philosophy:
            'IE4/IE5 + reductor de alta \u03b7 (helicoidal de 2 etapas o planetario de gama alta). Menor consumo a largo plazo; inversi\u00f3n inicial mayor.',
          gearbox: i > 30 ? 'Planetario premium o helicoidal 2 etapas clase I\u00b2t' : 'Helicoidal coaxial (SIMOGEAR D, Lenze)',
          brands: 'Siemens Simogear, SEW-Eurodrive (IE4), Nord, Bonfiglioli (A)',
          torque_Nm: T,
          drum_rpm: n,
          ratio: i,
          risks:
            'Comprobar que el punto de trabajo no quede con factor de utilizaci\u00f3n tan bajo que penalice el cos \u03c6 o la \u03b7 del motor.',
        },
        {
          id: 'cost',
          title: '3. Enfoque econ\u00f3mico (coste inicial)',
          motor_kW: Math.max(0.25, P * 1.08),
          philosophy:
            'Motor IE3 est\u00e1ndar + sinf\u00edn-corona o helicoidal-worm si el ratio es alto; menor precio, mayor p\u00e9rdida en reductor y posible necesidad de mayor refrigeraci\u00f3n.',
          gearbox: i > 50 ? 'Sinf\u00edn (Motovario NMRV, Bonfiglioli VF, etc.)' : 'Helicoidal entrada de gama est\u00e1ndar',
          brands: 'Motovario (NMRV), Bonfiglioli (VF), Motovario (H)',
          torque_Nm: T,
          drum_rpm: n,
          ratio: i,
          risks:
            'Riesgo de sobrecalentamiento del sinf\u00edn en servicio continuo alto; par de salida y tiempo S1 a revisar en cat\u00e1logo.',
        },
      ];
}

/**
 * HTML block for strategies (Spanish).
 * @param {ReturnType<typeof buildThreeMotorStrategies>} strategies
 * @param {{ designTorqueLabel?: string; drumSpeedLabel?: string } | undefined} [labelOverrides] — e.g. screw lift vs drum
 */
export function renderMotorStrategiesHtml(strategies, lang = getCurrentLang(), labelOverrides) {
  const en = lang === 'en';
  const lblMotorP = en ? 'Indicative motor shaft power' : 'Potencia de eje motor (orientativa)';
  const lblTorque =
    labelOverrides?.designTorqueLabel ?? (en ? 'Design torque at drum' : 'Par de dise\u00f1o en tambor');
  const lblSpeed =
    labelOverrides?.drumSpeedLabel ??
    (en ? 'Drum speed / ratio <var>i</var>' : 'Velocidad tambor / relaci\u00f3n <var>i</var>');
  const lblGb = en ? 'Suggested gearbox' : 'Reductor sugerido';
  const lblBrands = en ? 'Reference brands' : 'Marcas de referencia';
  const crit = en ? 'Rationale:' : 'Criterio:';
  const risk = en ? 'Risks / checks:' : 'Riesgos / revisiones:';
  const shaftTitle = en ? 'Shafts (SI, indicative)' : 'Ejes (SI, orientativo)';
  const shaftMotor = en ? 'Motor shaft' : 'Eje motor';
  const shaftOut = en ? 'Gearbox output / drum' : 'Salida reductor / tambor';
  const minLbl = en ? 'min.' : 'm\u00edn.';
  return `
    <div class="strategy-stack">
      ${strategies
        .map(
          (s) => {
            const sh =
              Number.isFinite(s.torque_Nm) &&
              s.torque_Nm > 0 &&
              Number.isFinite(s.ratio) &&
              s.ratio > 0
                ? shaftSizingFromDrive({ torqueDrum_Nm: s.torque_Nm, ratio: s.ratio })
                : null;
            const shaftRows =
              sh && Number.isFinite(sh.dMotor_suggest_mm)
                ? `<div class="strategy-card__shaft">
              <div class="strategy-card__shaft-title">${shaftTitle}</div>
              <ul class="strategy-card__shaft-list">
                <li><span>${shaftMotor}</span> <strong>\u2265 ${sh.dMotor_suggest_mm.toFixed(0)}\u00A0mm</strong> <em>(${minLbl} ${sh.dMotor_min_mm.toFixed(1)}\u00A0mm)</em></li>
                <li><span>${shaftOut}</span> <strong>\u2265 ${sh.dGearboxOut_suggest_mm.toFixed(0)}\u00A0mm</strong> <em>(${minLbl} ${sh.dGearboxOut_min_mm.toFixed(1)}\u00A0mm)</em></li>
              </ul>
            </div>`
                : '';
            return `
        <article class="strategy-card">
          <h4 class="strategy-card__title">${escapeHtml(s.title)}</h4>
          <dl class="strategy-card__dl">
            <div><dt>${lblMotorP}</dt><dd>${s.motor_kW.toFixed(2)}\u00A0kW</dd></div>
            <div><dt>${lblTorque}</dt><dd>${s.torque_Nm.toFixed(1)}\u00A0N\u00b7m</dd></div>
            <div><dt>${lblSpeed}</dt><dd>${s.drum_rpm.toFixed(2)}\u00A0min\u207b\u00b9 \u00b7 <var>i</var> \u2248 ${s.ratio.toFixed(1)}\u00A0: 1 \u00b7 ref. motor ~${TYPICAL_MOTOR_NOMINAL_RPM}\u00A0min\u207b\u00b9</dd></div>
            <div><dt>${lblGb}</dt><dd>${escapeHtml(s.gearbox)}</dd></div>
            <div><dt>${lblBrands}</dt><dd>${escapeHtml(s.brands)}</dd></div>
          </dl>
          ${shaftRows}
          <p class="strategy-card__why"><strong>${crit}</strong> ${escapeHtml(s.philosophy)}</p>
          <p class="strategy-card__risk"><strong>${risk}</strong> ${escapeHtml(s.risks)}</p>
        </article>`;
          },
        )
        .join('')}
    </div>`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
