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
  MOUNTING_GUIDE_EN,
} from '../modules/mountingPreferences.js';
import { FEATURES } from '../config/features.js';
import { isPremiumEffective } from '../services/accessTier.js';
import { shaftSizingFromDrive } from '../modules/shaftSizing.js';
import { getCurrentLang } from '../config/locales.js';

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
  const en = getCurrentLang() === 'en';
  const label = en ? 'Technical datasheet / PDF' : 'Ficha t\u00e9cnica / PDF';
  return `<a class="reco-ficha" href="${href}" target="_blank" rel="noopener noreferrer">${label} <span aria-hidden="true">\u2197</span></a>`;
}

/**
 * Genera tarjetas HTML de recomendación por marca.
 * @param {DriveRequirement} req
 * @param {{ torqueLabel?: string; rpmLabel?: string; rpmShortLabel?: string; contextHtml?: string } | undefined} [copyOpts]
 */
export function renderBrandRecommendationCards(req, copyOpts) {
  const en = getCurrentLang() === 'en';
  const r = normalizeDriveRequirement(req);
  const mountPref = {
    mountingType: r.mountingType,
    machineShaftDiameter_mm: r.machineShaftDiameter_mm,
    orientation: r.orientation,
    spaceConstraint: r.spaceConstraint,
  };
  const pick = getBestCatalogPick(r);
  const torqueLabel = copyOpts?.torqueLabel ?? (en ? 'torque at drum' : 'par en tambor');
  const rpmLabel = copyOpts?.rpmLabel ?? (en ? 'drum rpm' : 'rpm del tambor');
  const contextHtml =
    copyOpts?.contextHtml ??
    (en
      ? `Starting points from your <strong>shaft power</strong>, <strong>${torqueLabel}</strong>, and <strong>${rpmLabel}</strong>.
        Each card links to the manufacturer\u2019s <strong>documentation portal</strong> (PDF / catalogs). Always confirm with your supplier.`
      : `Puntos de partida seg\u00fan su <strong>potencia de eje</strong>, <strong>${torqueLabel}</strong> y <strong>${rpmLabel}</strong>.
        Cada tarjeta enlaza al <strong>portal de documentaci\u00f3n</strong> del fabricante (PDF / cat\u00e1logos). Valide siempre con su proveedor.`);

  const mountGuide = (en ? MOUNTING_GUIDE_EN : MOUNTING_GUIDE)[r.mountingType];
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
      ? en
        ? `Hollow shaft \u00b7 indicative bore ~${outShaft.nominalDiameter_mm}\u00A0mm`
        : `Eje hueco \u00b7 \u00d8 interior orientativo ~${outShaft.nominalDiameter_mm}\u00A0mm`
      : outShaft
        ? en
          ? `Solid output \u00b7 indicative OD ~${outShaft.nominalDiameter_mm}\u00A0mm`
          : `Eje salida s\u00f3lido \u00b7 \u00d8 orientativo ~${outShaft.nominalDiameter_mm}\u00A0mm`
        : '\u2014';

  const heroTop = en ? 'Top pick' : 'Recomendaci\u00f3n principal';
  const heroN2 = en ? 'n\u2082 out' : 'n\u2082 salida';
  const heroIntro = en ? 'Operating point:' : 'Punto de trabajo:';
  const heroOrient = en ? 'indicative' : 'orientativo';
  const heroInteg = en
    ? `Mechanical integration (your selection: ${escapeHtml(r.mountingType)})`
    : `Integraci\u00f3n mec\u00e1nica (su selecci\u00f3n: ${escapeHtml(r.mountingType)})`;
  const heroCat = en ? 'Catalog mount (demo)' : 'Montaje cat\u00e1logo (demo)';
  const heroFlange = en ? 'Flange / interface' : 'Brida / interfaz';
  const heroOut = en ? 'Output shaft config' : 'Config. eje salida';
  const heroWhy = en ? 'Why it fits:' : 'Por qu\u00e9 es adecuado:';
  const heroPros = en ? 'Advantages of this mounting:' : 'Ventajas de este tipo de montaje:';
  const heroCons = en ? 'Limits / caution:' : 'L\u00edmites / precauci\u00f3n:';
  const heroVerdictOk = en
    ? 'Reasonable match to the demo catalog \u2014 confirm with manufacturer.'
    : 'Encaje razonable con el cat\u00e1logo ejemplo \u2014 confirme con fabricante.';
  const heroVerdictWarn = en
    ? 'Review torque, rpm, or power; compare other cards.'
    : 'Revisar par, rpm o potencia; compare con el resto de tarjetas.';
  const heroShaftLine =
    topShaft && Number.isFinite(topShaft.dMotor_suggest_mm)
      ? en
        ? `<p class="reco-hero__shaft">Motor shaft OD \u2265 <strong>${topShaft.dMotor_suggest_mm.toFixed(0)}\u00A0mm</strong> \u00b7 Output / drum OD \u2265 <strong>${topShaft.dGearboxOut_suggest_mm.toFixed(0)}\u00A0mm</strong> <span class="muted">(${heroOrient})</span></p>`
        : `<p class="reco-hero__shaft">\u00d8 eje motor \u2265 <strong>${topShaft.dMotor_suggest_mm.toFixed(0)}\u00A0mm</strong> \u00b7 \u00d8 salida / tambor \u2265 <strong>${topShaft.dGearboxOut_suggest_mm.toFixed(0)}\u00A0mm</strong> <span class="muted">(${heroOrient})</span></p>`
      : '';

  const topPickHtml = pick
    ? `
    <div class="reco-hero">
      <div class="reco-hero__glow" aria-hidden="true"></div>
      <div class="reco-hero__head">
        <span class="reco-hero__kicker">${heroTop}</span>
        <h3 class="reco-hero__title">${escapeHtml(pick.m.code)}</h3>
        <p class="reco-hero__brand">${escapeHtml(BRANDS.find((b) => b.id === pick.m.brandId)?.name || pick.m.brandId)} · ${escapeHtml(pick.m.series)}</p>
      </div>
      <ul class="reco-hero__stats">
        <li><span>${en ? 'Motor P' : 'P motor'}</span><strong>${pick.m.motor_kW}\u00A0kW</strong></li>
        <li><span>${en ? 'Ratio' : 'Relaci\u00f3n'} <var>i</var></span><strong>${Number(pick.m.ratio).toFixed(1)}</strong></li>
        <li><span>${heroN2}</span><strong>${pick.m.n2_rpm.toFixed(1)}\u00A0min\u207b\u00b9</strong></li>
        <li><span>${en ? 'T\u2082 nom.' : 'T\u2082 nom.'}</span><strong>${pick.m.T2_nom_Nm}\u00A0N\u00b7m</strong></li>
      </ul>
      <p class="reco-hero__intro">${heroIntro} <strong>${r.power_kW.toFixed(3)}\u00A0kW</strong> \u00b7 <strong>${r.torque_Nm.toFixed(1)}\u00A0N\u00b7m</strong> \u00b7 <strong>${r.drum_rpm.toFixed(1)}\u00A0min\u207b\u00b9</strong></p>
      ${heroShaftLine}
      ${
        heroMount && mountGuide
          ? `<div class="reco-hero__integration">
        <div class="reco-hero__integration-title">${heroInteg}</div>
        <ul class="reco-hero__integration-list">
          <li><span>${heroCat}</span> <strong>${escapeHtml((pick.m.mountingTypes || []).join(' · ') || '\u2014')}</strong></li>
          <li><span>${heroFlange}</span> <strong>${escapeHtml(pick.m.flangeLabel || '\u2014')}</strong></li>
          <li><span>${heroOut}</span> <strong>${escapeHtml(pick.m.shaftConfigLabel || '')}</strong> \u00b7 ${escapeHtml(outShaftLine)}</li>
        </ul>
        <p class="reco-hero__integration-why"><strong>${heroWhy}</strong> ${escapeHtml(heroMount.why)}</p>
        <p class="reco-hero__integration-pros"><strong>${heroPros}</strong> ${escapeHtml(mountGuide.pros)}</p>
        <p class="reco-hero__integration-cons muted"><strong>${heroCons}</strong> ${escapeHtml(mountGuide.cons)}</p>
      </div>`
          : ''
      }
      <div class="reco-hero__foot">
        <p class="reco-hero__verdict reco-hero__verdict--${pick.verdict.suitable ? 'ok' : 'warn'}">
          ${escapeHtml(pick.verdict.suitable ? heroVerdictOk : heroVerdictWarn)}
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
          ? `<span class="reco-chip reco-chip--ok">${en ? 'Fit OK' : 'Encaje OK'}</span>`
          : `<span class="reco-chip reco-chip--warn">${en ? 'Review' : 'Revisar'}</span>`;
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
            ? `<div class="reco-kv"><span class="reco-kv__k">${en ? 'Shaft ODs (indic.)' : '\u00d8 ejes (orient.)'}</span><span class="reco-kv__v">${sh.dMotor_suggest_mm.toFixed(0)} / ${sh.dGearboxOut_suggest_mm.toFixed(0)}\u00A0mm</span></div>`
            : '';
        const fitExpl = explainMountingFit(m, mountPref);
        const mOut = m.outputShaft;
        const mOutTxt =
          mOut && mOut.kind === 'hollow'
            ? en
              ? `Hollow ~${mOut.nominalDiameter_mm}\u00A0mm`
              : `Hueco ~${mOut.nominalDiameter_mm}\u00A0mm`
            : mOut
              ? en
                ? `Solid ~${mOut.nominalDiameter_mm}\u00A0mm`
                : `S\u00f3lido ~${mOut.nominalDiameter_mm}\u00A0mm`
              : '\u2014';
        const mountKv = `<div class="reco-kv"><span class="reco-kv__k">${en ? 'Mount (IEC)' : 'Montaje (IEC)'}</span><span class="reco-kv__v">${escapeHtml((m.mountingTypes || []).join(' · ') || '\u2014')}</span></div>
            <div class="reco-kv"><span class="reco-kv__k">${en ? 'Flange' : 'Brida'}</span><span class="reco-kv__v">${escapeHtml(m.flangeLabel || '\u2014')}</span></div>
            <div class="reco-kv"><span class="reco-kv__k">${en ? 'Output shaft' : 'Eje salida'}</span><span class="reco-kv__v">${escapeHtml(mOutTxt)}</span></div>`;
        const mountCompat = en ? 'Mounting fit:' : 'Compatibilidad montaje:';
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
            <div class="reco-kv"><span class="reco-kv__k">${en ? 'Motor P' : 'P motor'}</span><span class="reco-kv__v">${m.motor_kW}\u00A0kW</span></div>
            <div class="reco-kv"><span class="reco-kv__k">${en ? 'Motor n' : 'n motor'}</span><span class="reco-kv__v">${m.motor_rpm_nom}\u00A0min\u207b\u00b9</span></div>
            <div class="reco-kv"><span class="reco-kv__k"><var>i</var></span><span class="reco-kv__v">${Number(m.ratio).toFixed(1)}\u00A0: 1</span></div>
            <div class="reco-kv"><span class="reco-kv__k">n\u2082</span><span class="reco-kv__v">${m.n2_rpm.toFixed(1)}\u00A0min\u207b\u00b9</span></div>
            <div class="reco-kv"><span class="reco-kv__k">${en ? 'T\u2082 nom. / peak' : 'T\u2082 nom. / pico'}</span><span class="reco-kv__v">${m.T2_nom_Nm} / ${m.T2_peak_Nm}\u00A0N\u00b7m</span></div>
            <div class="reco-kv"><span class="reco-kv__k">${en ? 'Gearbox \u03b7' : '\u03b7 reductor'}</span><span class="reco-kv__v">${(m.eta_g * 100).toFixed(0)}\u00A0%</span></div>
            <div class="reco-kv"><span class="reco-kv__k">IP \u00b7 ${en ? 'duty' : 'ciclo'}</span><span class="reco-kv__v">${escapeHtml(m.enclosure)} \u00b7 ${escapeHtml(m.duty)}</span></div>
            ${mountKv}
            ${shaftLine}
          </div>
          <p class="reco-card__note">${escapeHtml(m.notes)}</p>
          <p class="reco-card__mount-note"><strong>${mountCompat}</strong> ${escapeHtml(fitExpl.why)} <span class="muted">\u00b7 ${escapeHtml(fitExpl.guide.pros)}</span></p>
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
      ? en
        ? `<div class="reco-mounting-relaxed" role="status">
    <strong>No demo catalog model is a strict match for the selected mounting (${escapeHtml(r.mountingType)}).</strong>
    Candidates are still shown by power/torque/rpm \u2014 confirm <em>B3 / B5 / B14 / hollow shaft</em> with the manufacturer before ordering.
  </div>`
        : `<div class="reco-mounting-relaxed" role="status">
    <strong>Ning\u00fan modelo del cat\u00e1logo demo encaja de forma estricta con el montaje elegido (${escapeHtml(r.mountingType)}).</strong>
    Se muestran igualmente candidatos por potencia/par/rpm \u2014 valide <em>B3 / B5 / B14 / eje hueco</em> con el fabricante antes de pedir.
  </div>`
      : '';

  const orientPill =
    r.orientation === 'vertical'
      ? `<div class="reco-pill"><span>${en ? 'Orientation' : 'Orientaci\u00f3n'}</span><strong>Vertical</strong></div>`
      : `<div class="reco-pill"><span>${en ? 'Orientation' : 'Orientaci\u00f3n'}</span><strong>Horizontal</strong></div>`;

  const shaftPill =
    r.machineShaftDiameter_mm != null
      ? `<div class="reco-pill"><span>${en ? 'Machine shaft OD' : '\u00d8 eje m\u00e1quina'}</span><strong>${r.machineShaftDiameter_mm}\u00A0mm</strong></div>`
      : '';

  const spaceLine =
    r.spaceConstraint.length > 0
      ? en
        ? `<p class="reco-space-note"><strong>Your space note:</strong> ${escapeHtml(r.spaceConstraint)} \u2014 carry over to total length and envelopes in the RFQ.</p>`
        : `<p class="reco-space-note"><strong>Restricci\u00f3n de espacio (suya):</strong> ${escapeHtml(r.spaceConstraint)} \u2014 trasladar a longitud total y g\u00e1libos en el pedido.</p>`
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
        <div class="reco-pill"><span>${en ? 'Motor P' : 'P motor'}</span><strong>${r.power_kW.toFixed(3)} kW</strong></div>
        <div class="reco-pill"><span>${en ? 'Design T' : 'T dise\u00f1o'}</span><strong>${r.torque_Nm.toFixed(1)} N\u00b7m</strong></div>
        <div class="reco-pill"><span>${copyOpts?.rpmShortLabel ?? (en ? 'Drum n' : 'n tambor')}</span><strong>${r.drum_rpm.toFixed(2)} min\u207b\u00b9</strong></div>
        <div class="reco-pill"><span>${en ? 'Mount' : 'Montaje'}</span><strong>${escapeHtml(mountPillLabel)}</strong></div>
        ${orientPill}
        ${shaftPill}
      </div>
      ${spaceLine}
      ${
        isPremiumEffective() && FEATURES.motorSelectionAdvanced
          ? en
            ? '<p class="reco-catalog-note"><span class="premium-flag">Catalog</span> Demo data \u2014 extendable with your database or API.</p>'
            : '<p class="reco-catalog-note"><span class="premium-flag">Cat\u00e1logo</span> Datos de demostraci\u00f3n \u2014 ampliable con su base de datos o API.</p>'
          : en
            ? '<p class="reco-catalog-note reco-catalog-note--muted">Demo catalog; datasheet links point to official documentation.</p>'
            : '<p class="reco-catalog-note reco-catalog-note--muted">Cat\u00e1logo de demostraci\u00f3n; las fichas enlazan a documentaci\u00f3n oficial.</p>'
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
  const en = getCurrentLang() === 'en';
  const wrap = document.createElement('div');
  wrap.dataset.verifyManualWrap = '';
  wrap.className = 'verify-manual-wrap';
  wrap.innerHTML = en
    ? `
<details class="input-details verify-manual-details">
  <summary>Or: enter <strong>my</strong> gearmotor manually (nameplate / datasheet)</summary>
  <p class="muted" style="margin:0.5rem 0 0.75rem;font-size:0.84rem;line-height:1.45">
    Same checks as the catalog: <strong>motor P</strong>, <strong>rated T\u2082</strong>, and <strong>n\u2082</strong> vs the computed duty.
    IEC mounting is not validated here. Use <strong>?</strong> on each field.
  </p>
  <div class="verify-grid">
    <div class="field" style="grid-column: 1 / -1">
      <label>Reference <span class="info-chip" title="Label for reports only; does not change the verification math." aria-label="Manual reference help.">?</span></label>
      <input type="text" data-verify-manual-label maxlength="160" placeholder="e.g. Nord SK 42F - 132 SP/4" autocomplete="off" />
      <span class="field-hint">opt.</span>
    </div>
    <div class="field">
      <label><em>P</em> motor <span class="info-chip" title="Motor nameplate power (kW), not gearbox output power." aria-label="Motor kW help.">?</span></label>
      <input type="number" data-verify-manual-kw step="0.01" min="0" placeholder="kW" />
      <span class="field-hint">kW</span>
    </div>
    <div class="field">
      <label><em>n</em>\u2082 out <span class="info-chip" title="Output shaft speed (min\u207b\u00b9); should cover required drum rpm." aria-label="n2 help.">?</span></label>
      <input type="number" data-verify-manual-n2 step="0.1" min="0.01" placeholder="min\u207b\u00b9" />
      <span class="field-hint">min\u207b\u00b9</span>
    </div>
    <div class="field">
      <label><em>T</em>\u2082 rated <span class="info-chip" title="Continuous rated torque at gearbox output (N\u00b7m), per datasheet." aria-label="T2 help.">?</span></label>
      <input type="number" data-verify-manual-t2 step="0.1" min="0" placeholder="N\u00b7m" />
      <span class="field-hint">N\u00b7m</span>
    </div>
    <div class="field">
      <label><em>T</em>\u2082 peak <span class="info-chip" title="Short-time peak torque. Empty: defaults to 1.3 x T\u2082 rated." aria-label="T2 peak help.">?</span></label>
      <input type="number" data-verify-manual-t2peak step="0.1" min="0" placeholder="opt." />
      <span class="field-hint">opt.</span>
    </div>
    <div class="field">
      <label><em>n</em> motor <span class="info-chip" title="Motor synchronous/nominal rpm (e.g. 1400 min\u207b\u00b9). Optional; improves verification notes." aria-label="Motor rpm help.">?</span></label>
      <input type="number" data-verify-manual-nmotor step="1" min="1" placeholder="e.g. 1400" />
      <span class="field-hint">opt.</span>
    </div>
    <div class="field">
      <label>Gearbox \u03b7 <span class="info-chip" title="Gearbox efficiency (0-1). Empty: 0.92. If you enter 92 (%), it is converted to 0.92." aria-label="Eta g help.">?</span></label>
      <input type="number" data-verify-manual-eta step="0.01" min="0.5" max="1" placeholder="0-1" />
      <span class="field-hint">opt.</span>
    </div>
  </div>
  <button type="button" data-verify-run-manual style="margin-top: 1rem; width: 100%" class="button button--ghost">Check with these values</button>
</details>`
    : `
<details class="input-details verify-manual-details">
  <summary>O bien: introducir <strong>mi</strong> motorreductor a mano (ficha / placa)</summary>
  <p class="muted" style="margin:0.5rem 0 0.75rem;font-size:0.84rem;line-height:1.45">
    Mismos criterios que el cat\u00e1logo: <strong>P motor</strong>, <strong>T\u2082 nominal</strong> y <strong>n\u2082</strong> frente al punto calculado.
    Montaje IEC no se valida aqu\u00ed. Use <strong>?</strong> en cada campo.
  </p>
  <div class="verify-grid">
    <div class="field" style="grid-column: 1 / -1">
      <label>Referencia <span class="info-chip" title="Solo etiqueta en el informe; no afecta al c\u00e1lculo de comprobaci\u00f3n." aria-label="Ayuda referencia manual.">?</span></label>
      <input type="text" data-verify-manual-label maxlength="160" placeholder="ej. Nord SK 42F \u2013 132 SP/4" autocomplete="off" />
      <span class="field-hint">opc.</span>
    </div>
    <div class="field">
      <label><em>P</em> motor <span class="info-chip" title="Potencia en la placa del motor (kW), no en el eje de salida del reductor." aria-label="Ayuda potencia motor placa.">?</span></label>
      <input type="number" data-verify-manual-kw step="0.01" min="0" placeholder="kW" />
      <span class="field-hint">kW</span>
    </div>
    <div class="field">
      <label><em>n</em>\u2082 salida <span class="info-chip" title="Revoluciones por minuto en el eje de salida del reductor (debe cubrir la rpm del tambor exigida)." aria-label="Ayuda rpm salida reductor.">?</span></label>
      <input type="number" data-verify-manual-n2 step="0.1" min="0.01" placeholder="min\u207b\u00b9" />
      <span class="field-hint">min\u207b\u00b9</span>
    </div>
    <div class="field">
      <label><em>T</em>\u2082 nominal <span class="info-chip" title="Par nominal de uso continuo en el eje de salida del reductor (N\u00b7m), seg\u00fan ficha." aria-label="Ayuda par nominal salida.">?</span></label>
      <input type="number" data-verify-manual-t2 step="0.1" min="0" placeholder="N\u00b7m" />
      <span class="field-hint">N\u00b7m</span>
    </div>
    <div class="field">
      <label><em>T</em>\u2082 pico <span class="info-chip" title="Par m\u00e1ximo admitido corto tiempo. Vac\u00edo: se asume 1,3 \u00d7 T\u2082 nominal." aria-label="Ayuda par pico.">?</span></label>
      <input type="number" data-verify-manual-t2peak step="0.1" min="0" placeholder="opc." />
      <span class="field-hint">opc.</span>
    </div>
    <div class="field">
      <label><em>n</em> motor <span class="info-chip" title="RPM s\u00edncronas/nominales del motor (p. ej. 1400 min\u207b\u00b9). Opcional; mejora mensajes en verificaci\u00f3n." aria-label="Ayuda rpm motor.">?</span></label>
      <input type="number" data-verify-manual-nmotor step="1" min="1" placeholder="ej. 1400" />
      <span class="field-hint">opc.</span>
    </div>
    <div class="field">
      <label>\u03b7 reductor <span class="info-chip" title="Rendimiento del reductor (0\u20131). Vac\u00edo: 0,92. Si introduce porcentaje 92 se convierte a 0,92." aria-label="Ayuda eta reductor verificaci\u00f3n.">?</span></label>
      <input type="number" data-verify-manual-eta step="0.01" min="0.5" max="1" placeholder="0\u20131" />
      <span class="field-hint">opc.</span>
    </div>
  </div>
  <button type="button" data-verify-run-manual style="margin-top: 1rem; width: 100%" class="button button--ghost">Comprobar con estos datos</button>
</details>`;
  btn.parentNode.insertBefore(wrap, btn);
}

/**
 * Re-inject manual verify UI when language changes (first injection is lang-locked).
 * @param {HTMLElement | null} root
 * @param {() => DriveRequirement} getRequirements
 */
export function refreshMotorVerificationManual(root, getRequirements) {
  if (!root) return;
  const out = root.querySelector('[data-verify-out]');
  if (!out) return;
  root.querySelector('[data-verify-manual-wrap]')?.remove();
  injectManualMotorVerifyBlock(root);
  wireManualVerifyButton(root, getRequirements, out);
}

/**
 * @param {HTMLElement} root
 * @param {() => DriveRequirement} getRequirements
 * @param {Element} out
 */
function wireManualVerifyButton(root, getRequirements, out) {
  const btnManual = /** @type {HTMLButtonElement | null} */ (root.querySelector('[data-verify-run-manual]'));
  btnManual?.addEventListener('click', () => {
    const raw = readManualMotorFieldsFromDom(root);
    if (!raw) {
      out.innerHTML =
        getCurrentLang() === 'en'
          ? `<p class="verify-result verify-result--warn">Enter <strong>motor power (kW)</strong>, <strong>gearbox output rpm</strong>, and <strong>rated T\u2082 (N\u00b7m)</strong>.</p>`
          : `<p class="verify-result verify-result--warn">Rellene <strong>potencia motor (kW)</strong>, <strong>rpm salida del reductor</strong> y <strong>par nominal T\u2082 (N\u00b7m)</strong>.</p>`;
      return;
    }
    const model = buildManualGearmotorModel(raw);
    const req = normalizeDriveRequirement(getRequirements());
    const r = verifyGearmotorAgainstRequirement(req, model);
    out.innerHTML = renderMotorVerifyResultHtml(r, model);
  });
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
  const en = getCurrentLang() === 'en';
  const cls = r.suitable ? 'verify-result--ok' : 'verify-result--bad';
  const warnTitle = en ? 'Warnings' : 'Advertencias';
  const blockTitle = en ? 'Exclusion reasons' : 'Motivos de exclusi\u00f3n';
  const core = `
      <div class="verify-result ${cls}">
        <p class="verify-result__verdict">${escapeHtml(r.verdict)}</p>
        <ul class="verify-result__checks">${r.checks.map((c) => `<li>${escapeHtml(c)}</li>`).join('')}</ul>
        ${
          r.warnings.length
            ? `<p class="verify-result__sub">${warnTitle}</p><ul class="verify-result__warns">${r.warnings
                .map((w) => `<li>${escapeHtml(w)}</li>`)
                .join('')}</ul>`
            : ''
        }
        ${
          r.blockers.length
            ? `<p class="verify-result__sub">${blockTitle}</p><ul class="verify-result__blocks">${r.blockers
                .map((b) => `<li>${escapeHtml(b)}</li>`)
                .join('')}</ul>`
            : ''
        }
      </div>`;
  if (model.userManual) {
    return (
      core +
      (en
        ? `<p class="muted verify-disclaimer">
        <strong>Manual mode:</strong> only motor power, rated output torque, and output rpm are checked against the machine calculation.
        This does not replace datasheets, motor curves, mounting, or standards.
      </p>`
        : `<p class="muted verify-disclaimer">
        <strong>Modo manual:</strong> solo se contrastan potencia, par nominal de salida y rpm de salida con el c\u00e1lculo de la m\u00e1quina.
        No sustituye ficha t\u00e9cnica, curvas del motor, montaje ni normativa.
      </p>`)
    );
  }
  return (
    core +
    (en
      ? `<p class="verify-ficha">
        <a class="reco-ficha reco-ficha--inline" href="${escapeAttr(getModelDatasheetUrl(model))}" target="_blank" rel="noopener noreferrer">Documentation and datasheets (${escapeHtml(BRANDS.find((b) => b.id === model.brandId)?.name || model.brandId)}) \u2197</a>
      </p>
      <p class="muted verify-disclaimer">
        If your part number is missing, extend the parametric registry (<code>js/data/gearmotorParametricRegistry.js</code>) or demo rows in
        <code>js/data/gearmotorCatalog.js</code>. This tool does not replace supplier validation.
      </p>`
      : `<p class="verify-ficha">
        <a class="reco-ficha reco-ficha--inline" href="${escapeAttr(getModelDatasheetUrl(model))}" target="_blank" rel="noopener noreferrer">Documentaci\u00f3n y fichas t\u00e9cnicas (${escapeHtml(BRANDS.find((b) => b.id === model.brandId)?.name || model.brandId)}) \u2197</a>
      </p>
      <p class="muted verify-disclaimer">
        Si su referencia no aparece, ampl\u00ede el registro param\u00e9trico (<code>js/data/gearmotorParametricRegistry.js</code>) o las filas demo en
        <code>js/data/gearmotorCatalog.js</code>. Esta herramienta no sustituye la validaci\u00f3n del proveedor.
      </p>`)
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
  wireManualVerifyButton(root, getRequirements, out);

  function refillModels() {
    const en = getCurrentLang() === 'en';
    const bid = brandEl.value;
    const q = modelSearch ? modelSearch.value : '';
    const list = searchModels(bid, q);
    modelSelect.innerHTML =
      (en
        ? '<option value="">\u2014 Select a demo catalog model \u2014</option>'
        : '<option value="">\u2014 Elija modelo del cat\u00e1logo ejemplo \u2014</option>') +
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
      out.innerHTML =
        getCurrentLang() === 'en'
          ? `<p class="verify-result verify-result--warn">Select a model from the list (demo catalog).</p>`
          : `<p class="verify-result verify-result--warn">Seleccione un modelo de la lista (cat\u00e1logo de demostraci\u00f3n).</p>`;
      return;
    }
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


