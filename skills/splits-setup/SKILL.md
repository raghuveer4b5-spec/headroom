---
name: splits-setup
description: First-time setup questionnaire for Splits readiness. Checks the user's Garmin data, asks when to run the daily morning check, how to notify them, and which max HR to use, then saves ~/.splits/config.json and schedules the check. Use when the user installs Splits, asks to set it up, or wants to change the check time, notifications or max HR.
---

# Splits setup

Three questions, then a saved config, a scheduled morning check, and one test run. Re-running setup updates the existing config and schedule instead of adding a second one.

## 1. Check the data

Follow steps 1-3 of the morning check in the `splits-readiness` skill (fresh Chrome tab on `https://connect.garmin.com/app/home`, user signed in). Then run one `javascript_tool` call with the full contents of `../splits-readiness/scripts/splits-garmin.js` (relative to this skill's directory), a new line, and `await Splits.profile()`.

It returns `observedMaxHr`, the number of activities and runs, `daysWithHrv` over the last 90 days, and `readyToScore`. If `readyToScore` is false, tell the user the score needs about 14 nights of HRV data from wearing the watch overnight, and that setup can continue now.

## 2. Ask the questions

Ask all three at once (one AskUserQuestion call when available):

1. **Morning check time.** Options: 06:30, 07:00, 07:30, 08:00. Explain it needs the computer awake with Chrome open, and the watch synced through the phone.
2. **Notifications.** Options: every morning (recommended); only on Low or Poor days; no notifications, just keep the log.
3. **Max heart rate**, used to spot hard sessions. Offer "Use {observedMaxHr} bpm, the highest in your last 90 days" first. Mention that if they know a higher tested value, or Garmin shows one in heart-rate-zone settings, they can enter it as Other.

## 3. Save the config

Write `~/.splits/config.json` (create the folder if needed), keeping any fields already there:

```json
{
  "version": 1,
  "morningTime": "07:30",
  "notify": "daily",
  "maxHr": 190,
  "updatedAt": "2026-10-22"
}
```

`notify` is one of `daily`, `low-and-poor`, `none`.

## 4. Schedule the morning check

Use the scheduled-task tool available in this app to create, or update if it already exists, a daily task named **Splits morning check** at `morningTime`, in the user's local time zone, with this prompt:

> Scheduled run: use the splits-readiness skill to run my morning check. Follow the notify setting in ~/.splits/config.json. Don't ask for feedback.

If no scheduling tool is available, say so, and tell the user they can ask Claude for "my readiness" each morning instead.

## 5. Test run

Run the morning check once now with the new config, using the `splits-readiness` skill, so the user sees what the notification will look like. Then confirm what was set up in two or three lines: time, notification rule, max HR.
