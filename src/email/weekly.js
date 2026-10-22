// The Sunday plan email: next week's sessions in full, built around the user's strength days.
// Needs only the config, not Garmin data, so it never depends on the browser session.
const { buildWeek, WEEKDAYS, weekdayOf, ACCESSORY } = require('../core/plan');
const { addDays, round } = require('../core/stats');
const { formatPace, formatTime } = require('../core/pace');
const { INK, MUTED, esc, longDate, card, label, page } = require('./style');

const TYPE = {
  intervals: { title: 'Intervals', color: '#D85A30', tag: 'Hard' },
  tempo: { title: 'Tempo', color: '#D85A30', tag: 'Hard' },
  long: { title: 'Long run', color: '#1D9E75', tag: 'Long' },
  easy: { title: 'Easy run', color: '#639922', tag: 'Easy' },
};
const STRENGTH_COLOR = '#888780';
const GOALS = { '5k': '5K', '10k': '10K', half: 'half marathon', fitness: 'general fitness' };

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
// "Easy 2.5 km at 6:48-7:29/km, Zone 2 (...)" -> "6:48-7:29/km, Zone 2 (...)"; "Intervals: 1.5 km ..." -> "1.5 km ..."
const detailOf = (text) =>
  text
    .replace(/^(Easy|Long easy run) [\d.]+ km(, | at )?/, '')
    .replace(/^(Intervals|Tempo): /, '');

function mondayOf(date) {
  return addDays(date, -WEEKDAYS.indexOf(weekdayOf(date)));
}

