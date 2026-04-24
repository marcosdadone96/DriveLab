/**
 * Informe detallado en PDF — disponible con plan Pro (requiere red para cargar jsPDF).
 */

import { BRANDS } from '../data/gearmotorCatalog.js';
import { getBestCatalogPick } from '../ui/driveSelection.js';
import { getCurrentLang, t, formatNumberLocale, formatDateTimeLocale } from '../config/locales.js';
import { LOAD_DUTY_OPTIONS, LOAD_DUTY_OPTIONS_EN } from '../modules/serviceFactorByDuty.js';

const JSPDF_CDN = 'https://esm.sh/jspdf@2.5.2';
const REPORT_CFG_KEY = 'drivelab.reportConfig.v1';

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {string} text
 * @param {number} x
 * @param {number} y
 * @param {number} maxW
 * @param {number} lineMm
 * @returns {number} nueva Y
 */
function addWrapped(doc, text, x, y, maxW, lineMm) {
  const lines = doc.splitTextToSize(sanitizePdfText(text), maxW);
  doc.text(lines, x, y);
  return y + lines.length * lineMm;
}

function sanitizePdfText(value) {
  const map = {
    '·': ' - ',
    '•': '- ',
    '—': '-',
    '–': '-',
    '−': '-',
    '×': 'x',
    '⁻': '-',
    '¹': '1',
    '²': '2',
    '³': '3',
    '°': ' deg',
    '→': '->',
    '≤': '<=',
    '≥': '>=',
    'η': 'eta',
    'μ': 'mu',
    'ρ': 'rho',
    'θ': 'theta',
  };
  let out = String(value ?? '');
  out = out.replace(/[·•—–−×⁻¹²³°→≤≥ημρθ]/g, (m) => map[m] || ' ');
  out = out.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  // Avoid very long non-breaking tokens that can overflow in jsPDF.
  out = out.replace(/([^\s]{28})(?=[^\s])/g, '$1 ');
  out = out.replace(/[^\x20-\x7E\n]/g, ' ');
  out = out.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  return out;
}

function localizeVerdictText(value, lang) {
  const v = String(value || '').trim().toUpperCase();
  if (v === 'APTO') return t('verdictSuitable', lang);
  if (v === 'REVISAR') return t('verdictReview', lang);
  return value;
}

function localizePdfRowLabel(label, lang) {
  if (lang !== 'en') return label;
  const map = new Map([
    ['Norma de referencia', 'Reference standard'],
    ['Tipo de carga (factor servicio)', 'Load duty (service factor)'],
    ['Rama portante', 'Carrying strand'],
    ['Longitud L', 'Length L'],
    ['Masa carga', 'Load mass'],
    ['Velocidad v', 'Speed v'],
    ['Diámetro tambor D', 'Drum diameter D'],
    ['Coef. rozamiento μ', 'Friction coeff. mu'],
    ['Rendimiento η', 'Efficiency eta'],
    ['Ancho banda B', 'Belt width B'],
    ['Masa banda', 'Belt mass'],
    ['Fuerza régimen (tambor)', 'Steady force (drum)'],
    ['Fuerza arranque (pico)', 'Startup force (peak)'],
    ['Par diseño (con servicio)', 'Design Torque (with service)'],
    ['Potencia motor (eje)', 'Motor Power (shaft)'],
    ['Velocidad giro tambor', 'Drum rotational speed'],
    ['Caudal másico', 'Mass Flow Rate'],
    ['Longitud', 'Length'],
    ['Carga total', 'Total load'],
    ['Velocidad', 'Speed'],
    ['Diámetro rodillo', 'Roller diameter'],
    ['Paso rodillos', 'Roller pitch'],
    ['Coef. rodadura', 'Rolling resistance coeff.'],
    ['Rendimiento', 'Efficiency'],
    ['Fuerza régimen', 'Steady force'],
    ['Fuerza arranque', 'Startup force'],
    ['Par régimen', 'Steady torque'],
    ['Par diseño (servicio)', 'Design Torque (service)'],
    ['Potencia motor', 'Motor Power'],
    ['Factor servicio usado', 'Service factor used'],
    ['Validación', 'Validation'],
  ]);
  return map.get(label) || label;
}

function mm(v) {
  return Number(v) || 0;
}

function drawKpiCard(doc, x, y, w, h, title, value, subtitle = '') {
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(String(title), x + 3, y + 5);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(String(value), x + 3, y + 12);
  if (subtitle) {
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7.8);
    doc.setFont('helvetica', 'normal');
    doc.text(String(subtitle), x + 3, y + h - 3.5);
  }
}

function drawTorqueCurve(doc, x, y, w, h, runNm, startNm, lang = 'es') {
  const p = 10;
  const x0 = x + p;
  const y0 = y + h - p;
  const x1 = x + w - p;
  const y1 = y + p;
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(x, y, w, h, 2, 2, 'S');
  doc.setDrawColor(148, 163, 184);
  doc.line(x0, y1, x0, y0);
  doc.line(x0, y0, x1, y0);
  const maxT = Math.max(runNm || 0, startNm || 0, 1);
  const yr = y0 - ((runNm || 0) / maxT) * (h - 2 * p);
  const ys = y0 - ((startNm || 0) / maxT) * (h - 2 * p);
  const xr = x0 + 0.35 * (x1 - x0);
  const xs = x0 + 0.72 * (x1 - x0);
  doc.setDrawColor(13, 71, 161);
  doc.setLineWidth(0.8);
  doc.line(x0, yr, xr, yr);
  doc.line(xr, yr, xs, ys);
  doc.line(xs, ys, x1, ys);
  doc.setFillColor(13, 71, 161);
  doc.circle(xr, yr, 1.1, 'F');
  doc.circle(xs, ys, 1.1, 'F');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  const runLabel = lang === 'en' ? 'Steady torque' : 'Par regimen';
  const startLabel = lang === 'en' ? 'Startup torque' : 'Par arranque';
  doc.text(`${runLabel}: ${Number(runNm || 0).toFixed(1)} N·m`, x + 5, y + 6);
  doc.text(`${startLabel}: ${Number(startNm || 0).toFixed(1)} N·m`, x + 5, y + 10.5);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not rasterize SVG diagram.'));
    img.src = src;
  });
}

export async function svgToPngData(svgEl) {
  if (!(svgEl instanceof SVGSVGElement)) return null;
  const clone = svgEl.cloneNode(true);
  if (!(clone instanceof SVGSVGElement)) return null;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  const vb = clone.viewBox?.baseVal;
  const width =
    (vb && vb.width > 0 ? vb.width : Number.parseFloat(clone.getAttribute('width') || '0')) ||
    Math.max(640, Math.round(svgEl.getBoundingClientRect().width || 640));
  const height =
    (vb && vb.height > 0 ? vb.height : Number.parseFloat(clone.getAttribute('height') || '0')) ||
    Math.max(360, Math.round(svgEl.getBoundingClientRect().height || 360));
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  if (!clone.getAttribute('viewBox')) clone.setAttribute('viewBox', `0 0 ${width} ${height}`);

  const serialized = new XMLSerializer().serializeToString(clone);
  const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;
  const img = await loadImage(svgDataUrl);

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return {
    dataUrl: canvas.toDataURL('image/png', 0.95),
    width: canvas.width,
    height: canvas.height,
  };
}

/**
 * @param {object} payload
 * @param {string} payload.title
 * @param {string} payload.fileBase
 * @param {string} payload.timestamp
 * @param {{ power_kW: number; torque_Nm: number; drum_rpm: number }} payload.requirements
 * @param {Array<{ label: string; value: string }>} payload.inputRows
 * @param {Array<{ label: string; value: string }>} payload.resultRows
 * @param {string[]} [payload.assumptions]
 * @param {string[]} [payload.stepsSummary]
 * @param {string} [payload.topMotor]
 * @param {string} [payload.explanationsBlock]
 * @param {string} payload.disclaimer
 */
