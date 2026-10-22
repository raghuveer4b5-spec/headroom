// Training paces from a race time, using Jack Daniels' VDOT model (Daniels & Gilbert):
// a race time gives an "effective VO2max"; each training intensity is a fraction of it.

const DISTANCE_KM = { '5k': 5, '10k': 10, half: 21.0975, fitness: 5 };
const GOAL_NAMES = { '5k': '5K', '10k': '10K', half: 'half marathon', fitness: '5K' };

function parseTime(text) {
  if (typeof text === 'number') return text;
  const parts = String(text || '').trim().split(':').map(Number);
  if (!parts.length || parts.some((n) => !Number.isFinite(n))) return null;
  return parts.reduce((total, n) => total * 60 + n, 0);
}

function formatTime(sec) {
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
}

function formatPace(secPerKm) {
  const s = Math.round(secPerKm);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function vdotFromRace(km, sec) {
  const t = sec / 60;
  const v = (km * 1000) / t;
  const vo2 = -4.6 + 0.182258 * v + 0.000104 * v * v;
  const share = 0.8 + 0.1894393 * Math.exp(-0.012778 * t) + 0.2989558 * Math.exp(-0.1932605 * t);
  return vo2 / share;
}

function paceAt(vdot, fraction) {
  const vo2 = vdot * fraction;
  const a = 0.000104;
  const b = 0.182258;
  const c = -4.6 - vo2;
  const metresPerMin = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
  return 60000 / metresPerMin;
}

// Easy covers roughly 62-70% of VDOT, threshold (tempo) 88%, interval 97.5%.
function trainingPaces(vdot) {
  return {
    easyFast: paceAt(vdot, 0.7),
    easySlow: paceAt(vdot, 0.62),
    tempo: paceAt(vdot, 0.88),
    interval: paceAt(vdot, 0.975),
  };
}

// Paces for a plan, from the user's current time at their goal distance. Null when unknown.
function planPaces(plan) {
  const km = DISTANCE_KM[plan.goal] || 5;
  const current = parseTime(plan.currentTime);
  if (!current) return null;
  const vdot = vdotFromRace(km, current);
  const goal = parseTime(plan.goalTime);
  return {
    vdot,
    ...trainingPaces(vdot),
    distanceName: GOAL_NAMES[plan.goal] || '5K',
    current,
    currentPace: current / km,
    goal,
    goalPace: goal ? goal / km : null,
  };
}

// Riegel's formula, for estimating a time at one distance from a run at another.
function riegel(km, sec, targetKm) {
  return sec * (targetKm / km) ** 1.06;
}

module.exports = { DISTANCE_KM, parseTime, formatTime, formatPace, vdotFromRace, paceAt, trainingPaces, planPaces, riegel };
