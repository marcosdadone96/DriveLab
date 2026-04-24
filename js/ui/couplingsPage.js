/**
 * Selector acoplamientos — catálogo + par de diseño.
 */

import { COUPLING_BRANDS } from '../data/couplingsCatalog.js';
import { renderCouplingAssemblyDiagram } from '../lab/diagramCatalogModules.js';

function torqueFromPower_kW_nm(P_kW, n_rpm) {
  if (!(Number.isFinite(P_kW) && P_kW >= 0 && Number.isFinite(n_rpm) && n_rpm > 0)) return NaN;
  const w = (2 * Math.PI * n_rpm) / 60;
  return (P_kW * 1000) / w;
}

function fillBrandSelect() {
  const sel = document.getElementById('cpBrand');
  if (!sel) return;
  sel.innerHTML = COUPLING_BRANDS.map((b) => `<option value="${b.id}">${b.label}</option>`).join('');
}

function fillSeriesSelect(brandId) {
  const sel = document.getElementById('cpSeries');
  const brand = COUPLING_BRANDS.find((b) => b.id === brandId);
  if (!sel || !brand) return;
  sel.innerHTML = brand.series.map((s) => `<option value="${s.model}">${s.model} · ${s.family} · ${s.T_nom_Nm} N·m</option>`).join('');
}

function findSuggestedModel(brandId, T_req_Nm) {
  const brand = COUPLING_BRANDS.find((b) => b.id === brandId);
  if (!brand) return null;
  const ok = brand.series.filter((s) => s.T_nom_Nm >= T_req_Nm);
  if (!ok.length) return brand.series[brand.series.length - 1];
  return ok.reduce((a, b) => (a.T_nom_Nm < b.T_nom_Nm ? a : b));
}

function render() {
  const P = parseFloat((document.getElementById('cpPower')?.value || '0').replace(',', '.'));
  const n = parseFloat((document.getElementById('cpRpm')?.value || '0').replace(',', '.'));
  const K = parseFloat((document.getElementById('cpK')?.value || '1.25').replace(',', '.'));
  const brandId = document.getElementById('cpBrand')?.value;
  const model = document.getElementById('cpSeries')?.value;
  const out = document.getElementById('cpOut');
  const tbl = document.getElementById('cpTable');
  if (!out || !tbl) return;

  if (!(Number.isFinite(P) && P >= 0 && Number.isFinite(n) && n > 0 && Number.isFinite(K) && K >= 1)) {
    out.innerHTML = '<p class="lab-verdict lab-verdict--err"><strong>Entrada no válida:</strong> use P ≥ 0, n > 0 y K ≥ 1.</p>';
    tbl.innerHTML = '';
    return;
  }
  const T_ap = torqueFromPower_kW_nm(P, n);
  const T_des = T_ap * K;
  const brand = COUPLING_BRANDS.find((b) => b.id === brandId);
  const row = brand?.series.find((s) => s.model === model);

  if (!row) {
    out.innerHTML = '<p class="lab-verdict lab-verdict--muted">Seleccione fabricante y modelo.</p>';
    tbl.innerHTML = '';
    return;
  }

  const ok = row.T_nom_Nm >= T_des;
  const sug = ok ? null : findSuggestedModel(brandId, T_des);

  if (ok) {
    out.innerHTML = `<p class="lab-verdict lab-verdict--ok"><strong>OK:</strong> ${row.model} admite el par de diseño (${T_des.toFixed(1)} N·m ≤ ${row.T_nom_Nm} N·m cat.).</p>`;
  } else {
    out.innerHTML = `<p class="lab-verdict lab-verdict--err"><strong>ERROR:</strong> El modelo <strong>${row.model}</strong> no soporta la carga (${T_des.toFixed(1)} N·m &gt; ${row.T_nom_Nm} N·m).<br/>
      <strong>Sugerido:</strong> modelo <strong>${sug?.model ?? '—'}</strong> (${sug ? `${sug.T_nom_Nm} N·m` : ''}).</p>`;
  }

  tbl.innerHTML = `
    <table class="lab-catalog-table">
      <thead><tr><th>Concepto</th><th>Aplicación</th><th>Catálogo (${brand?.label})</th></tr></thead>
      <tbody>
        <tr><td>Potencia</td><td>${P.toFixed(3)} kW</td><td>—</td></tr>
        <tr><td>Velocidad</td><td>${n.toFixed(0)} min⁻¹</td><td>—</td></tr>
        <tr><td>Factor servicio K</td><td>${K.toFixed(2)}</td><td>—</td></tr>
        <tr><td>Par en eje (entrada)</td><td>${T_ap.toFixed(2)} N·m</td><td>—</td></tr>
        <tr><td>Par de diseño</td><td><strong>${T_des.toFixed(2)} N·m</strong></td><td>T<sub>nom</sub> = ${row.T_nom_Nm} N·m</td></tr>
        <tr><td>Modelo</td><td>—</td><td>${row.model} · ${row.family}</td></tr>
        <tr><td>Ø máx. aloj. (ref.)</td><td>—</td><td>${row.bore_max_mm} mm</td></tr>
        <tr><td>Notas cat.</td><td colspan="2">${row.note}</td></tr>
      </tbody>
    </table>
    <p class="lab-small-print">Datos demostrativos. Verifique siempre con la hoja técnica del fabricante.</p>`;
}

renderCouplingAssemblyDiagram(document.getElementById('cpDiagram'));

fillBrandSelect();
fillSeriesSelect(COUPLING_BRANDS[0].id);

document.getElementById('cpBrand')?.addEventListener('change', (e) => {
  fillSeriesSelect(e.target.value);
  render();
});
document.getElementById('cpSeries')?.addEventListener('change', render);
['cpPower', 'cpRpm', 'cpK'].forEach((id) => document.getElementById(id)?.addEventListener('input', render));
document.querySelectorAll('.cp-ka-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const input = document.getElementById('cpK');
    const ka = Number(btn.getAttribute('data-ka'));
    if (!(input instanceof HTMLInputElement) || !Number.isFinite(ka) || ka < 1) return;
    input.value = ka.toFixed(2);
    render();
  });
});

render();
