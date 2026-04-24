import { mountTierStatusBar } from './paywallMount.js';
import {
  V_BELT_PROFILES,
  SYNC_PITCH_PRESETS,
  POLY_V_PROFILES,
  computeBeltDriveTransmission,
} from '../lab/beltDrives.js';
import { renderBeltDriveDiagram } from '../lab/diagramBelts.js';
import {
  bindLabUnitSelectors,
  formatLength,
  formatLinearSpeed,
  formatRotation,
  getLabUnitPrefs,
} from '../lab/labUnitPrefs.js';
import { mountCompactLabFieldHelp } from './labHelpCompact.js';
import { injectLabUnitConverterIfNeeded, mountLabUnitConverter } from '../lab/labUnitConvert.js';
import { debounce, labAlert, metricHtml, renderResultHero, runCalcWithIndustrialFeedback } from './labCalcUx.js';
import { commerceIdForBeltSelection } from '../data/commerceCatalog.js';
import { emitEngineeringSnapshot } from '../services/engineeringSnapshot.js';
import { setLabPurchaseFromShoppingLines } from './labPurchaseSuggestions.js';
import { metricsFromBeltType } from '../services/iaAdvisor.js';
import { bindCommerceFilteredSelect } from './commerceSelectBind.js';
import { bootSmartDashboardIfEnabled } from './smartDashboardBoot.js';

mountTierStatusBar();
bootSmartDashboardIfEnabled('Correas · laboratorio');
injectLabUnitConverterIfNeeded();
mountLabUnitConverter();

