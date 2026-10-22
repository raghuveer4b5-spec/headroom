#!/usr/bin/env node
// Serves the last rendered morning email on http://127.0.0.1:8765 for a visual check.
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const file = path.join(os.homedir(), '.headroom', 'email.html');
http
  .createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(fs.existsSync(file) ? fs.readFileSync(file) : 'No email rendered yet. Run node tools/email.js first.');
  })
  .listen(8765, '127.0.0.1', () => console.log('Email preview on http://127.0.0.1:8765'));
