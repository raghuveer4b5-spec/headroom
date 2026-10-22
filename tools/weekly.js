#!/usr/bin/env node
// Renders the Sunday plan email for next week (or the week containing --date).
// Usage: node tools/weekly.js [config.json] [--date YYYY-MM-DD]
// Writes ~/.headroom/weekly.json ({ to, subject, html, text }) and ~/.headroom/weekly.html (preview).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { renderWeeklyEmail } = require('../src/email/weekly');
const { addDays } = require('../src/core/stats');

const dir = path.join(os.homedir(), '.headroom');
const args = process.argv.slice(2);
const i = args.indexOf('--date');
const configFile = args.find((a, n) => !a.startsWith('--') && !(i >= 0 && n === i + 1)) || path.join(dir, 'config.json');
const today = new Date().toLocaleDateString('en-CA');
// Sent on Sunday evening, so by default plan the week that starts tomorrow.
const date = i >= 0 ? args[i + 1] : addDays(today, 1);

const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
const email = { to: config.email || null, ...renderWeeklyEmail(config, date) };

fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'weekly.json'), JSON.stringify({ to: email.to, subject: email.subject, html: email.html, text: email.text }));
fs.writeFileSync(path.join(dir, 'weekly.html'), email.html);
console.log(JSON.stringify({ to: email.to, subject: email.subject, weekOf: email.monday, htmlBytes: email.html.length, file: path.join(dir, 'weekly.json') }));
