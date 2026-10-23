const { daysBetween } = require('./stats');

// Edwards TRIMP when per-zone time is available, Banister TRIMP from average HR otherwise.
// Only the acute:chronic ratio is used downstream, so the absolute scale cancels out.
function activityLoad(act, { maxHr, restHr }) {
  if (Array.isArray(act.zoneSeconds) && act.zoneSeconds.some((s) => s > 0)) {
    return act.zoneSeconds.reduce((sum, s, i) => sum + ((s || 0) / 60) * (i + 1), 0);
  }
  if (act.avgHr && act.durationS && maxHr > restHr) {
    const hrr = Math.max(0, Math.min(1, (act.avgHr - restHr) / (maxHr - restHr)));
    return (act.durationS / 60) * hrr * 0.64 * Math.exp(1.92 * hrr);
  }
  return 0;
}

function isHard(act, { maxHr }) {
  if ((act.aerobicTe || 0) >= 3.5) return true;
  return Boolean(act.avgHr && act.durationS >= 900 && act.avgHr >= 0.85 * maxHr);
}

function loadSummary(activities, date, { maxHr, restHr, coverageStart }) {
  let acute = 0;
  let chronic = 0;
  let hardDaysAgo = null;
  for (const act of activities) {
    const ago = daysBetween(act.start.slice(0, 10), date);
    if (ago < 1 || ago > 28) continue;
    const load = activityLoad(act, { maxHr, restHr });
    chronic += load;
    if (ago <= 7) acute += load;
    if (ago <= 2 && isHard(act, { maxHr })) {
      hardDaysAgo = hardDaysAgo === null ? ago : Math.min(hardDaysAgo, ago);
    }
  }
  const enoughHistory = coverageStart && daysBetween(coverageStart, date) >= 21;
  const chronicWeekly = chronic / 4;
  const ratio = enoughHistory && chronicWeekly > 0 ? acute / chronicWeekly : null;
  return { acute, chronicWeekly, ratio, hardDaysAgo };
}

// A sensible load is the expected state, so it scores like an average day (~75), not a bonus.
function ratioScore(ratio) {
  if (ratio < 0.8) return 70;
  if (ratio <= 1.3) return 75;
  if (ratio <= 2.0) return (75 * (2.0 - ratio)) / 0.7;
  return 0;
}

function observedMaxHr(activities) {
  const values = activities.map((a) => a.maxHr).filter((x) => typeof x === 'number' && x > 120 && x < 230);
  return values.length ? Math.max(...values) : null;
}

// Tanaka et al. 2001: 208 - 0.7 x age, the least biased of the common age formulas (about +-10 bpm).
function ageMaxHr(age) {
  return typeof age === 'number' && age >= 10 && age <= 100 ? Math.round(208 - 0.7 * age) : null;
}

module.exports = { activityLoad, isHard, loadSummary, ratioScore, observedMaxHr, ageMaxHr };
