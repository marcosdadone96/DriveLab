/**
 * PDF para calculadoras de laboratorio (hidraulica / neumatica).
 * Requiere red para cargar jsPDF (mismo CDN que reportPdfExport).
 */
import { svgToPngData } from './reportPdfExport.js';
import { getCurrentLang, formatDateTimeLocale, t } from '../config/locales.js';

const JSPDF_CDN = 'https://esm.sh/jspdf@2.5.2';

function sanitizePdfText(value) {
  let out = String(value ?? '');
  out = out.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  out = out.replace(/[^\x20-\x7E\n]/g, ' ');
  out = out.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  return out;
}

/**
 * @param {import('jspdf').jsPDF} doc
 */
function addWrapped(doc, text, x, y, maxW, lineMm) {
  const lines = doc.splitTextToSize(sanitizePdfText(text), maxW);
  doc.text(lines, x, y);
  return y + lines.length * lineMm;
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
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(String(value), x + 3, y + 12);
  if (subtitle) {
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7.8);
    doc.setFont('helvetica', 'normal');
    doc.text(String(subtitle), x + 3, y + h - 3.5);
  }
}

/**
 * @param {object} payload
 * @param {string} payload.title
 * @param {string} payload.fileBase
 * @param {string} [payload.timestamp]
 * @param {string} [payload.tierLabel]
 * @param {Array<{ title: string; value: string; subtitle?: string }>} [payload.kpis]
 * @param {Array<{ label: string; value: string }>} payload.inputRows
 * @param {Array<{ label: string; value: string }>} payload.resultRows
 * @param {string[]} [payload.formulaLines]
 * @param {string[]} [payload.assumptions]
 * @param {string} [payload.verdict]
 * @param {string} [payload.disclaimer]
 * @param {object} opts
 * @param {SVGElement[]} [opts.diagramEls]
 */
