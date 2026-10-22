const test = require('node:test');
const assert = require('node:assert/strict');
const { renderEmail } = require('../src/email/render');

const CONFIG = {
  maxHr: 196,
  plan: { goal: '5k', runsPerWeek: 3, longRunDay: 'sat', liftDays: ['mon', 'wed', 'fri'], priority: 'balanced', startDate: '2026-10-19', baseWeeklyKm: 9, baseLongKm: 10 },
};

const RESULT = {
  date: '2026-10-24',
  status: 'ok',
  score: 44,
  band: 'Low',
  source: 'Splits estimate',
  splitsScore: 44,
  suggestion: 'Keep it easy and short, or cross-train.',
  limiters: ['short or poor sleep (5h10, score 58)'],
  components: { hrv: 52, rhr: 60, sleep: 31, load: 70, bodyBattery: 50 },
  inputs: { hrv: 55, hrvBaseline: 63, rhr: 55, rhrBaseline: 54, sleepScore: 58, sleepHours: 5.17, loadRatio: 1.1, hardDaysAgo: null, bodyBattery: 55 },
};

test('subject carries the score, band and adjusted workout', () => {
  const { subject } = renderEmail(RESULT, CONFIG);
  assert.equal(subject, 'Readiness 44 · Low · Easy 4 km (was long run)');
});

test('HTML is email-safe and shows the workout, the reasons and the week', () => {
  const { html } = renderEmail(RESULT, CONFIG);
  assert.doesNotMatch(html, /<script|<img|<link|class="/i);
  assert.match(html, /TODAY'S WORKOUT/);
  assert.match(html, /instead of the planned long run/);
  assert.match(html, /Planned: Long easy run 7 km/);
  assert.match(html, /WHAT SHAPED THE SCORE/);
  assert.match(html, /5h10 · score 58/);
  assert.match(html, /THIS WEEK/);
  assert.doesNotMatch(html, /<div style="[^"]*height:8px/, 'bars must not be empty divs (Gmail drops them)');
  assert.match(html, /bgcolor="#D85A30"/, "today's highlight uses a bgcolor attribute");
  assert.ok(html.length < 12000, `html ${html.length} bytes`);
});

test('user text is escaped', () => {
  const { html } = renderEmail({ ...RESULT, limiters: ['<b>x</b>'] }, CONFIG);
  assert.match(html, /&lt;b&gt;x&lt;\/b&gt;/);
});

test('a failed check still sends a short, clear email', () => {
  const r = renderEmail({ date: '2026-10-24', status: 'no-sync', message: "Today's overnight data hasn't synced yet." }, CONFIG);
  assert.equal(r.subject, 'Splits: no readiness score today');
  assert.match(r.text, /hasn't synced/);
});

test('without a plan the email still works', () => {
  const r = renderEmail(RESULT, { maxHr: 196 });
  assert.equal(r.subject, 'Readiness 44 · Low');
  assert.doesNotMatch(r.html, /THIS WEEK/);
});
