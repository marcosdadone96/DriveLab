/**
 * UI: recomendaciones por marca y verificación de motorreductor del usuario.
 */

import {
  BRANDS,
  getGearmodels,
  modelsForBrand,
  searchModels,
  getModelById,
  getModelDatasheetUrl,
} from '../data/gearmotorCatalog.js';
import {
  verifyGearmotorAgainstRequirement,
  scoreModelFit,
  buildManualGearmotorModel,
} from '../modules/motorVerify.js';
import {
  filterModelsByMounting,
  explainMountingFit,
  MOUNTING_GUIDE,
} from '../modules/mountingPreferences.js';
import { FEATURES } from '../config/features.js';
import { isPremiumEffective } from '../services/accessTier.js';
import { shaftSizingFromDrive } from '../modules/shaftSizing.js';

/**
 * @typedef {import('../modules/motorVerify.js').DriveRequirement} DriveRequirement
 */

/**
 * Evita NaN/Infinity en la UI (p. ej. campos vacíos) que rompen .toFixed() y dejan el bloque de motores en blanco.
 * @param {DriveRequirement} req
 * @returns {DriveRequirement}
 */
export function normalizeDriveRequirement(req) {
  const p = Number(req.power_kW);
  const t = Number(req.torque_Nm);
  const n = Number(req.drum_rpm);
  const mtRaw = req.mountingType;
  const mt =
    mtRaw === 'B3' || mtRaw === 'B5' || mtRaw === 'B14' || mtRaw === 'hollowShaft' ? mtRaw : 'B3';
  const dShaft = Number(req.machineShaftDiameter_mm);
  const machineShaftDiameter_mm = Number.isFinite(dShaft) && dShaft > 0 ? dShaft : null;
  return {
    power_kW: Number.isFinite(p) && p >= 0 ? p : 0,
    torque_Nm: Number.isFinite(t) && t >= 0 ? t : 0,
    drum_rpm: Number.isFinite(n) && n > 0 ? n : 0.01,
    mountingType: mt,
    machineShaftDiameter_mm,
    orientation: req.orientation === 'vertical' ? 'vertical' : 'horizontal',
    spaceConstraint: String(req.spaceConstraint || '').trim().slice(0, 600),
  };
}

/**
 * Mejor modelo del catálogo ejemplo para el punto calculado (prioriza unidades "suitable").
 * @param {DriveRequirement} req
 */
export function getBestCatalogPick(req) {
  const r = normalizeDriveRequirement(req);
  const { filtered: pool, relaxed: mountingCatalogRelaxed } = filterModelsByMounting(
    getGearmodels(),
    r.mountingType,
  );
  let best = null;
  let bestScore = -Infinity;
  for (const m of pool) {
    const v = verifyGearmotorAgainstRequirement(r, m);
    const s = scoreModelFit(r, m);
    if (!v.suitable) continue;
    if (s > bestScore) {
      bestScore = s;
      best = { m, verdict: v };
    }
  }
  if (!best) {
    for (const m of pool) {
      const s = scoreModelFit(r, m);
      const v = verifyGearmotorAgainstRequirement(r, m);
      if (s > bestScore) {
        bestScore = s;
        best = { m, verdict: v };
      }
    }
  }
  return best ? { ...best, mountingCatalogRelaxed } : null;
}

function datasheetLink(m) {
  const href = escapeAttr(getModelDatasheetUrl(m));
  return `<a class="reco-ficha" href="${href}" target="_blank" rel="noopener noreferrer">Ficha técnica / PDF <span aria-hidden="true">↗</span></a>`;
}

/**
 * Genera tarjetas HTML de recomendación por marca.
 * @param {DriveRequirement} req
 * @param {{ torqueLabel?: string; rpmLabel?: string; rpmShortLabel?: string; contextHtml?: string } | undefined} [copyOpts]
 */
