const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { wakeLevel } = require('../src/adapters/garmin-browser');

test('the browser bundle builds and exposes Splits', () => {
  execFileSync(process.execPath, [path.join(__dirname, '..', 'tools', 'build.js')]);
  const code = fs.readFileSync(path.join(__dirname, '..', 'skills', 'splits-readiness', 'scripts', 'splits-garmin.js'), 'utf8');
  const sandbox = {};
  sandbox.globalThis = sandbox;
  vm.runInNewContext(code, sandbox);
  for (const fn of ['morningCheck', 'backtest', 'profile', 'planWeek', 'more', 'computeReadiness']) {
    assert.equal(typeof sandbox.Splits[fn], 'function', fn);
  }
});

test('an expired Garmin session is reported, not mistaken for calibrating', () => {
  const { authExpired } = require('../src/runner');
  assert.equal(authExpired({ days: [], warnings: ['hrv: HTTP 401'] }), true);
  assert.equal(authExpired({ days: [{ date: '2026-10-22' }], warnings: ['sleep 2026-10-22: HTTP 401'] }), false);
});

test('max HR comes from setup, else the highest HR seen in activities', () => {
  const { resolveConfig } = require('../src/runner');
  const acts = [{ maxHr: 172 }, { maxHr: 191 }, { maxHr: 250 }, { maxHr: null }];
  assert.equal(resolveConfig({ maxHr: 196 }, acts).maxHr, 196);
  assert.equal(resolveConfig({}, acts).maxHr, 191);
  assert.equal(resolveConfig(undefined, []).maxHr, 190);
});

test('Body Battery wake level is the first reading after sleep ends', () => {
  const end = 1_000_000_000;
  const values = [[end - 4 * 3600000, 20], [end - 3600000, 60], [end + 10 * 60000, 80], [end + 5 * 3600000, 50]];
  assert.equal(wakeLevel(values, end), 80);
  assert.equal(wakeLevel(values, null), 80);
  assert.equal(wakeLevel([], end), null);
});
