#!/usr/bin/env node
// Scores a common-schema JSON file (any data source) without a browser.
// Usage: node tools/score.js <data.json> [--date YYYY-MM-DD] [--backtest N]
const fs = require('fs');
const { computeReadiness } = require('../src/core/readiness');
const { addDays } = require('../src/core/stats');

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

if (!file) {
  console.error('Usage: node tools/score.js <data.json> [--date YYYY-MM-DD] [--backtest N]');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const lastDate = data.days.map((d) => d.date).sort().pop();
const date = opt('date') || lastDate;
const backtest = Number(opt('backtest') || 0);

if (backtest > 0) {
  for (let d = addDays(date, -(backtest - 1)); d <= date; d = addDays(d, 1)) {
    const r = computeReadiness(data, d);
    console.log(`${d}  ${r.score === null ? '--' : String(r.score).padStart(3)}  ${r.band || r.status}`);
  }
} else {
  console.log(JSON.stringify(computeReadiness(data, date), null, 2));
}