export function renderBrandRecommendationCards(req, copyOpts) {
  const r = normalizeDriveRequirement(req);
  const mountPref = {
    mountingType: r.mountingType,
    machineShaftDiameter_mm: r.machineShaftDiameter_mm,
    orientation: r.orientation,
    spaceConstraint: r.spaceConstraint,
  };
  const pick = getBestCatalogPick(r);
  const torqueLabel = copyOpts?.torqueLabel ?? 'par en tambor';
  const rpmLabel = copyOpts?.rpmLabel ?? 'rpm del tambor';
  const contextHtml =
    copyOpts?.contextHtml ??
    `Puntos de partida según su <strong>potencia de eje</strong>, <strong>${torqueLabel}</strong> y <strong>${rpmLabel}</strong>.
        Cada tarjeta enlaza al <strong>portal de documentación</strong> del fabricante (PDF / catálogos). Valide siempre con su proveedor.`;

  const mountGuide = MOUNTING_GUIDE[r.mountingType];
  const mountPillLabel = mountGuide ? mountGuide.title : r.mountingType;

  const topShaft =
    pick &&
    Number.isFinite(r.torque_Nm) &&
    r.torque_Nm > 0 &&
    Number.isFinite(pick.m.ratio) &&
    pick.m.ratio > 0
      ? shaftSizingFromDrive({
          torqueDrum_Nm: r.torque_Nm,
          ratio: pick.m.ratio,
          etaGearbox: pick.m.eta_g ?? 0.96,
        })
      : null;

  const heroMount = pick ? explainMountingFit(pick.m, mountPref) : null;
  const outShaft = pick?.m.outputShaft;
  const outShaftLine =
    outShaft && outShaft.kind === 'hollow'
      ? `Eje hueco · Ø interior orientativo ~${outShaft.nominalDiameter_mm}\u00A0mm`
      : outShaft
        ? `Eje salida sólido · Ø orientativo ~${outShaft.nominalDiameter_mm}\u00A0mm`
        : '—';

  const topPickHtml = pick
    ? `
    <div class="reco-hero">
      <div class="reco-hero__glow" aria-hidden="true"></div>
      <div class="reco-hero__head">
        <span class="reco-hero__kicker">Recomendación principal</span>
        <h3 class="reco-hero__title">${escapeHtml(pick.m.code)}</h3>
        <p class="reco-hero__brand">${escapeHtml(BRANDS.find((b) => b.id === pick.m.brandId)?.name || pick.m.brandId)} · ${escapeHtml(pick.m.series)}</p>
      </div>
      <ul class="reco-hero__stats">
        <li><span>P motor</span><strong>${pick.m.motor_kW}\u00A0kW</strong></li>
        <li><span>Relación <var>i</var></span><strong>${Number(pick.m.ratio).toFixed(1)}</strong></li>
        <li><span>n₂ salida</span><strong>${pick.m.n2_rpm.toFixed(1)}\u00A0min⁻¹</strong></li>
        <li><span>T₂ nom.</span><strong>${pick.m.T2_nom_Nm}\u00A0N·m</strong></li>
      </ul>
      <p class="reco-hero__intro">Punto de trabajo: <strong>${r.power_kW.toFixed(3)}\u00A0kW</strong> · <strong>${r.torque_Nm.toFixed(1)}\u00A0N·m</strong> · <strong>${r.drum_rpm.toFixed(1)}\u00A0min⁻¹</strong></p>
      ${
        topShaft && Number.isFinite(topShaft.dMotor_suggest_mm)
          ? `<p class="reco-hero__shaft">Ø eje motor ≥ <strong>${topShaft.dMotor_suggest_mm.toFixed(0)}\u00A0mm</strong> · Ø salida / tambor ≥ <strong>${topShaft.dGearboxOut_suggest_mm.toFixed(0)}\u00A0mm</strong> <span class="muted">(orientativo)</span></p>`
          : ''
      }
      ${
        heroMount && mountGuide
          ? `<div class="reco-hero__integration">
        <div class="reco-hero__integration-title">Integración mecánica (su selección: ${escapeHtml(r.mountingType)})</div>
        <ul class="reco-hero__integration-list">
          <li><span>Montaje catálogo (demo)</span> <strong>${escapeHtml((pick.m.mountingTypes || []).join(' · ') || '—')}</strong></li>
          <li><span>Brida / interfaz</span> <strong>${escapeHtml(pick.m.flangeLabel || '—')}</strong></li>
          <li><span>Config. eje salida</span> <strong>${escapeHtml(pick.m.shaftConfigLabel || '')}</strong> · ${escapeHtml(outShaftLine)}</li>
        </ul>
        <p class="reco-hero__integration-why"><strong>Por qué es adecuado:</strong> ${escapeHtml(heroMount.why)}</p>
        <p class="reco-hero__integration-pros"><strong>Ventajas de este tipo de montaje:</strong> ${escapeHtml(mountGuide.pros)}</p>
        <p class="reco-hero__integration-cons muted"><strong>Límites / precaución:</strong> ${escapeHtml(mountGuide.cons)}</p>
      </div>`
          : ''
      }
      <div class="reco-hero__foot">
        <p class="reco-hero__verdict reco-hero__verdict--${pick.verdict.suitable ? 'ok' : 'warn'}">
          ${escapeHtml(pick.verdict.suitable ? 'Encaje razonable con el catálogo ejemplo — confirme con fabricante.' : 'Revisar par, rpm o potencia; compare con el resto de tarjetas.')}
        </p>
        <div class="reco-hero__actions">${datasheetLink(pick.m)}</div>
      </div>
    </div>`
    : '';

  const blocks = BRANDS.map((brand) => {
    const { filtered: brandPool } = filterModelsByMounting(modelsForBrand(brand.id), r.mountingType);
    const models = brandPool
      .map((m) => ({
        m,
        score: scoreModelFit(r, m),
        verdict: verifyGearmotorAgainstRequirement(r, m),
      }))
      .sort((a, b) => b.score - a.score);

    const top = models.slice(0, 2);
    if (!top.length) return '';

    const rows = top
      .map(({ m, verdict }) => {
        const badge = verdict.suitable
          ? '<span class="reco-chip reco-chip--ok">Encaje OK</span>'
          : '<span class="reco-chip reco-chip--warn">Revisar</span>';
        const sh =
          Number.isFinite(r.torque_Nm) && r.torque_Nm > 0 && Number.isFinite(m.ratio) && m.ratio > 0
            ? shaftSizingFromDrive({
                torqueDrum_Nm: r.torque_Nm,
                ratio: m.ratio,
                etaGearbox: m.eta_g ?? 0.96,
              })
            : null;
        const shaftLine =
          sh && Number.isFinite(sh.dMotor_suggest_mm)
            ? `<div class="reco-kv"><span class="reco-kv__k">Ø ejes (orient.)</span><span class="reco-kv__v">${sh.dMotor_suggest_mm.toFixed(0)} / ${sh.dGearboxOut_suggest_mm.toFixed(0)}\u00A0mm</span></div>`
            : '';
        const fitExpl = explainMountingFit(m, mountPref);
        const mOut = m.outputShaft;
        const mOutTxt =
          mOut && mOut.kind === 'hollow'
            ? `Hueco ~${mOut.nominalDiameter_mm}\u00A0mm`
            : mOut
              ? `Sólido ~${mOut.nominalDiameter_mm}\u00A0mm`
              : '—';
        const mountKv = `<div class="reco-kv"><span class="reco-kv__k">Montaje (IEC)</span><span class="reco-kv__v">${escapeHtml((m.mountingTypes || []).join(' · ') || '—')}</span></div>
            <div class="reco-kv"><span class="reco-kv__k">Brida</span><span class="reco-kv__v">${escapeHtml(m.flangeLabel || '—')}</span></div>
            <div class="reco-kv"><span class="reco-kv__k">Eje salida</span><span class="reco-kv__v">${escapeHtml(mOutTxt)}</span></div>`;
        return `
        <article class="reco-card">
          <div class="reco-card__accent" aria-hidden="true"></div>
          <header class="reco-card__head">
            <div class="reco-card__titles">
              <span class="reco-card__series">${escapeHtml(m.series)}</span>
              <h4 class="reco-card__code">${escapeHtml(m.code)}</h4>
            </div>
            ${badge}
          </header>
          <div class="reco-card__grid">
            <div class="reco-kv"><span class="reco-kv__k">P motor</span><span class="reco-kv__v">${m.motor_kW}\u00A0kW</span></div>
            <div class="reco-kv"><span class="reco-kv__k">n motor</span><span class="reco-kv__v">${m.motor_rpm_nom}\u00A0min⁻¹</span></div>
            <div class="reco-kv"><span class="reco-kv__k"><var>i</var></span><span class="reco-kv__v">${Number(m.ratio).toFixed(1)}\u00A0: 1</span></div>
            <div class="reco-kv"><span class="reco-kv__k">n₂</span><span class="reco-kv__v">${m.n2_rpm.toFixed(1)}\u00A0min⁻¹</span></div>
            <div class="reco-kv"><span class="reco-kv__k">T₂ nom. / pico</span><span class="reco-kv__v">${m.T2_nom_Nm} / ${m.T2_peak_Nm}\u00A0N·m</span></div>
            <div class="reco-kv"><span class="reco-kv__k">η reductor</span><span class="reco-kv__v">${(m.eta_g * 100).toFixed(0)}\u00A0%</span></div>
            <div class="reco-kv"><span class="reco-kv__k">IP · ciclo</span><span class="reco-kv__v">${escapeHtml(m.enclosure)} · ${escapeHtml(m.duty)}</span></div>
            ${mountKv}
            ${shaftLine}
          </div>
          <p class="reco-card__note">${escapeHtml(m.notes)}</p>
          <p class="reco-card__mount-note"><strong>Compatibilidad montaje:</strong> ${escapeHtml(fitExpl.why)} <span class="muted">· ${escapeHtml(fitExpl.guide.pros)}</span></p>
          <div class="reco-card__actions">${datasheetLink(m)}</div>
        </article>`;
      })
      .join('');

    return `
      <section class="reco-brand reco-brand--${escapeHtml(brand.id)}">
        <header class="reco-brand__head">
          <h3 class="reco-brand__name">${escapeHtml(brand.name)}</h3>
          <span class="reco-brand__region">${escapeHtml(brand.region)}</span>
        </header>
        <div class="reco-brand__grid">${rows}</div>
      </section>
    `;
  }).join('');

  const relaxedBanner =
    pick?.mountingCatalogRelaxed === true
      ? `<div class="reco-mounting-relaxed" role="status">
    <strong>Ningún modelo del catálogo demo encaja de forma estricta con el montaje elegido (${escapeHtml(r.mountingType)}).</strong>
    Se muestran igualmente candidatos por potencia/par/rpm — valide <em>B3 / B5 / B14 / eje hueco</em> con el fabricante antes de pedir.
  </div>`
      : '';

  const orientPill =
    r.orientation === 'vertical'
      ? '<div class="reco-pill"><span>Orientación</span><strong>Vertical</strong></div>'
      : '<div class="reco-pill"><span>Orientación</span><strong>Horizontal</strong></div>';

  const shaftPill =
    r.machineShaftDiameter_mm != null
      ? `<div class="reco-pill"><span>Ø eje máquina</span><strong>${r.machineShaftDiameter_mm}\u00A0mm</strong></div>`
      : '';

  const spaceLine =
    r.spaceConstraint.length > 0
      ? `<p class="reco-space-note"><strong>Restricción de espacio (suya):</strong> ${escapeHtml(r.spaceConstraint)} — trasladar a longitud total y gálibos en el pedido.</p>`
      : '';

  return `
    <div class="reco-shell">
    ${relaxedBanner}
    ${topPickHtml}
    <div class="reco-context">
      <p class="reco-context__text">
        ${contextHtml}
      </p>
      <div class="reco-pills">
        <div class="reco-pill"><span>P motor</span><strong>${r.power_kW.toFixed(3)} kW</strong></div>
        <div class="reco-pill"><span>T diseño</span><strong>${r.torque_Nm.toFixed(1)} N·m</strong></div>
        <div class="reco-pill"><span>${copyOpts?.rpmShortLabel ?? 'n tambor'}</span><strong>${r.drum_rpm.toFixed(2)} min⁻¹</strong></div>
        <div class="reco-pill"><span>Montaje</span><strong>${escapeHtml(mountPillLabel)}</strong></div>
        ${orientPill}
        ${shaftPill}
      </div>
      ${spaceLine}
      ${
        isPremiumEffective() && FEATURES.motorSelectionAdvanced
          ? '<p class="reco-catalog-note"><span class="premium-flag">Catálogo</span> Datos de demostración — ampliable con su base de datos o API.</p>'
          : '<p class="reco-catalog-note reco-catalog-note--muted">Catálogo de demostración; las fichas enlazan a documentación oficial.</p>'
      }
    </div>
    <div class="reco-stack">${blocks}</div>
    </div>
  `;
}

