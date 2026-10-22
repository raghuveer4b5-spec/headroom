const test = require('node:test');
const assert = require('node:assert/strict');
const { parseTime, formatTime, formatPace, vdotFromRace, trainingPaces, planPaces, riegel } = require('../src/core/pace');
const { buildWeek } = require('../src/core/plan');

test('times parse and format both ways', () => {
  assert.equal(parseTime('27:03'), 1623);
  assert.equal(parseTime('1:58:30'), 7110);
  assert.equal(parseTime('abc'), null);
  assert.equal(formatTime(1623), '27:03');
  assert.equal(formatTime(7110), '1:58:30');
  assert.equal(formatPace(324.6), '5:25');
});

test("VDOT matches Daniels' published tables", () => {
  assert.ok(Math.abs(vdotFromRace(5, 20 * 60) - 50) < 0.5, '20:00 5K is about VDOT 50');
  assert.ok(Math.abs(vdotFromRace(10, 50 * 60) - 40) < 0.5, '50:00 10K is about VDOT 40');
});

test('training paces are ordered easy > tempo > interval and bracket 5K pace sensibly', () => {
  const p = trainingPaces(vdotFromRace(5, 1623));
  const racePace = 1623 / 5;
  assert.ok(p.easySlow > p.easyFast && p.easyFast > p.tempo && p.tempo > p.interval);
  assert.ok(p.interval < racePace + 5 && p.interval > racePace - 25, 'interval pace near 5K pace');
  assert.ok(p.easyFast > racePace + 60, 'easy is clearly slower than race pace');
});

test('plan paces need a current time, and carry the goal', () => {
  assert.equal(planPaces({ goal: '5k' }), null);
  const p = planPaces({ goal: '5k', currentTime: '27:03', goalTime: '26:00' });
  assert.equal(p.distanceName, '5K');
  assert.equal(p.goal, 1560);
  assert.equal(formatPace(p.goalPace), '5:12');
});

test('Riegel scales times between distances', () => {
  assert.ok(Math.abs(riegel(5, 1623, 10) - 3384) < 2);
});

test('sessions show paces when a current time is known, heart rate always', () => {
  const plan = { goal: '5k', runsPerWeek: 3, longRunDay: 'sat', liftDays: ['mon', 'wed', 'fri'], startDate: '2026-10-19', baseWeeklyKm: 12, baseLongKm: 9 };
  const withPaces = buildWeek({ ...plan, currentTime: '27:03' }, '2026-10-26', 196);
  assert.match(withPaces.days.mon.run.text, /x 1 km at \d:\d\d\/km/);
  assert.match(withPaces.days.thu.run.text, /^Easy [\d.]+ km at \d:\d\d-\d:\d\d\/km, Zone 2 \(keep HR under 137 bpm\)$/);
  const without = buildWeek(plan, '2026-10-26', 196);
  assert.match(without.days.mon.run.text, /effort 8\/10/);
});
