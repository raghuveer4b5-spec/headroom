function isNum(x) {
  return typeof x === 'number' && Number.isFinite(x);
}

function mean(values) {
  return values.reduce((sum, x) => sum + x, 0) / values.length;
}

function sd(values) {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(values.reduce((sum, x) => sum + (x - m) ** 2, 0) / (values.length - 1));
}

function clamp(x, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, x));
}

function round(x, digits = 0) {
  const f = 10 ** digits;
  return Math.round(x * f) / f;
}

function toUtc(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function addDays(dateStr, n) {
  return new Date(toUtc(dateStr) + n * 86400000).toISOString().slice(0, 10);
}

function daysBetween(from, to) {
  return Math.round((toUtc(to) - toUtc(from)) / 86400000);
}

module.exports = { isNum, mean, sd, clamp, round, addDays, daysBetween };
