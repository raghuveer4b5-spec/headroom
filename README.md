# Splits

A daily **training readiness score** for people whose watch doesn't have one, run by your own Claude on your own data.

Garmin only shows Training Readiness on its higher-end watches. A Forerunner 165 records every input it needs (overnight HRV, resting heart rate, sleep, training load, Body Battery) but never combines them. Splits does that each morning, scoring every input against **your own** 30-day baseline, and tells you in one line whether to train hard, keep it easy, or rest:

> **Readiness 64 · Moderate.** Planned session is fine; keep hard efforts controlled, or swap to easy if you feel off. Held back by: training load 1.42x your 4-week average + hard session 2 days ago; HRV below your normal (52 vs 58 ms).

## How it works

```
Claude (your subscription)
  ├─ splits-setup skill: questionnaire → ~/.splits/config.json + daily schedule
  └─ splits-readiness skill
       └─ Claude in Chrome → your logged-in Garmin Connect tab
            └─ splits-garmin.js (runs in the page)
                 ├─ Garmin adapter: reads Garmin's own JSON endpoints, read-only
                 ├─ normalises into a device-neutral format
                 └─ scores it → compact result (< 1,000 characters)
```

- **No backend, no credentials.** Splits uses the session you're already signed in with. Your data goes from Garmin to your browser to your Claude, and nowhere else.
- **The maths is code, not the model.** The score is computed by a deterministic, tested script. Claude only runs it and relays the result, so the numbers can't be made up.
- **Device-neutral core.** The scoring works on a common data format (below), so other sources such as the Google Health API (Fitbit Air, Pixel Watch) only need an adapter.

## The score

Each component is scored 0-100, where about 70 means a normal day for you.

| Component | Weight | How it's scored |
|---|---|---|
| HRV | 30% | Last night vs your 30-day log-normal baseline; penalised when the 7-day average drops below your Balanced range |
| Sleep | 25% | Last night's sleep score (60%) plus 3-night duration vs 8 hours (40%) |
| Training load | 25% | 7-day load vs your 4-week average (heart-rate-zone TRIMP). 0.8-1.3x is on track; above 1.3x falls to zero at 2.0x. Minus 20 the day after a hard session, minus 10 two days after |
| Resting HR | 15% | This morning vs your 30-day baseline |
| Body Battery | 5% | Level at wake-up |

**Safety caps:** resting HR 7+ bpm above baseline, or HRV status Low, caps the score at 30. With less than 14 days of history it shows "calibrating" instead of a number. Missing inputs are dropped and the weights re-normalised.

| Score | Band | Guidance |
|---|---|---|
| 75-100 | High | Good day for intervals or a time trial |
| 50-74 | Moderate | Planned session OK; swap hard for easy if you feel off |
| 25-49 | Low | Easy, short, or cross-train |
| 0-24 | Poor | Rest |

This is an estimate for training decisions, not Garmin's Training Readiness and not medical advice.

## Install

Requires Claude Code (or the Claude desktop app) with Claude in Chrome, and Node 18+ only if you want to run the tests.

```bash
claude plugin marketplace add <path-or-git-url-of-this-repo>
claude plugin install splits@splits
```

Then ask Claude to **set up Splits**. The setup questionnaire checks your Garmin data and asks three things:

1. What time to run the morning check
2. Whether to notify you every morning, only on Low or Poor days, or not at all
3. Which max heart rate to use (it suggests the highest from your last 90 days)

It saves your answers to `~/.splits/config.json`, schedules the daily check and runs it once so you see the result. Because it uses your Chrome session, the check runs on your computer, not in the cloud, so pick a time it's usually awake.

After that: "What's my readiness today?" or "Backtest my readiness for the last 60 days."

## Common data format

Adapters produce this; `src/core` only ever sees this shape.

```json
{
  "source": "garmin",
  "days": [
    { "date": "2026-10-22", "restingHr": 58, "hrvLastNight": 52, "hrvWeeklyAvg": 55,
      "hrvStatus": "BALANCED", "hrvBalancedLow": 49, "hrvBalancedHigh": 64,
      "sleepSeconds": 23400, "sleepScore": 72, "bodyBatteryWake": 77 }
  ],
  "activities": [
    { "start": "2026-10-20T07:30:00", "type": "running", "durationS": 1800, "distanceM": 5000,
      "avgHr": 165, "maxHr": 184, "aerobicTe": 3.6, "label": "VO2MAX",
      "zoneSeconds": [90, 300, 480, 720, 210] }
  ]
}
```

Every field except `date`/`start` is optional. Score any file in this format without a browser:

```bash
node tools/score.js data.json --backtest 30
```

## Development

```bash
npm test          # node:test suite, synthetic data only
npm run build     # bundle src/ into skills/splits-readiness/scripts/splits-garmin.js
```

`splits-garmin.js` is generated; edit `src/` and rebuild.

## Known limits (v0.1)

- **Unofficial endpoints.** The Garmin adapter uses the same internal endpoints as the Garmin Connect website. They can change without notice, and automated access sits outside Garmin's official API. Splits is read-only and limited to your own account.
- **Token cost.** Each run pastes the ~16 KB script into the page. An MCP server or the official API would remove that.
- **Untuned weights.** The weights are a reasoned starting point, checked against one person's 60-day history. The 👍/👎 log is there to tune them.

## Roadmap

- v0.2: post-run debrief card; Google Health API adapter (Fitbit Air, Pixel Watch)
- v0.3: adaptive run plan that fits around your lifting days
