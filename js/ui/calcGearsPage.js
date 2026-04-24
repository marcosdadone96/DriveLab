import { mountTierStatusBar } from './paywallMount.js';
import { computeSpurGearPair } from '../lab/gears.js';
import { computeAgmaSimplifiedCheck } from '../lab/agmaSpurSimplified.js';
import { renderGearPairDiagram } from '../lab/diagramGears.js';
import {
  bindLabUnitSelectors,
  formatLength,
  formatLinearSpeed,
  formatRotation,
  getLabUnitPrefs,
} from '../lab/labUnitPrefs.js';
import { mountCompactLabFieldHelp } from './labHelpCompact.js';
import { injectLabUnitConverterIfNeeded, mountLabUnitConverter } from '../lab/labUnitConvert.js';
import { setLabPurchaseFromShoppingLines } from './labPurchaseSuggestions.js';
import {
  debounce,
  labAlert,
  metricHtml,
  renderMotorPowerRuler,
  renderResultHero,
  runCalcWithIndustrialFeedback,
} from './labCalcUx.js';
import { emitEngineeringSnapshot } from '../services/engineeringSnapshot.js';
import { metricsFromGears } from '../services/iaAdvisor.js';
import { bootSmartDashboardIfEnabled } from './smartDashboardBoot.js';

mountTierStatusBar();
bootSmartDashboardIfEnabled('Engranajes · laboratorio');
injectLabUnitConverterIfNeeded();
mountLabUnitConverter();
mountCompactLabFieldHelp();

