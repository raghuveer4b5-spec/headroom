# Headroom

**A running plan built around your gym days, adjusted every morning to how recovered you are.**

Tell Headroom your goal, how often you run and which days you lift. Every Sunday it emails you next week's plan. Every morning it checks your watch's recovery data and tells you whether to run that day as planned, ease off, or rest. It runs on your own Claude against your own Garmin account: no app, no server, no account to create.

<table>
  <tr>
    <td align="center" valign="top" width="50%">
      <img src="docs/weekly-preview.png" width="320" alt="Headroom weekly plan email: 14.5 km across 3 runs and 3 strength days, with each day's session, a runner strength block, and how the week adapts">
      <br><sub><b>Sunday:</b> next week's plan</sub>
    </td>
    <td align="center" valign="top" width="50%">
      <img src="docs/email-preview.png" width="320" alt="Headroom morning email: readiness 64, Moderate, today's easy run, what shaped the score, and the week with Thursday highlighted">
      <br><sub><b>Every morning:</b> readiness and today's session</sub>
    </td>
  </tr>
</table>
<p align="center"><sub>Both shown with sample data.</sub></p>

## Why: injuries come from load that outpaces recovery

Most running injuries are overuse. They build over weeks, and the warning signs show up in data before they show up as pain:

- **Distance jumps.** Novice runners who added more than 30% in two weeks were more vulnerable to injury than those who stayed under 10% ([Nielsen et al., 2014](https://pubmed.ncbi.nlm.nih.gov/25155475/)).
- **Load spikes against your recent average** ([Gabbett, 2016](https://pubmed.ncbi.nlm.nih.gov/26758673/)).
- **Recovery that hasn't caught up:** HRV below your normal, resting heart rate creeping up. Training that follows HRV matched or beat a fixed plan ([Vesterinen et al., 2016](https://pubmed.ncbi.nlm.nih.gov/26909534/)).
- **Short sleep:** athletes sleeping under 8 hours were injured more often ([Milewski et al., 2014](https://pubmed.ncbi.nlm.nih.gov/25028798/)).

So Headroom does two things. **The plan** keeps load in check: about 10% more a week, a lighter fourth week, hard runs 48 hours apart and away from the day after the gym. **The morning check** catches the days your body hasn't recovered and makes them easier.

No score prevents injuries, and the acute:chronic ratio has its critics ([Impellizzeri et al., 2020](https://pubmed.ncbi.nlm.nih.gov/32502973/)). Headroom flags the conditions that make injury more likely, so you ease off on the days that matter.

## What you get

**Sunday evening: the plan.** Next week's sessions in full: distances, warm-ups, intervals, heart-rate targets, which days include strength training, and a 12-minute bodyweight runner-strength block (calves, glutes, core). Your gym sessions are a black box: Headroom only asks which days you train, never what you do there.

**Every morning: the check.** A readiness score from 0 to 100, today's session adjusted to it (on a Low day intervals become an easy run and the long run gets shorter; on a Poor day it's rest), what shaped the score, and the week with today highlighted. If the check can't run, because your watch hasn't synced or the Garmin session expired, you still get a short email saying so.

## The workflow

```mermaid
flowchart TD
    A[Setup questionnaire<br/>time, delivery, max HR,<br/>goal, runs/week, long-run day,<br/>strength days, priority] --> B[~/.headroom/config.json<br/>+ Sunday and daily scheduled tasks]
    B --> W[Sunday evening]
    W --> X[Build next week's plan<br/>around your strength days]
    X --> Y[Email the weekly plan<br/>tools/weekly.js]
    B --> C[Every morning at your time]
    C --> D[Claude opens Garmin Connect<br/>in your signed-in Chrome]
    D --> E[headroom-garmin.js runs in the page:<br/>reads HRV, resting HR, sleep,<br/>Body Battery, activities]
    E --> F{Watch has its own<br/>readiness score?}
    F -- yes --> G[Use Garmin Training Readiness]
    F -- no --> H[Calculate the Headroom estimate]
    G --> I[Plan: today's session,<br/>adjusted to the score]
    H --> I
    I --> J[Render the email<br/>tools/email.js]
    J --> K[Send to your inbox via Gmail]
    K --> L[Log to ~/.headroom/history.jsonl]
```

### 1. Setup (once, about two minutes)

Ask Claude to **set up Headroom**. It looks at your last 90 days of Garmin data first, so most answers are pre-filled, then asks two short rounds of questions:

- **The morning check:** what time, how to reach you (email, push or both), whether to notify every morning or only on Low or Poor days, and your max heart rate (it suggests the highest from your recent activities).
- **Your training:** goal (5K, 10K, half marathon or general fitness), runs per week, long-run day, which days you do strength training, and whether running, strength or neither comes first.

It saves your answers, shows you the week's plan, schedules the Sunday plan email and the daily check, and runs the check once so you see a real email straight away.

### 2. Sunday evening

Headroom builds next week from your config and emails it. This step doesn't touch Garmin or your browser, so it runs even if your Garmin session has expired.

### 3. Every morning

The scheduled task opens Garmin Connect in your browser, runs the Headroom script in the page and reads only what it needs. The score and the plan are calculated by tested code; Claude runs it and delivers the result exactly as rendered, so the numbers can't drift or be made up. The whole run takes a few minutes and closes its tab when it's done.

### 4. Over the weeks

Each run is logged. When you check in with Claude yourself, it asks whether the score matched how you felt. That 👍/👎 log is what the weights get tuned against. Your weekly distance builds by about 10% a week from where you actually are, with a lighter week every fourth week.

## How the score works

**If your watch has its own readiness score, Headroom uses it.** On Garmin watches with Training Readiness (many newer Forerunner, Fenix and Epix models), the morning email shows Garmin's score and says so. The Headroom estimate is still calculated and logged alongside it, which is a useful check on the formula. Fitbit's Daily Readiness isn't among the Google Health API's data types today, so Fitbit and Pixel Watch users would get the Headroom estimate.

Otherwise, Headroom calculates its own. Each part is scored 0-100 against your own 30-day history, where about 70 is a normal day for you:

| Component | Weight | How it's scored |
|---|---|---|
| HRV | 30% | Last night vs your 30-day baseline; marked down when your 7-day average drops below your Balanced range |
| Sleep | 25% | Last night's sleep score (60%) plus your 3-night average duration against 8 hours (40%) |
| Training load | 25% | Last 7 days of load vs your 4-week average, using time in heart-rate zones. 0.8-1.3x is on track; above 1.3x it falls steadily to zero at 2.0x. Marked down the day or two after a hard session |
| Resting HR | 15% | This morning vs your 30-day baseline |
| Body Battery | 5% | Level at wake-up |

**Safety caps.** If your resting HR is 7 or more bpm above normal, or Garmin's HRV status reads Low, the score is capped at 30, however good everything else looks. Those are often the first signs of illness or real fatigue. With less than 14 days of history it says "calibrating" instead of guessing.

| Score | Band | Guidance |
|---|---|---|
| 75-100 | High | Good day for intervals or a time trial |
| 50-74 | Moderate | Planned session is fine; swap hard for easy if you feel off |
| 25-49 | Low | Easy and short, or cross-train |
| 0-24 | Poor | Rest |

## How the plan protects you

The plan only schedules running and two short bodyweight "runner strength" blocks a week (calf raises, heel drops, split squats, glute bridges, core). Your strength training is yours: Headroom only needs to know which days you do it, never what's in it.

- **It starts from your real volume,** not your best week, and builds about 10% a week with a lighter week every fourth.
- **Hard runs are at least 48 hours apart,** and avoid the day after strength training when the week allows it. When they share a day, the plan says to run first and lift later.
- **Low weekly volume gets one hard run, not two,** because warm-ups and cool-downs add up.
- **The long run builds from your longest recent run,** so a few light weeks don't reset you to beginner distances.
- **A Low readiness score only ever shortens or softens a run,** never lengthens it.

## Install

You need the Claude desktop app or Claude Code, with Claude in Chrome and a Gmail connection for email delivery. Node 18+ is only needed to run the tests.

```bash
claude plugin marketplace add <path-or-git-url-of-this-repo>
claude plugin install headroom@headroom
```

Then ask Claude to **set up Headroom**.

A few practical notes:

- The check runs on your computer, because it uses your Chrome session. Pick a time when the computer is usually awake and the Claude app is open; a run that's missed happens the next time you open the app.
- Scheduled runs are unattended, so approve the tools once: open the scheduled task, click **Run now**, and choose "always allow" for connect.garmin.com.
- Your watch needs to have synced overnight through your phone.

## Privacy

There's no Headroom server. Your Garmin data goes from Garmin to your browser to your Claude session, and the email goes only to the address you gave during setup. Headroom never sees or stores your password: it uses the Garmin session you're already signed in with. Your history and settings stay in `~/.headroom/` on your computer.

## Under the hood

```
skills/setup               questionnaire → config, plan preview, schedule
skills/readiness           morning check, backtest, weekly plan email
src/adapters/              Garmin (browser session) → common data format
src/core/readiness.js      the score
src/core/plan.js           weekly plan + today's session
src/email/render.js        the morning email (email-safe HTML + plain text)
src/email/weekly.js        the Sunday plan email
src/email/style.js         shared email layout
tools/                     build, score, plan, email, weekly, preview
```

The core never talks to Garmin directly. Adapters turn each source into one common format, so adding another source (such as the Google Health API for Fitbit and Pixel Watch) means writing an adapter, not touching the score or the plan:

```json
{
  "source": "garmin",
  "days": [
    { "date": "2026-10-22", "restingHr": 58, "hrvLastNight": 52, "hrvWeeklyAvg": 55,
      "hrvStatus": "BALANCED", "hrvBalancedLow": 49, "hrvBalancedHigh": 64,
      "sleepSeconds": 23400, "sleepScore": 72, "bodyBatteryWake": 77,
      "deviceReadiness": null }
  ],
  "activities": [
    { "start": "2026-10-20T07:30:00", "type": "running", "durationS": 1800, "distanceM": 5000,
      "avgHr": 165, "maxHr": 184, "aerobicTe": 3.6, "label": "VO2MAX",
      "zoneSeconds": [90, 300, 480, 720, 210] }
  ]
}
```

Every field except `date` and `start` is optional.

```bash
npm test                                  # 42 tests, synthetic data only
npm run build                             # bundle src/ into the page script
node tools/score.js data.json --backtest 30
node tools/plan.js                        # this week's plan from your config
node tools/email.js result.json           # render a morning email
node tools/weekly.js                      # render next week's plan email
```

## Known limits

- **Unofficial endpoints.** The Garmin adapter reads the same internal endpoints the Garmin Connect website uses. They can change without notice, and automated access sits outside Garmin's official API. Headroom is read-only and limited to your own account.
- **Cost per run.** Each check pastes a ~28 KB script into the page, which uses some of your Claude usage every morning. An MCP server or Garmin's official API would remove that.
- **Untested on watches with Training Readiness.** Using Garmin's own score is written defensively but hasn't yet run against a watch that has it.
- **The weights aren't validated.** They were checked against one runner's 60-day history, where personal bests fell on high-scoring days and the worst mornings scored lowest. That's encouraging, not proof.

## Roadmap

- Post-run debrief: splits, pacing and form compared with your past runs at the same pace
- Google Health API adapter for Fitbit and Pixel Watch
- Tuning the weights from the 👍/👎 log

Headroom is an estimate for training decisions, not medical advice. If something hurts, see a physio.
