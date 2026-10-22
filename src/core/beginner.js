// Beginner mode: run/walk stages from "can't run yet" to 30 minutes non-stop (about 5K).
// Each stage is one week of three sessions. Moving up depends on how last week went, not the
// calendar: beginner programmes lose most people when progression is fixed (see docs).
const { addDays, daysBetween } = require('./stats');

// reps x (run, walk) in seconds. The longest continuous run never grows more than 50% per stage,
// avoiding jumps like Couch to 5K's week 5 (5 to 8 to 20 minutes) that dropouts blame.
const STAGES = [
  { reps: 8, run: 60, walk: 90 },
  { reps: 8, run: 90, walk: 90 },
  { reps: 6, run: 120, walk: 90 },
  { reps: 5, run: 180, walk: 90 },
  { reps: 4, run: 240, walk: 90 },
  { reps: 4, run: 300, walk: 90 },
  { reps: 3, run: 420, walk: 90 },
  { reps: 3, run: 480, walk: 60 },
  { reps: 2, run: 600, walk: 60 },
  { reps: 2, run: 720, walk: 60 },
  { reps: 2, run: 900, walk: 60 },
  { reps: 1, run: 1200, walk: 0 },
  { reps: 1, run: 1500, walk: 0 },
  { reps: 1, run: 1800, walk: 0 },
];
const LAST = STAGES.length;

// How long the user can run now -> starting stage. A recent injury starts one stage lower.
const START_STAGE = { none: 1, '1min': 1, '3min': 4, '5min': 6, '10min': 9 };

const mins = (sec) => {
  const m = sec / 60;
  return Number.isInteger(m) ? String(m) : m.toFixed(1);
};

function stageOf(prefs) {
  return Math.min(LAST, Math.max(1, Math.round(prefs.stage || 1)));
}

function startStage(canRun, injured) {
  const base = START_STAGE[canRun] || 1;
  return Math.max(1, base - (injured ? 1 : 0));
}

function describe(n) {
  const s = STAGES[n - 1];
  if (s.reps === 1) {
    return {
      title: `Run ${mins(s.run)} min`,
      short: `${mins(s.run)} min`,
      text: `Run ${mins(s.run)} min non-stop at an easy, talking pace, with a 5 min brisk walk before and after`,
      runMinutes: s.run / 60,
    };
  }
  return {
    title: `Run ${mins(s.run)} min, walk ${mins(s.walk)} min`,
    short: `${s.reps}x${mins(s.run)} min`,
    text: `Run/walk: 5 min brisk walk, then ${s.reps} x (run ${mins(s.run)} min, walk ${mins(s.walk)} min), then 5 min walk. Run easy enough to talk in full sentences`,
    runMinutes: (s.reps * s.run) / 60,
  };
}

// Sunday decision for the coming week, from the morning-check log of the past seven days.
// Advance when at least two runs happened and recovery held up; otherwise repeat the stage.
function decideProgression(history, prefs, nextMonday) {
  const stage = stageOf(prefs);
  if (prefs.repeatNext) return { stage, advance: false, reason: 'You asked to repeat this stage.' };
  const week = (history || []).filter((e) => {
    const ago = daysBetween(e.date, nextMonday);
    return ago >= 1 && ago <= 7;
  });
  if (!week.length) {
    return { stage, advance: false, reason: 'No morning checks last week, so Headroom kept you on this stage.' };
  }
  const lowLimit = prefs.injuryHistory ? 1 : 2;
  const low = week.filter((e) => e.band === 'Low' || e.band === 'Poor').length;
  // The latest check's 7-day run count covers the week just finished.
  const latest = [...week].sort((a, b) => (a.date < b.date ? -1 : 1)).pop();
  const runs = latest.runs7d || 0;
  if (runs < 2) {
    const what = runs === 0 ? 'No runs logged last week' : 'Only one run last week';
    return { stage, advance: false, reason: `${what}, so you stay on this stage. Repeating it helps it stick.` };
  }
  if (low >= lowLimit) return { stage, advance: false, reason: `${low} low-readiness morning${low === 1 ? '' : 's'} last week. Repeating the stage is normal and keeps the build safe.` };
  if (stage === LAST) return { stage, advance: true, graduated: true, reason: "You've run 30 minutes non-stop. That's roughly a 5K for most new runners." };
  return { stage: stage + 1, advance: true, reason: 'Last week went well, so you move up a stage.' };
}

module.exports = { STAGES, LAST, START_STAGE, stageOf, startStage, describe, decideProgression, mins };
