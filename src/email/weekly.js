// The Sunday plan email: next week's sessions in full, built around the user's strength days.
// Needs only the config (and, for beginners, the morning-check log), never the browser session.
const { buildWeek, WEEKDAYS, weekdayOf, ACCESSORY } = require('../core/plan');
const { addDays, round } = require('../core/stats');
const { formatPace, formatTime } = require('../core/pace');
const { INK, MUTED, esc, longDate, card, label, page } = require('./style');

const TYPE = {
  intervals: { title: 'Intervals', color: '#D85A30', tag: 'Hard' },
  tempo: { title: 'Tempo', color: '#D85A30', tag: 'Hard' },
  long: { title: 'Long run', color: '#1D9E75', tag: 'Long' },
  easy: { title: 'Easy run', color: '#639922', tag: 'Easy' },
  runwalk: { title: 'Run/walk', color: '#1D9E75', tag: 'Easy' },
};
const STRENGTH_COLOR = '#888780';
const GOALS = { '5k': '5K', '10k': '10K', half: 'half marathon', fitness: 'general fitness' };

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
// "Easy 2.5 km at 6:48-7:29/km, Zone 2 (...)" -> "6:48-7:29/km, Zone 2 (...)"; "Intervals: 1.5 km ..." -> "1.5 km ..."
const detailOf = (text) =>
  text
    .replace(/^(Easy|Long easy run) [\d.]+ km(, | at )?/, '')
    .replace(/^(Intervals|Tempo|Run\/walk): /, '');
const para = (t, extra = '') => `<p style="margin:14px 0 0;font-size:14px;line-height:1.55;color:${INK}${extra}">${t}</p>`;

function mondayOf(date) {
  return addDays(date, -WEEKDAYS.indexOf(weekdayOf(date)));
}

function progressBar(done, total) {
  const pct = Math.max(4, Math.round((done / total) * 100));
  const cell = (w, c) => `<td width="${w}%" bgcolor="${c}" style="background:${c};height:8px;font-size:1px;line-height:1px">&nbsp;</td>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;border-radius:4px;overflow:hidden"><tr>${cell(pct, '#1D9E75')}${pct < 100 ? cell(100 - pct, '#D9DDE3') : ''}</tr></table>`;
}

