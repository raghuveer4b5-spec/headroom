// Browser entry point. The agent's page-script tool returns at most ~1000 characters,
// so results are computed in the page and returned compactly, with paging for long output.
const { computeReadiness, DEFAULT_CONFIG } = require('./core/readiness');
const { isHard, observedMaxHr } = require('./core/load');
const { addDays } = require('./core/stats');
const { fetchCommon } = require('./adapters/garmin-browser');

const PAGE = 900;
let pending = [];

function localToday() {
  return new Date().toLocaleDateString('en-CA');
}

function paged(text) {
  pending = [];
  for (let i = 0; i < text.length; i += PAGE) pending.push(text.slice(i, i + PAGE));
  if (pending.length <= 1) return text;
  return `${pending[0]}\n[page 1/${pending.length}; call Splits.more(2)]`;
}

function more(n) {
  const chunk = pending[n - 1];
  if (chunk === undefined) return '[no such page]';
  return n < pending.length ? `${chunk}\n[page ${n}/${pending.length}; call Splits.more(${n + 1})]` : chunk;
}

const AUTH_MESSAGE = 'Garmin session expired. Reload connect.garmin.com (sign in if asked), then run again.';

function authExpired(data) {
  return data.days.length === 0 && data.warnings.some((w) => /HTTP 40[13]$/.test(w));
}

// Max HR from setup wins; otherwise the highest HR seen in the fetched activities.
function resolveConfig(config, activities) {
  const cfg = { ...(config || {}) };
  if (!cfg.maxHr) cfg.maxHr = observedMaxHr(activities) || DEFAULT_CONFIG.maxHr;
  return cfg;
}

async function morningCheck({ date, config } = {}) {
  const d = date || localToday();
  const data = await fetchCommon({ startDate: addDays(d, -31), endDate: d, sleepFrom: addDays(d, -2) });
  if (authExpired(data)) return JSON.stringify({ date: d, status: 'auth-expired', message: AUTH_MESSAGE });
  const r = computeReadiness(data, d, resolveConfig(config, data.activities));
  return paged(JSON.stringify({
    date: r.date,
    status: r.status,
    score: r.score,
    band: r.band,
    message: r.message,
    components: r.components,
    inputs: r.inputs,
    missing: r.missing,
    warnings: data.warnings.slice(0, 3),
  }));
}

function dayFlag(activities, date, maxHr) {
  const todays = activities.filter((a) => a.start.startsWith(date));
  if (todays.some((a) => isHard(a, { maxHr }))) return 'h';
  if (todays.some((a) => a.type.includes('running'))) return 'r';
  return todays.length ? 'x' : '';
}

async function backtest({ endDate, days = 60, config } = {}) {
  const end = endDate || localToday();
  const first = addDays(end, -(days - 1));
  const data = await fetchCommon({ startDate: addDays(first, -31), endDate: end, sleepFrom: addDays(first, -2) });
  if (authExpired(data)) return AUTH_MESSAGE;
  const cfg = resolveConfig(config, data.activities);
  const rows = [];
  for (let d = first; d <= end; d = addDays(d, 1)) {
    const r = computeReadiness(data, d, cfg);
    const score = r.score === null ? '--' : String(r.score);
    rows.push(`${d.slice(5).replace('-', '')}:${score}${r.band ? r.band[0] : ''}${dayFlag(data.activities, d, cfg.maxHr)}`);
  }
  const legend = 'MMDD:score, band H/M/L/P, then activity that day: h hard, r run, x other';
  return paged(`${legend}\n${rows.join(' ')}`);
}

// For setup: what Splits can see in the last 90 days, to pre-fill the questionnaire.
async function profile({ days = 90 } = {}) {
  const end = localToday();
  const data = await fetchCommon({ startDate: addDays(end, -(days - 1)), endDate: end, sleepFrom: end });
  if (authExpired(data)) return JSON.stringify({ status: 'auth-expired', message: AUTH_MESSAGE });
  const withHrv = data.days.filter((d) => typeof d.hrvLastNight === 'number').length;
  return JSON.stringify({
    status: 'ok',
    observedMaxHr: observedMaxHr(data.activities),
    activities: data.activities.length,
    runs: data.activities.filter((a) => a.type.includes('running')).length,
    daysWithHrv: withHrv,
    readyToScore: withHrv >= 14,
  });
}

module.exports = { morningCheck, backtest, profile, more, computeReadiness, fetchCommon, authExpired, resolveConfig };