/**
 * @param {HTMLElement} root
 */
function injectManualMotorVerifyBlock(root) {
  if (root.querySelector('[data-verify-manual-wrap]')) return;
  const btn = root.querySelector('[data-verify-run]');
  if (!btn || !btn.parentNode) return;
  const wrap = document.createElement('div');
  wrap.dataset.verifyManualWrap = '';
  wrap.className = 'verify-manual-wrap';
  wrap.innerHTML = `
<details class="input-details verify-manual-details">
  <summary>O bien: introducir <strong>mi</strong> motorreductor a mano (ficha / placa)</summary>
  <p class="muted" style="margin:0.5rem 0 0.75rem;font-size:0.84rem;line-height:1.45">
    Mismos criterios que el catálogo: <strong>potencia de motor</strong>, <strong>par nominal de salida</strong> y <strong>rpm de salida del reductor</strong>
    frente al punto de trabajo calculado. El <strong>montaje IEC</strong> (B3/B5/B14/hueco) no se valida en este modo.
  </p>
  <div class="verify-grid">
    <div class="field" style="grid-column: 1 / -1">
      <label>Referencia / modelo (opcional)</label>
      <input type="text" data-verify-manual-label maxlength="160" placeholder="ej. Nord SK 42F – 132 SP/4" autocomplete="off" />
    </div>
    <div class="field">
      <label>Potencia motor <em>P</em> (placa)</label>
      <input type="number" data-verify-manual-kw step="0.01" min="0" placeholder="kW" />
    </div>
    <div class="field">
      <label>RPM salida reductor <em>n</em>₂</label>
      <input type="number" data-verify-manual-n2 step="0.1" min="0.01" placeholder="min⁻¹" />
    </div>
    <div class="field">
      <label>Par nominal salida <em>T</em>₂</label>
      <input type="number" data-verify-manual-t2 step="0.1" min="0" placeholder="N·m" />
    </div>
    <div class="field">
      <label><em>T</em>₂ pico (opcional)</label>
      <input type="number" data-verify-manual-t2peak step="0.1" min="0" placeholder="Si vacío → 1,3·T₂" />
    </div>
    <div class="field">
      <label>RPM motor nominal (opcional)</label>
      <input type="number" data-verify-manual-nmotor step="1" min="1" placeholder="ej. 1400" />
    </div>
    <div class="field">
      <label>η reductor (opcional, 0–1)</label>
      <input type="number" data-verify-manual-eta step="0.01" min="0.5" max="1" placeholder="vacío → 0,92" />
    </div>
  </div>
  <button type="button" data-verify-run-manual style="margin-top: 1rem; width: 100%" class="button button--ghost">Comprobar con estos datos</button>
</details>`;
  btn.parentNode.insertBefore(wrap, btn);
}