function dayRows(week, monday) {
  return WEEKDAYS.map((wd, i) => {
    const day = week.days[wd];
    const date = addDays(monday, i);
    const run = day.run ? TYPE[day.run.type] : null;
    const color = run ? run.color : day.strength ? STRENGTH_COLOR : '#D9DDE3';
    let title;
    let detail = '';
    if (run && day.run.type === 'runwalk') {
      title = `${run.title} · ${day.run.short}`;
      detail = detailOf(day.run.text);
    } else if (run) {
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
}

function regularHero(plan, week, monday, maxHr, counts) {
  const { runs, gym, hard } = counts;
  const km = round(week.targetKm, 1);
  const goal = GOALS[plan.goal] || 'general fitness';
  // Describe the change against last week's actual plan, not the nominal 10% build.
  const prevKm = week.week > 1 ? round(buildWeek(plan, addDays(monday, -7), maxHr).targetKm, 1) : null;
  let change;
  if (week.recovery) change = 'A lighter week to absorb the last three, so the next build starts fresh.';
  else if (prevKm === null) change = "Week 1 is based on what you've actually been running lately.";
  else if (km > prevKm) change = `Up ${Math.round(((km - prevKm) / prevKm) * 100)}% on last week's ${prevKm} km.`;
  else change = `The same ${km} km as last week. Your long run is already ahead of your usual weekly distance, so the total holds steady until the rest of your week catches up.`;
  const spacing = hard > 1
    ? 'Hard runs are 48 hours apart and kept off the day after strength training where the week allows.'
    : 'One hard run, kept off the day after strength training where the week allows.';
  const p = week.paces;
  const timesLine = p
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px"><tr>
<td width="50%" valign="top" bgcolor="#F6F7F9" style="background:#F6F7F9;border-radius:8px;padding:10px 12px"><p style="margin:0;font-size:12px;color:${MUTED}">${esc(p.distanceName)} now</p><p style="margin:2px 0 0;font-size:17px;font-weight:700;color:${INK}">${formatTime(p.current)}</p><p style="margin:0;font-size:12px;color:${MUTED}">${formatPace(p.currentPace)}/km</p></td>
<td width="8">&nbsp;</td>
<td width="50%" valign="top" bgcolor="#F6F7F9" style="background:#F6F7F9;border-radius:8px;padding:10px 12px"><p style="margin:0;font-size:12px;color:${MUTED}">Goal</p><p style="margin:2px 0 0;font-size:17px;font-weight:700;color:${INK}">${p.goal ? formatTime(p.goal) : 'Not set'}</p><p style="margin:0;font-size:12px;color:${MUTED}">${p.goalPace ? `${formatPace(p.goalPace)}/km` : '&nbsp;'}</p></td>
</tr></table>
<p style="margin:10px 0 0;font-size:13px;color:${MUTED}">Your paces: easy ${formatPace(p.easyFast)}-${formatPace(p.easySlow)} · tempo ${formatPace(p.tempo)} · intervals ${formatPace(p.interval)} per km</p>`
    : '';
  return {
    subject: `${week.recovery ? 'Lighter week' : 'Your week'}: ${km} km · ${runs} runs + ${gym} strength`,
    preheader: `${km} km across ${runs} runs, around ${gym} strength days.`,
    hero: card(`${label(`WEEK ${week.week}${week.recovery ? ' · LIGHTER WEEK' : ''}`)}
<p style="margin:0;font-size:30px;font-weight:700;color:${INK}">${km} km</p>
<p style="margin:4px 0 0;font-size:14px;color:${MUTED}">${runs} runs (${hard} hard) · ${gym} strength days · ${esc(goal)} goal</p>${timesLine}
${para(esc(`${change} ${spacing}`))}`),
    adapts: "Each morning's email checks your readiness and adjusts that day. On a Low morning, intervals turn into an easy run and the long run gets shorter. On a Poor morning, it's rest.",
  };
}

function beginnerHero(week, counts, progression) {
  const b = week.beginner;
  const { runs, gym } = counts;
  if (progression && progression.graduated) {
    return {
      subject: 'You did it: 30 minutes non-stop',
      preheader: "You've finished the beginner programme.",
      hero: card(`${label('PROGRAMME COMPLETE')}
<p style="margin:0;font-size:26px;font-weight:700;color:${INK}">30 minutes, non-stop</p>${progressBar(b.of, b.of)}
${para("That's roughly a 5K for most new runners, and the hardest part of running is behind you.")}
${para('Next: ask Claude to <strong>set up Headroom again</strong>. It will measure your current 5K time and build a plan with paces from here.')}`),
      adapts: 'Keep running this week the way you have been: three easy 30-minute runs.',
    };
  }
  const moved = progression
    ? progression.reason
    : 'You start here. Each week you move up a stage when the last one went well, and repeat it when it didn\'t.';
  return {
    subject: `Stage ${b.stage} of ${b.of}: ${b.title.charAt(0).toLowerCase()}${b.title.slice(1)}`,
    preheader: `${runs} run/walk sessions this week, around ${gym} strength days.`,
    hero: card(`${label(`STAGE ${b.stage} OF ${b.of} · BEGINNER TO 30 MIN`)}
<p style="margin:0;font-size:26px;font-weight:700;color:${INK}">${esc(b.title)}</p>
<p style="margin:4px 0 0;font-size:14px;color:${MUTED}">${runs} run/walk sessions · ${gym} strength days · goal: 30 minutes non-stop</p>${progressBar(b.stage - 1, b.of)}
${para(esc(moved))}
${para('Go slowly enough to talk in full sentences. Walk breaks are part of the plan, not a sign of failing.', `;color:${MUTED};font-size:13px`)}`),
    adapts: "Each morning's email checks your readiness. On a Low morning you get the previous stage's session instead, an easier day. On a Poor morning, a walk instead. Repeating a stage is normal.",
  };
}

function renderWeeklyEmail(config, weekStart, progression) {
  const plan = config.plan;
  if (!plan) throw new Error('No plan in config. Run setup first.');
  const monday = mondayOf(weekStart);
  const maxHr = config.maxHr || 190;
  const week = buildWeek(plan, monday, maxHr);
  const counts = {
    runs: WEEKDAYS.filter((d) => week.days[d].run).length,
    gym: WEEKDAYS.filter((d) => week.days[d].strength).length,
    hard: WEEKDAYS.filter((d) => ['intervals', 'tempo'].includes(week.days[d].run?.type)).length,
  };
  const top = week.beginner ? beginnerHero(week, counts, progression) : regularHero(plan, week, monday, maxHr, counts);

  const schedule = card(`${label('THE PLAN')}<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${dayRows(week, monday)}</table>`);
  const block = WEEKDAYS.some((d) => week.days[d].accessory)
    ? card(`${label('RUNNER STRENGTH BLOCK')}<p style="margin:0;font-size:14px;line-height:1.6;color:${INK}">${esc(ACCESSORY.replace(/^Runner strength \(12 min, bodyweight\): /, ''))}</p><p style="margin:8px 0 0;font-size:12px;color:${MUTED}">12 minutes, bodyweight, on the days marked above. Strength work has the strongest evidence of anything for preventing running injuries.</p>`)
    : '';
  const adapts = card(`${label('HOW THE WEEK ADAPTS')}<p style="margin:0;font-size:14px;line-height:1.6;color:${INK}">${esc(top.adapts)}</p>${
    week.notes.length ? `<p style="margin:10px 0 0;font-size:13px;line-height:1.55;color:${MUTED}">${esc(week.notes.map(cap).join('. '))}.</p>` : ''
  }`);

  const html = page({
    preheader: top.preheader,
    dateLine: `Week of ${longDate(monday, { weekday: 'long', day: 'numeric', month: 'long' })}`,
    body: `${top.hero}${schedule}${block}${adapts}`,
    footer: "Your strength sessions are yours: Headroom only plans around the days you do them. To change the plan, ask Claude to set up Headroom again.",
  });

  const text = [
    week.beginner ? top.subject : `${top.subject} (week ${week.week}, ${GOALS[plan.goal] || 'general fitness'} goal)`,
    progression ? progression.reason : '',
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
  ].filter((line, i) => i !== 1 || line).join('\n');

  return { subject: top.subject, html, text, monday };
}

module.exports = { renderWeeklyEmail, mondayOf };
