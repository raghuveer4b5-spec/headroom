// Shared building blocks for Headroom emails. Email-safe: tables, inline styles and bgcolor
// attributes (Gmail drops CSS-only backgrounds in dark mode), no images or scripts.
const INK = '#1F2328';
const MUTED = '#6B7280';
const LINE = '#E5E7EB';
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function longDate(date, opts = { weekday: 'long', day: 'numeric', month: 'long' }) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { ...opts, timeZone: 'UTC' });
}

const card = (inner, extra = '') =>
  `<tr><td style="padding:0 0 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#FFFFFF" style="background:#FFFFFF;border:1px solid ${LINE};border-radius:12px${extra}"><tr><td style="padding:20px 18px">${inner}</td></tr></table></td></tr>`;

const label = (t) => `<p style="margin:0 0 10px;font-size:12px;letter-spacing:.04em;color:${MUTED};font-weight:600">${t}</p>`;

function page({ preheader, dateLine, body, footer }) {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:#F3F4F6">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;font-family:${FONT}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="padding:0 4px 14px"><p style="margin:0;font-size:13px;color:${MUTED}"><strong style="color:${INK}">Headroom</strong> · ${esc(dateLine)}</p></td></tr>
${body}
<tr><td style="padding:6px 4px 0"><p style="margin:0;font-size:11px;line-height:1.6;color:#9CA3AF">${footer}</p></td></tr>
</table></td></tr></table></body></html>`;
}

module.exports = { INK, MUTED, LINE, FONT, esc, longDate, card, label, page };
