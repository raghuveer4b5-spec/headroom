#!/usr/bin/env node
// Prints this week's plan from a Headroom config, no browser needed.
// Usage: node tools/plan.js [config.json] [--date YYYY-MM-DD]
const fs = require('fs');
const os = require('os');
const path = require('path');
const { planWeek } = require('../src/runner');

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--')) || path.join(os.homedir(), '.headroom', 'config.json');
const i = args.indexOf('--date');
const config = JSON.parse(fs.readFileSync(file, 'utf8'));
console.log(planWeek({ config, date: i >= 0 ? args[i + 1] : undefined }));