export async function exportLabFluidReportPdf(payload, opts = {}) {
  const lang = getCurrentLang();
  let jsPDF;
  try {
    const mod = await import(/* webpackIgnore: true */ JSPDF_CDN);
    jsPDF = mod.jsPDF;
  } catch {
    throw new Error(t('pdfLoadError', lang));
  }

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const m = 14;
  const blue = [13, 71, 161];
  const gray = [100, 116, 139];
  const ts = payload.timestamp || formatDateTimeLocale(new Date(), lang);

  doc.setFillColor(...blue);
  doc.rect(0, 0, pageW, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(sanitizePdfText(payload.title || 'Fluid lab report'), m, 13);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(ts, m, 21);
  if (payload.tierLabel) {
    doc.text(sanitizePdfText(payload.tierLabel), m, 26);
  }

  let y = 38;
  doc.setTextColor(15, 23, 42);
  const kpis = Array.isArray(payload.kpis) ? payload.kpis.slice(0, 4) : [];
  if (kpis.length) {
    const kpiW = (pageW - 2 * m - 6) / 2;
    const kpiH = 18;
    for (let i = 0; i < kpis.length; i += 1) {
      const k = kpis[i];
      const col = i % 2;
      const row = Math.floor(i / 2);
      drawKpiCard(doc, m + col * (kpiW + 6), y + row * (kpiH + 4), kpiW, kpiH, k.title, k.value, k.subtitle || '');
    }
    y += Math.ceil(kpis.length / 2) * (kpiH + 4) + 6;
  }

  doc.addPage();
  y = 16;
  doc.setTextColor(...blue);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(lang === 'en' ? 'Diagram(s)' : 'Diagrama(s)', m, y);
  y += 8;

  const diagramEls = Array.isArray(opts.diagramEls) ? opts.diagramEls.filter((e) => e instanceof SVGSVGElement) : [];
  const maxDiagramH = 78;
  for (const svg of diagramEls) {
    const png = await svgToPngData(svg);
    if (png) {
      const maxW = pageW - 2 * m;
      const ratio = png.width / png.height;
      let drawW = maxW;
      let drawH = drawW / ratio;
      if (drawH > maxDiagramH) {
        drawH = maxDiagramH;
        drawW = drawH * ratio;
      }
      const x = m + (maxW - drawW) / 2;
      if (y + drawH > pageH - 20) {
        doc.addPage();
        y = 16;
      }
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(m, y - 1, maxW, drawH + 2, 1.5, 1.5, 'S');
      doc.addImage(png.dataUrl, 'PNG', x, y, drawW, drawH, undefined, 'FAST');
      y += drawH + 10;
    }
  }
  if (!diagramEls.length) {
    doc.setTextColor(...gray);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(lang === 'en' ? 'No diagram in this export.' : 'Sin diagrama en esta exportacion.', m, y);
    y += 8;
  }

  doc.addPage();
  y = 16;
  doc.setTextColor(...blue);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(lang === 'en' ? 'Inputs' : 'Entradas', m, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  for (const row of payload.inputRows || []) {
    if (y > 275) {
      doc.addPage();
      y = 16;
    }
    y = addWrapped(doc, `• ${row.label}: ${row.value}`, m, y, pageW - 2 * m, 4.2) + 0.6;
  }

  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...blue);
  doc.text(lang === 'en' ? 'Results' : 'Resultados', m, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  for (const row of payload.resultRows || []) {
    if (y > 275) {
      doc.addPage();
      y = 16;
    }
    y = addWrapped(doc, `• ${row.label}: ${row.value}`, m, y, pageW - 2 * m, 4.2) + 0.6;
  }

  doc.addPage();
  y = 16;
  doc.setTextColor(...blue);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(lang === 'en' ? 'Calculation trace' : 'Trazabilidad de calculo', m, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.setTextColor(15, 23, 42);
  for (const line of payload.formulaLines || []) {
    if (y > 268) {
      doc.addPage();
      y = 16;
    }
    y = addWrapped(doc, `- ${line}`, m, y, pageW - 2 * m, 4) + 0.5;
  }

  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...blue);
  doc.text(lang === 'en' ? 'Assumptions' : 'Supuestos', m, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.setTextColor(15, 23, 42);
  for (const line of payload.assumptions || []) {
    if (y > 268) {
      doc.addPage();
      y = 16;
    }
    y = addWrapped(doc, `• ${line}`, m, y, pageW - 2 * m, 4) + 0.5;
  }

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text(lang === 'en' ? 'Verdict' : 'Veredicto', m, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  y = addWrapped(doc, payload.verdict || '—', m, y, pageW - 2 * m, 4.2) + 4;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...gray);
  doc.setFontSize(9);
  doc.text(lang === 'en' ? 'Disclaimer' : 'Aviso legal', m, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  y = addWrapped(
    doc,
    payload.disclaimer ||
      (lang === 'en'
        ? 'Educational pre-design tool. Verify with manufacturer data, applicable standards and qualified engineering review before fabrication or operation.'
        : 'Herramienta educativa de predimensionado. Verificar con datos de fabricante, normativa aplicable e ingenieria cualificada antes de fabricar u operar.'),
    m,
    y,
    pageW - 2 * m,
    4,
  );

  doc.setFontSize(8);
  doc.setTextColor(...gray);
  doc.text(`MechAssist � ${ts}`, m, pageH - 10);

  doc.save(`${payload.fileBase || 'informe-fluidos'}.pdf`);
}

/**
 * Barra de exportacion PDF (activa por defecto; sin paywall en laboratorio fluidos).
 * @param {HTMLElement | null} el
 * @param {object} opts
 * @param {() => object} opts.getPayload
 * @param {() => SVGSVGElement[]} opts.getDiagramElements
 */
export function mountLabFluidPdfExportBar(el, { getPayload, getDiagramElements }) {
  if (!(el instanceof HTMLElement)) return;
  const lang = getCurrentLang();
  const en = lang === 'en';
  el.className = 'lab-fluid-pdf-mount premium-pdf-mount';
  el.innerHTML = en
    ? `<div class="premium-export premium-export--active">
        <div class="premium-export__copy">
          <span class="premium-export__badge">PDF</span>
          <div><strong>Export technical report</strong>
          <p class="premium-export__hint">Includes diagram(s), inputs, results, formulas and assumptions. Internet required for PDF engine.</p></div>
        </div>
        <button type="button" class="premium-export__btn" data-lab-fluid-pdf>Download PDF</button>
      </div>`
    : `<div class="premium-export premium-export--active">
        <div class="premium-export__copy">
          <span class="premium-export__badge">PDF</span>
          <div><strong>Exportar informe tecnico</strong>
          <p class="premium-export__hint">Incluye diagrama(s), entradas, resultados, formulas y supuestos. Requiere conexion para generar el PDF.</p></div>
        </div>
        <button type="button" class="premium-export__btn" data-lab-fluid-pdf>Descargar PDF</button>
      </div>`;

  el.querySelector('[data-lab-fluid-pdf]')?.addEventListener('click', async () => {
    try {
      const payload = getPayload();
      if (payload && payload.valid === false) {
        window.alert(en ? 'Fix input errors before exporting.' : 'Corrija errores de entrada antes de exportar.');
        return;
      }
      await exportLabFluidReportPdf(payload, { diagramEls: getDiagramElements() });
    } catch (e) {
      window.alert(String(e?.message || e));
    }
  });
}
