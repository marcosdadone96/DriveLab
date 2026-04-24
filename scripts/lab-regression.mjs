import { computeIsoFit } from '../js/lab/iso286Compute.js';
import { computeAgmaSimplifiedCheck } from '../js/lab/agmaSpurSimplified.js';
import { computeBeltDriveTransmission } from '../js/lab/beltDrives.js';
import { computeBearingL10 } from '../js/lab/bearings.js';
import { computeSolidShaftTorsion } from '../js/lab/shaftTorsion.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function approxEqual(a, b, tol, label) {
  const ok = Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tol;
  assert(ok, `${label}: expected ${b} +/- ${tol}, got ${a}`);
}

function run(name, fn) {
  try {
    fn();
    return { name, ok: true };
  } catch (err) {
    return { name, ok: false, err: err instanceof Error ? err.message : String(err) };
  }
}

const tests = [
  run('ISO 25 H7/g6 anchor', () => {
    const r = computeIsoFit(25, 'H', 'IT7', 'g', 'IT6');
    assert(r.ok === true, 'computeIsoFit returned !ok');
    approxEqual(r.clearanceMin_um, 7, 0.2, 'Jmin');
    approxEqual(r.clearanceMax_um, 41, 0.2, 'Jmax');
    assert(r.fitKind === 'clearance', `fitKind expected clearance, got ${r.fitKind}`);
  }),
  run('ISO A hole sign sanity', () => {
    const r = computeIsoFit(25, 'A', 'IT7', 'h', 'IT6');
    assert(r.ok === true, 'computeIsoFit returned !ok');
    assert(r.hole.EI_um < 0, `hole EI should be negative for A, got ${r.hole.EI_um}`);
  }),
  run('AGMA tangential load formula', () => {
    const r = computeAgmaSimplifiedCheck({
      z1: 20,
      z2: 40,
      module_mm: 2.5,
      d1_mm: 50,
      faceWidth_mm: 20,
      n1_rpm: 1000,
      torquePinion_Nm: 100,
      lubrication: 'oil',
    });
    approxEqual(r.tangentialLoad_N, 4000, 1e-6, 'Ft');
  }),
  run('Belt valid geometry', () => {
    const r = computeBeltDriveTransmission({
      beltType: 'v_trapezoidal',
      d1_mm: 125,
      d2_mm: 280,
      center_mm: 520,
      n1_rpm: 1450,
      slip_pct: 2,
    });
    assert(r.geometryValid === true, 'Expected valid geometry');
    assert(Number.isFinite(r.wrapAngle_deg_small), 'Wrap angle should be finite');
  }),
  run('Belt invalid geometry detection', () => {
    const r = computeBeltDriveTransmission({
      beltType: 'v_trapezoidal',
      d1_mm: 200,
      d2_mm: 100,
      center_mm: 20,
      n1_rpm: 1450,
      slip_pct: 2,
    });
    assert(r.geometryValid === false, 'Expected invalid geometry');
    assert(Number.isNaN(r.wrapAngle_deg_small), 'Wrap angle should be NaN on invalid geometry');
  }),
  run('Bearing life positive with valid speed', () => {
    const r = computeBearingL10({
      dynamicLoad_N: 19500,
      equivalentLoad_N: 6200,
      speed_rpm: 1450,
      type: 'ball',
    });
    assert(Number.isFinite(r.nominalLife_hours) && r.nominalLife_hours > 0, `Unexpected life ${r.nominalLife_hours}`);
  }),
  run('Shaft zero torque stays zero', () => {
    const r = computeSolidShaftTorsion({ torque_Nm: 0, tauAllow_MPa: 40 });
    approxEqual(r.diameter_min_mm, 0, 1e-9, 'diameter_min_mm');
  }),
];

const failed = tests.filter((t) => !t.ok);
for (const t of tests) {
  if (t.ok) console.log(`PASS ${t.name}`);
  else console.log(`FAIL ${t.name} -> ${t.err}`);
}

if (failed.length) {
  console.log(`\n${failed.length} test(s) failed.`);
  process.exit(1);
}

console.log(`\nAll ${tests.length} lab regression tests passed.`);