function read(id, fallback) {
  const el = document.getElementById(id);
  if (!el || !(el instanceof HTMLInputElement)) return fallback;
  const n = parseFloat(String(el.value).replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
}

function readOptional(id) {
  const el = document.getElementById(id);
  if (!el || !(el instanceof HTMLInputElement)) return null;
  const s = el.value.trim();
  if (s === '') return null;
  const n = parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function elementCardHtml(title, rows) {
  const body = rows
    .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`)
    .join('');
  return `<article class="lab-element-card"><h4 class="lab-element-card__title">${esc(title)}</h4><dl class="lab-element-card__kv">${body}</dl></article>`;
}

function powerKwFromInputs(n1_rpm, Topt, Popt) {
  if (Topt != null && Topt > 0 && n1_rpm > 0) {
    const omega = (2 * Math.PI * n1_rpm) / 60;
    return (Topt * omega) / 1000;
  }
  if (Popt != null && Popt > 0) return Popt;
  return null;
}

function refreshCore() {
  const u = getLabUnitPrefs();
  const lubeEl = document.getElementById('gLube');
  const lube = lubeEl instanceof HTMLSelectElement && lubeEl.value === 'grease' ? 'grease' : 'oil';

  const n1In = read('gN1', 1455);
  const p = {
    z1: read('gZ1', 20),
    z2: read('gZ2', 45),
    module_mm: read('gM', 2.5),
    pressureAngle_deg: read('gAlpha', 20),
    n1: n1In,
    faceWidth_mm: read('gFace', 28),
  };
  const r = computeSpurGearPair(p);

  const Topt = readOptional('gTorque');
  const Popt = readOptional('gPower');
  const P_kw = powerKwFromInputs(n1In, Topt, Popt);

  const agma = computeAgmaSimplifiedCheck({
    z1: r.z1,
    z2: r.z2,
    module_mm: r.module_mm,
    d1_mm: r.d1,
    faceWidth_mm: r.faceWidth_mm ?? read('gFace', 28),
    n1_rpm: r.n1 ?? 0,
    torquePinion_Nm: Topt ?? undefined,
    powerPinion_kW: Topt != null ? undefined : Popt ?? undefined,
    lubrication: lube,
  });

  const heroEl = document.getElementById('gHero');
  if (heroEl) {
    const heroItems = [];
    heroItems.push({
      label: 'ω₂ — velocidad angular · rueda 2 (conducida)',
      display: r.n2 != null ? formatRotation(r.n2, u.rotation) : '—',
      hint:
        r.n2 != null
          ? 'Salida en el primitivo; ω₂/ω₁ = z₁/z₂.'
          : 'Indique giro de entrada &gt; 0 para obtener la salida.',
    });
    if (P_kw != null) {
      heroItems.push({
        label: 'Potencia en piñón',
        display: `${P_kw.toFixed(2)} kW`,
        hint: Topt != null ? 'Calculada a partir del par y el giro.' : 'Valor introducido o estimado.',
      });
    } else {
      heroItems.push({
        label: 'Potencia en piñón',
        display: '—',
        hint: 'Opcional: potencia o par para AGMA y regla de motor.',
      });
    }
    heroEl.innerHTML = renderResultHero(heroItems);
  }

  const motorEl = document.getElementById('gMotorCompare');
  if (motorEl) {
    motorEl.innerHTML = P_kw != null && P_kw > 0 ? renderMotorPowerRuler(P_kw) : '';
  }

  const i = r.ratio_transmission;
  const elementBox = document.getElementById('gElementResults');
  if (elementBox) {
    elementBox.innerHTML = [
      elementCardHtml('Rueda 1 · Piñón (motriz)', [
        ['Dientes (z)', String(r.z1)],
        ['Diam. primitivo (d)', formatLength(r.d1, u.length)],
        ['Diam. cabeza (da)', formatLength(r.da1, u.length)],
        ['Diam. pie (db)', formatLength(r.db1, u.length)],
        ['Velocidad (n)', formatRotation(r.n1, u.rotation)],
      ]),
      elementCardHtml('Rueda 2 · Conducida', [
        ['Dientes (z)', String(r.z2)],
        ['Diam. primitivo (d)', formatLength(r.d2, u.length)],
        ['Diam. cabeza (da)', formatLength(r.da2, u.length)],
        ['Diam. pie (db)', formatLength(r.db2, u.length)],
        ['Velocidad (n)', formatRotation(r.n2, u.rotation)],
      ]),
    ].join('');
  }

  const box = document.getElementById('gResults');
  if (box) {
    box.innerHTML = [
      metricHtml(
        'Relación de dientes (z₂/z₁)',
        i.toFixed(2),
        `Reductor típico: la rueda 2 gira más lento; por cada vuelta de la rueda 2 el piñón (rueda 1) da ${(1 / i).toFixed(2)} vueltas.`,
      ),
      metricHtml(
        'Velocidad lineal en primitivo · rueda 1 (piñón)',
        formatLinearSpeed(r.v_pitch_m_s, u.linear),
        'Donde ruedan los dientes del piñón; condiciona lubricación.',
      ),
      metricHtml(
        'Distancia entre ejes',
        formatLength(r.centerDistance_mm, u.length),
        'Mitad de la suma de primitivos en exterior estándar.',
      ),
      metricHtml(
        'd₁ — diámetro primitivo · rueda 1 (piñón)',
        formatLength(r.d1, u.length),
        'd₁ = m × z₁ en rectos sin corrección.',
      ),
      metricHtml(
        'd₂ — diámetro primitivo · rueda 2 (conducida)',
        formatLength(r.d2, u.length),
        'd₂ = m × z₂.',
      ),
      metricHtml(
        'Ancho de cara',
        formatLength(r.faceWidth_mm ?? 0, u.length),
        'Longitud axial útil de engrane.',
      ),
      metricHtml(
        'dₐ₁ — diámetro de cabeza · rueda 1 (piñón)',
        formatLength(r.da1, u.length),
        'Addendum típico ha = m.',
      ),
      metricHtml(
        'dₐ₂ — diámetro de cabeza · rueda 2 (conducida)',
        formatLength(r.da2, u.length),
        'Addendum típico ha = m.',
      ),
      metricHtml(
        'dᵦ₁ — diámetro de pie · rueda 1 (piñón)',
        formatLength(r.db1, u.length),
        'Dedendum orientativo ~1,25m.',
      ),
      metricHtml(
        'dᵦ₂ — diámetro de pie · rueda 2 (conducida)',
        formatLength(r.db2, u.length),
        'Dedendum orientativo ~1,25m.',
      ),
      metricHtml(
        'ω₁ — velocidad angular · rueda 1 (piñón, entrada)',
        formatRotation(r.n1, u.rotation),
        'Mismo dato que en el formulario, en las unidades elegidas arriba.',
      ),
      metricHtml(
        'ω₂ — velocidad angular · rueda 2 (conducida, salida)',
        formatRotation(r.n2, u.rotation),
        'Salida cinemática en el primitivo.',
      ),
    ].join('');

    if (agma.hasLoad) {
      box.innerHTML += [
        metricHtml(
          'Carga tangencial (piñón · rueda 1)',
          `${agma.tangentialLoad_N.toFixed(2)} N`,
          `Fₜ ≈ T/(d₁/2). Con par o potencia en piñón. Y forma Lewis ≈ ${agma.lewisY.toFixed(2)}.`,
        ),
        metricHtml(
          'Tensión de flexión (Lewis, orient.)',
          `${agma.bendingStress_MPa.toFixed(2)} MPa`,
          'Modelo educativo; no sustituye AGMA completo.',
        ),
        metricHtml(
          'Tensión de contacto (orient.)',
          `${agma.contactStress_MPa.toFixed(2)} MPa`,
          'Aproximación acero–acero; valide con norma y material.',
        ),
        metricHtml(
          'Margen a flexión (SF)',
          agma.bendingSafety_SF.toFixed(2),
          `Referencia admisible demo ≈ ${Number(agma.allowableBending_MPa).toFixed(2)} MPa. Valores &gt;1 suelen buscarse en diseño.`,
        ),
        metricHtml(
          'Margen a contacto (SH)',
          agma.contactSafety_SH.toFixed(2),
          `Referencia admisible demo ≈ ${Number(agma.allowableContact_MPa).toFixed(2)} MPa.`,
        ),
      ].join('');
    }
  }

  const alerts = document.getElementById('gAlerts');
  if (alerts) {
    const parts = [];
    agma.velocityAlerts.forEach((a) => {
      parts.push(labAlert(a.level === 'danger' ? 'danger' : 'warn', esc(a.text)));
    });
    if (agma.hasLoad) {
      if (agma.bendingSafety_SF < 1.05) {
        parts.push(
          labAlert(
            'danger',
            'SF ≤ 1,05: flexión aparentemente insuficiente con el modelo simplificado — revise carga, b, m y material.',
          ),
        );
      } else if (agma.bendingSafety_SF < 1.4) {
        parts.push(labAlert('warn', 'SF moderado: margen de flexión bajo para servicio industrial típico.'));
      }
      if (agma.contactSafety_SH < 1.05) {
        parts.push(
          labAlert('danger', 'SH ≤ 1,05: riesgo de fatiga de pitting aparente (modelo simplificado).'),
        );
      } else if (agma.contactSafety_SH < 1.2) {
        parts.push(labAlert('warn', 'SH moderado: confirme durezas y acabado de flancos.'));
      }
      if (agma.bendingSafety_SF >= 1.4 && agma.contactSafety_SH >= 1.2) {
        parts.push(
          labAlert(
            'ok',
            'Márgenes SF/SH aparentemente holgados con el modelo simplificado — valide siempre con norma y datos de material.',
          ),
        );
      }
    } else {
      parts.push(
        labAlert(
          'info',
          `${esc(agma.disclaimer)} Introduzca <strong>P</strong> o <strong>T</strong> en el piñón para estimar σ_F, σ_H y factores SF/SH.`,
        ),
      );
    }
    alerts.innerHTML = parts.join('');
  }

  const sub = document.getElementById('gSubstitution');
  if (sub && r.n1 != null) {
    const n2 = (r.n1 * r.z1) / r.z2;
    const vps = formatLinearSpeed(r.v_pitch_m_s, u.linear);
    const d1s = formatLength(r.d1, u.length);
    sub.innerHTML = `
      <details class="calc-substitution">
        <summary class="calc-substitution__summary">
          <span class="calc-substitution__title">Sustitución — de dientes a velocidad de salida</span>
        </summary>
        <div class="calc-substitution__inner">
          <p class="calc-substitution__step">
            Relación cinemática en el primitivo: <code>n₂ = n₁ · z₁ / z₂</code>
          </p>
          <p class="calc-substitution__step">
            En <strong>RPM</strong> (cálculo numérico, rueda 2): <code>n₂ = ${r.n1.toFixed(2)} × ${r.z1} / ${r.z2} = ${n2.toFixed(2)} RPM</code>
          </p>
          <p class="calc-substitution__step">
            Mismo giro de salida en sus unidades elegidas: <strong>${formatRotation(n2, u.rotation)}</strong>
          </p>
          <p class="calc-substitution__step">
            Velocidad en primitivo · rueda 1 (piñón): <strong>${vps}</strong> (<code>d₁ = ${d1s}</code>).
          </p>
        </div>
      </details>`;
  } else if (sub) {
    sub.innerHTML = '';
  }

  renderGearPairDiagram(document.getElementById('gDiagram'), p);

  const shoppingLines = [
    {
      commerceId: 'gear-pair-quote',
      qty: 1,
      note: `m = ${r.module_mm} mm · z₁/z₂ = ${r.z1}/${r.z2}`,
    },
  ];
  emitEngineeringSnapshot({
    page: 'calc-gears',
    moduleLabel: 'Engranajes cilíndricos',
    advisorContext: {
      safetyMargins: agma.hasLoad
        ? [
            { label: 'SF flexión (modelo demo)', value: agma.bendingSafety_SF },
            { label: 'SH contacto (modelo demo)', value: agma.contactSafety_SH },
          ]
        : [],
    },
    shoppingLines,
    metrics: metricsFromGears(agma),
  });
  setLabPurchaseFromShoppingLines(document.getElementById('labPurchaseSuggestions'), shoppingLines, [
    {
      label: 'Herramientas modulo / engrane',
      searchQuery: `modulo engranaje ${r.module_mm} mm herramienta`,
    },
  ]);
}

const resultsWrap = document.getElementById('gResultsWrap');
const debounced = debounce(() => runCalcWithIndustrialFeedback(resultsWrap, refreshCore), 55);

bindLabUnitSelectors(debounced);

['gZ1', 'gZ2', 'gM', 'gFace', 'gAlpha', 'gN1', 'gPower', 'gTorque', 'gLube'].forEach((id) => {
  document.getElementById(id)?.addEventListener('input', debounced);
  document.getElementById(id)?.addEventListener('change', debounced);
});
runCalcWithIndustrialFeedback(resultsWrap, refreshCore);