/**
 * @param {HTMLElement} root
 * @returns {object | null}
 */
function readManualMotorFieldsFromDom(root) {
  const num = (sel) => {
    const el = root.querySelector(sel);
    if (!(el instanceof HTMLInputElement)) return NaN;
    return parseFloat(String(el.value).replace(',', '.'));
  };
  const str = (sel) => {
    const el = root.querySelector(sel);
    if (!(el instanceof HTMLInputElement)) return '';
    return String(el.value || '').trim();
  };
  const motor_kW = num('[data-verify-manual-kw]');
  const n2_rpm = num('[data-verify-manual-n2]');
  const T2_nom_Nm = num('[data-verify-manual-t2]');
  if (!Number.isFinite(motor_kW) || motor_kW <= 0) return null;
  if (!Number.isFinite(n2_rpm) || n2_rpm <= 0) return null;
  if (!Number.isFinite(T2_nom_Nm) || T2_nom_Nm <= 0) return null;
  const T2_peak_Nm = num('[data-verify-manual-t2peak]');
  const motor_rpm_nom = num('[data-verify-manual-nmotor]');
  let eta_g = num('[data-verify-manual-eta]');
  const code = str('[data-verify-manual-label]');
  const o = {
    motor_kW,
    n2_rpm,
    T2_nom_Nm,
  };
  if (Number.isFinite(T2_peak_Nm) && T2_peak_Nm > 0) o.T2_peak_Nm = T2_peak_Nm;
  if (Number.isFinite(motor_rpm_nom) && motor_rpm_nom > 0) o.motor_rpm_nom = motor_rpm_nom;
  if (Number.isFinite(eta_g) && eta_g > 0) {
    if (eta_g > 1 && eta_g <= 100) eta_g /= 100;
    o.eta_g = eta_g;
  }
  if (code) o.code = code;
  return o;
}

