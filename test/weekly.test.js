const test = require('node:test');
const assert = require('node:assert/strict');
const { renderWeeklyEmail, mondayOf } = require('../src/email/weekly');

const CONFIG = {
  maxHr: 190,
  plan: { goal: '5k', runsPerWeek: 3, longRunDay: 'sat', liftDays: ['mon', 'wed', 'fri'], priority: 'balanced', startDate: '2026-10-19', baseWeeklyKm: 12, baseLongKm: 9 },
};

test('any date maps to the Monday of its week', () => {
  assert.equal(mondayOf('2026-10-26'), '2026-10-26');
  assert.equal(mondayOf('2026-11-01'), '2026-10-26');
});

test('subject sums up the week', () => {
  const { subject } = renderWeeklyEmail(CONFIG, '2026-10-26');
  assert.match(subject, /^Your week: [\d.]+ km · 3 runs \+ 3 strength$/);
});

test('every day appears with its full session, and strength stays a black box', () => {
  const { html, text } = renderWeeklyEmail(CONFIG, '2026-10-26');
  for (const d of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']) assert.match(html, new RegExp(`>${d}<`));
  assert.match(html, /Intervals · [\d.]+ km/);
  assert.match(html, /1\.5 km warm-up/);
  assert.match(html, /run first, lift later/);
  assert.match(html, /RUNNER STRENGTH BLOCK/);
  assert.doesNotMatch(html, /bench|deadlift|squat 3x5|press/i);
  assert.match(text, /^Sat 31 Oct: Long easy run/m);
});

test('the week-on-week line matches the actual change in planned distance', () => {
  assert.match(renderWeeklyEmail(CONFIG, '2026-10-19').html, /Week 1 is based on/);
  assert.match(renderWeeklyEmail(CONFIG, '2026-10-26').html, /The same [\d.]+ km as last week/);
  const growing = { ...CONFIG, plan: { ...CONFIG.plan, baseWeeklyKm: 20, baseLongKm: 6 } };
  assert.match(renderWeeklyEmail(growing, '2026-10-26').html, /Up \d+% on last week/);
});

test('current and goal times and the paces appear when known', () => {
  const config = { ...CONFIG, plan: { ...CONFIG.plan, currentTime: '27:03', goalTime: '26:00' } };
  const { html } = renderWeeklyEmail(config, '2026-10-26');
  assert.match(html, /5K now<\/p><p[^>]*>27:03/);
  assert.match(html, /26:00/);
  assert.match(html, /Your paces: easy \d:\d\d-\d:\d\d · tempo \d:\d\d · intervals \d:\d\d per km/);
  assert.match(html, />\d:\d\d-\d:\d\d\/km, Zone 2/, 'easy detail starts with the pace, not a broken fragment');
});

test('the fourth week is flagged as lighter', () => {
  const { subject, html } = renderWeeklyEmail(CONFIG, '2026-11-09');
  assert.match(subject, /^Lighter week:/);
  assert.match(html, /LIGHTER WEEK/);
});

test('HTML stays email-safe', () => {
  const { html } = renderWeeklyEmail(CONFIG, '2026-10-26');
  assert.doesNotMatch(html, /<script|<img|<link|class="/i);
  assert.ok(html.length < 14000, `html ${html.length} bytes`);
});

test('a config without a plan is refused clearly', () => {
  assert.throws(() => renderWeeklyEmail({ maxHr: 190 }, '2026-10-26'), /Run setup first/);
});