export async function exportEngineeringReportPdf(payload, opts = {}) {
  const lang = getCurrentLang();
  let jsPDF;
  try {
    const mod = await import(/* webpackIgnore: true */ JSPDF_CDN);
    jsPDF = mod.jsPDF;
  } catch {
    throw new Error(t('pdfLoadError', lang));
  }

  const cfg = {
    projectName: opts?.reportConfig?.projectName || t('unnamedProject', lang),
    preparedFor: opts?.reportConfig?.preparedFor || t('endClient', lang),
    engineerName: opts?.reportConfig?.engineerName || t('mechAssistEngineering', lang),
    offerRef: opts?.reportConfig?.offerRef || 'N/A',
    logoDataUrl: opts?.reportConfig?.logoDataUrl || '',
    operationHoursDaily: Number(opts?.reportConfig?.operationHoursDaily) || 8,
    energyCostPerKwh: Number(opts?.reportConfig?.energyCostPerKwh) || 0.18,
    beltStrengthN: Number(opts?.reportConfig?.beltStrengthN) || 0,
    currency: opts?.reportConfig?.currency || '€',
  };
  const req = payload.requirements || { power_kW: 0, torque_Nm: 0, drum_rpm: 0 };
  const resultRows = Array.isArray(payload.resultRows)
    ? payload.resultRows.map((r) => ({
        ...r,
        label: localizePdfRowLabel(r.label, lang),
        value: String(localizeVerdictText(r.value, lang)),
      }))
    : [];
  const inputRows = Array.isArray(payload.inputRows)
    ? payload.inputRows.map((r) => ({
        ...r,
        label: localizePdfRowLabel(r.label, lang),
        value: String(localizeVerdictText(r.value, lang)),
      }))
    : [];
  const assumptions = Array.isArray(payload.assumptions) ? payload.assumptions : [];
  const steps = Array.isArray(payload.stepsSummary) ? payload.stepsSummary : [];
  const d = payload.dynamicAnalysis || {};
  const torqueRun = Number(d.torqueRunNm ?? req.torque_Nm ?? 0);
  const torqueStart = Number(d.torqueStartNm ?? req.torque_Nm ?? 0);
  const forcePeak = Number(d.forcePeakN ?? 0);
  const massFlow = Number(d.massFlowKgS ?? 0);
  const energyYear = Math.max(0, Number(req.power_kW || 0) * cfg.operationHoursDaily * 365);
  const opCost = energyYear * cfg.energyCostPerKwh;
  const verdict = localizeVerdictText(payload.verdict || (forcePeak > 0 ? 'APTO' : 'REVISAR'), lang);

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const m = 14;
  const blue = [13, 71, 161];
  const gray = [100, 116, 139];
  const diagramPng = await svgToPngData(opts.diagramEl || null);

  // PÁGINA 1 - Portada + resumen ejecutivo
  doc.setFillColor(...blue);
  doc.rect(0, 0, pageW, 34, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(t('reportPremium', lang), m, 14);
  doc.setFontSize(11);
  doc.text(payload.title || t('technicalMemo', lang), m, 22);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`${t('masterEdition', lang)} · ${payload.timestamp || formatDateTimeLocale(new Date(), lang)}`, m, 29);

  if (cfg.logoDataUrl) {
    try {
      doc.addImage(cfg.logoDataUrl, 'PNG', pageW - m - 30, 6, 30, 20, undefined, 'FAST');
    } catch {
      // ignore logo rendering failures
    }
  }

  let y = 42;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(t('projectData', lang), m, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  y = addWrapped(doc, `${t('project', lang)}: ${cfg.projectName}`, m, y, pageW - 2 * m - 1, 4.7);
  y = addWrapped(doc, `${t('preparedFor', lang)}: ${cfg.preparedFor}`, m, y + 1, pageW - 2 * m - 1, 4.7);
  y = addWrapped(doc, `${t('leadEngineer', lang)}: ${cfg.engineerName}`, m, y + 1, pageW - 2 * m - 1, 4.7);
  y = addWrapped(doc, `${t('offerRef', lang)}: ${cfg.offerRef}`, m, y + 1, pageW - 2 * m - 1, 4.7);
  y += 6;

  const kpiW = (pageW - 2 * m - 6) / 2;
  const kpiH = 20;
  drawKpiCard(doc, m, y, kpiW, kpiH, t('shaftPower', lang), `${formatNumberLocale(req.power_kW || 0, 3, lang)} kW`, t('calcValue', lang));
  drawKpiCard(doc, m + kpiW + 6, y, kpiW, kpiH, t('designTorque', lang), `${formatNumberLocale(req.torque_Nm || 0, 1, lang)} N·m`, t('serviceFactorApplied', lang));
  y += kpiH + 4;
  drawKpiCard(doc, m, y, kpiW, kpiH, t('massFlowRate', lang), `${formatNumberLocale(massFlow, 3, lang)} kg/s`, t('estimated', lang));
  drawKpiCard(doc, m + kpiW + 6, y, kpiW, kpiH, t('verdict', lang), verdict, verdict.toUpperCase().includes('NO') ? t('requiresAction', lang) : t('baseDesignOk', lang));

  // PÁGINA 2 - Diagrama + entradas
  doc.addPage();
  y = 18;
  doc.setTextColor(...blue);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(t('page2', lang), m, y);
  y += 8;
  if (diagramPng) {
    const maxW = pageW - 2 * m;
    const maxH = 92;
    const ratio = diagramPng.width / diagramPng.height;
    let drawW = maxW;
    let drawH = drawW / ratio;
    if (drawH > maxH) {
      drawH = maxH;
      drawW = drawH * ratio;
    }
    const x = m + (maxW - drawW) / 2;
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(m, y - 2, maxW, drawH + 4, 1.5, 1.5, 'S');
    doc.addImage(diagramPng.dataUrl, 'PNG', x, y, drawW, drawH, undefined, 'FAST');
    y += drawH + 10;
  } else {
    doc.setTextColor(...gray);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(t('diagramCaptureError', lang), m, y);
    y += 8;
  }
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(t('inputParameters', lang), m, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  for (const row of inputRows) {
    if (y > 276) break;
    y = addWrapped(doc, `• ${row.label}: ${row.value}`, m, y, pageW - 2 * m, 4.4) + 1;
  }

  // PÁGINA 3 - Memoria detallada
  doc.addPage();
  y = 18;
  doc.setTextColor(...blue);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(t('page3', lang), m, y);
  y += 8;
  drawTorqueCurve(doc, m, y, pageW - 2 * m, 44, torqueRun, torqueStart, lang);
  y += 51;

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(t('page3Title', lang), m, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  for (const line of steps.slice(0, 22)) {
    y = addWrapped(doc, `- ${line}`, m, y, pageW - 2 * m, 4.1) + 0.8;
    if (y > 268) break;
  }
  y += 3;
  doc.setFont('helvetica', 'bold');
  doc.text(t('beltStress', lang), m, y);
  y += 5;
  const strength = cfg.beltStrengthN;
  const ratio = strength > 0 ? forcePeak / strength : null;
  const tensionRows = [
    [`${t('peakForce', lang)} (N)`, `${formatNumberLocale(forcePeak, 1, lang)} N`],
    [t('selectedBeltStrength', lang), strength > 0 ? `${strength.toFixed(1)} N` : t('notSpecified', lang)],
    [t('utilizationIndex', lang), ratio != null ? `${(ratio * 100).toFixed(1)} %` : '—'],
    [t('validation', lang), ratio == null ? t('pendingMissingStrength', lang) : ratio <= 0.8 ? t('suitableWithMargin', lang) : t('reviewBeltSelection', lang)],
  ];
  for (const [k, v] of tensionRows) {
    y = addWrapped(doc, `• ${k}: ${v}`, m, y, pageW - 2 * m, 4.2) + 0.6;
  }

  // PÁGINA 4 - Selección comercial + anexos
  doc.addPage();
  y = 18;
  doc.setTextColor(...blue);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(t('page4', lang), m, y);
  y += 8;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(t('recommendedCommercialSelection', lang), m, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  y = addWrapped(doc, payload.topMotor || t('unavailableForCalc', lang), m, y, pageW - 2 * m - 2, 4.5);
  y += 7;

  doc.setFont('helvetica', 'bold');
  doc.text(t('energyEfficiencyStudy', lang), m, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  y = addWrapped(
    doc,
    `${t('annualConsumption', lang)}: ${formatNumberLocale(energyYear, 1, lang)} kWh/year (${t('consideringHoursPerDay', lang)} ${formatNumberLocale(cfg.operationHoursDaily, 0, lang)} ${t('hoursPerDay', lang)}).`,
    m,
    y,
    pageW - 2 * m - 2,
    4.4,
  ) + 1;
  y = addWrapped(
    doc,
    `${t('operatingCostEstimated', lang)}: ${formatNumberLocale(opCost, 2, lang)} ${cfg.currency}/year (${t('tariff', lang)} ${formatNumberLocale(cfg.energyCostPerKwh, 3, lang)} ${cfg.currency}/kWh).`,
    m,
    y,
    pageW - 2 * m - 2,
    4.4,
  ) + 2;

  doc.setFont('helvetica', 'bold');
  doc.text(t('glossaryMethodology', lang), m, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  const methodText =
    payload.methodologyText ||
    t('defaultMethodology', lang);
  y = addWrapped(doc, methodText, m, y, pageW - 2 * m - 2, 4.3) + 2;
  for (const a of assumptions.slice(0, 6)) {
    y = addWrapped(doc, `- ${a}`, m, y, pageW - 2 * m - 2, 4.2) + 0.6;
  }
  y += 2;
  doc.setFont('helvetica', 'bold');
  doc.text(t('legalDisclaimerTitle', lang), m, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  const legal =
    payload.disclaimerPro ||
    t('defaultLegalDisclaimer', lang);
  y = addWrapped(doc, legal, m, y, pageW - 2 * m - 2, 4.2) + 8;

  doc.setDrawColor(148, 163, 184);
  doc.line(m, y, m + 70, y);
  doc.line(pageW - m - 70, y, pageW - m, y);
  doc.setFontSize(8.5);
  doc.setTextColor(...gray);
  doc.text(t('engineerSignature', lang), m, y + 4);
  doc.text(t('companyStamp', lang), pageW - m - 28, y + 4);
  doc.setFontSize(8);
  doc.text(`${t('reference', lang)}: ${cfg.offerRef} · ${payload.timestamp || ''}`, m, pageH - 8);

  doc.save(`${payload.fileBase || t('reportFileBase', lang)}.pdf`);
}

function formatStepLine(s) {
  const u = s.unit || '';
  let v = '';
  if (u === '°') v = `${Number(s.value).toFixed(2)}°`;
  else if (u === 'N·m') v = `${Number(s.value).toFixed(2)} N·m`;
  else if (u === 'kW') v = `${Number(s.value).toFixed(2)} kW`;
  else if (u === 'N') v = `${Number(s.value).toFixed(2)} N`;
  else v = `${s.value} ${u}`.trim();
  return `${s.title}: ${v}`;
}

/**
 * @param {ReturnType<import('../modules/flatConveyor.js').computeFlatConveyor>} r
 * @param {object} raw
 */
export function buildFlatPdfPayload(raw, r) {
  const d = r.detail || {};
  const pick = getBestCatalogPick({
    power_kW: r.requiredMotorPower_kW,
    torque_Nm: r.torqueWithService_Nm,
    drum_rpm: r.drumRpm,
  });
  const brandName = pick ? BRANDS.find((b) => b.id === pick.m.brandId)?.name || pick.m.brandId : '';

  return {
    title: 'Informe — Cinta transportadora horizontal',
    fileBase: `informe-cinta-plana-${new Date().toISOString().slice(0, 10)}`,
    timestamp: formatDateTimeLocale(new Date(), getCurrentLang()),
    requirements: {
      power_kW: r.requiredMotorPower_kW,
      torque_Nm: r.torqueWithService_Nm,
      drum_rpm: r.drumRpm,
    },
    inputRows: [
      { label: 'Norma de referencia', value: String(raw.designStandard || r.designStandard || '—') },
      { label: 'Tipo de carga (factor servicio)', value: String(raw.loadDuty || r.loadDuty || '—') },
      {
        label: 'Rama portante',
        value:
          raw.carrySurface === 'slide_plate' || r.carrySurface === 'slide_plate'
            ? 'Plancha deslizante'
            : 'Rodillos',
      },
      { label: 'Longitud L', value: `${Number(raw.beltLength_m).toFixed(2)} m` },
      { label: 'Masa carga', value: `${Number(raw.loadMass_kg).toFixed(2)} kg` },
      { label: 'Velocidad v', value: `${Number(raw.beltSpeed_m_s).toFixed(2)} m/s` },
      { label: 'Diámetro tambor D', value: `${Number(raw.rollerDiameter_mm).toFixed(2)} mm` },
      {
        label: 'Coef. rozamiento μ',
        value: Number.isFinite(Number(raw.frictionCoeff))
          ? Number(raw.frictionCoeff).toFixed(2)
          : String(raw.frictionCoeff ?? '—'),
      },
      {
        label: 'Rendimiento η',
        value: `${Number.isFinite(Number(r.efficiency_pct_effective ?? raw.efficiency_pct)) ? Number(r.efficiency_pct_effective ?? raw.efficiency_pct).toFixed(2) : '—'} %`,
      },
      { label: 'Ancho banda B', value: `${Number(raw.beltWidth_m).toFixed(2)} m` },
      { label: 'Masa banda', value: `${Number(raw.beltMass_kg).toFixed(2)} kg` },
    ],
    resultRows: [
      ...(r.steadyStandardMultiplier > 1
        ? [{ label: 'Margen normativo régimen', value: `×${r.steadyStandardMultiplier.toFixed(2)} (${r.designStandard})` }]
        : []),
      { label: 'Fuerza régimen (tambor)', value: `${(d.F_steady_N ?? 0).toFixed(2)} N` },
      { label: 'Fuerza arranque (pico)', value: `${(d.F_total_start_N ?? 0).toFixed(2)} N` },
      { label: 'Par diseño (con servicio)', value: `${r.torqueWithService_Nm.toFixed(2)} N·m` },
      { label: 'Potencia motor (eje)', value: `${r.requiredMotorPower_kW.toFixed(2)} kW` },
      { label: 'Velocidad giro tambor', value: `${r.drumRpm.toFixed(2)} min⁻¹` },
      { label: 'Caudal másico', value: `${r.massFlow_kg_s.toFixed(2)} kg/s` },
    ],
    assumptions: r.assumptions || [],
    stepsSummary: (r.steps || []).map(formatStepLine),
    topMotor: pick ? `${pick.m.code} — ${brandName} · ${pick.m.motor_kW} kW · i≈${pick.m.ratio.toFixed(2)} · n₂≈${pick.m.n2_rpm.toFixed(2)} min⁻¹` : '—',
    explanationsBlock: (r.explanations || []).join('\n\n'),
    dynamicAnalysis: {
      torqueRunNm: r.torqueAtDrum_Nm,
      torqueStartNm: r.torqueStart_Nm,
      forcePeakN: d.F_total_start_N,
      massFlowKgS: r.massFlow_kg_s,
    },
    verdict: Number.isFinite(r.requiredMotorPower_kW) ? 'APTO' : 'NO APTO',
    methodologyText:
      'Metodología simplificada basada en ISO 5048 / DIN 22101 para cintas transportadoras: balance de fuerzas en régimen, pico de arranque con inercia y margen por factor de servicio para dimensionado de potencia y par.',
    disclaimerPro:
      'Este informe tiene carácter de simulación preliminar para fase de oferta/anteproyecto. La selección definitiva debe validarse por instalador certificado y fabricante del equipo, considerando normativa local, seguridad de máquina y condiciones reales de operación.',
    disclaimer:
      'Documento generado automáticamente por MechAssist. Los datos de motorreductor son de catálogo de demostración. No sustituye proyecto ejecutivo, normativa aplicable ni validación del fabricante. Revise siempre fichas técnicas y condiciones de servicio (S1, temperatura, ciclo, freno, etc.).',
  };
}

/**
 * @param {ReturnType<import('../modules/inclinedConveyor.js').computeInclinedConveyor>} r
 * @param {object} raw
 */
export function buildInclinedPdfPayload(raw, r) {
  const d = r.detail || {};
  const pick = getBestCatalogPick({
    power_kW: r.requiredMotorPower_kW,
    torque_Nm: r.torqueWithService_Nm,
    drum_rpm: r.drumRpm,
  });
  const brandName = pick ? BRANDS.find((b) => b.id === pick.m.brandId)?.name || pick.m.brandId : '';

  return {
    title: 'Informe — Cinta transportadora inclinada',
    fileBase: `informe-cinta-inclinada-${new Date().toISOString().slice(0, 10)}`,
    timestamp: formatDateTimeLocale(new Date(), getCurrentLang()),
    requirements: {
      power_kW: r.requiredMotorPower_kW,
      torque_Nm: r.torqueWithService_Nm,
      drum_rpm: r.drumRpm,
    },
    inputRows: [
      { label: 'Norma de referencia', value: String(raw.designStandard || r.designStandard || '—') },
      { label: 'Tipo de carga', value: String(raw.loadDuty || r.loadDuty || '—') },
      { label: 'Longitud L', value: `${raw.length_m} m` },
      { label: 'Desnivel H', value: `${raw.height_m} m` },
      {
        label: 'Ángulo θ',
        value: raw.angle_deg != null && Number.isFinite(raw.angle_deg) ? `${raw.angle_deg}°` : 'auto (H/L)',
      },
      { label: 'Masa carga', value: `${raw.loadMass_kg} kg` },
      { label: 'Velocidad v', value: `${raw.beltSpeed_m_s} m/s` },
      { label: 'Diámetro tambor D', value: `${raw.rollerDiameter_mm} mm` },
      { label: 'μ', value: String(raw.frictionCoeff) },
      { label: 'η', value: `${r.efficiency_pct_effective ?? raw.efficiency_pct} %` },
    ],
    resultRows: [
      ...(r.steadyStandardMultiplier > 1
        ? [{ label: 'Margen normativo régimen', value: `×${r.steadyStandardMultiplier.toFixed(2)} (${r.designStandard})` }]
        : []),
      { label: 'Ángulo de pendiente', value: `${r.angle_deg.toFixed(2)}°` },
      { label: 'Fuerza régimen', value: `${(d.F_steady_N ?? 0).toFixed(2)} N` },
      { label: 'Fuerza arranque', value: `${(d.F_total_start_N ?? 0).toFixed(2)} N` },
      { label: 'Par diseño', value: `${r.torqueWithService_Nm.toFixed(2)} N·m` },
      { label: 'Potencia motor', value: `${r.requiredMotorPower_kW.toFixed(2)} kW` },
      { label: 'n tambor', value: `${r.drumRpm.toFixed(2)} min⁻¹` },
    ],
    assumptions: r.assumptions || [],
    stepsSummary: (r.steps || []).map(formatStepLine),
    topMotor: pick ? `${pick.m.code} — ${brandName} · ${pick.m.motor_kW} kW · i≈${pick.m.ratio.toFixed(2)}` : '—',
    explanationsBlock: (r.explanations || []).join('\n\n'),
    dynamicAnalysis: {
      torqueRunNm: r.torqueAtDrum_Nm,
      torqueStartNm: r.torqueStart_Nm,
      forcePeakN: d.F_total_start_N,
      massFlowKgS: r.massFlow_kg_s,
    },
    verdict: Number.isFinite(r.requiredMotorPower_kW) ? 'APTO' : 'NO APTO',
    methodologyText:
      'Metodología simplificada basada en ISO 5048 / DIN 22101 para tramo inclinado, incluyendo componente gravitatoria, rozamiento, aceleración y factor de servicio.',
    disclaimerPro:
      'Informe orientativo para fase de ingeniería conceptual. Requiere validación final por técnico habilitado y fabricante, incluyendo seguridad en pendiente, freno y anti-retorno.',
    disclaimer:
      'Documento generado automáticamente por MechAssist. Datos de motorreductor de demostración. Valide con fabricante y normativa. En pendiente revise seguridad (freno, anti-retorno, paradas).',
  };
}

/**
 * @param {object} raw — entradas leídas del formulario bomba
 * @param {object} r — resultado de computeCentrifugalPump
 */
export function buildPumpPdfPayload(raw, r) {
  const d = r.detail || {};
  const pick = getBestCatalogPick({
    power_kW: r.requiredMotorPower_kW,
    torque_Nm: r.torqueWithService_Nm,
    drum_rpm: r.drumRpm,
  });
  const brandName = pick ? BRANDS.find((b) => b.id === pick.m.brandId)?.name || pick.m.brandId : '';

  const flowLabel = raw.flowUnit === 'lmin' ? 'L/min' : 'm³/h';
  const instLines = raw.installationProActive
    ? [
        {
          label: 'Presión succión (manométrica)',
          value:
            raw.suctionPressure_kPa_gauge != null && Number.isFinite(raw.suctionPressure_kPa_gauge)
              ? `${raw.suctionPressure_kPa_gauge} kPa`
              : '—',
        },
        {
          label: 'Diámetro tubería impulsión',
          value: raw.pipeDiameter_mm != null ? `${raw.pipeDiameter_mm} mm` : '—',
        },
        {
          label: 'Horas uso diario',
          value: raw.dailyRunHours != null ? `${raw.dailyRunHours} h/día` : '—',
        },
      ]
    : [];

  return {
    title: 'Informe — Bomba centrífuga (punto de trabajo)',
    fileBase: `informe-bomba-${new Date().toISOString().slice(0, 10)}`,
    timestamp: formatDateTimeLocale(new Date(), getCurrentLang()),
    requirements: {
      power_kW: r.requiredMotorPower_kW,
      torque_Nm: r.torqueWithService_Nm,
      drum_rpm: r.drumRpm,
    },
    inputRows: [
      { label: 'Caudal Q', value: `${raw.flowValue} ${flowLabel}` },
      { label: 'Altura manométrica H', value: `${raw.head_m} m` },
      { label: 'Rendimiento bomba η', value: `${raw.etaPump_pct} %` },
      { label: 'Tipo de fluido', value: String(raw.fluidType || '—') },
      { label: 'Densidad ρ', value: `${raw.rho_kg_m3} kg/m³` },
      { label: 'Viscosidad cinemática', value: `${raw.viscosity_mm2_s} mm²/s` },
      { label: 'Temperatura', value: `${raw.temp_C} °C` },
      { label: 'Régimen eje bomba', value: `${raw.pumpSpeed_rpm} min⁻¹` },
      { label: 'Tipo de carga (SF)', value: String(raw.loadDuty || '—') },
      { label: 'Acoplamiento', value: raw.couplingType === 'direct' ? 'Directo' : 'Motorreductor' },
      { label: 'Tensión / frecuencia', value: `${raw.voltage_V} V · ${raw.frequency_Hz} Hz` },
      ...instLines,
    ],
    resultRows: [
      { label: 'Potencia hidráulica P_h', value: `${r.hydraulicPower_kW.toFixed(3)} kW` },
      { label: 'Potencia eje bomba (antes SF)', value: `${r.shaftPower_kW.toFixed(3)} kW` },
      { label: 'Factor viscosidad / fluido (orient.)', value: `${(r.viscosityFactor ?? 1).toFixed(3)}` },
      { label: 'Caudal másico', value: `${r.massFlow_kg_s.toFixed(3)} kg/s` },
      { label: 'Par eje (régimen)', value: `${r.torqueAtDrum_Nm.toFixed(1)} N·m` },
      { label: 'Par diseño (con servicio)', value: `${r.torqueWithService_Nm.toFixed(1)} N·m` },
      { label: 'Potencia motor orientativa', value: `${r.requiredMotorPower_kW.toFixed(3)} kW` },
      { label: 'Velocidad giro eje', value: `${r.drumRpm.toFixed(2)} min⁻¹` },
      { label: 'Factor servicio usado', value: `${(r.serviceFactorUsed ?? 1).toFixed(3)}` },
    ],
    assumptions: r.assumptions || [],
    stepsSummary: (r.steps || []).map(formatStepLine),
    topMotor: pick
      ? `${pick.m.code} — ${brandName} · ${pick.m.motor_kW} kW · i≈${pick.m.ratio.toFixed(1)} · n₂≈${pick.m.n2_rpm.toFixed(1)} min⁻¹`
      : '—',
    explanationsBlock: (r.explanations || []).join('\n\n'),
    dynamicAnalysis: {
      torqueRunNm: r.torqueAtDrum_Nm,
      torqueStartNm: r.torqueWithService_Nm,
      forcePeakN: r.torqueWithService_Nm,
      massFlowKgS: r.massFlow_kg_s,
    },
    verdict: Number.isFinite(r.requiredMotorPower_kW) ? 'APTO' : 'NO APTO',
    disclaimer:
      'Documento generado automáticamente por MechAssist. Modelo de punto único (Q,H,η); no sustituye curvas del fabricante, NPSH ni proyecto de tuberías. Datos de motorreductor de demostración.',
  };
}

/**
 * @param {object} raw
 * @param {object} r — computeScrewConveyor
 */
export function buildScrewPdfPayload(raw, r) {
  const lang = getCurrentLang();
  const en = lang === 'en';
  const pick = getBestCatalogPick({
    power_kW: r.requiredMotorPower_kW,
    torque_Nm: r.torqueWithService_Nm,
    drum_rpm: r.drumRpm,
  });
  const brandName = pick ? BRANDS.find((b) => b.id === pick.m.brandId)?.name || pick.m.brandId : '';
  const capU = raw.capUnit === 'th' ? 't/h' : 'm\u00b3/h';
  const dU = raw.diamUnit === 'in' ? 'in' : 'mm';
  const pU = raw.pitchUnit === 'in' ? 'in' : 'mm';
  const wear = (x) =>
    en
      ? x === 'high'
        ? 'High'
        : x === 'medium'
          ? 'Medium'
          : 'Low'
      : x === 'high'
        ? 'Alta'
        : x === 'medium'
          ? 'Media'
          : 'Baja';
  const dutyRow = /** @type {keyof typeof LOAD_DUTY_OPTIONS_EN} */ (String(raw.loadDuty || ''));
  const dutyOpt = LOAD_DUTY_OPTIONS.find((o) => o.id === dutyRow);
  const dutyLabel =
    dutyOpt != null
      ? en
        ? LOAD_DUTY_OPTIONS_EN[dutyRow].label
        : dutyOpt.label
      : String(raw.loadDuty || '\u2014');

  return {
    title: en ? 'Report \u2014 Screw conveyor' : 'Informe \u2014 Transportador de tornillo helicoidal',
    fileBase: en
      ? `screw-conveyor-report-${new Date().toISOString().slice(0, 10)}`
      : `informe-tornillo-${new Date().toISOString().slice(0, 10)}`,
    timestamp: formatDateTimeLocale(new Date(), lang),
    requirements: {
      power_kW: r.requiredMotorPower_kW,
      torque_Nm: r.torqueWithService_Nm,
      drum_rpm: r.drumRpm,
    },
    inputRows: en
      ? [
          { label: 'Capacity', value: `${raw.capValue} ${capU}` },
          { label: 'Screw OD', value: `${raw.diamValue} ${dU}` },
          { label: 'Pitch', value: `${raw.pitchValue} ${pU}` },
          { label: 'Conveying length', value: `${raw.length_m} m` },
          { label: 'Inclination', value: `${raw.angle_deg} deg` },
          { label: 'Bulk density', value: `${raw.rho_kg_m3} kg/m3` },
          { label: 'Trough loading', value: `${raw.troughLoadPct ?? '30'} %` },
          { label: 'Abrasiveness', value: wear(raw.abrasive) },
          { label: 'Corrosiveness', value: wear(raw.corrosive) },
          { label: 'mu material-steel', value: String(raw.frictionCoeff) },
          { label: 'Bearing mechanical efficiency', value: `${raw.bearingMechanicalEff_pct} %` },
          { label: 'Load duty (SF)', value: dutyLabel },
        ]
      : [
          { label: 'Capacidad', value: `${raw.capValue} ${capU}` },
          { label: '\u00d8 tornillo', value: `${raw.diamValue} ${dU}` },
          { label: 'Paso', value: `${raw.pitchValue} ${pU}` },
          { label: 'Longitud transporte', value: `${raw.length_m} m` },
          { label: 'Inclinaci\u00f3n', value: `${raw.angle_deg}\u00b0` },
          { label: 'Densidad aparente', value: `${raw.rho_kg_m3} kg/m\u00b3` },
          { label: 'Trough loading', value: `${raw.troughLoadPct ?? '30'} %` },
          { label: 'Abrasividad', value: wear(raw.abrasive) },
          { label: 'Corrosividad', value: wear(raw.corrosive) },
          { label: '\u03bc material\u2013acero', value: String(raw.frictionCoeff) },
          { label: '\u03b7 mec\u00e1nica apoyos', value: `${raw.bearingMechanicalEff_pct} %` },
          { label: 'Tipo de carga (SF)', value: dutyLabel },
        ],
    resultRows: en
      ? [
          { label: 'Screw RPM (model)', value: `${r.screwRpm.toFixed(1)} min-1` },
          { label: 'Indicative RPM cap', value: `${r.screwRpmMaxSuggested.toFixed(0)} min-1` },
          { label: 'RPM risk', value: r.rpmRisk?.label || '\u2014' },
          { label: 'Shaft power (no extra service SF)', value: `${r.shaftPower_kW.toFixed(3)} kW` },
          { label: 'Drive power (design)', value: `${r.requiredMotorPower_kW.toFixed(3)} kW` },
          { label: 'Power HP (design)', value: `${(r.requiredMotorPower_kW * 1.34102).toFixed(3)} HP` },
          { label: 'Shaft torque (steady)', value: `${r.torqueAtDrum_Nm.toFixed(1)} N\u00b7m` },
          { label: 'Design torque (x SF)', value: `${r.torqueWithService_Nm.toFixed(1)} N\u00b7m` },
          { label: 'Mass flow', value: `${r.massFlow_kg_s.toFixed(3)} kg/s` },
          { label: 'Service factor used', value: `${(r.serviceFactorUsed ?? 1).toFixed(3)}` },
        ]
      : [
          { label: 'RPM tornillo (modelo)', value: `${r.screwRpm.toFixed(1)} min\u207b\u00b9` },
          { label: 'RPM tope orientativo', value: `${r.screwRpmMaxSuggested.toFixed(0)} min\u207b\u00b9` },
          { label: 'Riesgo RPM', value: r.rpmRisk?.label || '\u2014' },
          { label: 'Potencia eje (sin SF extra servicio)', value: `${r.shaftPower_kW.toFixed(3)} kW` },
          { label: 'Potencia accionamiento (dise\u00f1o)', value: `${r.requiredMotorPower_kW.toFixed(3)} kW` },
          { label: 'Potencia HP (dise\u00f1o)', value: `${(r.requiredMotorPower_kW * 1.34102).toFixed(3)} HP` },
          { label: 'Par eje (r\u00e9gimen)', value: `${r.torqueAtDrum_Nm.toFixed(1)} N\u00b7m` },
          { label: 'Par dise\u00f1o (\u00d7 SF)', value: `${r.torqueWithService_Nm.toFixed(1)} N\u00b7m` },
          { label: 'Caudal m\u00e1sico', value: `${r.massFlow_kg_s.toFixed(3)} kg/s` },
          { label: 'Factor servicio usado', value: `${(r.serviceFactorUsed ?? 1).toFixed(3)}` },
        ],
    assumptions: r.assumptions || [],
    stepsSummary: (r.steps || []).map(formatStepLine),
    topMotor: pick
      ? `${pick.m.code} \u2014 ${brandName} \u00b7 ${pick.m.motor_kW} kW \u00b7 i\u2248${pick.m.ratio.toFixed(1)} \u00b7 n\u2082\u2248${pick.m.n2_rpm.toFixed(1)} min\u207b\u00b9`
      : '\u2014',
    explanationsBlock: (r.explanations || []).join('\n\n'),
    dynamicAnalysis: {
      torqueRunNm: r.torqueAtDrum_Nm,
      torqueStartNm: r.torqueWithService_Nm,
      forcePeakN: r.torqueWithService_Nm,
      massFlowKgS: r.massFlow_kg_s,
    },
    verdict: Number.isFinite(r.requiredMotorPower_kW) ? (en ? 'OK' : 'APTO') : en ? 'REVIEW' : 'NO APTO',
    disclaimer: en
      ? 'Auto-generated by MechAssist. Indicative screw model; does not replace full CEMA 350 or OEM data. Check max RPM and wear with the equipment supplier.'
      : 'Documento generado autom\u00e1ticamente por MechAssist. Modelo orientativo de tornillo; no sustituye CEMA 350 completo ni datos del fabricante. Revise RPM m\u00e1ximas y desgaste con el proveedor del equipo.',
  };
}

export function buildRollerPdfPayload(raw, r) {
  const d = r.detail || {};
  return {
    title: 'Informe — Transportador de rodillos',
    fileBase: `informe-rodillos-${new Date().toISOString().slice(0, 10)}`,
    timestamp: formatDateTimeLocale(new Date(), getCurrentLang()),
    requirements: {
      power_kW: r.requiredMotorPower_kW,
      torque_Nm: r.torqueWithService_Nm,
      drum_rpm: r.drumRpm,
    },
    inputRows: [
      { label: 'Norma', value: String(raw.designStandard || '—') },
      { label: 'Tipo de carga', value: String(raw.loadDuty || '—') },
      { label: 'Longitud', value: `${raw.length_m} m` },
      { label: 'Carga total', value: `${raw.loadMass_kg} kg` },
      { label: 'Velocidad', value: `${raw.speed_m_s} m/s` },
      { label: 'Diámetro rodillo', value: `${raw.rollerDiameter_mm} mm` },
      { label: 'Paso rodillos', value: `${raw.rollerPitch_mm ?? 125} mm` },
      {
        label: 'Apoyo / paleta',
        value:
          raw.loadSupportMode === 'pallet'
            ? `Paleta ${String(raw.palletPreset || '—')} · ${String(raw.palletOrientation || '—')}`
            : `Uniforme${raw.uniformRollersOverride ? ` · rodillos doc. ${raw.uniformRollersOverride}` : ''}`,
      },
      { label: 'Coef. rodadura', value: String(raw.rollingResistanceCoeff) },
      { label: 'Rendimiento', value: `${raw.efficiency_pct} %` },
    ],
    resultRows: [
      { label: 'Fuerza régimen', value: `${(d.F_steady_N ?? 0).toFixed(1)} N` },
      { label: 'Fuerza arranque', value: `${(d.F_total_start_N ?? 0).toFixed(1)} N` },
      { label: 'Par régimen', value: `${r.torqueAtDrum_Nm.toFixed(2)} N·m` },
      { label: 'Par diseño (servicio)', value: `${r.torqueWithService_Nm.toFixed(2)} N·m` },
      { label: 'Potencia motor', value: `${r.requiredMotorPower_kW.toFixed(3)} kW` },
      { label: 'Caudal másico', value: `${r.massFlow_kg_s.toFixed(3)} kg/s` },
      {
        label: 'Rodillos estim. (huella o L)',
        value: String(r.supportInfo?.rollersAlongFootprint ?? '—'),
      },
    ],
    assumptions: r.assumptions || [],
    stepsSummary: (r.steps || []).map(formatStepLine),
    topMotor: 'Ver bloque de recomendaciones de motorreductor en la página.',
    explanationsBlock: (r.explanations || []).join('\n\n'),
    dynamicAnalysis: {
      torqueRunNm: r.torqueAtDrum_Nm,
      torqueStartNm: r.torqueStart_Nm,
      forcePeakN: d.F_total_start_N,
      massFlowKgS: r.massFlow_kg_s,
    },
    verdict: Number.isFinite(r.requiredMotorPower_kW) ? 'APTO' : 'NO APTO',
    disclaimer:
      'Documento generado automáticamente por MechAssist. Modelo orientativo para línea de rodillos, sujeto a validación final de fabricante e instalación real.',
  };
}

export function buildCarLiftPdfPayload(raw, r) {
  return {
    title: 'Informe - Elevador de coches por husillo',
    fileBase: `informe-elevador-coches-${new Date().toISOString().slice(0, 10)}`,
    timestamp: formatDateTimeLocale(new Date(), getCurrentLang()),
    requirements: {
      power_kW: r.drive.powerDesign_kW,
      torque_Nm: r.drive.torqueDesign_Nm,
      drum_rpm: r.drive.screw_rpm,
    },
    inputRows: [
      { label: 'Capacidad', value: `${raw.capacity_kg} kg` },
      { label: 'Altura elevacion', value: `${raw.liftHeight_m} m` },
      { label: 'Tiempo elevacion', value: `${raw.liftTime_s} s` },
      { label: 'Paso husillo', value: `${raw.pitch_mm} mm` },
      { label: 'Diametro husillo', value: `${raw.screwDiameter_mm} mm` },
      { label: 'Longitud efectiva tuerca', value: `${raw.nutLength_mm} mm` },
      { label: 'Rozamiento rosca', value: String(raw.mu_thread) },
      { label: 'Presion admisible', value: `${raw.pAllow_MPa} MPa` },
      { label: 'Factor servicio', value: String(raw.serviceFactor) },
    ],
    resultRows: [
      { label: 'Par elevacion total', value: `${r.drive.torqueTotal_Nm.toFixed(1)} N·m` },
      { label: 'Par diseño', value: `${r.drive.torqueDesign_Nm.toFixed(1)} N·m` },
      { label: 'Potencia total', value: `${r.drive.power_kW.toFixed(2)} kW` },
      { label: 'Potencia diseño', value: `${r.drive.powerDesign_kW.toFixed(2)} kW` },
      { label: 'RPM husillo', value: `${r.drive.screw_rpm.toFixed(2)} rpm` },
      { label: 'Autofrenado', value: r.selfLocking ? 'OK' : 'NO' },
      { label: 'Presion contacto tuerca', value: `${r.nut.contactPressure_MPa.toFixed(2)} MPa` },
    ],
    assumptions: r.assumptions || [],
    stepsSummary: (r.steps || []).map(formatStepLine),
    topMotor: 'Ver bloque de recomendaciones de motorreductor en la página.',
    explanationsBlock: (r.explanations || []).join('\n\n'),
    dynamicAnalysis: {
      torqueRunNm: r.drive.torqueTotal_Nm,
      torqueStartNm: r.drive.torqueDesign_Nm,
      forcePeakN: r.drive.torqueDesign_Nm,
      massFlowKgS: 0,
    },
    verdict: r.selfLocking ? 'APTO' : 'REVISAR',
    disclaimer: r.disclaimer || 'Validar con normativa de elevadores y fabricante del sistema.',
  };
}

export function buildBucketPdfPayload(raw, r, driveReq) {
  const pw = r.power || {};
  const lang = getCurrentLang();
  const en = lang === 'en';
  return {
    title: en ? 'Report \u2014 Bucket elevator' : 'Informe \u2014 Elevador de cangilones',
    fileBase: en
      ? `bucket-elevator-report-${new Date().toISOString().slice(0, 10)}`
      : `informe-cangilones-${new Date().toISOString().slice(0, 10)}`,
    timestamp: formatDateTimeLocale(new Date(), lang),
    requirements: {
      power_kW: driveReq.power_kW,
      torque_Nm: driveReq.torque_Nm,
      drum_rpm: driveReq.drum_rpm,
    },
    inputRows: en
      ? [
          { label: 'Apparent bulk density', value: `${raw.bulkDensity_kg_m3} kg/m3` },
          { label: 'Capacity', value: `${raw.capacity_tph} t/h` },
          { label: 'Lift height', value: `${raw.liftHeight_m} m` },
          { label: 'Center distance', value: `${raw.centerDistance_m} m` },
          { label: 'Belt speed', value: `${raw.beltSpeed_m_s} m/s` },
          { label: 'Belt width', value: `${raw.beltWidth_mm} mm` },
          { label: 'Belt strength', value: `${raw.beltStrength_N_per_mm} N/mm` },
          { label: 'Lift efficiency', value: String(raw.etaElev) },
        ]
      : [
          { label: 'Densidad aparente', value: `${raw.bulkDensity_kg_m3} kg/m3` },
          { label: 'Capacidad', value: `${raw.capacity_tph} t/h` },
          { label: 'Altura elevacion', value: `${raw.liftHeight_m} m` },
          { label: 'Distancia centros', value: `${raw.centerDistance_m} m` },
          { label: 'Velocidad banda', value: `${raw.beltSpeed_m_s} m/s` },
          { label: 'Ancho banda', value: `${raw.beltWidth_mm} mm` },
          { label: 'Resistencia banda', value: `${raw.beltStrength_N_per_mm} N/mm` },
          { label: 'Eta elevacion', value: String(raw.etaElev) },
        ],
    resultRows: en
      ? [
          { label: 'Pure lift power', value: `${(pw.pureLift_kW ?? 0).toFixed(3)} kW` },
          { label: 'Boot drag power', value: `${(pw.dragBoot_kW ?? 0).toFixed(3)} kW` },
          { label: 'Shaft power', value: `${(pw.shaft_kW ?? 0).toFixed(3)} kW` },
          { label: 'Head drum torque', value: `${driveReq.torque_Nm.toFixed(1)} N\u00b7m` },
          { label: 'Head drum rpm', value: `${driveReq.drum_rpm.toFixed(2)} rpm` },
          {
            label: 'Working / allowable tension',
            value: `${r.tension.working_N.toFixed(0)} / ${r.tension.admissible_N.toFixed(0)} N`,
          },
        ]
      : [
          { label: 'Potencia elevacion pura', value: `${(pw.pureLift_kW ?? 0).toFixed(3)} kW` },
          { label: 'Potencia arrastre bota', value: `${(pw.dragBoot_kW ?? 0).toFixed(3)} kW` },
          { label: 'Potencia eje', value: `${(pw.shaft_kW ?? 0).toFixed(3)} kW` },
          { label: 'Par en tambor cabeza', value: `${driveReq.torque_Nm.toFixed(1)} N\u00b7m` },
          { label: 'RPM tambor cabeza', value: `${driveReq.drum_rpm.toFixed(2)} rpm` },
          { label: 'Tension trabajo/admisible', value: `${r.tension.working_N.toFixed(0)} / ${r.tension.admissible_N.toFixed(0)} N` },
        ],
    assumptions: [],
    stepsSummary: [],
    topMotor: en
      ? 'See the gearmotor recommendation block on the page.'
      : 'Ver bloque de recomendaciones de motorreductor en la p\u00e1gina.',
    explanationsBlock: '',
    dynamicAnalysis: {
      torqueRunNm: driveReq.torque_Nm * 0.7,
      torqueStartNm: driveReq.torque_Nm,
      forcePeakN: r.tension.working_N,
      massFlowKgS: (raw.capacity_tph * 1000) / 3600,
    },
    verdict: r.tension.ok ? (en ? 'OK' : 'APTO') : en ? 'REVIEW' : 'REVISAR',
    disclaimer:
      r.disclaimer ||
      (en
        ? 'Validate with CEMA and the manufacturer before releasing final engineering.'
        : 'Validar con CEMA y fabricante antes de liberar ingenier\u00eda final.'),
  };
}

export function buildTractionPdfPayload(raw, r, driveReq) {
  return {
    title: 'Informe — Ascensor de tracción',
    fileBase: `informe-ascensor-traccion-${new Date().toISOString().slice(0, 10)}`,
    timestamp: formatDateTimeLocale(new Date(), getCurrentLang()),
    requirements: {
      power_kW: driveReq.power_kW,
      torque_Nm: driveReq.torque_Nm,
      drum_rpm: driveReq.drum_rpm,
    },
    inputRows: [
      { label: 'Carga util', value: `${raw.usefulLoad_kg} kg` },
      { label: 'Masa cabina vacia', value: `${raw.emptyCar_kg} kg` },
      { label: 'Altura viaje', value: `${raw.travelHeight_m} m` },
      { label: 'Velocidad nominal', value: `${raw.speed_m_s} m/s` },
      { label: 'Arrollamiento', value: raw.reeving === '2_1' ? '2:1' : '1:1' },
      { label: 'Diametro polea', value: `${raw.sheaveDiameter_m} m` },
      { label: 'Angulo abrazamiento', value: `${raw.wrapAngle_deg} deg` },
      { label: 'Rozamiento mu', value: String(raw.friction_mu) },
    ],
    resultRows: [
      { label: 'Masa contrapeso', value: `${r.inputs.Mcp.toFixed(0)} kg` },
      { label: 'Par polea diseño', value: `${driveReq.torque_Nm.toFixed(1)} N·m` },
      { label: 'Potencia motor orientativa', value: `${driveReq.power_kW.toFixed(3)} kW` },
      { label: 'RPM polea', value: `${r.drive.sheave_rpm.toFixed(2)} rpm` },
      { label: 'Relacion T1/T2', value: `${r.euler.tensionRatioWorst.toFixed(2)}` },
      { label: 'Margen adherencia', value: `x${r.euler.adhesionMargin.toFixed(2)}` },
      { label: 'Par freno emergencia', value: `${r.brake.torque_Nm.toFixed(1)} N·m` },
    ],
    assumptions: [],
    stepsSummary: [],
    topMotor: 'Ver bloque de recomendaciones de motorreductor en la página.',
    explanationsBlock: '',
    dynamicAnalysis: {
      torqueRunNm: driveReq.torque_Nm * 0.75,
      torqueStartNm: driveReq.torque_Nm,
      forcePeakN: driveReq.torque_Nm,
      massFlowKgS: 0,
    },
    verdict: r.euler.adhesionOk ? 'APTO' : 'REVISAR',
    disclaimer: r.disclaimer || 'Validar conforme EN 81 y normativa local aplicable.',
  };
}

/**
 * @param {HTMLElement | null} el
 * @param {{ isPremium: boolean; getPayload: () => object }} opts
 */
export function mountPremiumPdfExportBar(el, opts) {
  if (!el) return;
  const lang = getCurrentLang();
  const en = lang === 'en';
  let reportCfg = {};
  try {
    reportCfg = JSON.parse(window.localStorage.getItem(REPORT_CFG_KEY) || '{}') || {};
  } catch {
    reportCfg = {};
  }

  if (opts.isPremium) {
    const copy = en
      ? {
          title: 'Export PDF report',
          hint: 'Includes inputs, results, assumptions, reasoning, and step summary. Internet connection required to generate the file.',
          cfgSummary: 'Report settings (Premium)',
          projectName: 'Project name',
          preparedFor: 'Prepared for',
          engineer: 'Lead engineer',
          offerRef: 'Offer reference',
          hoursDay: 'Hours/day',
          energyCost: 'Energy cost',
          currency: 'Currency',
          beltStrength: 'Belt strength (N)',
          logo: 'Company logo (PNG/JPG)',
          download: 'Download PDF',
        }
      : {
          title: 'Exportar informe PDF',
          hint: 'Incluye entradas, resultados, hip\u00f3tesis, razonamiento y resumen de pasos. Requiere conexi\u00f3n para generar el archivo.',
          cfgSummary: 'Configuraci\u00f3n de informe (Premium)',
          projectName: 'Nombre del proyecto',
          preparedFor: 'Preparado para',
          engineer: 'Ingeniero responsable',
          offerRef: 'Referencia de oferta',
          hoursDay: 'Horas/d\u00eda',
          energyCost: 'Coste energ\u00eda',
          currency: 'Moneda',
          beltStrength: 'Resistencia banda (N)',
          logo: 'Logo empresa (PNG/JPG)',
          download: 'Descargar PDF',
        };
    el.innerHTML = `
      <div class="premium-export premium-export--active">
        <div class="premium-export__copy">
          <span class="premium-export__badge">Pro</span>
          <div>
            <strong>${copy.title}</strong>
            <p class="premium-export__hint">${copy.hint}</p>
          </div>
        </div>
        <details class="lab-results-details" style="margin:0.55rem 0 0.35rem">
          <summary>${copy.cfgSummary}</summary>
          <div style="padding:0.65rem 0.75rem; display:grid; gap:0.45rem; grid-template-columns:repeat(2,minmax(0,1fr))">
            <label style="display:grid; gap:0.2rem; font-size:0.8rem">${copy.projectName}<input data-report-field="projectName" type="text" value="${String(reportCfg.projectName || '').replace(/"/g, '&quot;')}" /></label>
            <label style="display:grid; gap:0.2rem; font-size:0.8rem">${copy.preparedFor}<input data-report-field="preparedFor" type="text" value="${String(reportCfg.preparedFor || '').replace(/"/g, '&quot;')}" /></label>
            <label style="display:grid; gap:0.2rem; font-size:0.8rem">${copy.engineer}<input data-report-field="engineerName" type="text" value="${String(reportCfg.engineerName || '').replace(/"/g, '&quot;')}" /></label>
            <label style="display:grid; gap:0.2rem; font-size:0.8rem">${copy.offerRef}<input data-report-field="offerRef" type="text" value="${String(reportCfg.offerRef || '').replace(/"/g, '&quot;')}" /></label>
            <label style="display:grid; gap:0.2rem; font-size:0.8rem">${copy.hoursDay}<input data-report-field="operationHoursDaily" type="number" min="1" step="any" value="${Number(reportCfg.operationHoursDaily || 8)}" /></label>
            <label style="display:grid; gap:0.2rem; font-size:0.8rem">${copy.energyCost}<input data-report-field="energyCostPerKwh" type="number" min="0.001" step="any" value="${Number(reportCfg.energyCostPerKwh || 0.18)}" /></label>
            <label style="display:grid; gap:0.2rem; font-size:0.8rem">${copy.currency}<input data-report-field="currency" type="text" value="${String(reportCfg.currency || '€').replace(/"/g, '&quot;')}" /></label>
            <label style="display:grid; gap:0.2rem; font-size:0.8rem">${copy.beltStrength}<input data-report-field="beltStrengthN" type="number" min="0" step="any" value="${Number(reportCfg.beltStrengthN || 0)}" /></label>
            <label style="display:grid; gap:0.2rem; font-size:0.8rem; grid-column:1 / -1">${copy.logo}<input data-report-logo type="file" accept="image/*" /></label>
          </div>
        </details>
        <button type="button" class="premium-export__btn" data-pdf-export>${copy.download}</button>
      </div>`;
    el.hidden = false;
    const readCfgFromDom = () => {
      const next = { ...reportCfg };
      el.querySelectorAll('[data-report-field]').forEach((input) => {
        if (!(input instanceof HTMLInputElement)) return;
        const key = input.getAttribute('data-report-field');
        if (!key) return;
        next[key] = input.value;
      });
      next.operationHoursDaily = Number(next.operationHoursDaily) || 8;
      next.energyCostPerKwh = Number(next.energyCostPerKwh) || 0.18;
      next.beltStrengthN = Number(next.beltStrengthN) || 0;
      reportCfg = next;
      try {
        window.localStorage.setItem(REPORT_CFG_KEY, JSON.stringify(reportCfg));
      } catch {
        // ignore storage quota/privacy errors
      }
    };
    el.querySelectorAll('[data-report-field]').forEach((input) => {
      input.addEventListener('input', readCfgFromDom);
      input.addEventListener('change', readCfgFromDom);
    });
    const logoInput = el.querySelector('[data-report-logo]');
    if (logoInput instanceof HTMLInputElement) {
      logoInput.addEventListener('change', () => {
        const file = logoInput.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          reportCfg.logoDataUrl = String(reader.result || '');
          try {
            window.localStorage.setItem(REPORT_CFG_KEY, JSON.stringify(reportCfg));
          } catch {
            // ignore
          }
        };
        reader.readAsDataURL(file);
      });
    }
    const btn = el.querySelector('[data-pdf-export]');
    btn?.addEventListener('click', async () => {
      try {
        readCfgFromDom();
        await exportEngineeringReportPdf(opts.getPayload(), {
          diagramEl: opts.getDiagramElement?.() || null,
          diagramTitle: opts.diagramTitle || (en ? 'System diagram' : 'Diagrama del sistema'),
          reportConfig: reportCfg,
        });
      } catch (e) {
        window.alert(String(e?.message || e));
      }
    });
  } else {
    el.hidden = false;
    el.innerHTML = en
      ? `
      <div class="premium-export premium-export--teaser">
        <span class="premium-export__badge premium-export__badge--muted">Pro</span>
        <p class="premium-export__teaser-text">Full <strong>PDF</strong> report export is available on the Pro plan.</p>
        <a class="premium-export__link" href="?pro=1">Try Pro access</a>
      </div>`
      : `
      <div class="premium-export premium-export--teaser">
        <span class="premium-export__badge premium-export__badge--muted">Pro</span>
        <p class="premium-export__teaser-text">La exportaci\u00f3n completa del informe en <strong>PDF</strong> est\u00e1 disponible con el plan Pro.</p>
        <a class="premium-export__link" href="?pro=1">Probar acceso Pro</a>
      </div>`;
  }
}