function read(id, fallback) {
  const el = document.getElementById(id);
  if (!el || !(el instanceof HTMLInputElement)) return fallback;
  const n = parseFloat(String(el.value).replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
}

function readSelect(id, fallback) {
  const el = document.getElementById(id);
  if (!el || !(el instanceof HTMLSelectElement)) return fallback;
  return el.value || fallback;
}

function readOptionalNonNeg(id) {
  const el = document.getElementById(id);
  if (!el || !(el instanceof HTMLInputElement)) return null;
  const s = el.value.trim();
  if (s === '') return null;
  const n = parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : null;
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

bindCommerceFilteredSelect('bVProfile', V_BELT_PROFILES, 'id', 'label', (o) => `belt-v-${o.id}`);
bindCommerceFilteredSelect('bPolyProfile', POLY_V_PROFILES, 'id', 'label', (o) => `belt-poly-${o.id}`);
bindCommerceFilteredSelect(
  'bSyncPitch',
  SYNC_PITCH_PRESETS.map((o) => ({ id: o.id, label: o.label })),
  'id',
  'label',
  (o) => `belt-sync-${o.id}`,
);
const vProf = document.getElementById('bVProfile');
if (vProf instanceof HTMLSelectElement) vProf.value = 'SPA';
const syncSel = document.getElementById('bSyncPitch');
if (syncSel instanceof HTMLSelectElement) syncSel.value = '5';

mountCompactLabFieldHelp();

/** @returns {import('../lab/beltDrives.js').BeltDriveType} */
function currentBeltType() {
  const el = document.getElementById('bBeltType');
  return /** @type {import('../lab/beltDrives.js').BeltDriveType} */ (
    el instanceof HTMLSelectElement ? el.value : 'v_trapezoidal'
  );
}

function syncBeltFormUi() {
  const t = currentBeltType();
  document.querySelectorAll('[data-belt-show]').forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    const modes = (node.getAttribute('data-belt-show') || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    node.classList.toggle('belt-row--hidden', !modes.includes(t));
  });
}

function buildParams() {
  const beltType = currentBeltType();
  const C = read('bC', 520);
  const n1 = read('bN1', 0);
  const base = {
    beltType,
    center_mm: C,
    n1_rpm: n1 > 0 ? n1 : undefined,
    vBeltProfileId: readSelect('bVProfile', 'SPA'),
    polyVProfileId: readSelect('bPolyProfile', 'PK'),
    syncPitchId: readSelect('bSyncPitch', '5'),
  };

  if (beltType === 'synchronous') {
    return {
      ...base,
      Z1: read('bZ1', 20),
      Z2: read('bZ2', 40),
      slip_pct: 0,
    };
  }

  return {
    ...base,
    d1_mm: read('bD1', 125),
    d2_mm: read('bD2', 280),
    slip_pct: read('bSlip', 2),
  };
}

function renderSpeedVerdictEl(r) {
  const wrap = document.getElementById('bSpeedVerdict');
  if (!wrap) return;
  const sv = r.speedVerdict;
  if (!sv || sv.key === 'unknown') {
    wrap.innerHTML = '';
    return;
  }
  const level =
    sv.key === 'optimal' ? 'optimal' : sv.key === 'low' ? 'low' : sv.key === 'critical' ? 'critical' : 'info';
  wrap.innerHTML = `
    <div class="lab-belt-speed-verdict lab-belt-speed-verdict--${level}" role="status">
      <span class="lab-belt-speed-verdict__badge" aria-hidden="true">${
        level === 'optimal' ? '✓' : level === 'low' ? '!' : level === 'critical' ? '⚠' : '·'
      }</span>
      <div class="lab-belt-speed-verdict__text">
        <strong class="lab-belt-speed-verdict__title">${esc(sv.title)}</strong>
        <span class="lab-belt-speed-verdict__detail">${esc(sv.detail)}</span>
      </div>
      <span class="lab-belt-speed-verdict__v">v ≈ ${r.beltSpeed_m_s != null && Number.isFinite(r.beltSpeed_m_s) ? `${r.beltSpeed_m_s.toFixed(2)} m/s` : '—'}</span>
    </div>`;
}

function refreshCore() {
  const u = getLabUnitPrefs();
  const p = buildParams();
  const r = computeBeltDriveTransmission(p);
  const bt = r.beltType;

  const heroEl = document.getElementById('bHero');
  if (heroEl) {
    const hint2 =
      bt === 'synchronous'
        ? 'Engrane por dientes: misma v sin patín cinemático (modelo ideal).'
        : 'Incluye deslizamiento modelado en la conducida (V / plana / Poly-V).';
    heroEl.innerHTML = renderResultHero([
      {
        label: 'ω₂ — velocidad angular · polea 2 (conducida)',
        display: r.n2_rpm != null ? formatRotation(r.n2_rpm, u.rotation) : '—',
        hint: hint2,
      },
      {
        label: 'Velocidad lineal de correa (primitivo · polea 1)',
        display: formatLinearSpeed(r.beltSpeed_m_s, u.linear),
        hint: 'v = ω₁ · r₁ = π d₁ n₁ / 60 000 (d₁ en mm, n₁ en RPM → m/s).',
      },
    ]);
  }

  renderSpeedVerdictEl(r);

  const elementBox = document.getElementById('bElementResults');
  if (elementBox) {
    const p1Rows = [
      ['Diam. primitivo (d1)', formatLength(r.d1, u.length)],
      ['Velocidad (n1)', formatRotation(r.n1_rpm, u.rotation)],
      ['Vel. lineal correa (v)', formatLinearSpeed(r.beltSpeed_m_s, u.linear)],
    ];
    const p2Rows = [
      ['Diam. primitivo (d2)', formatLength(r.d2, u.length)],
      ['Velocidad (n2)', r.n2_rpm != null ? formatRotation(r.n2_rpm, u.rotation) : '—'],
      ['Relación (i)', r.ratio_i.toFixed(2)],
    ];
    if (bt === 'synchronous' && r.Z1 != null && r.Z2 != null) {
      p1Rows.unshift(['Dientes (Z1)', String(r.Z1)]);
      p2Rows.unshift(['Dientes (Z2)', String(r.Z2)]);
    } else {
      p2Rows.push(['Deslizamiento (s)', `${r.slip_pct.toFixed(2)} %`]);
    }
    elementBox.innerHTML = [
      elementCardHtml('Polea 1 · Motriz', p1Rows),
      elementCardHtml('Polea 2 · Conducida', p2Rows),
    ].join('');
  }

  const box = document.getElementById('bResults');
  if (box) {
    const cells = [
      metricHtml(
        'Tipo y referencia',
        esc(r.profileNote),
        'Identificación de perfil o paso; selección de servicio en catálogo y norma citada.',
      ),
      metricHtml(
        'Relación de transmisión i (≈ d₂/d₁ o Z₂/Z₁)',
        r.ratio_i.toFixed(2),
        'Reductor si i &gt; 1 (salida más lenta que entrada en el modelo habitual).',
      ),
      metricHtml(
        'Longitud primitiva L (aprox.)',
        formatLength(r.beltLength_mm, u.length),
        'Tramo abierto: L ≈ 2C + π(d₁+d₂)/2 + (d₂−d₁)²/(4C).',
      ),
      metricHtml(
        'Distancia entre ejes C',
        formatLength(r.center_mm, u.length),
        'Influye en abrazamiento y flecha del ramal.',
      ),
    ];

    if (bt === 'synchronous' && r.Z1 != null && r.Z2 != null) {
      cells.push(
        metricHtml(
          'Z₁ — dientes · polea 1 (motriz)',
          String(r.Z1),
          `Diámetro primitivo D₁ = p·Z₁/π = ${formatLength(r.d1, u.length)}.`,
        ),
        metricHtml(
          'Z₂ — dientes · polea 2 (conducida)',
          String(r.Z2),
          `D₂ = p·Z₂/π = ${formatLength(r.d2, u.length)}.`,
        ),
      );
    } else {
      cells.push(
        metricHtml(
          'd₁ — primitivo · polea 1 (motriz)',
          formatLength(r.d1, u.length),
          'Referencia de velocidad periférica.',
        ),
        metricHtml(
          'd₂ — primitivo · polea 2 (conducida)',
          formatLength(r.d2, u.length),
          'Salida cinemática antes/después de deslizamiento según tipo.',
        ),
      );
    }

    if (r.slipApplied) {
      cells.push(
        metricHtml(
          'Deslizamiento s (modelo)',
          `${r.slip_pct.toFixed(2)} %`,
          'Aplicado sobre n₂ teórica en correas flexibles.',
        ),
        metricHtml(
          'ω₂,teo — polea 2 (sin patín)',
          r.n2_rpm_theoretical != null ? formatRotation(r.n2_rpm_theoretical, u.rotation) : '—',
          'n₂,teo = n₁ · d₁/d₂.',
        ),
        metricHtml(
          'ω₂ — polea 2 (real)',
          r.n2_rpm != null ? formatRotation(r.n2_rpm, u.rotation) : '—',
          'n₂,real = n₂,teo · (1 − s).',
        ),
      );
    } else {
      cells.push(
        metricHtml(
          'ω₂ — polea 2 (síncrona)',
          r.n2_rpm != null ? formatRotation(r.n2_rpm, u.rotation) : '—',
          'n₂ = n₁ · Z₁/Z₂ = n₁ · D₁/D₂.',
        ),
      );
    }

    cells.push(
      metricHtml(
        'Velocidad lineal v (primitivo motriz)',
        formatLinearSpeed(r.beltSpeed_m_s, u.linear),
        'Criterio del veredicto de seguridad: &lt; 5 m/s baja · 5–30 m/s óptimo · &gt; 30 m/s crítico.',
      ),
      metricHtml(
        'Arco de abrazamiento · polea menor',
        `${r.wrapAngle_deg_small.toFixed(2)}°`,
        bt === 'flat' || bt === 'poly_v'
          ? 'Adherencia y potencia transmitible dependen fuertemente del arco (correa plana / Poly-V).'
          : 'Suele ser la polea más exigente en adherencia (correa flexible).',
      ),
      metricHtml(
        'Arco de abrazamiento · polea mayor',
        `${r.wrapAngle_deg_large.toFixed(2)}°`,
        'Tramo envuelto en la polea mayor.',
      ),
      metricHtml(
        'ω₁ — polea 1 (motriz)',
        formatRotation(r.n1_rpm, u.rotation),
        'Entrada del formulario.',
      ),
    );

    box.innerHTML = cells.join('');
  }

  const alerts = document.getElementById('bAlerts');
  if (alerts) {
    if (r.geometryValid === false) {
      alerts.innerHTML = labAlert('danger', `${esc(r.geometryNote)} Ajuste C o diámetros antes de usar el resultado.`);
    } else {
      alerts.innerHTML = labAlert(
        'info',
        `${esc(r.profileNote)} · Compruebe tensado, alineación y datos de catálogo para el dimensionado final.`,
      );
    }
  }

  const sub = document.getElementById('bSubstitution');
  if (sub && r.n1_rpm != null && r.beltSpeed_m_s != null) {
    const w1 = ((2 * Math.PI) / 60) * r.n1_rpm;
    const vDisp = formatLinearSpeed(r.beltSpeed_m_s, u.linear);
    let body = '';

    if (bt === 'synchronous' && r.pitch_mm != null && r.Z1 != null && r.Z2 != null) {
      const p = r.pitch_mm;
      const D1 = r.d1;
      const D2 = r.d2;
      const n2 = r.n2_rpm;
      body = `
        <p class="calc-substitution__step">
          Primitivos: <code>D = p·Z/π</code> →
          <code>D₁ = ${p.toFixed(3)} × ${r.Z1} / π = ${D1.toFixed(2)} mm</code>,
          <code>D₂ = ${p.toFixed(3)} × ${r.Z2} / π = ${D2.toFixed(2)} mm</code>
        </p>
        <p class="calc-substitution__step">
          Velocidad angular motriz: <code>ω₁ = 2π n₁/60 = ${w1.toFixed(2)} rad/s</code>
        </p>
        <p class="calc-substitution__step">
          Velocidad lineal: <code>v = ω₁ · (D₁/2000) = ${r.beltSpeed_m_s.toFixed(2)} m/s</code> → <strong>${vDisp}</strong>
        </p>
        <p class="calc-substitution__step">
          Salida (sin deslizamiento): <code>n₂ = n₁ · D₁/D₂ = ${r.n1_rpm.toFixed(2)} × ${D1.toFixed(2)} / ${D2.toFixed(2)} = ${n2 != null ? n2.toFixed(2) : '—'} RPM</code>
        </p>`;
    } else {
      const d1 = r.d1;
      const d2 = r.d2;
      const s = r.slip_pct / 100;
      const n2t = r.n2_rpm_theoretical;
      const n2r = r.n2_rpm;
      body = `
        <p class="calc-substitution__step">
          Velocidad angular: <code>ω₁ = 2π n₁/60 = ${w1.toFixed(2)} rad/s</code>
        </p>
        <p class="calc-substitution__step">
          Velocidad lineal en primitivo motriz: <code>v = ω₁ · (d₁/2000) = ${r.beltSpeed_m_s.toFixed(2)} m/s</code> → <strong>${vDisp}</strong>
          <span class="calc-substitution__muted">(equivalente <code>v = π d₁ n₁ / 60 000</code> con d₁ en mm)</span>
        </p>
        <p class="calc-substitution__step">
          Giro teórico conducida: <code>n₂,teo = n₁ · d₁/d₂ = ${r.n1_rpm.toFixed(2)} × ${d1.toFixed(2)} / ${d2.toFixed(2)} = ${n2t != null ? n2t.toFixed(2) : '—'} RPM</code>
        </p>
        ${
          r.slipApplied
            ? `<p class="calc-substitution__step">
          Deslizamiento: <code>s = ${r.slip_pct.toFixed(2)} %</code> → <code>n₂,real = n₂,teo · (1−s) = ${n2r != null ? n2r.toFixed(2) : '—'} RPM</code> → <strong>${formatRotation(n2r, u.rotation)}</strong>
        </p>`
            : ''
        }`;
    }

    sub.innerHTML = `
      <details class="calc-substitution">
        <summary class="calc-substitution__summary">
          <span class="calc-substitution__title">Sustitución — cinemática y velocidad</span>
        </summary>
        <div class="calc-substitution__inner">
          ${body}
        </div>
      </details>`;
  } else if (sub) {
    sub.innerHTML = '';
  }

  renderBeltDriveDiagram(document.getElementById('bDiagram'), r);

  const pKw = readOptionalNonNeg('bPowerKw');
  const beltCommerceId = commerceIdForBeltSelection(bt, {
    vProfileId: readSelect('bVProfile', 'SPA'),
    polyProfileId: readSelect('bPolyProfile', 'PK'),
    syncPitchId: readSelect('bSyncPitch', '5'),
  });
  const shoppingLines = [{ commerceId: beltCommerceId, qty: 1, note: esc(r.profileNote) }];
  emitEngineeringSnapshot({
    page: 'calc-belts',
    moduleLabel: 'Correas',
    advisorContext: {
      belt: { beltType: bt, powerKw: pKw },
    },
    shoppingLines,
    metrics: metricsFromBeltType(bt),
  });
  setLabPurchaseFromShoppingLines(document.getElementById('labPurchaseSuggestions'), shoppingLines);
}

syncBeltFormUi();

const wrap = document.getElementById('bResultsWrap');
const debounced = debounce(() => runCalcWithIndustrialFeedback(wrap, refreshCore), 55);

bindLabUnitSelectors(debounced);

document.getElementById('bBeltType')?.addEventListener('change', () => {
  syncBeltFormUi();
  debounced();
});

[
  'bVProfile',
  'bPolyProfile',
  'bSyncPitch',
  'bZ1',
  'bZ2',
  'bD1',
  'bD2',
  'bC',
  'bN1',
  'bSlip',
  'bPowerKw',
].forEach((id) => {
  document.getElementById(id)?.addEventListener('input', debounced);
  document.getElementById(id)?.addEventListener('change', debounced);
});

runCalcWithIndustrialFeedback(wrap, refreshCore);
