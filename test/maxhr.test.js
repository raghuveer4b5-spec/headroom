const test = require('node:test');
const assert = require('node:assert/strict');
const { ageMaxHr } = require('../src/core/load');
const { resolveConfig } = require('../src/runner');

test('age estimate uses Tanaka: 208 - 0.7 x age', () => {
  assert.equal(ageMaxHr(20), 194);
  assert.equal(ageMaxHr(35), 184);
  assert.equal(ageMaxHr(50), 173);
  assert.equal(ageMaxHr(undefined), null);
  assert.equal(ageMaxHr(4), null);
});

test('max HR: setup value, then observed, then age, then default', () => {
  const runs = [{ maxHr: 188 }];
  assert.equal(resolveConfig({ maxHr: 192, age: 35 }, runs).maxHr, 192);
  assert.equal(resolveConfig({ age: 35 }, runs).maxHr, 188);
  assert.equal(resolveConfig({ age: 35 }, []).maxHr, 184);
  assert.ok(resolveConfig({}, []).maxHr > 0);
});
