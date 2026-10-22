const test = require('node:test');
const assert = require('node:assert/strict');
const { STAGES, LAST, startStage, describe, decideProgression } = require('../src/core/beginner');
const { buildWeek, todaySession } = require('../src/core/plan');
const { renderWeeklyEmail } = require('../src/email/weekly');
const { renderEmail } = require('../src/email/render');

const PLAN = { mode: 'beginner', goal: '5k', runsPerWeek: 3, longRunDay: 'sat', liftDays: ['mon', 'wed', 'fri'], startDate: '2026-10-19', stage: 5 };

test('stages go from short run/walk to 30 minutes non-stop', () => {
  assert.equal(STAGES[0].run, 60);
  assert.equal(STAGES[LAST - 1].run, 1800);
  assert.equal(STAGES[LAST - 1].reps, 1);
});

test('the longest continuous run never grows more than 50% in one stage', () => {
  for (let i = 1; i < STAGES.length; i++) {
    const ratio = STAGES[i].run / STAGES[i - 1].run;
    assert.ok(ratio >= 1 && ratio <= 1.5, `stage ${i + 1}: x${ratio.toFixed(2)}`);
  }
});

test('starting stage comes from how long you can run, one lower after an injury', () => {
  assert.equal(startStage('none', false), 1);
  assert.equal(startStage('5min', false), 6);
  assert.equal(startStage('5min', true), 5);
  assert.equal(startStage('1min', true), 1);
});

test('a beginner week is three run/walk sessions, no hard runs, around strength days', () => {
  const week = buildWeek(PLAN, '2026-10-26', 190);
  const runDays = Object.keys(week.days).filter((d) => week.days[d].run);
  assert.equal(runDays.length, 3);
  assert.ok(runDays.every((d) => week.days[d].run.type === 'runwalk'));
  assert.ok(runDays.every((d) => !['mon', 'wed', 'fri'].includes(d)), `runs on ${runDays}`);
  assert.equal(week.beginner.stage, 5);
  assert.match(week.days[runDays[0]].run.text, /4 x \(run 4 min, walk 1\.5 min\)/);
});

test('readiness adjusts a beginner day: Low drops back a stage, Poor is a walk', () => {
  const week = buildWeek(PLAN, '2026-10-26', 190);
  const runDay = Object.keys(week.days).find((d) => week.days[d].run);
  const dates = { mon: '2026-10-26', tue: '2026-10-27', wed: '2026-10-28', thu: '2026-10-29', fri: '2026-10-30', sat: '2026-10-31', sun: '2026-11-01' };
  const date = dates[runDay];
  assert.match(todaySession(PLAN, date, 'High', 190).suggestion, /run 4 min/);
  const low = todaySession(PLAN, date, 'Low', 190);
  assert.match(low.suggestion, /run 3 min/);
  assert.ok(low.changed);
  assert.match(todaySession(PLAN, date, 'Poor', 190).suggestion, /walk/i);
});

const entry = (date, band, runs7d) => ({ date, status: 'ok', band, runs7d });

test('moves up a stage after a good week', () => {
  const history = [entry('2026-10-20', 'Moderate', 1), entry('2026-10-23', 'High', 2), entry('2026-10-25', 'Moderate', 3)];
  const d = decideProgression(history, PLAN, '2026-10-26');
  assert.equal(d.stage, 6);
  assert.ok(d.advance);
});

test('repeats the stage after too few runs or too many low mornings', () => {
  const fewRuns = [entry('2026-10-25', 'High', 1)];
  assert.equal(decideProgression(fewRuns, PLAN, '2026-10-26').stage, 5);
  const tired = [entry('2026-10-21', 'Low', 2), entry('2026-10-23', 'Low', 2), entry('2026-10-25', 'Moderate', 3)];
  assert.equal(decideProgression(tired, PLAN, '2026-10-26').stage, 5);
  const injured = [entry('2026-10-23', 'Low', 2), entry('2026-10-25', 'Moderate', 3)];
  assert.equal(decideProgression(injured, { ...PLAN, injuryHistory: true }, '2026-10-26').stage, 5, 'one low morning is enough after an injury');
  assert.equal(decideProgression([], PLAN, '2026-10-26').stage, 5, 'no data: stay');
  assert.equal(decideProgression([entry('2026-10-25', 'High', 3)], { ...PLAN, repeatNext: true }, '2026-10-26').stage, 5);
});

test('finishing the last stage graduates', () => {
  const d = decideProgression([entry('2026-10-25', 'High', 3)], { ...PLAN, stage: LAST }, '2026-10-26');
  assert.ok(d.graduated);
});

test('the Sunday email shows the stage, progress and the decision', () => {
  const progression = { stage: 6, advance: true, reason: 'Last week went well, so you move up a stage.' };
  const { subject, html } = renderWeeklyEmail({ maxHr: 190, plan: { ...PLAN, stage: 6 } }, '2026-10-26', progression);
  assert.equal(subject, `Stage 6 of ${LAST}: run 5 min, walk 1.5 min`);
  assert.match(html, /STAGE 6 OF 14/);
  assert.match(html, /move up a stage/);
  assert.match(html, /Walk breaks are part of the plan/);
  assert.doesNotMatch(html, /Intervals|Tempo/);
  const done = renderWeeklyEmail({ maxHr: 190, plan: { ...PLAN, stage: LAST } }, '2026-10-26', { stage: LAST, graduated: true, reason: 'x' });
  assert.match(done.subject, /30 minutes non-stop/);
});

test('the morning email works for beginners', () => {
  const result = { date: '2026-10-27', status: 'ok', score: 70, band: 'Moderate', source: 'Headroom estimate', suggestion: 'ok', limiters: [], components: { hrv: 70 }, inputs: { hrv: 60, hrvBaseline: 60 } };
  const { subject, html } = renderEmail(result, { maxHr: 190, plan: PLAN });
  assert.match(subject, /Run\/walk 4x4 min/);
  assert.match(html, /STAGE 5 OF 14/);
  assert.doesNotMatch(html, /NaN|undefined/);
});

test('describe gives readable session text', () => {
  assert.equal(describe(12).title, 'Run 20 min');
  assert.equal(describe(1).title, 'Run 1 min, walk 1.5 min');
});
