// Weekly run plan that fits around the user's strength days, plus today's session
// adjusted by readiness. Running is prescribed; strength training is a black box we only schedule around.
const { daysBetween, clamp } = require('./stats');
const { planPaces, formatPace } = require('./pace');
const { stageOf, describe, LAST } = require('./beginner');

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const PEAK_KM = { '5k': 25, '10k': 35, half: 45, fitness: 25 };
const LONG_CAP_KM = { '5k': 10, '10k': 14, half: 20, fitness: 10 };
const ACCESSORY =
  'Runner strength (12 min, bodyweight): calf raises 3x15, slow heel drops 3x12, split squats 3x10/side, glute bridges 3x12, dead bugs 3x10, side plank 2x30s';

function weekdayOf(date) {
  const [y, m, d] = date.split('-').map(Number);
  return WEEKDAYS[(new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7];
}

const idx = (d) => WEEKDAYS.indexOf(d);
const shift = (d, n) => WEEKDAYS[(idx(d) + n + 7) % 7];
const gap = (a, b) => {
  const g = Math.abs(idx(a) - idx(b));
  return Math.min(g, 7 - g);
};
const halfKm = (km) => Math.round(km * 2) / 2;

function combinations(items, k) {
  if (k === 0) return [[]];
  if (items.length < k) return [];
  const [first, ...rest] = items;
  return [...combinations(rest, k - 1).map((c) => [first, ...c]), ...combinations(rest, k)];
}

// Below 15 km a week there's only room for one hard session once warm-ups are counted.
function hardTarget(runCount, priority, targetKm) {
  if (priority === 'beginner') return 0;
  let count = runCount >= 4 ? 2 : runCount === 3 ? 1 : 0;
  if (priority === 'lifting' || (targetKm && targetKm < 15)) count = Math.min(count, 1);
  return count;
}

// Picks run days and hard-session slots together: the week must first fit the planned hard
// sessions without bending rules, then avoid strength days and crowding, then spread out.
function chooseRunDays({ runsPerWeek, longRunDay, liftDays = [], priority, targetKm }) {
  const n = clamp(Math.round(runsPerWeek || 3), 1, 7);
  const others = WEEKDAYS.filter((d) => d !== longRunDay);
  let best = null;
  for (const combo of combinations(others, n - 1)) {
    const days = [...combo, longRunDay].sort((a, b) => idx(a) - idx(b));
    const { hard, notes } = assignHard(days, longRunDay, { liftDays, priority, targetKm });
    let penalty = (hardTarget(n, priority, targetKm) - Object.keys(hard).length) * 5 + notes.length * 3;
    for (const d of combo) {
      if (liftDays.includes(d)) penalty += 1;
      if (gap(d, longRunDay) === 1) penalty += 1;
    }
    let minGap = 7;
    for (let i = 0; i < days.length; i++) {
      const next = days[(i + 1) % days.length];
      const g = days.length === 1 ? 7 : (idx(next) - idx(days[i]) + 7) % 7 || 7;
      minGap = Math.min(minGap, g);
    }
    const score = penalty * 10 - minGap;
    if (!best || score < best.score) best = { score, days };
  }
  return best.days;
}

// Hard sessions: never within 48h of each other, preferably not the day after strength
// training or next to the long run. Those two rules relax, in that order, if the week is too tight.
function assignHard(runDays, longRunDay, prefs) {
  const liftDays = prefs.liftDays || [];
  const count = hardTarget(runDays.length, prefs.priority, prefs.targetKm);
  const candidates = runDays
    .filter((d) => d !== longRunDay)
    .sort((a, b) => gap(b, longRunDay) - gap(a, longRunDay) || idx(a) - idx(b));
  const hard = {};
  const notes = [];
  for (const type of ['intervals', 'tempo'].slice(0, count)) {
    for (let level = 0; level <= 2; level++) {
      const pick = candidates.find((d) => {
        if (hard[d]) return false;
        if (Object.keys(hard).some((h) => gap(h, d) < 2)) return false;
        if (level < 2 && liftDays.includes(shift(d, -1))) return false;
        if (level < 1 && gap(d, longRunDay) === 1) return false;
        return true;
      });
      if (pick) {
        hard[pick] = type;
        if (level === 2) notes.push(`${type} falls the day after strength training; keep that session lighter`);
        break;
      }
    }
  }
  return { hard, notes };
}

function weeklyTargetKm(prefs, date) {
  const goal = prefs.goal || 'fitness';
  const peak = PEAK_KM[goal] || PEAK_KM.fitness;
  const week = Math.max(0, Math.floor(daysBetween(prefs.startDate || date, date) / 7));
  let build = Math.min(peak, Math.max(10, prefs.baseWeeklyKm || 10));
  for (let w = 1; w <= week; w++) if (w % 4 !== 3) build = Math.min(peak, build * 1.1);
  return { week: week + 1, km: halfKm(week % 4 === 3 ? build * 0.8 : build), recovery: week % 4 === 3 };
}

// Beginner weeks: two or three run/walk sessions at the current stage, spaced around strength days.
function buildBeginnerWeek(prefs, date) {
  const liftDays = prefs.liftDays || [];
  const longRunDay = prefs.longRunDay || 'sat';
  const runsPerWeek = Math.min(3, Math.max(2, prefs.runsPerWeek || 3));
  const runDays = prefs.runDays || chooseRunDays({ runsPerWeek, longRunDay, liftDays, priority: 'beginner' });
  const stage = stageOf(prefs);
  const session = describe(stage);
  const easier = describe(Math.max(1, stage - 1));
  const week = Math.max(0, Math.floor(daysBetween(prefs.startDate || date, date) / 7)) + 1;
  const accessoryDays = [...WEEKDAYS.filter((d) => liftDays.includes(d)), ...runDays]
    .filter((d, i, all) => all.indexOf(d) === i)
    .slice(0, 2);
  const days = {};
  for (const d of WEEKDAYS) {
    const run = runDays.includes(d)
      ? { type: 'runwalk', km: null, minutes: session.runMinutes, text: session.text, short: session.short, easierText: easier.text, easierShort: easier.short }
      : null;
    days[d] = { run, strength: liftDays.includes(d), accessory: accessoryDays.includes(d) };
  }
  return {
    week,
    targetKm: null,
    recovery: false,
    runDays,
    days,
    notes: [],
    text: {},
    paces: null,
    beginner: { stage, of: LAST, title: session.title, short: session.short, runMinutes: session.runMinutes, graduated: Boolean(prefs.graduated) },
  };
}

function buildWeek(prefs, date, maxHr) {
  if (prefs.mode === 'beginner') return buildBeginnerWeek(prefs, date);
  const goal = prefs.goal || 'fitness';
  const liftDays = prefs.liftDays || [];
  const longRunDay = prefs.longRunDay || 'sun';
  const target = weeklyTargetKm(prefs, date);
  const planPrefs = { ...prefs, targetKm: target.km };
  const runDays = prefs.runDays || chooseRunDays({ runsPerWeek: prefs.runsPerWeek, longRunDay, liftDays, priority: prefs.priority, targetKm: target.km });
  const { hard, notes } = assignHard(runDays, longRunDay, planPrefs);

  const reps = target.km < 15 ? 3 : target.km < 25 ? 4 : 5;
  const tempoMin = target.km < 15 ? 15 : target.km < 25 ? 20 : 25;
  const sizes = { intervals: 2.5 + reps, tempo: halfKm(2.5 + tempoMin / 5.5) };
  // A low weekly average can hide a runner who already handles longer runs, so the
  // long run also builds from 70% of the longest recent run.
  const longKm = Math.max(4, Math.min(LONG_CAP_KM[goal] || 10, halfKm(Math.max(target.km * 0.3, (prefs.baseLongKm || 0) * 0.7))));
  const easyDays = runDays.filter((d) => d !== longRunDay && !hard[d]);
  const hardKm = Object.values(hard).reduce((s, t) => s + sizes[t], 0);
  const easyKm = easyDays.length ? Math.max(2.5, halfKm((target.km - longKm - hardKm) / easyDays.length)) : 0;
  const plannedKm = longKm + hardKm + easyKm * easyDays.length;
  if (plannedKm > target.km * 1.15) notes.push(`${plannedKm} km planned, above the build target of ${target.km} km because your recent long run sets the long-run distance; keep the easy runs genuinely easy`);

  const z2 = Math.round(0.7 * maxHr);
  const t1 = Math.round(0.85 * maxHr);
  const t2 = Math.round(0.9 * maxHr);
  // Paces come from the user's current race time when known; heart rate stays as the guard rail.
  const paces = planPaces(prefs);
  const easyPace = paces ? ` at ${formatPace(paces.easyFast)}-${formatPace(paces.easySlow)}/km` : '';
  const text = {
    easy: (km) => `Easy ${km} km${easyPace}, Zone 2 (keep HR under ${z2} bpm)`,
    long: (km) => `Long easy run ${km} km${easyPace}, Zone 2 (under ${z2} bpm)`,
    intervals: () => paces
      ? `Intervals: 1.5 km warm-up, ${reps} x 1 km at ${formatPace(paces.interval)}/km with 2 min jog, 1 km cool-down`
      : `Intervals: 1.5 km warm-up, ${reps} x 1 km hard (effort 8/10) with 2 min jog, 1 km cool-down`,
    tempo: () => paces
      ? `Tempo: 1.5 km warm-up, ${tempoMin} min at ${formatPace(paces.tempo)}/km (${t1}-${t2} bpm), 1 km cool-down`
      : `Tempo: 1.5 km warm-up, ${tempoMin} min comfortably hard (${t1}-${t2} bpm), 1 km cool-down`,
  };

  // Two short runner-strength blocks a week: tacked onto strength days first, then easy days.
  const accessoryDays = [...WEEKDAYS.filter((d) => liftDays.includes(d)), ...easyDays]
    .filter((d, i, all) => all.indexOf(d) === i)
    .slice(0, 2);

  const days = {};
  for (const d of WEEKDAYS) {
    let run = null;
    if (d === longRunDay) run = { type: 'long', km: longKm, text: text.long(longKm) };
    else if (hard[d]) run = { type: hard[d], km: sizes[hard[d]], text: text[hard[d]]() };
    else if (runDays.includes(d)) run = { type: 'easy', km: easyKm, text: text.easy(easyKm) };
    days[d] = { run, strength: liftDays.includes(d), accessory: accessoryDays.includes(d) };
  }
  return { week: target.week, targetKm: plannedKm, recovery: target.recovery, runDays, days, notes, text, paces };
}

const RUN_NAMES = { easy: 'Easy', long: 'Long run', intervals: 'Intervals', tempo: 'Tempo' };

// A few words for subject lines and the week strip, e.g. "Intervals 5.5 km + strength".
function shortLabel(day, band) {
  if (band === 'Poor') return 'Rest';
  const parts = [];
  if (day.run && day.run.type === 'runwalk') {
    parts.push(band === 'Low' ? `Run/walk ${day.run.easierShort} (easier)` : `Run/walk ${day.run.short}`);
  } else if (day.run) {
    const { type, km } = day.run;
    if (band === 'Low') {
      const share = type === 'easy' ? 0.7 : 0.6;
      const lowKm = Math.min(km, Math.max(2, halfKm(km * share)));
      parts.push(type === 'easy' ? `Easy ${lowKm} km` : `Easy ${lowKm} km (was ${RUN_NAMES[type].toLowerCase()})`);
    } else parts.push(`${RUN_NAMES[type]} ${km} km`);
  }
  if (day.strength) parts.push(parts.length ? 'strength' : 'Strength');
  return parts.join(' + ') || 'Rest';
}

function todaySession(prefs, date, band, maxHr) {
  const week = buildWeek(prefs, date, maxHr);
  const day = week.days[weekdayOf(date)];
  const parts = [];
  let changed = false;

  if (band === 'Poor') {
    parts.push('Rest, or a gentle 20-30 min walk');
    changed = Boolean(day.run || day.strength);
  } else {
    if (day.run && day.run.type === 'runwalk') {
      // Beginners drop back one stage on a Low morning rather than shortening the session.
      if (band === 'Low') {
        parts.push(`${day.run.easierText} (last stage's session, an easier day)`);
        changed = true;
      } else parts.push(day.run.text);
    } else if (day.run) {
      const { type, km } = day.run;
      // Low readiness only ever shortens or softens a run, never lengthens it.
      const lowKm = (share) => Math.min(km, Math.max(2, halfKm(km * share)));
      if (band === 'Low' && type !== 'easy') {
        parts.push(`${week.text.easy(lowKm(0.6))} instead of the planned ${type === 'long' ? 'long run' : type}`);
        changed = true;
      } else if (band === 'Low') {
        parts.push(week.text.easy(lowKm(0.7)));
        changed = true;
      } else {
        const hardRun = type === 'intervals' || type === 'tempo';
        let cue = band === 'Moderate' && hardRun ? ' (keep it controlled)' : '';
        if (hardRun && day.strength) cue += ' - run first, lift later';
        parts.push(day.run.text + cue);
      }
    }
    if (day.strength) {
      parts.push(band === 'Low' ? 'Strength training, lighter than usual' : 'Strength training');
      if (band === 'Low') changed = true;
    }
    if (day.accessory && band !== 'Low') parts.push('12-min runner strength block');
    if (!parts.length) parts.push('Rest day');
  }

  return {
    day: weekdayOf(date),
    week: week.week,
    weekTargetKm: week.targetKm,
    recoveryWeek: week.recovery,
    suggestion: parts.join(' + '),
    short: shortLabel(day, band),
    planned: day.run ? day.run.text : null,
    changed,
    accessory: day.accessory && band !== 'Low' && band !== 'Poor' ? ACCESSORY : null,
    notes: week.notes,
    beginner: week.beginner || null,
  };
}

module.exports = { WEEKDAYS, weekdayOf, chooseRunDays, assignHard, weeklyTargetKm, buildWeek, todaySession, shortLabel, ACCESSORY };
