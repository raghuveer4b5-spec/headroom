const test = require('node:test');
const assert = require('node:assert/strict');
const { unreachable, authExpired } = require('../src/runner');
const { renderEmail } = require('../src/email/render');

test('timeouts with no data read as unreachable, not as an unsynced watch', () => {
  const timedOut = { days: [], activities: [], warnings: ['hrv: timed out', 'rhr: network error'] };
  assert.ok(unreachable(timedOut));
  assert.ok(!authExpired(timedOut));
  assert.ok(!unreachable({ days: [{ date: '2026-10-23' }], activities: [], warnings: ['sleep: timed out'] }), 'partial data still scores');
});

test('failed and unreachable checks get honest subjects', () => {
  assert.equal(renderEmail({ date: '2026-10-23', status: 'unreachable', message: 'x' }).subject, "No check today: Garmin Connect didn't respond");
  assert.equal(renderEmail({ date: '2026-10-23', status: 'failed', message: 'x' }).subject, "No check today: Headroom couldn't read Garmin Connect");
});