function renderWeeklyEmail(config, weekStart) {
  const plan = config.plan;
  if (!plan) throw new Error('No plan in config. Run setup first.');
  const monday = mondayOf(weekStart);
  const maxHr = config.maxHr || 190;
  const week = buildWeek(plan, monday, maxHr);

  const runs = WEEKDAYS.filter((d) => week.days[d].run).length;
  const gym = WEEKDAYS.filter((d) => week.days[d].strength).length;
  const hard = WEEKDAYS.filter((d) => ['intervals', 'tempo'].includes(week.days[d].run?.type)).length;
  const km = round(week.targetKm, 1);
  const goal = GOALS[plan.goal] || 'general fitness';
  const subject = `${week.recovery ? 'Lighter week' : 'Your week'}: ${km} km · ${runs} runs + ${gym} strength`;

  // Describe the change against last week's actual plan, not the nominal 10% build.
  const prevKm = week.week > 1 ? round(buildWeek(plan, addDays(monday, -7), maxHr).targetKm, 1) : null;
  let change;
  if (week.recovery) change = 'A lighter week to absorb the last three, so the next build starts fresh.';
  else if (prevKm === null) change = "Week 1 is based on what you've actually been running lately.";
  else if (km > prevKm) change = `Up ${Math.round(((km - prevKm) / prevKm) * 100)}% on last week's ${prevKm} km.`;
  else change = `The same ${km} km as last week. Your long run is already ahead of your usual weekly distance, so the total holds steady until the rest of your week catches up.`;
  const p = week.paces;
  const timesLine = p
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px"><tr>
<td width="50%" valign="top" bgcolor="#F6F7F9" style="background:#F6F7F9;border-radius:8px;padding:10px 12px"><p style="margin:0;font-size:12px;color:${MUTED}">${esc(p.distanceName)} now</p><p style="margin:2px 0 0;font-size:17px;font-weight:700;color:${INK}">${formatTime(p.current)}</p><p style="margin:0;font-size:12px;color:${MUTED}">${formatPace(p.currentPace)}/km</p></td>
<td width="8">&nbsp;</td>
<td width="50%" valign="top" bgcolor="#F6F7F9" style="background:#F6F7F9;border-radius:8px;padding:10px 12px"><p style="margin:0;font-size:12px;color:${MUTED}">Goal</p><p style="margin:2px 0 0;font-size:17px;font-weight:700;color:${INK}">${p.goal ? formatTime(p.goal) : 'Not set'}</p><p style="margin:0;font-size:12px;color:${MUTED}">${p.goalPace ? `${formatPace(p.goalPace)}/km` : '&nbsp;'}</p></td>
</tr></table>
<p style="margin:10px 0 0;font-size:13px;color:${MUTED}">Your paces: easy ${formatPace(p.easyFast)}-${formatPace(p.easySlow)} · tempo ${formatPace(p.tempo)} · intervals ${formatPace(p.interval)} per km</p>`
    : '';
  const spacing = hard > 1
    ? 'Hard runs are 48 hours apart and kept off the day after strength training where the week allows.'
    : 'One hard run, kept off the day after strength training where the week allows.';

  const rows = WEEKDAYS.map((wd, i) => {
    const day = week.days[wd];
    const date = addDays(monday, i);
    const run = day.run ? TYPE[day.run.type] : null;
    const color = run ? run.color : day.strength ? STRENGTH_COLOR : '#D9DDE3';
    let title;
    let detail = '';
    if (run) {
      title = `${run.title} · ${day.run.km} km`;
      detail = detailOf(day.run.text);
    } else title = day.strength ? 'Strength training' : 'Rest';
    const extras = [];
    if (day.run && day.strength) extras.push(run.tag === 'Hard' ? '+ strength training (run first, lift later)' : '+ strength training');
    if (day.accessory) extras.push('+ 12-min runner strength block');
    return `<tr>
<td width="4" bgcolor="${color}" style="background:${color};width:4px;font-size:1px;line-height:1px">&nbsp;</td>
<td width="58" valign="top" style="padding:12px 0 12px 12px;width:58px"><p style="margin:0;font-size:13px;font-weight:600;color:${INK}">${cap(wd)}</p><p style="margin:2px 0 0;font-size:12px;color:${MUTED}">${esc(longDate(date, { day: 'numeric', month: 'short' }))}</p></td>
<td valign="top" style="padding:12px 0 12px 8px;border-bottom:1px solid #F0F1F3"><p style="margin:0;font-size:15px;font-weight:600;color:${INK}">${esc(title)}</p>${
      detail ? `<p style="margin:3px 0 0;font-size:13px;line-height:1.5;color:${MUTED}">${esc(detail)}</p>` : ''
    }${extras.map((x) => `<p style="margin:3px 0 0;font-size:13px;color:${INK}">${esc(x)}</p>`).join('')}</td></tr>`;
  }).join('');

  const hero = card(`${label(`WEEK ${week.week}${week.recovery ? ' · LIGHTER WEEK' : ''}`)}
<p style="margin:0;font-size:30px;font-weight:700;color:${INK}">${km} km</p>
<p style="margin:4px 0 0;font-size:14px;color:${MUTED}">${runs} runs (${hard} hard) · ${gym} strength days · ${esc(goal)} goal</p>${timesLine}
<p style="margin:14px 0 0;font-size:14px;line-height:1.55;color:${INK}">${esc(`${change} ${spacing}`)}</p>`);

  const schedule = card(`${label('THE PLAN')}<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`);
  const block = WEEKDAYS.some((d) => week.days[d].accessory)
    ? card(`${label('RUNNER STRENGTH BLOCK')}<p style="margin:0;font-size:14px;line-height:1.6;color:${INK}">${esc(ACCESSORY.replace(/^Runner strength \(12 min, bodyweight\): /, ''))}</p><p style="margin:8px 0 0;font-size:12px;color:${MUTED}">12 minutes, bodyweight. Add it to the end of the session on the days marked above.</p>`)
    : '';
  const adapts = card(`${label('HOW THE WEEK ADAPTS')}<p style="margin:0;font-size:14px;line-height:1.6;color:${INK}">Each morning's email checks your readiness and adjusts that day. On a Low morning, intervals turn into an easy run and the long run gets shorter. On a Poor morning, it's rest.</p>${
    week.notes.length ? `<p style="margin:10px 0 0;font-size:13px;line-height:1.55;color:${MUTED}">${esc(week.notes.map(cap).join('. '))}.</p>` : ''
  }`);

  const html = page({
    preheader: `${km} km across ${runs} runs, around ${gym} strength days.`,
    dateLine: `Week of ${longDate(monday, { weekday: 'long', day: 'numeric', month: 'long' })}`,
    body: `${hero}${schedule}${block}${adapts}`,
    footer: "Your strength sessions are yours: Headroom only plans around the days you do them. To change the plan, ask Claude to set up Headroom again.",
  });

  const text = [
    `${subject} (week ${week.week}, ${goal} goal)`,
    '',
    ...WEEKDAYS.map((wd, i) => {
      const day = week.days[wd];
      const parts = [];
      if (day.run) parts.push(day.run.text);
      if (day.strength) parts.push('strength training');
      if (day.accessory) parts.push('runner strength block');
      return `${cap(wd)} ${longDate(addDays(monday, i), { day: 'numeric', month: 'short' })}: ${parts.join(' + ') || 'rest'}`;
    }),
    '',
    "Each morning's email adjusts the day to your readiness.",
  ].join('\n');

  return { subject, html, text, monday };
}

module.exports = { renderWeeklyEmail, mondayOf };
