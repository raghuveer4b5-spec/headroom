const test = require('node:test');
const assert = require('node:assert/strict');
const { computeReadiness, bandFor } = require('../src/core/readiness');
const { activityLoad, ratioScore, loadSummary } = require('../src/core/load');
const { syntheticData } = require('./helpers');

const DATE = '2026-10-22';

test('a normal day scores around 70, the top of Moderate', () => {
  const r = computeReadiness(syntheticData({ overrides: { [DATE]: { hrvLastNight: 66, restingHr: 54 } } }), DATE);
  assert.equal(r.status, 'ok');
  assert.equal(r.band, 'Moderate');
  assert.ok(r.score >= 62 && r.score <= 74, `score ${r.score}`);
  assert.ok(r.components.hrv >= 60 && r.components.hrv <= 80);
  assert.equal(r.components.load, 75);
});

test('a clearly better-than-normal morning reaches High', () => {
  const r = computeReadiness(
    syntheticData({ overrides: { [DATE]: { hrvLastNight: 74, restingHr: 51, sleepScore: 90, sleepSeconds: 8.2 * 3600 } } }),
    DATE,
  );
  assert.equal(r.band, 'High', `score ${r.score}`);
});

test('better HRV and lower resting HR raise the score', () => {
  const normal = computeReadiness(syntheticData(), DATE).score;
  const fresh = computeReadiness(
    syntheticData({ overrides: { [DATE]: { hrvLastNight: 80, restingHr: 51 } } }),
    DATE,
  ).score;
  assert.ok(fresh > normal, `${fresh} should be > ${normal}`);
});

test('resting HR 7+ bpm above baseline caps the score at 30', () => {
  const r = computeReadiness(syntheticData({ overrides: { [DATE]: { restingHr: 62 } } }), DATE);
  assert.ok(r.score <= 30);
  assert.ok(r.limiters[0].includes('resting HR well above normal'));
});

test('HRV status LOW caps the score at 30', () => {
  const r = computeReadiness(syntheticData({ overrides: { [DATE]: { hrvStatus: 'LOW' } } }), DATE);
  assert.ok(r.score <= 30);
});

test('fewer than 14 days of history means calibrating', () => {
  const r = computeReadiness(syntheticData({ length: 10 }), DATE);
  assert.equal(r.status, 'calibrating');
  assert.equal(r.score, null);
});

test("history but no overnight data for today means no-sync", () => {
  const r = computeReadiness(
    syntheticData({ overrides: { [DATE]: { hrvLastNight: null, restingHr: null, sleepScore: null } } }),
    DATE,
  );
  assert.equal(r.status, 'no-sync');
});

test('a load spike in the last 7 days pulls the load component down', () => {
  const data = syntheticData();
  for (let k = 1; k <= 6; k++) {
    const d = new Date(Date.UTC(2026, 9, 22 - k)).toISOString().slice(0, 10);
    data.activities.push({ start: `${d}T18:00:00`, type: 'cardio', durationS: 5400, avgHr: 130, zoneSeconds: [600, 2400, 1800, 600, 0] });
  }
  const r = computeReadiness(data, DATE);
  assert.ok(r.inputs.loadRatio > 1.3, `ratio ${r.inputs.loadRatio}`);
  assert.ok(r.components.load < 60);
  assert.ok(r.limiters.some((l) => l.includes('training load')));
});

test('a hard session yesterday costs 20 load points', () => {
  const data = syntheticData();
  const base = computeReadiness(data, DATE).components.load;
  data.activities.push({ start: '2026-10-21T09:00:00', type: 'running', durationS: 600, aerobicTe: 3.8, zoneSeconds: [0, 0, 0, 0, 0] });
  assert.equal(computeReadiness(data, DATE).components.load, base - 20);
});

test('missing Body Battery re-weights the remaining components', () => {
  const r = computeReadiness(syntheticData({ overrides: { [DATE]: { bodyBatteryWake: null } } }), DATE);
  assert.equal(r.components.bodyBattery, undefined);
  assert.equal(r.status, 'ok');
});

test("the watch's own readiness score is used when available", () => {
  const data = syntheticData({ overrides: { [DATE]: { deviceReadiness: { score: 41, level: 'LOW', source: 'Garmin Training Readiness' } } } });
  const r = computeReadiness(data, DATE);
  assert.equal(r.score, 41);
  assert.equal(r.band, 'Low');
  assert.equal(r.source, 'Garmin Training Readiness');
  assert.ok(r.estimateScore > 41, 'Headroom estimate is kept for comparison');
  assert.match(r.message, /^Readiness 41 · Low \(Garmin Training Readiness\)/);
});

test('device readiness can be turned off, and works before Headroom has a baseline', () => {
  const data = syntheticData({ overrides: { [DATE]: { deviceReadiness: { score: 82, source: 'Garmin Training Readiness' } } } });
  assert.equal(computeReadiness(data, DATE, { useDeviceReadiness: false }).source, 'Headroom estimate');
  const fresh = syntheticData({ length: 5, overrides: { [DATE]: { deviceReadiness: { score: 82, source: 'Garmin Training Readiness' } } } });
  const r = computeReadiness(fresh, DATE);
  assert.equal(r.status, 'ok');
  assert.equal(r.score, 82);
  assert.equal(r.estimateScore, null);
});

test('bands and ratio scoring boundaries', () => {
  assert.equal(bandFor(75), 'High');
  assert.equal(bandFor(74), 'Moderate');
  assert.equal(bandFor(50), 'Moderate');
  assert.equal(bandFor(25), 'Low');
  assert.equal(bandFor(24), 'Poor');
  assert.equal(ratioScore(0.5), 70);
  assert.equal(ratioScore(1.0), 75);
  assert.equal(ratioScore(2.0), 0);
  assert.ok(Math.abs(ratioScore(1.65) - 37.5) < 0.01);
});

test('activity load uses zones when present, average HR otherwise', () => {
  assert.equal(activityLoad({ zoneSeconds: [60, 60, 60, 60, 60] }, { maxHr: 196, restHr: 54 }), 15);
  const banister = activityLoad({ avgHr: 154, durationS: 3600 }, { maxHr: 196, restHr: 54 });
  assert.ok(banister > 60 && banister < 120, `banister ${banister}`);
});

test('load ratio needs 21 days of coverage', () => {
  const s = loadSummary([{ start: '2026-10-20T08:00:00', zoneSeconds: [0, 600, 0, 0, 0] }], DATE, {
    maxHr: 196, restHr: 54, coverageStart: '2026-10-10',
  });
  assert.equal(s.ratio, null);
});

test('HRV, resting HR and sleep all down together caps the score at Low, even with normal load', () => {
  const short = { sleepSeconds: 5.4 * 3600, sleepScore: 60 };
  const data = syntheticData({ overrides: { '2026-10-20': short, '2026-10-21': short, '2026-10-22': { ...short, hrvLastNight: 60, restingHr: 56, bodyBatteryWake: 57 } } });
  const r = computeReadiness(data, '2026-10-22', { maxHr: 190 });
  assert.ok(['hrv', 'rhr', 'sleep'].every((k) => r.components[k] < 50), JSON.stringify(r.components));
  assert.equal(r.band, 'Low');
  assert.match(r.limiters[0], /all below your normal/);
  const oneDown = computeReadiness(syntheticData({ overrides: { '2026-10-22': { sleepSeconds: 5.4 * 3600, sleepScore: 60 } } }), '2026-10-22', { maxHr: 190 });
  assert.notEqual(oneDown.band, 'Low', 'one bad signal alone is not capped');
});
