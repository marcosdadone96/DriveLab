/**
 * Inercia carga vs motor — relación J_ext/J_mot y gráfico par motor vs par resistente.
 */

import { renderInertiaTransmissionLine } from '../lab/diagramCatalogModules.js';
import { mountCompactLabFieldHelp } from './labHelpCompact.js';

function interpCurve(curve, x) {
  const pts = [...curve].sort((a, b) => a[0] - b[0]);
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (x <= pts[i][0]) {
      const t = (x - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]);
      return pts[i - 1][1] + t * (pts[i][1] - pts[i - 1][1]);
    }
  }
  return pts[pts.length - 1][1];
}

function readNum(id, fallback) {
  const el = document.getElementById(id);
  const n = parseFloat(el?.value || '');
  return Number.isFinite(n) ? n : fallback;
}

function motorTorqueAtSpeed(motor, n_rpm) {
  const ratio = Math.min(0.999, Math.max(0, n_rpm / motor.n_sync));
  const k = interpCurve(motor.curve, ratio);
  return k * motor.T_N_m;
}

function buildUserMotor() {
  const J_motor_kgm2 = Math.max(1e-9, readNum('gmJmotor', 0.0012));
  const J_ratio_max = Math.max(1, readNum('gmJratioMax', 10));
  const T_N_m = Math.max(0.01, readNum('gmTN', 48));
  const n_sync = Math.max(100, readNum('gmNsync', 1500));
  const peak = Math.min(4, Math.max(1, readNum('gmTpeak', 2.2)));
  return {
    id: 'user',
    label: 'Motorreductor definido por usuario',
    J_motor_kgm2,
    J_ratio_max,
    T_N_m,
    n_sync,
    curve: [
      [0, Math.max(1.5, peak * 0.86)],
      [0.15, peak],
      [0.55, Math.max(1.05, 0.6 * peak)],
      [0.9, 0.95],
      [1, 0],
    ],
  };
}

function drawChart(motor, T_load, n_op) {
  const svg = document.getElementById('gmChart');
  if (!(svg instanceof SVGSVGElement)) return;
  const W = 520;
  const H = 220;
  const padL = 44;
  const padR = 24;
  const padT = 34;
  const padB = 40;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

  const nMax = motor.n_sync * 1.05;
  const TMax = motor.T_N_m * 2.5;
  const x = (n) => padL + ((n / nMax) * (W - padL - padR));
  const y = (T) => H - padB - (T / TMax) * (H - padT - padB);

  let pathD = '';
  for (let i = 0; i <= 48; i++) {
    const n = (i / 48) * nMax;
    const Tm = motorTorqueAtSpeed(motor, n);
    pathD += (i === 0 ? 'M' : 'L') + x(n).toFixed(1) + ' ' + y(Tm).toFixed(1) + ' ';
  }

  const xl = x(n_op);
  const yl = y(T_load);
  const ym = y(motorTorqueAtSpeed(motor, n_op));

  const gridH = [0.25, 0.5, 0.75, 1].map((f) => H - padB - f * (H - padT - padB));
  const gridV = [0.2, 0.4, 0.6, 0.8, 1].map((f) => padL + f * (W - padL - padR));

  let grid = '';
  gridH.forEach((gy) => {
    grid += `<line x1="${padL}" y1="${gy.toFixed(0)}" x2="${W - padR}" y2="${gy.toFixed(0)}" stroke="#e2e8f0" stroke-width="1"/>`;
  });
  gridV.forEach((gx) => {
    grid += `<line x1="${gx.toFixed(0)}" y1="${padT}" x2="${gx.toFixed(0)}" y2="${H - padB}" stroke="#e2e8f0" stroke-width="1"/>`;
  });

  const tickN = [0, Math.round(nMax * 0.5), Math.round(nMax)];
  let ticks = '';
  tickN.forEach((nv) => {
    const px = x(Math.min(nv, nMax));
    ticks += `<line x1="${px.toFixed(0)}" y1="${H - padB}" x2="${px.toFixed(0)}" y2="${H - padB + 5}" stroke="#64748b"/><text x="${px.toFixed(0)}" y="${H - 10}" text-anchor="middle" font-size="8.5" fill="#64748b" font-family="Inter,system-ui,sans-serif">${nv}</text>`;
  });
  const tickT = [0, (TMax / 2).toFixed(0), TMax.toFixed(0)];
  tickT.forEach((tv, i) => {
    const Tval = i === 0 ? 0 : i === 1 ? TMax / 2 : TMax;
    const py = y(Tval);
    ticks += `<line x1="${padL - 5}" y1="${py.toFixed(0)}" x2="${padL}" y2="${py.toFixed(0)}" stroke="#64748b"/><text x="${padL - 8}" y="${py + 3}" text-anchor="end" font-size="8.5" fill="#64748b" font-family="Inter,system-ui,sans-serif">${tv}</text>`;
  });

  svg.innerHTML = `
    <defs><linearGradient id="gmChBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fff"/><stop offset="100%" stop-color="#f8fafc"/></linearGradient></defs>
    <rect fill="url(#gmChBg)" x="0" y="0" width="${W}" height="${H}" rx="8" stroke="#e2e8f0"/>
    ${grid}
    <text x="${padL}" y="22" font-size="11" font-weight="800" fill="#0f172a" font-family="Inter,system-ui,sans-serif">Par T (N·m) frente a n (rpm)</text>
    <line x1="${padL}" y1="${H - padB}" x2="${W - padR}" y2="${H - padB}" stroke="#64748b" stroke-width="1.5" />
    <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${H - padB}" stroke="#64748b" stroke-width="1.5" />
    ${ticks}
    <text x="${(padL + W - padR) / 2}" y="${H - 6}" text-anchor="middle" font-size="9" font-weight="600" fill="#475569" font-family="Inter,system-ui,sans-serif">Velocidad n (rpm)</text>
    <text transform="rotate(-90 14 ${(padT + H - padB) / 2})" x="14" y="${(padT + H - padB) / 2}" text-anchor="middle" font-size="9" font-weight="600" fill="#475569" font-family="Inter,system-ui,sans-serif">Par (N·m)</text>
    <path d="${pathD.trim()}" fill="none" stroke="#0d9488" stroke-width="2.8" stroke-linejoin="round" />
    <line x1="${xl}" y1="${padT}" x2="${xl}" y2="${H - padB}" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="5 4" opacity="0.95" />
    <circle cx="${xl}" cy="${yl}" r="6" fill="#b45309" stroke="#fff" stroke-width="1.5" />
    <circle cx="${xl}" cy="${ym}" r="6" fill="#0d9488" stroke="#fff" stroke-width="1.5" />
    <text x="${W - padR - 130}" y="${padT + 16}" font-size="9" font-weight="700" fill="#0d9488" font-family="Inter,system-ui,sans-serif">● T motor en régimen</text>
    <text x="${W - padR - 130}" y="${padT + 30}" font-size="9" font-weight="700" fill="#b45309" font-family="Inter,system-ui,sans-serif">● T carga</text>
  `;
}

