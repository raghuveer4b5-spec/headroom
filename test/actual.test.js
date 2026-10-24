const test = require('node:test');
const assert = require('node:assert/strict');
const { buildWeek, compareDay } = require('../src/core/plan');
const { renderEmail } = require('../src/email/render');
const { renderWeeklyEmail } = require('../src/email/weekly');

// Sat long run, Sun rest, lifting Mon/Wed/Fri: week 1 plans a 7 km long run.
const PLAN = { goal: '5k', runsPerWeek: 3, longRunDay: 'sat', liftDays: ['mon', 'wed', 'fri'], priority: 'balanced', startDate: '2026-10-19', baseWeeklyKm: 8.7, baseLongKm: 10.1 };
const MAX_HR = 196;

test('a run much longer than planned gets a note', () => {
  assert.equal(buildWeek(PLAN, '2026-10-24', MAX_HR).days.sat.run.km, 7);
  const y = compareDay(PLAN, '2026-10-24', 12.46, MAX_HR);
  assert.equal(y.planned, 7);
  assert.equal(y.ranKm, 12.5);
  assert.match(y.note, /^Yesterday you ran 12\.5 km against 7 km planned\. Sunday's plan builds from what you actually ran\.$/);
});

test('close to plan, no note', () => {
  assert.equal(compareDay(PLAN, '2026-10-24', 7.8, MAX_HR).note, null);
  assert.equal(compareDay(PLAN, '2026-10-25', 0, MAX_HR).note, null, 'rest day, rested');
});

test('a missed long run before a rest day can still move; a missed run otherwise is let go', () => {
  assert.match(compareDay(PLAN, '2026-10-24', 0, MAX_HR).note, /long run isn't in Garmin yet\. Today is a rest day, so you can still fit it in/);
  const days = buildWeek(PLAN, '2026-10-19', MAX_HR).days;
  const easyDay = Object.keys(days).find((d) => days[d].run && days[d].run.type === 'easy');
  const date = { mon: '2026-10-19', tue: '2026-10-20', wed: '2026-10-21', thu: '2026-10-22', fri: '2026-10-23' }[easyDay];
  assert.match(compareDay(PLAN, date, 0, MAX_HR).note, /Let it go rather than doubling up today\.$/);
});

test('an unplanned run gets a note', () => {
  assert.match(compareDay(PLAN, '2026-10-25', 5, MAX_HR).note, /^Yesterday you ran 5 km on a day with no run planned\./);
});

test('the morning email shows the note under the workout', () => {
  const result = {
    date: '2026-10-25', status: 'ok', score: 60, band: 'Moderate', source: 'Headroom estimate', limiters: [],
    suggestion: 'x', components: {}, inputs: {},
    yesterday: { planned: 7, ranKm: 12.5, note: 'Yesterday you ran 12.5 km against 7 km planned.' },
  };
  const { html, text } = renderEmail(result, { maxHr: MAX_HR, plan: PLAN });
  assert.match(html, /Yesterday you ran 12\.5 km against 7 km planned\./);
  assert.match(text, /Yesterday you ran 12\.5 km/);
});

test('next week builds from what was run, for that week only', () => {
  const recent = { week: '2026-10-26', km7d: 20.6, longestKm28d: 12.5 };
  const before = buildWeek(PLAN, '2026-10-26', MAX_HR);
  const after = buildWeek({ ...PLAN, recent }, '2026-10-26', MAX_HR);
  assert.equal(before.days.sat.run.km, 7);
  assert.equal(after.days.sat.run.km, 9, '70% of the 12.5 km run');
  assert.equal(after.actual.capped, false, 'running more never speeds up the schedule');
  assert.equal(buildWeek({ ...PLAN, recent }, '2026-11-02', MAX_HR).actual, null, 'other weeks ignore it');
});

test('running much less than planned holds the build back', () => {
  const plan = { ...PLAN, baseWeeklyKm: 20, baseLongKm: 8 };
  const normal = buildWeek(plan, '2026-10-26', MAX_HR);
  const held = buildWeek({ ...plan, recent: { week: '2026-10-26', km7d: 9, longestKm28d: 5 } }, '2026-10-26', MAX_HR);
  assert.ok(held.targetKm < normal.targetKm, `${held.targetKm} < ${normal.targetKm}`);
  assert.equal(held.actual.capped, true);
  assert.match(renderWeeklyEmail({ maxHr: MAX_HR, plan: { ...plan, recent: { week: '2026-10-26', km7d: 9, longestKm28d: 5 } } }, '2026-10-26').html, /You ran 9 km in the last 7 days, so this week builds from that instead of the schedule/);
});

test('the weekly email says when a long run set the long-run distance', () => {
  const { html } = renderWeeklyEmail({ maxHr: MAX_HR, plan: { ...PLAN, recent: { week: '2026-10-26', km7d: 20.6, longestKm28d: 12.5 } } }, '2026-10-26');
  assert.match(html, /You ran 20\.6 km in the last 7 days\. Your 12\.5 km run sets this week&#39;s long run at 9 km|You ran 20\.6 km in the last 7 days\. Your 12\.5 km run sets this week's long run at 9 km/);
});
