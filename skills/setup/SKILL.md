---
name: setup
description: Setup questionnaire for Headroom. Checks the user's Garmin data, asks about the morning check (time, notifications, max HR) and their training (goal, runs per week, long-run day, strength days, priority), then saves ~/.headroom/config.json, builds a weekly run plan around their strength training, and schedules the morning check. Use when the user installs Headroom, asks to set it up, or wants to change their schedule, notifications, max HR or training plan.
---

# Headroom setup

Two short rounds of questions, then a saved config, a weekly plan, a scheduled morning check, and one test run. Re-running setup updates the existing config and schedule instead of adding a second one; keep answers the user doesn't change.

## 1. Check the data

Follow steps 1-3 of the morning check in the `headroom:readiness` skill (fresh Chrome tab on `https://connect.garmin.com/app/home`, user signed in). Then run one `javascript_tool` call with the full contents of `../readiness/scripts/headroom-garmin.js` (relative to this skill's directory), a new line, and `await Headroom.profile()`. Keep the tab open for the test run in step 6.

It returns `estimatedTimes` (current 5K, 10K and half-marathon times estimated from the best recent run), `weeklyRunKm4w` (average running km per week, last 4 weeks), `longestRunKm4w`, `usualLiftDays` (weekdays with 2+ strength sessions in the last 4 weeks), `observedMaxHr`, `daysWithHrv` and `readyToScore`. If `readyToScore` is false, tell the user the score needs about 14 nights of HRV data from wearing the watch overnight; setup can continue now.

## 2. Ask the questions

Use AskUserQuestion when available (up to 4 questions per call). Pre-fill from the profile where you can.

**Round 1: the morning check**
1. **Time.** 06:30, 07:00, 07:30, 08:00. It needs the computer awake with Chrome open, and the watch synced through the phone.
2. **Notifications.** Every morning (recommended); only on Low or Poor days; no notifications, just the log.
3. **Delivery.** Email (recommended: the most reliable, since scheduled runs can't always push to a phone), push notification, or both. For email, confirm the address to send to; only ever use an address the user gives or confirms here.
4. **Max heart rate.** Offer "{observedMaxHr} bpm, the highest in your last 90 days" first; a tested or Garmin-set value can go in Other.

**Round 2: training**
1. **Goal.** 5K, 10K, half marathon, or general fitness.
2. **Runs per week.** 2, 3, 4 or 5. Mention their recent volume ({weeklyRunKm4w} km/week) so they pick something realistic.
3. **Long-run day.** Saturday, Sunday, Friday, or another day via Other.
4. **Strength days and priority.** Say which days Garmin shows they usually lift ({usualLiftDays}), and ask what comes first: running, strength training, or balanced. They can correct the days in Other.

**Round 3: times** (skip for general fitness unless the user wants paces)
1. **Current time** at the goal distance. Offer the profile's `estimatedTimes` value first ("about 27:03, from your best recent run"), plus "a recent race time" and "I don't know" (no paces then; the plan uses heart rate and effort only). This sets the training paces, so it must be what they can run now, not what they hope for.
2. **Goal time.** Offer three sensible targets: roughly 2%, 4% and 6% faster than the current time, rounded to the nearest 30 seconds for 5K and 10K, or the nearest minute for the half. Mention that 4-6% over two to three months is a realistic stretch for a newer runner.

Strength training is a black box: ask only which days, never what the sessions train, and never prescribe lifts. The plan schedules runs around those days and adds two short bodyweight runner-strength blocks a week.

## 3. Save the config

Write `~/.headroom/config.json` (create the folder if needed):

```json
{
  "version": 1,
  "morningTime": "07:30",
  "notify": "daily",
  "email": "you@example.com",
  "push": true,
  "maxHr": 190,
  "plan": {
    "goal": "5k",
    "runsPerWeek": 4,
    "longRunDay": "sun",
    "liftDays": ["mon", "wed", "fri"],
    "priority": "balanced",
    "startDate": "2026-10-19",
    "baseWeeklyKm": 9.5,
    "baseLongKm": 8,
    "currentTime": "29:30",
    "goalTime": "28:30"
  },
  "updatedAt": "2026-10-22"
}
```

- `notify`: `daily`, `low-and-poor` or `none`. `email` is omitted and `push` is `false` when the user didn't choose that channel.
- Days are lowercase three-letter weekdays.
- `startDate` is the Monday of the current week; week numbers and the 10%-a-week build count from it. Keep the existing `startDate` when re-running setup unless the goal changed.
- `baseWeeklyKm` is `weeklyRunKm4w` and `baseLongKm` is `longestRunKm4w` from the profile.
- `currentTime` and `goalTime` are race times at the goal distance (`mm:ss`, or `h:mm:ss` for the half). Omit `currentTime` if the user doesn't know it. Paces in every session come from `currentTime`; when the user runs a faster race, update it so the paces move with them.

## 4. Show the plan

In the same tab, run `Headroom.planWeek({ config: <the config object> })` and show the week to the user as a short table (day, run, strength). Mention any `note:` lines. Ask if they want to change anything before scheduling.

## 5. Schedule the morning check

Use the scheduled-task tool available in this app to create, or update if it already exists, a daily task named **Headroom morning check** at `morningTime`, in the user's local time zone, with this prompt:

> Scheduled run: use the headroom:readiness skill to run my morning check. Follow the notify setting in ~/.headroom/config.json. Don't ask for feedback.

If the user chose email delivery and has a plan, also create (or update) a weekly task named **Headroom weekly plan** for Sunday at 19:00 local time, with this prompt:

> Scheduled run: use the headroom:readiness skill to send my weekly plan email. Don't ask for feedback.

If no scheduling tool is available, say so, and tell the user they can ask Claude for "my readiness" each morning instead.

Scheduled runs are unattended, so any permission prompt stops them. Tell the user to open the task and click **Run now** once while at the computer, and to choose "always allow" for connect.garmin.com in Claude in Chrome. Push notifications only reach their phone while Remote Control is on.

## 6. Test run

Run the morning check once now with the new config (`headroom:readiness` skill), so the user sees exactly what the morning notification says, including today's workout. Then confirm the setup in two or three lines: time, notification rule, plan summary.
