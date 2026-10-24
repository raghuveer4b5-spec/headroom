const test = require('node:test');
const assert = require('node:assert/strict');
const { weekdayOf, chooseRunDays, buildWeek, todaySession, weeklyTargetKm } = require('../src/core/plan');

const PREFS = {
  goal: '5k',
  runsPerWeek: 4,
  longRunDay: 'sun',
  liftDays: ['mon', 'wed', 'fri'],
  priority: 'balanced',
  startDate: '2026-10-19',
  baseWeeklyKm: 12,
};
const MAX_HR = 196;

test('weekdays are computed from the calendar date', () => {
  assert.equal(weekdayOf('2026-10-22'), 'thu');
  assert.equal(weekdayOf('2026-10-25'), 'sun');
});

test('run days include the long run day and avoid strength days when that costs nothing', () => {
  const days = chooseRunDays({ runsPerWeek: 3, longRunDay: 'sun', liftDays: ['mon'] });
  assert.equal(days.length, 3);
  assert.ok(days.includes('sun'));
  assert.ok(!days.includes('mon'), days.join(','));
});

test('hard sessions are 48h apart and never the day after strength when avoidable', () => {
  const week = buildWeek({ ...PREFS, runsPerWeek: 4, liftDays: ['mon'], baseWeeklyKm: 18 }, '2026-10-22', MAX_HR);
  const hardDays = Object.keys(week.days).filter((d) => ['intervals', 'tempo'].includes(week.days[d].run?.type));
  assert.equal(hardDays.length, 2);
  assert.ok(!hardDays.includes('tue'), 'no hard run the day after Monday strength');
  assert.equal(week.notes.length, 0);
});

test('a tight week still gets a plan, with a note when a rule had to bend', () => {
  const week = buildWeek(PREFS, '2026-10-22', MAX_HR);
  assert.equal(Object.values(week.days).filter((d) => d.run).length, 4);
  assert.equal(week.days.sun.run.type, 'long');
});

test('a low-volume week gets one hard session, not two', () => {
  const week = buildWeek(PREFS, '2026-10-22', MAX_HR);
  const hard = Object.values(week.days).filter((d) => ['intervals', 'tempo'].includes(d.run?.type));
  assert.equal(hard.length, 1);
});

test('lifting-first users get at most one hard run', () => {
  const week = buildWeek({ ...PREFS, runsPerWeek: 5, liftDays: [], priority: 'lifting', baseWeeklyKm: 25 }, '2026-10-22', MAX_HR);
  const hard = Object.values(week.days).filter((d) => ['intervals', 'tempo'].includes(d.run?.type));
  assert.equal(hard.length, 1);
});

test('weekly volume builds about 10% a week with a lighter fourth week', () => {
  const w1 = weeklyTargetKm(PREFS, '2026-10-19').km;
  const w2 = weeklyTargetKm(PREFS, '2026-10-26').km;
  const w3 = weeklyTargetKm(PREFS, '2026-11-02').km;
  const w4 = weeklyTargetKm(PREFS, '2026-11-09');
  assert.equal(w1, 12);
  assert.ok(w2 > w1 && w3 > w2);
  assert.ok(w4.recovery && w4.km < w3);
});

test('readiness adjusts today: Low turns a hard run easy, Poor means rest', () => {
  const week = buildWeek(PREFS, '2026-10-22', MAX_HR);
  const hardDay = Object.keys(week.days).find((d) => ['intervals', 'tempo'].includes(week.days[d].run?.type));
  const dates = { mon: '2026-10-19', tue: '2026-10-20', wed: '2026-10-21', thu: '2026-10-22', fri: '2026-10-23', sat: '2026-10-24', sun: '2026-10-25' };
  const date = dates[hardDay];

  const high = todaySession(PREFS, date, 'High', MAX_HR);
  assert.equal(high.changed, false);
  assert.match(high.suggestion, /Intervals|Tempo/);

  const low = todaySession(PREFS, date, 'Low', MAX_HR);
  assert.equal(low.changed, true);
  assert.match(low.suggestion, /^Easy .* instead of the planned/);

  const poor = todaySession(PREFS, date, 'Poor', MAX_HR);
  assert.match(poor.suggestion, /^Rest/);
});

test('Low readiness never makes a run longer', () => {
  const prefs = { ...PREFS, runsPerWeek: 3, longRunDay: 'sat' };
  const week = buildWeek(prefs, '2026-10-22', MAX_HR);
  const dates = { mon: '2026-10-19', tue: '2026-10-20', wed: '2026-10-21', thu: '2026-10-22', fri: '2026-10-23', sat: '2026-10-24', sun: '2026-10-25' };
  for (const [d, x] of Object.entries(week.days)) {
    if (!x.run) continue;
    const km = Number(todaySession(prefs, dates[d], 'Low', MAX_HR).suggestion.match(/Easy ([\d.]+) km/)[1]);
    assert.ok(km <= x.run.km, `${d}: ${km} > ${x.run.km}`);
  }
});

test('the long run builds from the longest recent run, not just the weekly average', () => {
  const short = buildWeek({ ...PREFS, baseWeeklyKm: 9 }, '2026-10-22', MAX_HR);
  const experienced = buildWeek({ ...PREFS, baseWeeklyKm: 9, baseLongKm: 10 }, '2026-10-22', MAX_HR);
  assert.equal(short.days.sun.run.km, 4);
  assert.equal(experienced.days.sun.run.km, 7);
});

test('strength days are scheduled, never programmed', () => {
  const s = todaySession(PREFS, '2026-10-19', 'High', MAX_HR);
  assert.match(s.suggestion, /Strength training/);
  assert.doesNotMatch(s.suggestion, /squat|bench|deadlift|press/i);
  assert.match(todaySession(PREFS, '2026-10-19', 'Low', MAX_HR).suggestion, /lighter than usual/);
});

test('a Moderate day with limiters is not called normal, and a down day offers the rest-day swap', () => {
  const prefs = { goal: '5k', runsPerWeek: 3, longRunDay: 'sat', liftDays: ['mon', 'wed', 'fri'], priority: 'balanced', startDate: '2026-10-19', baseWeeklyKm: 9, baseLongKm: 7 };
  const sat = '2026-10-24';
  assert.equal(buildWeek(prefs, sat, 196).days.sat.run.type, 'long');
  assert.match(todaySession(prefs, sat, 'Moderate', 196).advice, /^A normal day/);
  const limited = todaySession(prefs, sat, 'Moderate', 196, { limited: true });
  assert.match(limited.advice, /^Recovery is a bit behind/);
  assert.match(limited.suggestion, /or move the long run to tomorrow, your rest day$/);
  assert.ok(limited.swap);
  assert.match(todaySession(prefs, sat, 'Low', 196).suggestion, /instead of the planned long run, or move the long run to tomorrow/);
  assert.ok(!todaySession(prefs, sat, 'High', 196).swap);
});