/**
 * @param {import('../modules/motorVerify.js').VerifyResult} r
 * @param {import('../modules/motorVerify.js').GearmotorModel} model
 */
function renderMotorVerifyResultHtml(r, model) {
  const cls = r.suitable ? 'verify-result--ok' : 'verify-result--bad';
  const core = `
      <div class="verify-result ${cls}">
        <p class="verify-result__verdict">${escapeHtml(r.verdict)}</p>
        <ul class="verify-result__checks">${r.checks.map((c) => `<li>${escapeHtml(c)}</li>`).join('')}</ul>
        ${
          r.warnings.length
            ? `<p class="verify-result__sub">Advertencias</p><ul class="verify-result__warns">${r.warnings
                .map((w) => `<li>${escapeHtml(w)}</li>`)
                .join('')}</ul>`
            : ''
        }
        ${
          r.blockers.length
            ? `<p class="verify-result__sub">Motivos de exclusión</p><ul class="verify-result__blocks">${r.blockers
                .map((b) => `<li>${escapeHtml(b)}</li>`)
                .join('')}</ul>`
            : ''
        }
      </div>`;
  if (model.userManual) {
    return (
      core +
      `<p class="muted verify-disclaimer">
        <strong>Modo manual:</strong> solo se contrastan potencia, par nominal de salida y rpm de salida con el cálculo de la máquina.
        No sustituye ficha técnica, curvas del motor, montaje ni normativa.
      </p>`
    );
  }
  return (
    core +
    `<p class="verify-ficha">
        <a class="reco-ficha reco-ficha--inline" href="${escapeAttr(getModelDatasheetUrl(model))}" target="_blank" rel="noopener noreferrer">Documentación y fichas técnicas (${escapeHtml(BRANDS.find((b) => b.id === model.brandId)?.name || model.brandId)}) ↗</a>
      </p>
      <p class="muted verify-disclaimer">
        Si su referencia no aparece, amplíe el registro paramétrico (<code>js/data/gearmotorParametricRegistry.js</code>) o las filas demo en
        <code>js/data/gearmotorCatalog.js</code>. Esta herramienta no sustituye la validación del proveedor.
      </p>`
  );
}

