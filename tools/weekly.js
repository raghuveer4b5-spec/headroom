#!/usr/bin/env node
// Renders the Sunday plan email for next week (or the week containing --date).
// Usage: node tools/weekly.js [config.json] [--date YYYY-MM-DD] [--commit]
// Writes ~/.headroom/weekly.json ({ to, subject, html, text }) and ~/.headroom/weekly.html (preview).
// The week builds from what was actually run, read from the morning-check log. For beginners it
// also decides whether to move up a stage. Only --commit (the Sunday run) saves either to the
// config, so previews never change anyone's plan or progress.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { renderWeeklyEmail, mondayOf } = require('../src/email/weekly');
const { decideProgression } = require('../src/core/beginner');
const { addDays } = require('../src/core/stats');

const dir = path.join(os.homedir(), '.headroom');
const args = process.argv.slice(2);
const i = args.indexOf('--date');
const commit = args.includes('--commit');
const configFile = args.find((a, n) => !a.startsWith('--') && !(i >= 0 && n === i + 1)) || path.join(dir, 'config.json');
const today = new Date().toLocaleDateString('en-CA');
// Sent on Sunday evening, so by default plan the week that starts tomorrow.
const monday = mondayOf(i >= 0 ? args[i + 1] : addDays(today, 1));

const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
const historyFile = path.join(dir, 'history.jsonl');
const history = fs.existsSync(historyFile)
  ? fs.readFileSync(historyFile, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
  : [];
let changed = false;

let progression = null;
if (config.plan && config.plan.mode === 'beginner' && monday > (config.plan.startDate || monday)) {
  const decided = (config.plan.stageLog || []).find((e) => e.week === monday);
  // Re-running for a week that was already decided reuses that decision instead of moving up twice.
  progression = decided
    ? { stage: config.plan.stage, advance: decided.advance, graduated: Boolean(config.plan.graduated), reason: decided.reason || 'Already decided for this week.' }
    : decideProgression(history, config.plan, monday);
  config.plan = { ...config.plan, stage: progression.stage, repeatNext: false, graduated: Boolean(progression.graduated) };
  if (!decided) {
    config.plan.stageLog = [...(config.plan.stageLog || []), { week: monday, stage: progression.stage, advance: progression.advance, reason: progression.reason }];
    changed = true;
  }
}

// The latest morning check from the last few days before the week starts says what was actually run.
if (config.plan && config.plan.mode !== 'beginner') {
  const latest = history
    .filter((e) => e.recent && e.date >= addDays(monday, -3) && e.date <= monday)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .pop();
  if (latest && !(config.plan.recent && config.plan.recent.week === monday)) {
    config.plan = { ...config.plan, recent: { week: monday, asOf: latest.date, ...latest.recent } };
    changed = true;
  }
}

const email = { to: config.email || null, ...renderWeeklyEmail(config, monday, progression) };
const willWrite = Boolean(commit && changed);
if (willWrite) fs.writeFileSync(configFile, JSON.stringify(config, null, 2));

fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'weekly.json'), JSON.stringify({ to: email.to, subject: email.subject, html: email.html, text: email.text }));
fs.writeFileSync(path.join(dir, 'weekly.html'), email.html);
console.log(JSON.stringify({ to: email.to, subject: email.subject, weekOf: email.monday, progression, recent: config.plan && config.plan.recent, committed: willWrite, htmlBytes: email.html.length }));
