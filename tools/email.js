#!/usr/bin/env node
// Turns a morning-check result into the morning email.
// Usage: node tools/email.js <result.json> [config.json]
// Writes ~/.headroom/email.json ({ to, subject, html, text }) and ~/.headroom/email.html (preview).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { renderEmail } = require('../src/email/render');

const dir = path.join(os.homedir(), '.headroom');
const [resultFile, configFile = path.join(dir, 'config.json')] = process.argv.slice(2);
if (!resultFile) {
  console.error('Usage: node tools/email.js <result.json> [config.json]');
  process.exit(1);
}

const result = JSON.parse(fs.readFileSync(resultFile, 'utf8'));
const config = fs.existsSync(configFile) ? JSON.parse(fs.readFileSync(configFile, 'utf8')) : {};
const email = { to: config.email || null, ...renderEmail(result, config) };

fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'email.json'), JSON.stringify(email));
fs.writeFileSync(path.join(dir, 'email.html'), email.html);
console.log(JSON.stringify({ to: email.to, subject: email.subject, htmlBytes: email.html.length, file: path.join(dir, 'email.json') }));