/**
 * @param {HTMLElement | null} root
 * @param {() => DriveRequirement} getRequirements
 */
export function initMotorVerification(root, getRequirements) {
  if (!root) return;

  const brandEl = /** @type {HTMLSelectElement | null} */ (root.querySelector('[data-verify-brand]'));
  const modelSelect = /** @type {HTMLSelectElement | null} */ (root.querySelector('[data-verify-model]'));
  const modelSearch = /** @type {HTMLInputElement | null} */ (root.querySelector('[data-verify-search]'));
  const btn = /** @type {HTMLButtonElement | null} */ (root.querySelector('[data-verify-run]'));
  const out = root.querySelector('[data-verify-out]');

  if (!brandEl || !modelSelect || !btn || !out) return;

  injectManualMotorVerifyBlock(root);
  const btnManual = /** @type {HTMLButtonElement | null} */ (root.querySelector('[data-verify-run-manual]'));

  function refillModels() {
    const bid = brandEl.value;
    const q = modelSearch ? modelSearch.value : '';
    const list = searchModels(bid, q);
    modelSelect.innerHTML =
      '<option value="">— Elija modelo del catálogo ejemplo —</option>' +
      list
        .map(
          (m) =>
            `<option value="${escapeAttr(m.id)}">${escapeHtml(m.code)} · ${m.motor_kW} kW · ${m.n2_rpm.toFixed(0)} min⁻¹</option>`,
        )
        .join('');
  }

  brandEl.addEventListener('change', refillModels);
  modelSearch?.addEventListener('input', refillModels);
  btn.addEventListener('click', () => {
    const id = modelSelect.value;
    const model = getModelById(id);
    const req = normalizeDriveRequirement(getRequirements());
    if (!model) {
      out.innerHTML = `<p class="verify-result verify-result--warn">Seleccione un modelo de la lista (catálogo de demostración).</p>`;
      return;
    }
    const r = verifyGearmotorAgainstRequirement(req, model);
    out.innerHTML = renderMotorVerifyResultHtml(r, model);
  });

  btnManual?.addEventListener('click', () => {
    const raw = readManualMotorFieldsFromDom(root);
    if (!raw) {
      out.innerHTML = `<p class="verify-result verify-result--warn">Rellene <strong>potencia motor (kW)</strong>, <strong>rpm salida del reductor</strong> y <strong>par nominal T₂ (N·m)</strong>.</p>`;
      return;
    }
    const model = buildManualGearmotorModel(raw);
    const req = normalizeDriveRequirement(getRequirements());
    const r = verifyGearmotorAgainstRequirement(req, model);
    out.innerHTML = renderMotorVerifyResultHtml(r, model);
  });

  refillModels();
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, '&#39;');
}