function render() {
  const Jext = parseFloat(document.getElementById('gmJext')?.value || '0');
  const nOp = parseFloat(document.getElementById('gmN')?.value || '1455');
  const Tload = parseFloat(document.getElementById('gmTload')?.value || '10');
  const out = document.getElementById('gmOut');
  const tbl = document.getElementById('gmTable');
  const motor = buildUserMotor();
  if (!out || !tbl) return;

  const ratio = motor.J_motor_kgm2 > 0 ? Jext / motor.J_motor_kgm2 : Infinity;
  const okJ = ratio <= motor.J_ratio_max;
  const Tm = motorTorqueAtSpeed(motor, nOp);
  const okT = Tm >= Tload * 1.05;

  drawChart(motor, Tload, nOp);

  out.innerHTML = `
    <p class="lab-verdict ${okJ ? 'lab-verdict--ok' : 'lab-verdict--err'}">
      Relación inercias <strong>J<sub>ext</sub>/J<sub>mot</sub></strong> = ${ratio.toFixed(2)} (límite definido: <strong>${motor.J_ratio_max}</strong>) — ${okJ ? 'dentro de referencia' : 'fuera de referencia'}.
    </p>
    <p class="lab-verdict ${okT ? 'lab-verdict--ok' : 'lab-verdict--err'}">
      A ${nOp.toFixed(0)} rpm, par motor estimado ≈ <strong>${Tm.toFixed(2)} N·m</strong> vs par resistente <strong>${Tload.toFixed(2)} N·m</strong> — ${okT ? 'margen suficiente (≈5%)' : 'riesgo de stall / sobrecarga'}.
    </p>`;

  tbl.innerHTML = `
    <table class="lab-catalog-table">
      <thead><tr><th>Parámetro</th><th>Valor</th></tr></thead>
      <tbody>
        <tr><td>J motorreductor</td><td>${motor.J_motor_kgm2.toExponential(3)} kg·m²</td></tr>
        <tr><td>J carga reflejada</td><td>${Jext.toExponential(3)} kg·m²</td></tr>
        <tr><td>T<sub>N</sub> nominal</td><td>${motor.T_N_m.toFixed(2)} N·m</td></tr>
        <tr><td>n síncrona base</td><td>${motor.n_sync.toFixed(0)} rpm</td></tr>
        <tr><td>Factor pico Tpico/Tn</td><td>${readNum('gmTpeak', 2.2).toFixed(2)}</td></tr>
      </tbody>
    </table>
    <p class="lab-small-print">Curva estimada según parámetros introducidos por usuario. Para validación final, use curva real del fabricante de su motorreductor.</p>`;
}

renderInertiaTransmissionLine(document.getElementById('gmLineDiagram'));
mountCompactLabFieldHelp();

['gmJmotor', 'gmJratioMax', 'gmTN', 'gmNsync', 'gmTpeak', 'gmJext', 'gmN', 'gmTload'].forEach((id) => {
  document.getElementById(id)?.addEventListener('input', render);
  document.getElementById(id)?.addEventListener('change', render);
});

render();
